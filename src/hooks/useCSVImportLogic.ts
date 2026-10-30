import { useEffect, useMemo, useState } from 'react';
import { useCash } from '../context/CashContext';
import {
  CSVColumnMapping,
  CSVParseValidationResponse,
} from '../types/finance';
import { parseAndValidateCSV, parseCSVLines } from '../utils/finance';

export const SAMPLE_CSV_HDFC = `Txn Date,Narration,Dr Amount,Cr Amount,Category
2026-10-01,Client Milestone Invoice #104,,180000,Client Payment
2026-10-02,Team Payroll Salaries,140000,,Staff Salaries
2026-10-05,Commercial Office Rent,45000,,Office Rent
2026-10-08,Meta Ads Campaign Invoice,22000,,Marketing & Ads
2026-10-12,Direct Product Sales Shopify,,65000,Product Sales
2026-10-15,GST Monthly Tax Deposit,38000,,Taxes & GST
2026-10-18,Packaging Stock Vendor Payment,18500,,Vendor / Supplier
2026-10-22,Consulting Retainer Alpha Corp,,95000,Consulting / Services
2026-10-25,AWS Cloud Infrastructure,14500,,Software & SaaS
2026-10-28,Logistics Courier Freight,8200,,Logistics & Shipping`;

export const SAMPLE_CSV_WITH_ERRORS = `Date,Description,Debit,Credit,Category
2026-10-01,Client Retainer Payment,,125000,Client Payment
2026-10-03,Office Broadband Internet,4500,,Utilities & Wifi
32/13/2026,Bad Date Sample Row,15000,,Vendor / Supplier
2026-10-08,Zero Value Line Item,0,,Miscellaneous Expense
2026-10-10,Valid Inventory Raw Materials,32000,,Inventory / Stock`;

/**
 * Custom hook containing complete business logic for CSV import,
 * column heuristic auto-detection, server/client validation, and batching.
 */
export function useCSVImportLogic(isOpen: boolean, onClose: () => void) {
  const { accounts, primaryAccountId, batchImportTransactions } = useCash();

  const [rawCSV, setRawCSV] = useState<string>('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(primaryAccountId || 'acc-primary');
  const [mapping, setMapping] = useState<CSVColumnMapping>({
    dateColumn: '',
    descriptionColumn: '',
    debitColumn: '',
    creditColumn: '',
    categoryColumn: '',
  });

  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<CSVParseValidationResponse | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [filterTab, setFilterTab] = useState<'all' | 'valid' | 'errors'>('all');
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);

  // Initialize selected account when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedAccountId(primaryAccountId || accounts[0]?.id || 'acc-primary');
      setImportSuccessCount(null);
      setServerError(null);
    }
  }, [isOpen, primaryAccountId, accounts]);

  // When rawCSV changes, parse detected headers and auto-suggest column mapping
  useEffect(() => {
    if (!rawCSV.trim()) {
      setDetectedHeaders([]);
      setValidationResult(null);
      return;
    }

    const lines = parseCSVLines(rawCSV);
    if (lines.length > 0) {
      const headers = lines[0].map((h) => h.trim());
      setDetectedHeaders(headers);

      const findHeader = (candidates: string[]) =>
        headers.find((h) => candidates.some((c) => h.toLowerCase() === c.toLowerCase())) || '';

      const autoDate = findHeader(['Date', 'Txn Date', 'Transaction Date', 'Value Date', 'Posting Date']);
      const autoDesc = findHeader(['Description', 'Narration', 'Particulars', 'Remarks', 'Details']);
      const autoDebit = findHeader(['Debit', 'Dr', 'Dr Amount', 'Withdrawal', 'Outflow', 'Debit Amount']);
      const autoCredit = findHeader(['Credit', 'Cr', 'Cr Amount', 'Deposit', 'Inflow', 'Credit Amount']);
      const autoCat = findHeader(['Category', 'Tag', 'Type']);

      setMapping({
        dateColumn: autoDate || headers[0] || '',
        descriptionColumn: autoDesc || headers[1] || '',
        debitColumn: autoDebit || (headers.length > 2 ? headers[2] : ''),
        creditColumn: autoCredit || (headers.length > 3 ? headers[3] : ''),
        categoryColumn: autoCat || '',
      });
    }
  }, [rawCSV]);

  // Execute validation whenever rawCSV, mapping, or selected account changes
  useEffect(() => {
    if (!rawCSV.trim() || !mapping.dateColumn || !mapping.descriptionColumn) {
      setValidationResult(null);
      return;
    }

    let isMounted = true;
    setIsValidating(true);
    setServerError(null);

    const runValidation = async () => {
      try {
        const response = await fetch('/api/import/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawCSV,
            mapping,
            defaultAccountId: selectedAccountId,
          }),
        });

        if (response.ok) {
          const resJson = await response.json();
          if (isMounted && resJson.success && resJson.data) {
            setValidationResult(resJson.data);
            setIsValidating(false);
            return;
          }
        }
      } catch {
        // Fallback to client identical validation engine if offline or server route fails
      }

      if (isMounted) {
        const clientResult = parseAndValidateCSV(rawCSV, mapping, selectedAccountId);
        setValidationResult(clientResult);
        setIsValidating(false);
      }
    };

    const timer = setTimeout(runValidation, 300);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [rawCSV, mapping, selectedAccountId]);

  // Filter preview rows
  const displayedRows = useMemo(() => {
    return (validationResult?.rows || []).filter((row) => {
      if (filterTab === 'valid') return row.isValid;
      if (filterTab === 'errors') return !row.isValid;
      return true;
    });
  }, [validationResult, filterTab]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setRawCSV(content);
        setImportSuccessCount(null);
      }
    };
    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setRawCSV(SAMPLE_CSV_HDFC);
    setImportSuccessCount(null);
    setServerError(null);
  };

  const handleLoadSampleWithErrors = () => {
    setRawCSV(SAMPLE_CSV_WITH_ERRORS);
    setImportSuccessCount(null);
    setServerError(null);
  };

  const handleClear = () => {
    setRawCSV('');
    setValidationResult(null);
  };

  const handleImportValidRows = async () => {
    if (!validationResult || validationResult.validCount === 0) return;

    setIsImporting(true);
    setServerError(null);
    try {
      const validTxs = validationResult.rows
        .filter((r) => r.isValid && r.parsedTransaction)
        .map((r) => r.parsedTransaction!);

      const count = await batchImportTransactions(validTxs, selectedAccountId);
      setImportSuccessCount(count);
      setTimeout(() => {
        onClose();
      }, 1800);
    } catch (err: any) {
      setServerError(`Import failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
    }
  };

  return {
    accounts,
    selectedAccountId,
    setSelectedAccountId,
    rawCSV,
    setRawCSV,
    mapping,
    setMapping,
    detectedHeaders,
    validationResult,
    isValidating,
    isImporting,
    filterTab,
    setFilterTab,
    importSuccessCount,
    serverError,
    displayedRows,
    handleFileUpload,
    handleLoadSample,
    handleLoadSampleWithErrors,
    handleClear,
    handleImportValidRows,
  };
}
