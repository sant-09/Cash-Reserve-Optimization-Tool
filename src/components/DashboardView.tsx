import React, { useMemo, useState } from 'react';
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  Clock,
  AlertOctagon,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Info,
  Calendar,
  X,
  Box,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Flame,
  ArrowRight,
  Coins,
  Layers,
  Landmark,
  Building2,
  Star,
  FileSpreadsheet,
  Calculator,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  ReferenceLine,
} from 'recharts';
import { useCash } from '../context/CashContext';
import {
  formatINR,
  formatCompactINR,
  generateForecast,
  getNextMajorCashNeed,
} from '../utils/finance';
import { TransactionModal } from './TransactionModal';
import { StatusBadge } from './StatusBadge';
import { InfoTooltip } from './InfoTooltip';
import { RecommendedActionCard } from './RecommendedActionCard';
import { BankAccountsModal } from './BankAccountsModal';
import { CSVImportModal } from './CSVImportModal';

export const DashboardView: React.FC = () => {
  const {
    transactions,
    minCashRequired,
    metrics,
    recommendation,
    headlineSummary,
    shortfallInfo,
    healthStatus,
    language,
    setActiveView,
    addTransaction,
    dismissedLowCashToast,
    dismissLowCashToast,
    accounts,
    totalCashPosition,
    openExplanation,
    upcomingCashFlows,
    setShowUpcomingModal,
    triggeredAlerts,
    setShowReportModal,
    setShowNotificationsDrawer,
    setShowAlertSettingsModal,
  } = useCash();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Group historical transactions by date for the last 30 days chart
  const incomeVsExpenseData = useMemo(() => {
    const days: { [dateStr: string]: { date: string; displayDate: string; income: number; expense: number } } = {};
    const today = new Date();

    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      days[dateStr] = {
        date: dateStr,
        displayDate,
        income: 0,
        expense: 0,
      };
    }

    transactions.forEach((tx) => {
      if (days[tx.date]) {
        if (tx.type === 'income') {
          days[tx.date].income += tx.amount;
        } else {
          days[tx.date].expense += tx.amount;
        }
      }
    });

    const allDays = Object.values(days);
    const grouped = [];
    const chunkSize = 5;
    for (let i = 0; i < allDays.length; i += chunkSize) {
      const chunk = allDays.slice(i, i + chunkSize);
      const incomeSum = chunk.reduce((acc, curr) => acc + curr.income, 0);
      const expenseSum = chunk.reduce((acc, curr) => acc + curr.expense, 0);
      const label = `${chunk[0].displayDate} - ${chunk[chunk.length - 1].displayDate}`;
      grouped.push({
        label,
        income: incomeSum,
        expense: expenseSum,
      });
    }

    return grouped;
  }, [transactions]);

  // Generate 30-day forward cash trajectory
  const forecastData = useMemo(() => {
    const list = generateForecast(metrics.currentBalance, transactions, 30);
    return list.map((item) => ({
      date: item.formattedDate,
      fullDate: item.date,
      balance: item.projectedBalance,
      minReserve: minCashRequired,
    }));
  }, [metrics.currentBalance, transactions, minCashRequired]);

  // Next upcoming major cash commitments
  const nextNeed = useMemo(() => getNextMajorCashNeed(transactions), [transactions]);

  // Calculate potential interest earned on surplus
  const surplusAnnualInterest = useMemo(() => {
    if (metrics.safeSurplus <= 0) return 0;
    return Math.round(metrics.safeSurplus * 0.068);
  }, [metrics.safeSurplus]);

  const surplusMonthlyInterest = Math.round(surplusAnnualInterest / 12);
  const isDeficit = metrics.safeSurplus < 0;

  // Runway Meter Visual Width & Colors
  const runwayStatus = useMemo(() => {
    if (metrics.daysOfCashLeft >= 60) {
      return {
        label: 'Comfortable & Resilient',
        bg: 'bg-emerald-500',
        width: '100%',
      };
    } else if (metrics.daysOfCashLeft >= 30) {
      return {
        label: 'Healthy Working Buffer',
        bg: 'bg-blue-500',
        width: '75%',
      };
    } else if (metrics.daysOfCashLeft >= 15) {
      return {
        label: 'Caution: Tight Runway',
        bg: 'bg-amber-500',
        width: '40%',
      };
    } else {
      return {
        label: 'Critical: Immediate Inflow Needed',
        bg: 'bg-rose-500',
        width: '18%',
      };
    }
  }, [metrics.daysOfCashLeft]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Low Cash Alert Banner */}
      {metrics.isLowCash && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-900 dark:text-rose-200 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge status="critical" size="sm" />
                <h2 className="text-sm font-bold leading-tight">
                  Balance Below Minimum Operating Reserve
                </h2>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300 mt-0.5">
                Current balance ({formatINR(metrics.currentBalance)}) is{' '}
                {formatINR(Math.abs(metrics.safeSurplus))} below your safety buffer of{' '}
                {formatINR(minCashRequired)}. Delay non-essential payments and prioritize pending collections.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setActiveView('cashflow')}
              className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              Adjust Reserve / Log Inflow
            </button>
          </div>
        </div>
      )}

      {/* Dismissible Floating Toast */}
      {metrics.isLowCash && !dismissedLowCashToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-rose-900 text-white p-4 rounded-2xl shadow-2xl border border-rose-700 flex items-start gap-3 animate-slide-up">
          <AlertOctagon className="w-5 h-5 text-rose-300 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <div className="font-bold text-sm">Action Needed: Low Runway</div>
            <p className="text-rose-100">
              Only {metrics.daysOfCashLeft} days of cash runway remaining based on your average monthly spend.
            </p>
          </div>
          <button
            onClick={dismissLowCashToast}
            className="text-rose-300 hover:text-white p-1 rounded-lg"
            aria-label="Dismiss alert toast"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Phase 4: In-App Active Alerts Banner */}
      {triggeredAlerts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start sm:items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-bold text-amber-900 dark:text-amber-200">
                {triggeredAlerts.length} Alert{triggeredAlerts.length > 1 ? 's' : ''} Active:
              </span>{' '}
              <span className="text-amber-800 dark:text-amber-300">
                {triggeredAlerts[0].title} — {triggeredAlerts[0].message}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={() => setShowNotificationsDrawer(true)}
              className="px-3 py-1.5 text-xs font-bold text-amber-900 dark:text-amber-100 bg-amber-200/80 dark:bg-amber-900/60 hover:bg-amber-300 dark:hover:bg-amber-800 rounded-lg transition-colors whitespace-nowrap"
            >
              View All ({triggeredAlerts.length})
            </button>
            <button
              onClick={() => setShowAlertSettingsModal(true)}
              className="px-2.5 py-1.5 text-xs text-amber-700 dark:text-amber-300 hover:underline whitespace-nowrap"
            >
              Alert Rules
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Header & Quick Action Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Financial Health Dashboard
            </h1>
            <StatusBadge status={healthStatus} size="sm" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Executive working capital monitor, cash runway tracking, and reserve optimization.
          </p>
        </div>

        {/* Quick Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl shadow-xs transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Record Transaction</span>
          </button>

          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap"
          >
            <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
            <span>Import Statement</span>
          </button>

          <button
            onClick={() => setShowReportModal(true)}
            title="Generate Printable / PDF Executive Monthly Report"
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap shadow-2xs"
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Monthly Report</span>
          </button>

          <button
            onClick={() => setIsAccountsModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap"
          >
            <Landmark className="w-4 h-4 text-emerald-500" />
            <span>Accounts ({accounts.length})</span>
          </button>

          <button
            onClick={() => setActiveView('vault3d')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap"
          >
            <Box className="w-4 h-4 text-emerald-500" />
            <span>3D Vault</span>
          </button>

          <button
            onClick={() => setActiveView('forecast')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors whitespace-nowrap"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>What-If Simulator</span>
          </button>
        </div>
      </div>

      {/* 3. Item 1: Headline Summary Card in Plain Language */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Executive Health Briefing
              </span>
            </div>
            <StatusBadge status={healthStatus} size="md" />
          </div>

          <div>
            <p className="text-base sm:text-xl font-bold tracking-tight text-white leading-relaxed">
              "{headlineSummary.plainText}"
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <span className="font-semibold text-slate-300">Runway:</span>
              <span className="font-bold text-white tabular-nums">
                {metrics.daysOfCashLeft >= 999 ? '90+ Days' : `${metrics.daysOfCashLeft} Days`}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <span className="font-semibold text-slate-300">Safe Surplus:</span>
              <span className={`font-bold tabular-nums ${isDeficit ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatCompactINR(metrics.safeSurplus)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
              <span className="font-semibold text-slate-300">Next Risk:</span>
              <span className="font-bold text-amber-300">
                {shortfallInfo.formattedDate}
              </span>
            </div>

            {language === 'hinglish' && (
              <span className="text-[11px] text-emerald-300 italic ml-auto">
                Hinglish mode active
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Item 2: Main Dashboard Reduced to 4 Core KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Current Balance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Current Balance
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openExplanation('currentBalance')}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="How is this calculated? Formula & Inputs"
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>
                <InfoTooltip termKey="currentBalance" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums mt-3">
              {formatINR(metrics.currentBalance)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <button
              type="button"
              onClick={() => openExplanation('currentBalance')}
              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              📐 How is this calculated?
            </button>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">Active</span>
          </div>
        </div>

        {/* Card 2: Cash Runway */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-amber-300 dark:hover:border-amber-900 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Cash Runway
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openExplanation('runway')}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="How is this calculated? Formula & Inputs"
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>
                <StatusBadge
                  status={metrics.daysOfCashLeft >= 45 ? 'healthy' : metrics.daysOfCashLeft >= 21 ? 'watch' : 'critical'}
                  size="sm"
                />
                <InfoTooltip termKey="runway" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums mt-3">
              {metrics.daysOfCashLeft >= 999 ? '90+ Days' : `${metrics.daysOfCashLeft} Days`}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <button
              type="button"
              onClick={() => openExplanation('runway')}
              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              📐 How is this calculated?
            </button>
            <span className="flex items-center gap-1">
              Burn: <strong className="text-slate-700 dark:text-slate-300">{formatINR(metrics.burnRatePerDay)}</strong>/day
            </span>
          </div>
        </div>

        {/* Card 3: Safe Surplus */}
        <div className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border ${
          isDeficit ? 'border-rose-200 dark:border-rose-900' : 'border-emerald-200/90 dark:border-emerald-900/60'
        } shadow-xs flex flex-col justify-between transition-colors`}>
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Safe Surplus
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => openExplanation('safeSurplus')}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="How is this calculated? Formula & Inputs"
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>
                <InfoTooltip termKey="safeSurplus" />
              </div>
            </div>
            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight tabular-nums mt-3 ${
              isDeficit ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
            }`}>
              {formatINR(metrics.safeSurplus)}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between truncate">
            <button
              type="button"
              onClick={() => openExplanation('safeSurplus')}
              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              📐 How is this calculated?
            </button>
            <span className="text-slate-400 font-mono text-[10px]">
              Min: {formatCompactINR(minCashRequired)}
            </span>
          </div>
        </div>

        {/* Card 4: Next Shortfall Date */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Next Shortfall Date
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openExplanation('shortfall')}
                  className="p-1 rounded-md text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="How is this calculated? Formula & Inputs"
                >
                  <Calculator className="w-3.5 h-3.5" />
                </button>
                <StatusBadge
                  status={shortfallInfo.hasShortfall ? (shortfallInfo.type === 'insolvency' ? 'critical' : 'watch') : 'healthy'}
                  size="sm"
                />
                <InfoTooltip termKey="workingCapital" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums mt-3">
              {shortfallInfo.formattedDate}
            </div>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between truncate">
            <button
              type="button"
              onClick={() => openExplanation('shortfall')}
              className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
            >
              📐 How is this calculated?
            </button>
            <span className="truncate max-w-[130px] text-slate-400" title={shortfallInfo.reason}>
              {shortfallInfo.reason}
            </span>
          </div>
        </div>

      </div>

      {/* 5. Phase 2: Total Cash Position First with Per-Account Breakdown */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-2xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Total Cash Position & Account Breakdown
                </h2>
                <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                  {accounts.length} Active Accounts
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consolidated balance: <strong className="text-slate-900 dark:text-white font-mono">{formatINR(totalCashPosition.totalBalance)}</strong> · Inflows: +{formatINR(totalCashPosition.totalInflow)} · Outflows: -{formatINR(totalCashPosition.totalOutflow)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-500" />
              <span>Import Statement</span>
            </button>
            <button
              onClick={() => setIsAccountsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors shadow-2xs"
            >
              <Landmark className="w-3.5 h-3.5 text-emerald-500" />
              <span>Manage Accounts</span>
            </button>
          </div>
        </div>

        {/* Per-Account Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {totalCashPosition.accountBreakdown.map((item) => {
            const acc = item.account;
            return (
              <div
                key={acc.id}
                className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-3 group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-2xs"
                      style={{ backgroundColor: acc.color || '#10b981' }}
                    >
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {acc.name}
                        </span>
                        {acc.isDefault && (
                          <span title="Primary Operative Account" className="text-amber-500">
                            <Star className="w-3 h-3 fill-current" />
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {acc.bankName} {acc.accountNumberMasked ? `· ${acc.accountNumberMasked}` : ''}
                      </span>
                    </div>
                  </div>
                  <span className="text-[9px] uppercase font-bold text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700">
                    {acc.accountType}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Balance</span>
                    <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
                      {formatINR(item.currentBalance)}
                    </span>
                  </div>
                  <div className="text-right text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <div>+{formatCompactINR(item.totalInflow)} in</div>
                    <div>-{formatCompactINR(item.totalOutflow)} out</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Phase 3: Upcoming Payments & Receipts Timeline Preview Section */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-950/80 flex items-center justify-center text-purple-600 dark:text-purple-400 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Upcoming Payments & Receipts Timeline
                </h2>
                <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full border border-purple-200 dark:border-purple-800">
                  {upcomingCashFlows.filter((f) => f.status === 'pending').length} Scheduled
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scheduled payroll, GST tax filing, office rent, vendor invoices, and expected client receivables
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowUpcomingModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-colors shadow-2xs self-end sm:self-auto"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Manage Timeline</span>
          </button>
        </div>

        {/* Timeline Horizon Preview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {upcomingCashFlows
            .filter((f) => f.status === 'pending')
            .slice(0, 4)
            .map((flow) => {
              const isExpense = flow.type === 'expense';
              const dueDateObj = new Date(flow.dueDate);
              const formattedDate = dueDateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

              return (
                <div
                  key={flow.id}
                  className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate" title={flow.title}>
                      {flow.title}
                    </span>
                    <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      isExpense ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}>
                      {flow.category.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {formattedDate}
                    </span>
                    <span className={`font-mono font-extrabold ${
                      isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {isExpense ? `-${formatCompactINR(flow.amount)}` : `+${formatCompactINR(flow.amount)}`}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 5. Collapsible Section Toggle */}
      <div className="pt-2">
        <button
          onClick={() => setShowMoreDetails((prev) => !prev)}
          className="w-full p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 shadow-2xs transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950/60 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>{showMoreDetails ? 'Hide Detailed Financial Analytics & Charts' : 'Show Detailed Financial Analytics & Charts'}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Runway meter, 30D forecast, ledger & cash outflows
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {showMoreDetails
                  ? 'Click to collapse back to executive view'
                  : 'Click to expand historical income vs expenses, runway health meter, smart advice, and ledger breakdown'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:bg-emerald-600 group-hover:text-white transition-all">
            <span>{showMoreDetails ? 'Collapse' : 'Expand Details'}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showMoreDetails ? 'rotate-180' : ''}`} />
          </div>
        </button>
      </div>

      {/* 6. Collapsible Content: Detailed Modules & Charts */}
      {showMoreDetails && (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Module A: Cash Runway Health Meter Bar */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Cash Runway Health Meter
                </h3>
                <InfoTooltip termKey="runway" />
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                Indian SME Benchmark: 90 Days Reserve (3 Months)
              </span>
            </div>

            <div className="space-y-2">
              <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex p-0.5">
                <div
                  style={{ width: runwayStatus.width }}
                  className={`h-full ${runwayStatus.bg} transition-all duration-700 rounded-full shadow-inner`}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400 font-mono pt-0.5">
                <span>0 Days (Deficit)</span>
                <span>15 Days</span>
                <span>30 Days (1 Month)</span>
                <span>60 Days</span>
                <span>90+ Days (Safe Reserve)</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2">
              <span>
                Average Daily Burn: <strong className="text-slate-800 dark:text-slate-200">{formatINR(metrics.burnRatePerDay)}</strong>/day
              </span>
              <span>
                Status: <strong className="text-slate-800 dark:text-slate-200">{runwayStatus.label}</strong>
              </span>
            </div>
          </div>

          {/* Module B: Smart Recommendation Box */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white shadow-xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Working Capital Deployment Advice</span>
              </div>
              <div className="text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Next Outflow: {recommendation.nextCashNeedDate}</span>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white leading-snug">
              {recommendation.headline}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-semibold text-slate-300">
                  1. How much cash to keep?
                </span>
                <div className="text-xl font-bold text-white mt-1 tabular-nums">
                  {formatINR(recommendation.keepAmount)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Keep in operative account for monthly payroll & vendor commitments.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-semibold text-slate-300">
                  2. How much can you invest?
                </span>
                <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
                  {formatINR(recommendation.investAmount)}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Safe to deploy into instant-access Liquid Mutual Funds earning ~6.8%.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-white/5 border border-white/10">
                <span className="text-[11px] font-semibold text-slate-300">
                  3. When will you need cash next?
                </span>
                <div className="text-xl font-bold text-amber-300 mt-1">
                  {recommendation.nextCashNeedDate}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {recommendation.nextCashNeedReason}
                </p>
              </div>
            </div>

            {/* Actionable points */}
            <div className="space-y-1.5 pt-1">
              {recommendation.advicePoints.map((point, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                  <span>{point}</span>
                </div>
              ))}
            </div>

            {/* Surplus Returns Calculator Box */}
            {metrics.safeSurplus > 20000 && (
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="text-slate-300">Surplus Yield Potential: </span>
                    <span className="font-bold text-emerald-400">
                      +{formatINR(surplusMonthlyInterest)}/month extra
                    </span>{' '}
                    <span className="text-slate-400">
                      (+{formatINR(surplusAnnualInterest)} yearly) at ~6.8% vs ₹0 in current account.
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveView('forecast')}
                  className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1 shrink-0"
                >
                  <span>View Allocation Blueprint</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Module C & D: Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Chart A: Income vs Expenses */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      Income vs Expenses (Last 30 Days)
                    </h3>
                    <InfoTooltip termKey="burnRate" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Cash inflows vs operational burn grouped in 5-day intervals
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    Inflow
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    Outflow
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incomeVsExpenseData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(val) => formatCompactINR(val)}
                    />
                    <Tooltip
                      formatter={(val: any) => [formatINR(Number(val)), '']}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Avg Daily Inflow: {formatINR(metrics.avgDailyIncome)}</span>
                <span>Avg Daily Outflow: {formatINR(metrics.avgDailyExpense)}</span>
              </div>
            </div>

            {/* Chart B: 30-Day Forward Cash Projection Line */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      30-Day Forward Cash Projection
                    </h3>
                    <InfoTooltip termKey="minReserve" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Projected balance trajectory based on historical run-rate
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('forecast')}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>Scenario Simulator</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={forecastData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      interval={4}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(val) => formatCompactINR(val)}
                    />
                    <Tooltip
                      formatter={(val: any, name: any) => [
                        formatINR(Number(val)),
                        name === 'balance' ? 'Projected Balance' : 'Min Reserve Buffer',
                      ]}
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '0.75rem',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <ReferenceLine
                      y={minCashRequired}
                      stroke="#3b82f6"
                      strokeDasharray="4 4"
                      label={{
                        value: 'Min Reserve',
                        fill: '#3b82f6',
                        fontSize: 10,
                        position: 'insideTopLeft',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="balance"
                      name="balance"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-blue-500 inline-block" />
                  Blue dashed = Min Reserve ({formatINR(minCashRequired)})
                </span>
                <span className="text-slate-700 dark:text-slate-300 font-semibold">
                  30D End: {formatINR(forecastData[forecastData.length - 1]?.balance || 0)}
                </span>
              </div>
            </div>

          </div>

          {/* Module E & F: Outflows & Recent Ledger Strip */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Upcoming Outflows */}
            <div className="lg:col-span-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Upcoming Cash Outflows
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">This Month</span>
              </div>

              <div className="space-y-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Staff Salaries (Payroll)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Due around 7th of month
                    </div>
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    ~₹1,40,000
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      Office Rent & Co-working
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Due around 10th of month
                    </div>
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    ~₹45,000
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/70 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      GST Monthly Filing (GSTR-3B)
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Due on 20th of month
                    </div>
                  </div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                    ~₹52,000
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Ledger Snapshot */}
            <div className="lg:col-span-8 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Recent Ledger Activity
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Latest cash entries affecting your current reserve buffer
                  </p>
                </div>
                <button
                  onClick={() => setActiveView('cashflow')}
                  className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  <span>View All ({transactions.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                      <th className="pb-2.5 pl-2 font-medium">Date</th>
                      <th className="pb-2.5 font-medium">Description</th>
                      <th className="pb-2.5 font-medium">Category</th>
                      <th className="pb-2.5 font-medium">Channel</th>
                      <th className="pb-2.5 pr-2 text-right font-medium">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                    {transactions.slice(0, 5).map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3 pl-2 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono">
                          {new Date(tx.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </td>
                        <td className="py-3 text-slate-800 dark:text-slate-200 font-medium">
                          {tx.note}
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {tx.category}
                        </td>
                        <td className="py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap font-mono text-[11px]">
                          {tx.paymentMethod || 'UPI'}
                        </td>
                        <td className={`py-3 pr-2 text-right font-bold whitespace-nowrap tabular-nums ${
                          tx.type === 'income'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}>
                          {tx.type === 'income' ? `+${formatINR(tx.amount)}` : `-${formatINR(tx.amount)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* 7. Item 5: Screen-Ending Recommended Next Action Card */}
      <RecommendedActionCard view="dashboard" />

      {/* Add Transaction Modal */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={addTransaction}
      />

      {/* Bank Accounts Modal (Phase 2) */}
      <BankAccountsModal
        isOpen={isAccountsModalOpen}
        onClose={() => setIsAccountsModalOpen(false)}
      />

      {/* CSV Import Modal (Phase 2) */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

    </div>
  );
};
