import React, { useMemo, useState } from 'react';
import {
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  Trash2,
  Edit2,
  Calculator,
  ShieldCheck,
  Calendar,
  Check,
  Sparkles,
  Building2,
  FileSpreadsheet,
  Lock,
} from 'lucide-react';
import { useCash } from '../context/CashContext';
import { Transaction, TransactionType } from '../types/finance';
import { exportTransactionsToCSV, formatINR, formatCompactINR } from '../utils/finance';
import { TransactionModal } from './TransactionModal';
import { ExportCSVModal } from './ExportCSVModal';
import { CSVImportModal } from './CSVImportModal';
import { InfoTooltip } from './InfoTooltip';
import { RecommendedActionCard } from './RecommendedActionCard';

export const CashFlowView: React.FC = () => {
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    minCashRequired,
    setMinCashRequired,
    applyAutoRecommendedReserve,
    metrics,
    accounts,
    canPerform,
  } = useCash();

  const canManageSettings = canPerform('manage_settings');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | TransactionType>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<'all' | '7d' | '30d' | 'this_month'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [quickFilter, setQuickFilter] = useState<'all' | 'high_value' | 'recurring'>('all');

  // Reports Toggle: Daily vs Monthly
  const [reportView, setReportView] = useState<'daily' | 'monthly'>('monthly');

  // Manual reserve input state
  const [tempMinReserve, setTempMinReserve] = useState(minCashRequired.toString());
  const [reserveSavedFeedback, setReserveSavedFeedback] = useState(false);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const today = new Date();

    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Account filter (Phase 2)
      if (accountFilter !== 'all' && (tx.accountId || 'acc-primary') !== accountFilter) return false;

      // Category filter
      if (categoryFilter !== 'all' && tx.category !== categoryFilter) return false;

      // Quick filter
      if (quickFilter === 'high_value' && tx.amount < 50000) return false;
      if (quickFilter === 'recurring' && !tx.isRecurring) return false;

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchNote = tx.note.toLowerCase().includes(query);
        const matchCategory = tx.category.toLowerCase().includes(query);
        const matchMethod = (tx.paymentMethod || '').toLowerCase().includes(query);
        if (!matchNote && !matchCategory && !matchMethod) return false;
      }

      // Date range filter
      if (dateRangeFilter !== 'all') {
        const txDate = new Date(tx.date);
        const diffTime = today.getTime() - txDate.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        if (dateRangeFilter === '7d' && diffDays > 7) return false;
        if (dateRangeFilter === '30d' && diffDays > 30) return false;
        if (dateRangeFilter === 'this_month') {
          if (
            txDate.getMonth() !== today.getMonth() ||
            txDate.getFullYear() !== today.getFullYear()
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [transactions, typeFilter, categoryFilter, searchQuery, dateRangeFilter]);

  // Unique categories for filter dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [transactions]);

  // Aggregated Summary calculation for current filtered view
  const summary = useMemo(() => {
    let totalInflow = 0;
    let totalOutflow = 0;

    filteredTransactions.forEach((tx) => {
      if (tx.type === 'income') totalInflow += tx.amount;
      else totalOutflow += tx.amount;
    });

    const netFlow = totalInflow - totalOutflow;
    const savingsRatio = totalInflow > 0 ? (netFlow / totalInflow) * 100 : 0;

    return {
      totalInflow,
      totalOutflow,
      netFlow,
      savingsRatio,
      count: filteredTransactions.length,
    };
  }, [filteredTransactions]);

  // Grouped reports breakdown (Daily or Monthly)
  const reportBreakdown = useMemo(() => {
    const groups: { [key: string]: { key: string; label: string; income: number; expense: number; net: number; count: number } } = {};

    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      let key = '';
      let label = '';

      if (reportView === 'daily') {
        key = tx.date;
        label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
      }

      if (!groups[key]) {
        groups[key] = { key, label, income: 0, expense: 0, net: 0, count: 0 };
      }

      if (tx.type === 'income') {
        groups[key].income += tx.amount;
      } else {
        groups[key].expense += tx.amount;
      }
      groups[key].net = groups[key].income - groups[key].expense;
      groups[key].count += 1;
    });

    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [transactions, reportView]);

  // Handlers
  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setIsModalOpen(true);
  };

  const handleAddNewClick = () => {
    setEditingTx(null);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = (txData: Omit<Transaction, 'id'>) => {
    if (editingTx) {
      updateTransaction(editingTx.id, txData);
    } else {
      addTransaction(txData);
    }
  };

  const handleDelete = (id: string, note: string) => {
    if (confirm(`Are you sure you want to delete "${note}"?`)) {
      deleteTransaction(id);
    }
  };

  const handleSaveMinReserve = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(tempMinReserve);
    if (!isNaN(val) && val >= 0) {
      setMinCashRequired(val);
      setReserveSavedFeedback(true);
      setTimeout(() => setReserveSavedFeedback(false), 2000);
    }
  };

  const handleExportCSV = () => {
    setIsExportModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Cash Flow & Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Track all inflows, operational burn, and fine-tune your minimum safety reserve.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
            <span>Import CSV</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleAddNewClick}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Record Entry</span>
          </button>
        </div>
      </div>

      {/* 2. Minimum Cash Requirement Tuning Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Minimum Cash Reserve Policy
                </h2>
                <InfoTooltip termKey="minReserve" />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
                The minimum amount of money that must remain in your current account before any cash is considered "Safe Surplus".
              </p>
            </div>
          </div>

          {/* Quick Auto-Suggestion Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!canManageSettings}
              onClick={() => {
                applyAutoRecommendedReserve(3);
                setTempMinReserve((metrics.monthlyAverageExpense * 3).toFixed(0));
              }}
              title={canManageSettings ? 'Auto-suggest 3 months' : '🔒 Owner role required to adjust safety reserve'}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl transition-colors border ${
                canManageSettings
                  ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 border-blue-200/80 dark:border-blue-800/80 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Auto-Suggest (3 Months: {formatCompactINR(metrics.monthlyAverageExpense * 3)})</span>
            </button>
            <button
              type="button"
              disabled={!canManageSettings}
              onClick={() => {
                applyAutoRecommendedReserve(1);
                setTempMinReserve((metrics.monthlyAverageExpense * 1).toFixed(0));
              }}
              title={canManageSettings ? 'Auto-suggest 1 month' : '🔒 Owner role required'}
              className={`px-2.5 py-1.5 text-xs rounded-xl transition-colors ${
                canManageSettings
                  ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed text-slate-400'
              }`}
            >
              1 Month ({formatCompactINR(metrics.monthlyAverageExpense)})
            </button>
            <button
              type="button"
              disabled={!canManageSettings}
              onClick={() => {
                applyAutoRecommendedReserve(6);
                setTempMinReserve((metrics.monthlyAverageExpense * 6).toFixed(0));
              }}
              title={canManageSettings ? 'Auto-suggest 6 months' : '🔒 Owner role required'}
              className={`px-2.5 py-1.5 text-xs rounded-xl transition-colors ${
                canManageSettings
                  ? 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                  : 'opacity-50 cursor-not-allowed text-slate-400'
              }`}
            >
              6 Months Conservative ({formatCompactINR(metrics.monthlyAverageExpense * 6)})
            </button>
          </div>
        </div>

        {/* Clear Role Disclaimer Banner if Finance */}
        {!canManageSettings && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Owner Role Required:</strong> You are currently signed in with the <strong>Finance</strong> role. Modifying the safety reserve policy is restricted to Owners. Switch roles using the profile badge in the top navigation bar to test updates.
            </span>
          </div>
        )}

        {/* Manual Input Form */}
        <form onSubmit={handleSaveMinReserve} className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
            Manual Override:
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">
              ₹
            </span>
            <input
              type="number"
              min="0"
              step="5000"
              disabled={!canManageSettings}
              value={tempMinReserve}
              onChange={(e) => setTempMinReserve(e.target.value)}
              className={`pl-7 pr-3 py-1.5 rounded-lg text-xs font-bold tabular-nums w-40 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                canManageSettings
                  ? 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white'
                  : 'opacity-60 cursor-not-allowed bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
              }`}
            />
          </div>
          <button
            type="submit"
            disabled={!canManageSettings}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
              canManageSettings
                ? 'text-white bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 cursor-pointer'
                : 'opacity-50 cursor-not-allowed bg-slate-400 text-white'
            }`}
          >
            {reserveSavedFeedback ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : null}
            <span>{reserveSavedFeedback ? 'Saved!' : 'Update Reserve Target'}</span>
          </button>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Based on average monthly operational expense of {formatINR(metrics.monthlyAverageExpense)}.
          </span>
        </form>
      </div>

      {/* 3. Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 print-card">
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400">Total Inflow</div>
          <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            +{formatINR(summary.totalInflow)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400">Total Outflow</div>
          <div className="text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
            -{formatINR(summary.totalOutflow)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400">Net Operating Flow</div>
          <div className={`text-lg font-bold tabular-nums mt-0.5 ${
            summary.netFlow >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
          }`}>
            {formatINR(summary.netFlow)}
          </div>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400">Operating Retention Rate</div>
          <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {summary.savingsRatio.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* 4. Filter Toolbar & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs no-print">
        
        {/* Left: Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search transactions, client names, categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Right: Filter Segmented Controls */}
        <div className="flex flex-wrap items-center gap-2">
          
          {/* Quick Filter: High Value & Recurring */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              onClick={() => setQuickFilter('all')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                quickFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setQuickFilter('high_value')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                quickFilter === 'high_value'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              &gt; ₹50K Major
            </button>
            <button
              onClick={() => setQuickFilter('recurring')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                quickFilter === 'recurring'
                  ? 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Recurring Bills
            </button>
          </div>

          {/* Account Filter (Phase 2) */}
          {accounts.length > 1 && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="px-2 py-1 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">All Accounts ({accounts.length})</option>
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Type Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['all', 'income', 'expense'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all capitalize ${
                  typeFilter === t
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {t === 'all' ? 'All Types' : t}
              </button>
            ))}
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {(['all', '7d', '30d', 'this_month'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateRangeFilter(d)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  dateRangeFilter === d
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {d === 'all' ? 'All Time' : d === '7d' ? '7 Days' : d === '30d' ? '30 Days' : 'This Month'}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">All Categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

        </div>
      </div>

      {/* 5. Main Transactions Table */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs print-card space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-bold text-slate-900 dark:text-white">
              Ledger Entries
            </span>
            <span aria-hidden="true">·</span>
            <span>Showing {filteredTransactions.length} of {transactions.length} records</span>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No transactions match your current filters.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Try adjusting your search criteria or record a new transaction.
            </p>
            <button
              onClick={handleAddNewClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl shadow-xs hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Record First Entry</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                  <th className="pb-3 pl-2 font-medium">Date</th>
                  <th className="pb-3 font-medium">Account</th>
                  <th className="pb-3 font-medium">Type</th>
                  <th className="pb-3 font-medium">Category</th>
                  <th className="pb-3 font-medium">Note / Reference</th>
                  <th className="pb-3 font-medium">Channel</th>
                  <th className="pb-3 pr-4 text-right font-medium">Amount (₹)</th>
                  <th className="pb-3 pr-2 text-right font-medium no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredTransactions.map((tx) => {
                  const txAccount = accounts.find((a) => a.id === tx.accountId) || accounts[0];
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      <td className="py-3 pl-2 whitespace-nowrap font-mono text-slate-600 dark:text-slate-400">
                        {tx.date}
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: txAccount?.color || '#10b981' }}
                          />
                          <span className="truncate max-w-[100px]">{txAccount?.name || 'Primary A/c'}</span>
                        </span>
                      </td>
                      <td className="py-3 whitespace-nowrap">
                        <span className={`text-[11px] font-semibold ${
                          tx.type === 'income'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}>
                          {tx.type === 'income' ? '● Inflow' : '○ Outflow'}
                        </span>
                      </td>
                    <td className="py-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                      {tx.category}
                      {tx.isRecurring && (
                        <span className="ml-2 text-[10px] text-blue-600 dark:text-blue-400 font-mono">
                          [Monthly]
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-slate-800 dark:text-slate-200 max-w-xs truncate">
                      {tx.note}
                    </td>
                    <td className="py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {tx.paymentMethod || 'UPI'}
                    </td>
                    <td className={`py-3 pr-4 text-right font-bold whitespace-nowrap tabular-nums text-sm ${
                      tx.type === 'income'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {tx.type === 'income' ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                    </td>
                    <td className="py-3 pr-2 text-right whitespace-nowrap no-print">
                      <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditClick(tx)}
                          title="Edit transaction"
                          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id, tx.note)}
                          title="Delete transaction"
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Reports Section (Daily vs Monthly Breakdowns) */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs print-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Periodic Financial Summary Report
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Aggregated income, expense burn, and net monthly surplus history
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl no-print">
            <button
              onClick={() => setReportView('monthly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                reportView === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Monthly Summary
            </button>
            <button
              onClick={() => setReportView('daily')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                reportView === 'daily'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Daily Breakdown
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                <th className="pb-2.5 pl-2 font-medium">Period</th>
                <th className="pb-2.5 font-medium">Tx Count</th>
                <th className="pb-2.5 font-medium">Total Inflows</th>
                <th className="pb-2.5 font-medium">Total Outflows</th>
                <th className="pb-2.5 pr-2 text-right font-medium">Net Operating Surplus</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {reportBreakdown.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 pl-2 font-semibold text-slate-800 dark:text-slate-200">
                    {row.label}
                  </td>
                  <td className="py-2.5 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                    {row.count} entries
                  </td>
                  <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-medium tabular-nums">
                    +{formatINR(row.income)}
                  </td>
                  <td className="py-2.5 text-rose-600 dark:text-rose-400 font-medium tabular-nums">
                    -{formatINR(row.expense)}
                  </td>
                  <td className={`py-2.5 pr-2 text-right font-bold tabular-nums ${
                    row.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {row.net >= 0 ? `+${formatINR(row.net)}` : formatINR(row.net)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTransaction}
        initialData={editingTx}
      />

      {/* Export to CSV Modal Dialog */}
      <ExportCSVModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filteredTransactions={filteredTransactions}
        allTransactions={transactions}
      />

      {/* CSV Import Modal (Phase 2) */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Screen Ending Recommended Next Action Card */}
      <RecommendedActionCard view="cashflow" />

    </div>
  );
};
