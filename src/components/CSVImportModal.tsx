import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Filter,
  Check,
  Building2,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { useCash } from '../context/CashContext';
import {
  CSVColumnMapping,
  CSVParseValidationResponse,
  ParsedImportRow,
} from '../types/finance';
import { formatINR, parseAndValidateCSV, parseCSVLines } from '../utils/finance';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_CSV_HDFC = `Txn Date,Narration,Dr Amount,Cr Amount,Category
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

const SAMPLE_CSV_WITH_ERRORS = `Date,Description,Debit,Credit,Category
2026-10-01,Client Retainer Payment,,125000,Client Payment
2026-10-03,Office Broadband Internet,4500,,Utilities & Wifi
32/13/2026,Bad Date Sample Row,15000,,Vendor / Supplier
2026-10-08,Zero Value Line Item,0,,Miscellaneous Expense
2026-10-10,Valid Inventory Raw Materials,32000,,Inventory / Stock`;

export const CSVImportModal: React.FC<CSVImportModalProps> = ({ isOpen, onClose }) => {
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

      // Auto-detect mappings
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

    // Call server route /api/import/validate for parsing & validation
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

      // Parity fallback
      if (isMounted) {
        const clientResult = parseAndValidateCSV(rawCSV, mapping, selectedAccountId);
        setValidationResult(clientResult);
        setIsValidating(false);
      }
    };

    const timer = setTimeout(runValidation, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [rawCSV, mapping, selectedAccountId]);

  if (!isOpen) return null;

  // Filter preview rows
  const displayedRows: ParsedImportRow[] = (validationResult?.rows || []).filter((row) => {
    if (filterTab === 'valid') return row.isValid;
    if (filterTab === 'errors') return !row.isValid;
    return true;
  });

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

  const handleImportValidRows = async () => {
    if (!validationResult || validationResult.validCount === 0) return;

    setIsImporting(true);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-6 max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Import Bank Statement (CSV / Excel)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Upload CSV or paste text, map bank statement columns, and preview row validations before importing.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Target Bank Account & Source Action Bar */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
            {/* Account Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Target Bank Account
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} — {acc.name} ({acc.accountType}) {acc.isDefault ? '★ Default' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Quick Sample Fill Buttons */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Quick Statement Templates
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setRawCSV(SAMPLE_CSV_HDFC)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                >
                  Load HDFC Statement (10 rows)
                </button>
                <button
                  type="button"
                  onClick={() => setRawCSV(SAMPLE_CSV_WITH_ERRORS)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-amber-300 dark:border-amber-800/60 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 hover:bg-amber-100/50 transition-all"
                >
                  Test Sample with Errors
                </button>
              </div>
            </div>
          </div>

          {/* Upload File or Paste CSV Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                Upload CSV File or Paste Raw Statement
              </label>
              {rawCSV && (
                <button
                  type="button"
                  onClick={() => {
                    setRawCSV('');
                    setValidationResult(null);
                  }}
                  className="text-xs text-rose-500 hover:text-rose-600 flex items-center gap-1 font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Clear input
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* File upload zone */}
              <label className="md:col-span-1 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all bg-white dark:bg-slate-900 group">
                <input
                  type="file"
                  accept=".csv,.txt,.tsv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-500 transition-colors">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-center">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Choose .CSV File
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Supports HDFC, ICICI, SBI, Excel
                  </span>
                </div>
              </label>

              {/* Paste Textarea */}
              <div className="md:col-span-2">
                <textarea
                  rows={4}
                  value={rawCSV}
                  onChange={(e) => setRawCSV(e.target.value)}
                  placeholder="Or paste CSV text with headers directly here...&#10;Date,Description,Debit,Credit,Category&#10;2026-10-01,Client Invoice,,150000,Client Payment"
                  className="w-full h-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Column Mapping Section (Visible once CSV has headers) */}
          {detectedHeaders.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-500" />
                  Map Statement Columns
                </span>
                <span className="text-[11px] text-slate-400">
                  {detectedHeaders.length} headers detected
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {/* Date */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Date Column *
                  </label>
                  <select
                    value={mapping.dateColumn}
                    onChange={(e) => setMapping((m) => ({ ...m, dateColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Column</option>
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Description / Narration *
                  </label>
                  <select
                    value={mapping.descriptionColumn}
                    onChange={(e) => setMapping((m) => ({ ...m, descriptionColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Select Column</option>
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Debit */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Debit (Expense Outflow)
                  </label>
                  <select
                    value={mapping.debitColumn || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, debitColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">(None / Empty)</option>
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Credit */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Credit (Income Inflow)
                  </label>
                  <select
                    value={mapping.creditColumn || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, creditColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">(None / Empty)</option>
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Category (Optional)
                  </label>
                  <select
                    value={mapping.categoryColumn || ''}
                    onChange={(e) => setMapping((m) => ({ ...m, categoryColumn: e.target.value }))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Auto-Detect from Narration</option>
                    {detectedHeaders.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Validation Metrics Summary Bar */}
          {validationResult && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Total Rows
                  </div>
                  <div className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    {validationResult.totalRows}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50">
                  <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300">
                    Valid to Import
                  </div>
                  <div className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    {validationResult.validCount}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border ${
                    validationResult.errorCount > 0
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold">Errors Flagged</div>
                  <div className="text-base font-bold font-mono">
                    {validationResult.errorCount}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Projected Inflow
                  </div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                    +{formatINR(validationResult.totalInflow)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800">
                  <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                    Projected Outflow
                  </div>
                  <div className="text-sm font-bold text-rose-600 dark:text-rose-400 font-mono">
                    -{formatINR(validationResult.totalOutflow)}
                  </div>
                </div>
              </div>

              {/* Table Tabs */}
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      filterTab === 'all'
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    All Rows ({validationResult.rows.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('valid')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      filterTab === 'valid'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Valid Only ({validationResult.validCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('errors')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
                      filterTab === 'errors'
                        ? 'bg-rose-600 text-white'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    Errors Only ({validationResult.errorCount})
                  </button>
                </div>
                <span className="text-[11px] text-slate-400">
                  Verified via Express Server Route
                </span>
              </div>

              {/* Row Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/80 dark:bg-slate-800/80 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                    <tr>
                      <th className="py-2 px-3 font-semibold w-12">#</th>
                      <th className="py-2 px-3 font-semibold w-24">Status</th>
                      <th className="py-2 px-3 font-semibold">Date</th>
                      <th className="py-2 px-3 font-semibold">Narration</th>
                      <th className="py-2 px-3 font-semibold">Type</th>
                      <th className="py-2 px-3 font-semibold text-right">Amount</th>
                      <th className="py-2 px-3 font-semibold">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                    {displayedRows.map((row) => (
                      <tr
                        key={row.rowIndex}
                        className={`transition-colors ${
                          row.isValid
                            ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                            : 'bg-rose-50/50 dark:bg-rose-950/20'
                        }`}
                      >
                        <td className="py-2 px-3 text-slate-400 font-sans">{row.rowIndex}</td>
                        <td className="py-2 px-3 font-sans">
                          {row.isValid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
                              <Check className="w-3 h-3" />
                              Valid
                            </span>
                          ) : (
                            <span
                              title={row.error}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-full cursor-help"
                            >
                              <AlertCircle className="w-3 h-3" />
                              Error
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {row.parsedTransaction ? (
                            row.parsedTransaction.date
                          ) : (
                            <span className="text-rose-500 font-sans text-[11px] truncate block max-w-[120px]">
                              {row.error || 'Invalid date'}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 max-w-[200px] truncate font-sans text-slate-800 dark:text-slate-200">
                          {row.parsedTransaction?.note || Object.values(row.rawRow)[1] || '-'}
                        </td>
                        <td className="py-2 px-3 font-sans">
                          {row.parsedTransaction && (
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                row.parsedTransaction.type === 'income'
                                  ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50'
                                  : 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50'
                              }`}
                            >
                              {row.parsedTransaction.type.toUpperCase()}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right font-bold">
                          {row.parsedTransaction ? (
                            <span
                              className={
                                row.parsedTransaction.type === 'income'
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : 'text-rose-600 dark:text-rose-400'
                              }
                            >
                              {formatINR(row.parsedTransaction.amount)}
                            </span>
                          ) : (
                            <span className="text-rose-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-500 font-sans text-[11px] truncate max-w-[140px]">
                          {row.parsedTransaction?.category || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Feedback & Errors */}
          {serverError && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
              {serverError}
            </div>
          )}

          {importSuccessCount !== null && (
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                  Successfully imported {importSuccessCount} transactions!
                </div>
                <div className="text-[11px] text-emerald-700 dark:text-emerald-300">
                  Your working capital metrics, runway, and account balances have updated.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            Keep existing transactions or append newly mapped rows.
          </span>

          <div className="flex items-center gap-2.5 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleImportValidRows}
              disabled={
                !validationResult ||
                validationResult.validCount === 0 ||
                isImporting ||
                importSuccessCount !== null
              }
              className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isImporting ? (
                <span>Importing...</span>
              ) : importSuccessCount !== null ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Imported!</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>
                    Import {validationResult?.validCount ? `${validationResult.validCount} ` : ''}Valid Transactions
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
