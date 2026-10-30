import React, { useState } from 'react';
import { X, Download, FileSpreadsheet, Check, CheckCircle2 } from 'lucide-react';
import { Transaction } from '../../types/finance';
import { exportTransactionsToCSV, formatINR } from '../../utils/finance';
import { useAuth } from '../../context/AuthContext';
import { useCash } from '../../context/CashContext';

interface ExportCSVModalProps {
  isOpen: boolean;
  onClose: () => void;
  filteredTransactions: Transaction[];
  allTransactions: Transaction[];
}

export const ExportCSVModal: React.FC<ExportCSVModalProps> = ({
  isOpen,
  onClose,
  filteredTransactions,
  allTransactions,
}) => {
  const { user } = useAuth();
  const { initialBalance } = useCash();

  const [scope, setScope] = useState<'filtered' | 'all'>('filtered');
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [includeSummaryHeader, setIncludeSummaryHeader] = useState(true);
  const [includeRunningBalance, setIncludeRunningBalance] = useState(true);
  const [customFilename, setCustomFilename] = useState(
    `CashWise_Ledger_${new Date().toISOString().split('T')[0]}`
  );
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  // Determine which transactions to export
  const baseList = scope === 'filtered' ? filteredTransactions : allTransactions;
  const targetList =
    typeFilter === 'all'
      ? baseList
      : baseList.filter((tx) => tx.type === typeFilter);

  // Compute metrics for the preview
  const totalInflow = targetList
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalOutflow = targetList
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  const netSurplus = totalInflow - totalOutflow;

  const handleDownload = () => {
    const csvData = exportTransactionsToCSV(targetList, {
      businessName: user?.businessName || 'My Business',
      includeSummaryHeader,
      includeRunningBalance,
      initialBalance: scope === 'all' ? initialBalance : 0,
    });

    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const finalFilename = customFilename.endsWith('.csv')
      ? customFilename
      : `${customFilename}.csv`;
    link.setAttribute('download', finalFilename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setDownloadSuccess(true);
    setTimeout(() => {
      setDownloadSuccess(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Export Transactions to CSV
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Download your income and expense records for Excel, Google Sheets, or CA auditing
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Record Scope
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setScope('filtered')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  scope === 'filtered'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Current Filtered ({filteredTransactions.length} records)
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  scope === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                All Records ({allTransactions.length} records)
              </button>
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Include Transaction Types
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All In & Out' },
                { id: 'income', label: 'Incomes Only' },
                { id: 'expense', label: 'Expenses Only' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTypeFilter(item.id as any)}
                  className={`py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all ${
                    typeFilter === item.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Formatting Options */}
          <div className="space-y-2.5 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              CSV Structure Options
            </span>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSummaryHeader}
                onChange={(e) => setIncludeSummaryHeader(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Include Executive Summary Header (Business name, date generated, total inflow/outflow)
              </span>
            </label>

            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={includeRunningBalance}
                onChange={(e) => setIncludeRunningBalance(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-600 dark:text-slate-300">
                Include Chronological Running Cash Balance column (Ideal for bank ledger audits)
              </span>
            </label>
          </div>

          {/* Filename */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              File Name
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-xs font-mono text-slate-400">.csv</span>
            </div>
          </div>

          {/* Summary Box */}
          <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-center">
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Export Count</div>
              <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                {targetList.length} rows
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Inflow</div>
              <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                +{formatINR(totalInflow)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">Total Outflow</div>
              <div className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                -{formatINR(totalOutflow)}
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            UTF-8 BOM enabled · Opens seamlessly in Excel & Google Sheets
          </span>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={targetList.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl shadow-xs transition-colors disabled:opacity-50"
            >
              {downloadSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Downloaded!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download CSV</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
