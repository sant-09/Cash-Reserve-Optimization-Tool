import { useMemo, useState } from 'react';
import { useCash } from '../context/CashContext';
import { Transaction, TransactionType } from '../types/finance';

export interface CashFlowSummary {
  totalInflow: number;
  totalOutflow: number;
  netFlow: number;
  savingsRatio: number;
  count: number;
}

export interface ReportBreakdownItem {
  key: string;
  label: string;
  income: number;
  expense: number;
  net: number;
  count: number;
}

/**
 * Custom hook containing all filtering, search, aggregation,
 * and report grouping logic for the Cash Flow View.
 */
export function useCashFlowData() {
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

  // Filter transactions across all selected dimensions
  const filteredTransactions = useMemo<Transaction[]>(() => {
    const today = new Date();

    return transactions.filter((tx) => {
      // Type filter
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;

      // Account filter
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
  }, [transactions, typeFilter, accountFilter, categoryFilter, quickFilter, searchQuery, dateRangeFilter]);

  // Unique categories for filter dropdown
  const availableCategories = useMemo<string[]>(() => {
    const set = new Set<string>();
    transactions.forEach((t) => set.add(t.category));
    return Array.from(set).sort();
  }, [transactions]);

  // Aggregated Summary calculation for current filtered view
  const summary = useMemo<CashFlowSummary>(() => {
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
  const reportBreakdown = useMemo<ReportBreakdownItem[]>(() => {
    const groups: { [key: string]: ReportBreakdownItem } = {};

    transactions.forEach((tx) => {
      const d = new Date(tx.date);
      let key = '';
      let label = '';

      if (reportView === 'monthly') {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        label = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
      } else {
        key = tx.date;
        label = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      }

      if (!groups[key]) {
        groups[key] = {
          key,
          label,
          income: 0,
          expense: 0,
          net: 0,
          count: 0,
        };
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
    setIsModalOpen(false);
    setEditingTx(null);
  };

  const handleDelete = (id: string, note?: string) => {
    const msg = note ? `Are you sure you want to delete "${note}"?` : 'Are you sure you want to delete this transaction record?';
    if (window.confirm(msg)) {
      deleteTransaction(id);
    }
  };

  const handleSaveMinReserve = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(tempMinReserve);
    if (!isNaN(val) && val >= 0) {
      setMinCashRequired(val);
      setReserveSavedFeedback(true);
      setTimeout(() => setReserveSavedFeedback(false), 2000);
    }
  };

  const handleAutoReserve = () => {
    applyAutoRecommendedReserve();
    setTempMinReserve(metrics.recommendedReserve.toString());
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTx(null);
  };

  return {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    minCashRequired,
    metrics,
    accounts,
    canManageSettings,
    // Modal states
    isModalOpen,
    setIsModalOpen,
    isExportModalOpen,
    setIsExportModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    editingTx,
    handleEditClick,
    handleAddNewClick,
    handleSaveTransaction,
    handleDelete,
    handleCloseModal,
    // Filters
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    accountFilter,
    setAccountFilter,
    dateRangeFilter,
    setDateRangeFilter,
    categoryFilter,
    setCategoryFilter,
    quickFilter,
    setQuickFilter,
    reportView,
    setReportView,
    // Reserve controls
    tempMinReserve,
    setTempMinReserve,
    reserveSavedFeedback,
    handleSaveMinReserve,
    handleAutoReserve,
    applyAutoRecommendedReserve,
    // Filtered data & aggregates
    filteredTransactions,
    availableCategories,
    summary,
    reportBreakdown,
  };
}
