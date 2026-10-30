import { useMemo, useState } from 'react';
import { useCash } from '../context/CashContext';
import { generateForecast, getNextMajorCashNeed } from '../utils/finance';

export interface IncomeExpenseChunk {
  label: string;
  income: number;
  expense: number;
}

export interface DashboardForecastItem {
  date: string;
  fullDate: string;
  balance: number;
  minReserve: number;
}

export interface RunwayStatusInfo {
  label: string;
  bg: string;
  width: string;
}

/**
 * Custom hook containing all business logic, data aggregation,
 * and state transitions for the Dashboard View.
 */
export function useDashboardData() {
  const {
    transactions,
    metrics,
    minCashRequired,
    recommendation,
    headlineSummary,
    shortfallInfo,
    healthStatus,
    setActiveView,
    addTransaction,
    dismissedLowCashToast,
    dismissLowCashToast,
    language,
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

  // Modal display states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Group historical transactions by date for the last 30 days chart
  const incomeVsExpenseData = useMemo<IncomeExpenseChunk[]>(() => {
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
    const grouped: IncomeExpenseChunk[] = [];
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
  const forecastData = useMemo<DashboardForecastItem[]>(() => {
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

  // Calculate potential interest earned on surplus (e.g. liquid mutual fund @ ~6.8% p.a.)
  const surplusAnnualInterest = useMemo(() => {
    if (metrics.safeSurplus <= 0) return 0;
    return Math.round(metrics.safeSurplus * 0.068);
  }, [metrics.safeSurplus]);

  const surplusMonthlyInterest = Math.round(surplusAnnualInterest / 12);
  const isDeficit = metrics.safeSurplus < 0;

  // Runway Meter Visual Width & Color Status
  const runwayStatus = useMemo<RunwayStatusInfo>(() => {
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

  return {
    transactions,
    metrics,
    minCashRequired,
    recommendation,
    headlineSummary,
    shortfallInfo,
    healthStatus,
    setActiveView,
    addTransaction,
    dismissedLowCashToast,
    dismissLowCashToast,
    language,
    accounts,
    totalCashPosition,
    openExplanation,
    upcomingCashFlows,
    setShowUpcomingModal,
    triggeredAlerts,
    setShowReportModal,
    setShowNotificationsDrawer,
    setShowAlertSettingsModal,
    // Modal states
    isAddModalOpen,
    setIsAddModalOpen,
    isAccountsModalOpen,
    setIsAccountsModalOpen,
    isImportModalOpen,
    setIsImportModalOpen,
    showMoreDetails,
    setShowMoreDetails,
    // Computed values
    incomeVsExpenseData,
    forecastData,
    nextNeed,
    surplusAnnualInterest,
    surplusMonthlyInterest,
    isDeficit,
    runwayStatus,
  };
}
