/**
 * CashWise Financial Utility Functions
 * All mathematical formulas for surplus, runway, forecasting, what-if scenarios,
 * and smart recommendations are centralized here.
 */

import {
  AccountBalanceSummary,
  AppLanguage,
  BankAccount,
  CSVColumnMapping,
  CSVParseValidationResponse,
  CashHealthMetrics,
  FinanceTermDefinition,
  FinanceTermKey,
  ForecastDay,
  HeadlineSummary,
  HealthStatus,
  InvestmentOption,
  MetricCalculationExplanation,
  MetricCalculationKey,
  MetricInputBreakdown,
  ParsedImportRow,
  RecommendedAction,
  SavedScenario,
  ScenarioComparisonResult,
  ScenarioPreset,
  ShortfallInfo,
  SmartRecommendation,
  TotalCashPosition,
  Transaction,
  TransactionCategory,
  TransactionType,
  UpcomingCashFlow,
  WhatIfScenario,
  AlertRule,
  TriggeredAlert,
  AlertDispatchResult,
  MonthlyReportData,
  UserRole,
  ALL_TRANSACTION_CATEGORIES,
} from '../types/finance';



/**
 * Format number into Indian Rupee (INR) representation (e.g. ₹1,50,000)
 */
export function formatINR(amount: number, showDecimals = false): string {
  if (isNaN(amount) || !isFinite(amount)) return '₹0';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);
  
  const formatted = abs.toLocaleString('en-IN', {
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  });

  return `${isNegative ? '-₹' : '₹'}${formatted}`;
}

/**
 * Format compact INR (e.g., ₹1.5L, ₹25K, ₹1.2Cr) for charts and mobile cards
 */
export function formatCompactINR(amount: number): string {
  if (isNaN(amount) || !isFinite(amount)) return '₹0';
  const isNegative = amount < 0;
  const abs = Math.abs(amount);

  let result = '';
  if (abs >= 10000000) {
    result = `${(abs / 10000000).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0$/, '$1')} Cr`;
  } else if (abs >= 100000) {
    result = `${(abs / 100000).toFixed(2).replace(/\.00$/, '').replace(/(\.[0-9]*[1-9])0$/, '$1')} L`;
  } else if (abs >= 1000) {
    result = `${(abs / 1000).toFixed(1).replace(/\.0$/, '')} K`;
  } else {
    result = abs.toFixed(0);
  }

  return `${isNegative ? '-₹' : '₹'}${result}`;
}

/**
 * Compute aggregate financial health metrics
 * Handles edge cases like 0 expenses, empty data, or negative balance.
 */
export function calculateCashHealth(
  transactions: Transaction[],
  initialBalance: number,
  minCashRequired: number
): CashHealthMetrics {
  // 1. Current balance = initial + sum(income) - sum(expense)
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') {
      totalIncome += tx.amount;
    } else {
      totalExpense += tx.amount;
    }
  });

  const currentBalance = initialBalance + totalIncome - totalExpense;

  // 2. Safe Surplus = current balance - min cash required
  // If negative, it represents a working capital deficit
  const safeSurplus = currentBalance - minCashRequired;

  // 3. Time window calculation for daily burn rate
  // We look at the date spread or at least 30 days
  let daysSpan = 30;
  if (transactions.length > 1) {
    const dates = transactions.map((t) => new Date(t.date).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
    daysSpan = Math.max(diffDays, 14); // at least 14 days baseline
  }

  const avgDailyExpense = daysSpan > 0 ? totalExpense / daysSpan : 0;
  const avgDailyIncome = daysSpan > 0 ? totalIncome / daysSpan : 0;

  // Monthly average (30 days baseline)
  const monthlyAverageExpense = avgDailyExpense * 30;
  const monthlyAverageIncome = avgDailyIncome * 30;

  // Recommended reserve: Standard Indian SME rule of thumb is 3 months of operating expenses
  const recommendedReserve = Math.round(monthlyAverageExpense * 3);

  // 4. Days of cash left (Runway)
  // Runway = Current Balance / Average Daily Expense
  let daysOfCashLeft = 0;
  if (currentBalance <= 0) {
    daysOfCashLeft = 0;
  } else if (avgDailyExpense <= 0) {
    daysOfCashLeft = 999; // Infinite runway if no expenses
  } else {
    daysOfCashLeft = Math.round(currentBalance / avgDailyExpense);
  }

  // Check if cash is low (below minimum reserve threshold or runway < 30 days)
  const isLowCash = currentBalance < minCashRequired || (currentBalance > 0 && daysOfCashLeft < 21);

  // Forecast shortfall date
  const forecast = generateForecast(currentBalance, transactions, 90);
  const firstShortfall = forecast.find((d) => d.projectedBalance < 0);
  const shortfallDate = firstShortfall ? firstShortfall.date : null;

  return {
    currentBalance,
    minCashRequired,
    safeSurplus,
    burnRatePerDay: avgDailyExpense,
    avgDailyExpense,
    avgDailyIncome,
    monthlyAverageExpense,
    monthlyAverageIncome,
    daysOfCashLeft,
    isLowCash,
    shortfallDate,
    recommendedReserve: recommendedReserve > 0 ? recommendedReserve : 100000,
  };
}

/**
 * Generate Day-by-Day Forecast for 30, 60, or 90 days
 * Combines average daily run rates with scheduled recurring calendar bills
 */
export function generateForecast(
  startingBalance: number,
  transactions: Transaction[],
  daysCount = 30,
  scenario?: WhatIfScenario,
  upcomingCashFlows?: UpcomingCashFlow[]
): ForecastDay[] {
  // Extract average daily rates from history (normalized over 30 days)
  let totalIncome = 0;
  let totalExpense = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') totalIncome += tx.amount;
    else totalExpense += tx.amount;
  });

  const span = Math.max(30, transactions.length);
  let baseDailyIncome = totalIncome / span;
  let baseDailyExpense = totalExpense / span;

  // If no transactions yet, provide realistic small business defaults
  if (baseDailyIncome === 0 && baseDailyExpense === 0) {
    baseDailyIncome = 12000;
    baseDailyExpense = 9000;
  }

  // Apply scenario adjustments if provided
  let effectiveDailyIncome = baseDailyIncome;
  let effectiveDailyExpense = baseDailyExpense;

  if (scenario) {
    effectiveDailyIncome = baseDailyIncome * (1 + scenario.incomeChangePercent / 100);
    effectiveDailyExpense = baseDailyExpense * (1 + scenario.expenseChangePercent / 100);
  }

  const result: ForecastDay[] = [];
  let runningBaseline = startingBalance;
  let runningScenario = startingBalance;

  const today = new Date();

  // Find recurring transactions (like rent, salaries) to project on specific monthly dates
  const recurringBills = transactions.filter((t) => t.isRecurring && t.type === 'expense');

  for (let i = 1; i <= daysCount; i++) {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + i);

    const dateStr = futureDate.toISOString().split('T')[0];
    const dayOfMonth = futureDate.getDate();

    // Check if recurring monthly bill falls on this day of month
    let recurringBillAmount = 0;
    recurringBills.forEach((b) => {
      const billDay = new Date(b.date).getDate();
      if (billDay === dayOfMonth) {
        recurringBillAmount += b.amount;
      }
    });

    // Phase 3: Check scheduled upcoming payments & receipts
    let dayUpcomingInflow = 0;
    let dayUpcomingOutflow = 0;
    const dayEvents: UpcomingCashFlow[] = [];

    if (upcomingCashFlows && upcomingCashFlows.length > 0) {
      upcomingCashFlows.forEach((flow) => {
        if (flow.status !== 'pending') return;

        const flowDueDate = new Date(flow.dueDate);
        const flowDateStr = flow.dueDate.split('T')[0];
        const flowDayOfMonth = flowDueDate.getDate();

        let isMatch = false;
        if (flowDateStr === dateStr) {
          isMatch = true;
        } else if (flow.recurrence === 'monthly' && flowDayOfMonth === dayOfMonth) {
          // If due date has passed or is today, it reoccurs monthly on the same day
          if (futureDate >= flowDueDate) {
            isMatch = true;
          }
        } else if (flow.recurrence === 'weekly' && futureDate.getDay() === flowDueDate.getDay()) {
          if (futureDate >= flowDueDate) {
            isMatch = true;
          }
        } else if (flow.recurrence === 'quarterly' && flowDayOfMonth === dayOfMonth) {
          // Recur every 3 months
          const monthDiff = Math.abs(futureDate.getMonth() - flowDueDate.getMonth());
          if (monthDiff % 3 === 0 && futureDate >= flowDueDate) {
            isMatch = true;
          }
        }

        if (isMatch) {
          dayEvents.push(flow);
          if (flow.type === 'income') {
            dayUpcomingInflow += flow.amount;
          } else {
            dayUpcomingOutflow += flow.amount;
          }
        }
      });
    }

    // Baseline calculation
    // Daily income minus daily expense + upcoming planned events
    const netDailyBase = baseDailyIncome - baseDailyExpense + (dayUpcomingInflow - dayUpcomingOutflow);
    runningBaseline = runningBaseline + netDailyBase;

    // Scenario calculation
    let scenarioUpcomingInflow = dayUpcomingInflow;
    let scenarioUpcomingOutflow = dayUpcomingOutflow;

    // If client payment delay is simulated, expected receivables in delay window are deferred
    if (scenario && scenario.receivableDelayDays > 0 && i <= scenario.receivableDelayDays) {
      scenarioUpcomingInflow = 0;
    }

    let scenarioNetDaily = effectiveDailyIncome - effectiveDailyExpense + (scenarioUpcomingInflow - scenarioUpcomingOutflow);

    // If client payment delay is simulated, baseline ongoing collections are suppressed during delay days
    if (scenario && scenario.receivableDelayDays > 0 && i <= scenario.receivableDelayDays) {
      scenarioNetDaily -= effectiveDailyIncome * 0.7; // 70% delay in collections
    }

    runningScenario = runningScenario + scenarioNetDaily;

    // Apply one-time big expense if this date matches
    if (scenario && scenario.oneTimeExpenseAmount > 0 && scenario.oneTimeExpenseDate === dateStr) {
      runningScenario -= scenario.oneTimeExpenseAmount;
    }

    const formattedDate = futureDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });

    result.push({
      date: dateStr,
      formattedDate,
      projectedBalance: Math.round(runningBaseline),
      scenarioBalance: scenario ? Math.round(runningScenario) : undefined,
      netDailyChange: Math.round(netDailyBase),
      isShortfall: runningBaseline < 0,
      isBelowMinimum: false, // Evaluated dynamically against minCashRequired
      upcomingInflow: dayUpcomingInflow > 0 ? Math.round(dayUpcomingInflow) : undefined,
      upcomingOutflow: dayUpcomingOutflow > 0 ? Math.round(dayUpcomingOutflow) : undefined,
      upcomingEvents: dayEvents.length > 0 ? dayEvents : undefined,
    });
  }

  return result;
}

/**
 * Identify the next major anticipated cash outflow (e.g. Salaries on 1st/7th, GST on 20th)
 */
export function getNextMajorCashNeed(_transactions?: Transaction[]): {
  date: string;
  formattedDate: string;
  reason: string;
  amount: number;
} {
  const today = new Date();
  const currentDay = today.getDate();

  // Common Indian SME dates:
  // Day 1-7: Payroll / Salaries
  // Day 10: Office Rent
  // Day 20: GST Payment (GSTR-3B)
  // Day 25: Vendor Settlement / Raw Materials

  if (currentDay < 7) {
    const targetDate = new Date(today.getFullYear(), today.getMonth(), 7);
    return {
      date: targetDate.toISOString().split('T')[0],
      formattedDate: targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      reason: 'Monthly Staff Payroll & Salaries',
      amount: 145000,
    };
  } else if (currentDay < 15) {
    const targetDate = new Date(today.getFullYear(), today.getMonth(), 15);
    return {
      date: targetDate.toISOString().split('T')[0],
      formattedDate: targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      reason: 'Office Rent & Utility Clearances',
      amount: 45000,
    };
  } else if (currentDay < 22) {
    const targetDate = new Date(today.getFullYear(), today.getMonth(), 20);
    return {
      date: targetDate.toISOString().split('T')[0],
      formattedDate: targetDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      reason: 'GST Monthly Tax Filing (GSTR-3B)',
      amount: 62000,
    };
  } else {
    // Next month salaries
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5);
    return {
      date: nextMonth.toISOString().split('T')[0],
      formattedDate: nextMonth.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      reason: 'Next Cycle Staff Salaries',
      amount: 145000,
    };
  }
}

/**
 * Generate Smart Recommendation in simple human language
 * Answers the 3 core questions:
 * 1. How much cash to keep?
 * 2. How much to invest?
 * 3. When will you need cash next?
 */
export function generateSmartRecommendation(
  metrics: CashHealthMetrics,
  transactions: Transaction[]
): SmartRecommendation {
  const { currentBalance, minCashRequired, safeSurplus, daysOfCashLeft } = metrics;
  const nextNeed = getNextMajorCashNeed(transactions);

  if (safeSurplus > 50000) {
    // Healthy surplus
    const investable = Math.floor(safeSurplus * 0.85); // Keep a 15% extra cushion
    return {
      status: 'healthy',
      headline: `Great liquidity! Keep ${formatINR(minCashRequired)} in current account and invest ${formatINR(investable)} in short-term instruments.`,
      keepAmount: minCashRequired,
      investAmount: investable,
      nextCashNeedDate: nextNeed.formattedDate,
      nextCashNeedReason: nextNeed.reason,
      advicePoints: [
        `You have ${daysOfCashLeft} days of cash runway at current burn rate.`,
        `Idle cash in zero-interest current accounts loses ~6% to inflation yearly. Move ₹${formatINR(investable).replace('₹', '')} into instant-access liquid funds.`,
        `Next anticipated major outflow is ${nextNeed.reason} (~${formatINR(nextNeed.amount)}) around ${nextNeed.formattedDate}.`,
      ],
      hinglishTip: `Current account me extra cash mat chhodiye. ₹${formatINR(investable).replace('₹', '')} ko Liquid Funds ya 30-Day FD me daalein jaha 6.5-7% interest mile aur zaroorat padne par 24 ghante me wapas nikal sakein.`,
    };
  } else if (safeSurplus >= 0) {
    // Moderate / Tight cushion
    return {
      status: 'caution',
      headline: `Cash reserve is balanced. Keep all ${formatINR(currentBalance)} as working capital buffer. Do not lock funds in long FDs.`,
      keepAmount: currentBalance,
      investAmount: 0,
      nextCashNeedDate: nextNeed.formattedDate,
      nextCashNeedReason: nextNeed.reason,
      advicePoints: [
        `You have a modest safe surplus of ${formatINR(safeSurplus)} above minimum requirement.`,
        `Keep all funds liquid in your operative bank account for smooth operations.`,
        `Major expense approaching: ${nextNeed.reason} around ${nextNeed.formattedDate}. Expedite pending client invoices.`,
      ],
      hinglishTip: `Abhi safe surplus kam hai. Paisa lock mat kijiye. Agla bada kharcha ${nextNeed.formattedDate} ko aayega, isliye collections fast kijiye.`,
    };
  } else {
    // Deficit / Low cash
    const deficit = Math.abs(safeSurplus);
    return {
      status: 'critical',
      headline: `Cash reserve shortfall of ${formatINR(deficit)}. Priority: Protect working capital and accelerate customer receivables.`,
      keepAmount: currentBalance > 0 ? currentBalance : 0,
      investAmount: 0,
      nextCashNeedDate: nextNeed.formattedDate,
      nextCashNeedReason: nextNeed.reason,
      advicePoints: [
        `Current balance is ${formatINR(deficit)} below your safety buffer (${formatINR(minCashRequired)}).`,
        `Runway is down to ${daysOfCashLeft} days. Follow up on overdue client invoices immediately.`,
        `Postpone discretionary equipment purchases and non-urgent supplier advance payments until balance recovers.`,
      ],
      hinglishTip: `Alert: Aapka cash minimum reserve se kam ho gaya hai. Clients ko payment reminder bhejein aur non-essential kharche 2-3 hafte ke liye hold par dalein.`,
    };
  }
}

/**
 * Generate investment suggestions based on available Safe Surplus
 */
export function getInvestmentSuggestions(safeSurplus: number): InvestmentOption[] {
  const investable = Math.max(0, safeSurplus * 0.85);

  const liquidAmount = Math.round(investable * 0.6); // 60% in liquid
  const fdAmount = Math.round(investable * 0.4); // 40% in short FD

  return [
    {
      id: 'inv-liquid',
      category: 'low_risk',
      instrument: 'Overnight & Liquid Mutual Funds',
      expectedReturn: '6.5% - 6.8% p.a.',
      lockIn: '0 to 7 days (Instant redemption up to ₹50K/day, remainder T+1)',
      suggestedAllocationPercent: 60,
      suggestedAmount: liquidAmount,
      riskDescription: 'Very low risk. Invests in short-term sovereign & AAA debt instruments.',
      liquiditySpeed: 'Instant / Next day to bank account',
    },
    {
      id: 'inv-fd',
      category: 'low_risk',
      instrument: 'Short-Term Bank Fixed Deposit (FD / Sweep-in)',
      expectedReturn: '6.8% - 7.2% p.a.',
      lockIn: '30 to 90 days (premature withdrawal penalty ~0.5%)',
      suggestedAllocationPercent: 40,
      suggestedAmount: fdAmount,
      riskDescription: 'DICGC insured up to ₹5 Lakh per bank. Guaranteed returns.',
      liquiditySpeed: 'Same-day breakable via net banking',
    },
    {
      id: 'inv-arbitrage',
      category: 'medium_risk',
      instrument: 'Arbitrage Funds (for 6+ Months Horizon)',
      expectedReturn: '7.2% - 7.6% p.a.',
      lockIn: '3 to 6 months recommended for equity taxation benefit',
      suggestedAllocationPercent: 0,
      suggestedAmount: 0,
      riskDescription: 'Low volatility, hedges cash and futures markets. Equity tax rate (20% short-term).',
      liquiditySpeed: 'T+2 working days',
    },
  ];
}

export interface CSVExportOptions {
  businessName?: string;
  includeSummaryHeader?: boolean;
  includeRunningBalance?: boolean;
  initialBalance?: number;
}

/**
 * Format CSV string from transactions for personal record keeping & accounting
 * Includes UTF-8 BOM (\uFEFF) for perfect display in Excel, Numbers, and Google Sheets
 */
export function exportTransactionsToCSV(
  transactions: Transaction[],
  options?: CSVExportOptions
): string {
  const lines: string[] = [];

  // Add metadata summary header if requested
  if (options?.includeSummaryHeader) {
    const totalInflow = transactions
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalOutflow = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const netCash = totalInflow - totalOutflow;

    lines.push(`"CashWise Financial Statement - Personal Record"`);
    if (options.businessName) {
      lines.push(`"Business / Entity:","${options.businessName.replace(/"/g, '""')}"`);
    }
    lines.push(`"Generated On:","${new Date().toLocaleString('en-IN')}"`);
    lines.push(`"Total Inflow (INR):","${totalInflow}"`);
    lines.push(`"Total Outflow (INR):","${totalOutflow}"`);
    lines.push(`"Net Operating Surplus (INR):","${netCash}"`);
    lines.push(`"Total Transaction Count:","${transactions.length}"`);
    lines.push(''); // Blank separator line
  }

  // Column Headers
  const headers = [
    'Date',
    'Type',
    'Category',
    'Description / Note',
    'Inflow Amount (INR)',
    'Outflow Amount (INR)',
    ...(options?.includeRunningBalance ? ['Running Balance (INR)'] : []),
    'Payment Channel',
    'Recurring',
    'Transaction ID',
  ];
  lines.push(headers.map((h) => `"${h}"`).join(','));

  // Sort chronologically for running balance calculation
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let runningBalance = options?.initialBalance ?? 0;

  sortedTx.forEach((tx) => {
    const inflow = tx.type === 'income' ? tx.amount : 0;
    const outflow = tx.type === 'expense' ? tx.amount : 0;
    runningBalance += inflow - outflow;

    const row = [
      `"${tx.date}"`,
      `"${tx.type.toUpperCase()}"`,
      `"${tx.category.replace(/"/g, '""')}"`,
      `"${(tx.note || '').replace(/"/g, '""')}"`,
      inflow > 0 ? inflow : '',
      outflow > 0 ? outflow : '',
      ...(options?.includeRunningBalance ? [runningBalance] : []),
      `"${tx.paymentMethod || 'UPI'}"`,
      `"${tx.isRecurring ? 'Yes' : 'No'}"`,
      `"${tx.id}"`,
    ];
    lines.push(row.join(','));
  });

  // Prepend UTF-8 Byte Order Mark (\uFEFF)
  return '\uFEFF' + lines.join('\r\n');
}

// =========================================================================
// Phase 1: Dashboard Clarity & Standardized Calculations
// =========================================================================

/**
 * Categorize financial health into standardized status tiers:
 * - 'healthy' (comfortable runway & surplus)
 * - 'watch' (moderate buffer, tightening runway)
 * - 'critical' (deficit, reserve breach, or runway < 21 days)
 */
export function getHealthStatus(metrics: CashHealthMetrics): HealthStatus {
  if (
    metrics.currentBalance < metrics.minCashRequired ||
    metrics.safeSurplus < 0 ||
    metrics.daysOfCashLeft < 21 ||
    metrics.currentBalance <= 0
  ) {
    return 'critical';
  }

  if (metrics.daysOfCashLeft < 45 || metrics.safeSurplus < 50000) {
    return 'watch';
  }

  return 'healthy';
}

/**
 * Predict next upcoming liquidity shortfall / reserve breach within 90 days.
 * Checks for both outright insolvency (balance < 0) and reserve buffer breaches (balance < minCashRequired).
 */
export function getNextShortfallInfo(
  currentBalance: number,
  minCashRequired: number,
  transactions: Transaction[],
  daysCount = 90
): ShortfallInfo {
  // If today is already negative
  if (currentBalance < 0) {
    return {
      hasShortfall: true,
      shortfallDate: new Date().toISOString().split('T')[0],
      formattedDate: 'Today (Insolvent)',
      daysUntilShortfall: 0,
      type: 'insolvency',
      shortfallAmount: Math.abs(currentBalance),
      reason: 'Operating account currently in overdraft/negative balance',
    };
  }

  // If today is already below minimum reserve
  if (currentBalance < minCashRequired) {
    return {
      hasShortfall: true,
      shortfallDate: new Date().toISOString().split('T')[0],
      formattedDate: 'Immediate',
      daysUntilShortfall: 0,
      type: 'reserve_breach',
      shortfallAmount: minCashRequired - currentBalance,
      reason: 'Balance is currently below your required safety reserve',
    };
  }

  const forecast = generateForecast(currentBalance, transactions, daysCount);

  // 1. Look for first outright cash depletion (projectedBalance < 0)
  const firstInsolvency = forecast.find((d) => d.projectedBalance < 0);

  // 2. Look for first dip below safety buffer (projectedBalance < minCashRequired)
  const firstReserveDip = forecast.find((d) => d.projectedBalance < minCashRequired);

  // If there's an insolvency or reserve breach, report the earliest risk
  if (firstReserveDip) {
    const isAlsoInsolvent = firstInsolvency && firstInsolvency.date === firstReserveDip.date;
    const isSevere = isAlsoInsolvent || (firstInsolvency && new Date(firstInsolvency.date) <= new Date(firstReserveDip.date));
    const target = isSevere ? firstInsolvency! : firstReserveDip;

    const daysUntil = Math.max(
      1,
      Math.ceil((new Date(target.date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    );

    const type = target.projectedBalance < 0 ? 'insolvency' : 'reserve_breach';
    const shortfallAmount =
      type === 'insolvency'
        ? Math.abs(target.projectedBalance)
        : minCashRequired - target.projectedBalance;

    const reason =
      type === 'insolvency'
        ? `Account projected to run out of cash on ${target.formattedDate}`
        : `Balance projected to dip below safety reserve on ${target.formattedDate}`;

    return {
      hasShortfall: true,
      shortfallDate: target.date,
      formattedDate: target.formattedDate,
      daysUntilShortfall: daysUntil,
      type,
      shortfallAmount,
      reason,
    };
  }

  // No shortfall projected in the forecast horizon
  return {
    hasShortfall: false,
    shortfallDate: null,
    formattedDate: `None in ${daysCount} days`,
    daysUntilShortfall: null,
    type: 'none',
    shortfallAmount: 0,
    reason: `Sufficient runway maintained through next ${daysCount} days without breach`,
  };
}

/**
 * Generate headline summary card in plain language.
 * Example output:
 * "Runway: 56 days. Safe surplus: ₹2.0 lakh. Next risk: balance below reserve on 14 Dec."
 */
export function generateHeadlineSummary(
  metrics: CashHealthMetrics,
  transactions: Transaction[],
  language: AppLanguage = 'en'
): HeadlineSummary {
  const status = getHealthStatus(metrics);
  const shortfall = getNextShortfallInfo(
    metrics.currentBalance,
    metrics.minCashRequired,
    transactions,
    90
  );

  // Format runway
  const runwayDisplay = metrics.daysOfCashLeft >= 999 ? '90+ days' : `${metrics.daysOfCashLeft} days`;
  const runwayHinglish = metrics.daysOfCashLeft >= 999 ? '90+ din' : `${metrics.daysOfCashLeft} din`;

  // Format surplus / deficit
  const isDeficit = metrics.safeSurplus < 0;
  const surplusAmountStr = formatCompactINR(Math.abs(metrics.safeSurplus)).replace(/^-/, '');

  let surplusEnglish = '';
  let surplusHinglish = '';

  if (isDeficit) {
    surplusEnglish = `Working capital deficit: ${surplusAmountStr}.`;
    surplusHinglish = `Deficit: ${surplusAmountStr}.`;
  } else if (metrics.safeSurplus === 0) {
    surplusEnglish = `Safe surplus: ₹0.`;
    surplusHinglish = `Safe surplus: ₹0.`;
  } else {
    surplusEnglish = `Safe surplus: ${surplusAmountStr}.`;
    surplusHinglish = `Safe surplus: ${surplusAmountStr}.`;
  }

  // Format next risk
  let riskEnglish = '';
  let riskHinglish = '';

  if (shortfall.hasShortfall) {
    if (shortfall.formattedDate === 'Immediate') {
      riskEnglish = `Next risk: balance currently below reserve.`;
      riskHinglish = `Agla risk: balance safety reserve se kam hai.`;
    } else if (shortfall.formattedDate.startsWith('Today')) {
      riskEnglish = `Next risk: immediate cash deficit today.`;
      riskHinglish = `Agla risk: account deficit me hai.`;
    } else if (shortfall.type === 'reserve_breach') {
      riskEnglish = `Next risk: balance below reserve on ${shortfall.formattedDate}.`;
      riskHinglish = `Agla risk: balance ${shortfall.formattedDate} ko reserve se kam.`;
    } else {
      riskEnglish = `Next risk: cash shortfall on ${shortfall.formattedDate}.`;
      riskHinglish = `Agla risk: ${shortfall.formattedDate} ko balance zero se kam.`;
    }
  } else {
    riskEnglish = `Next risk: no shortfall projected in next 90 days.`;
    riskHinglish = `Agla risk: agle 90 dino me koi cash khatra nahi.`;
  }

  const plainText = `Runway: ${runwayDisplay}. ${surplusEnglish} ${riskEnglish}`;
  const hinglishText = `Runway: ${runwayHinglish}. ${surplusHinglish} ${riskHinglish}`;

  return {
    plainText: language === 'hinglish' ? hinglishText : plainText,
    hinglishText,
    runwayDays: metrics.daysOfCashLeft,
    safeSurplus: metrics.safeSurplus,
    nextRiskDate: shortfall.shortfallDate,
    nextRiskFormattedDate: shortfall.formattedDate,
    nextRiskReason: shortfall.reason,
    status,
  };
}

/**
 * Standard finance term definitions used for info tooltips across the app.
 * Provides clear English definition, formula, and optional Hinglish explanation.
 */
export const FINANCE_TERMS: Record<FinanceTermKey, FinanceTermDefinition> = {
  burnRate: {
    key: 'burnRate',
    term: 'Burn Rate',
    shortLabel: 'Burn Rate',
    definition:
      'The net rate at which a company spends cash to cover operating expenses over a given period (daily or monthly).',
    formula: 'Daily Burn = Total Monthly Operating Expenses ÷ 30 Days',
    hinglish: 'Aapka business daily ya monthly kitna kharcha kar raha hai bina nayi income ke.',
    practicalTip: 'Keep daily burn rate lean to protect runway without resorting to short-term loans.',
  },
  runway: {
    key: 'runway',
    term: 'Cash Runway',
    shortLabel: 'Runway',
    definition:
      'The number of days or months your business can continue operating at current burn rate before running out of funds, assuming zero new income.',
    formula: 'Cash Runway = Current Cash Balance ÷ Average Daily Burn Rate',
    hinglish: 'Agar kal se ek rupaye ki bhi nayi income na aaye, toh maujooda balance se kitne din business chalega.',
    practicalTip: 'Indian SMEs should maintain a healthy 60 to 90 days of runway for operational resilience.',
  },
  safeSurplus: {
    key: 'safeSurplus',
    term: 'Safe Surplus',
    shortLabel: 'Safe Surplus',
    definition:
      'Cash balance remaining above your required minimum operating safety reserve. This capital is not locked in daily operations and can safely earn yield in liquid mutual funds or short FDs.',
    formula: 'Safe Surplus = Current Balance − Minimum Cash Required',
    hinglish: 'Total bank balance minus emergency buffer. Yeh extra paisa bina tension Liquid Fund ya FD me laga kar return kamaya ja sakta hai.',
    practicalTip: 'Leaving safe surplus idle in 0% interest current accounts loses value to inflation.',
  },
  dso: {
    key: 'dso',
    term: 'DSO (Days Sales Outstanding)',
    shortLabel: 'DSO',
    definition:
      'The average number of days it takes for credit sales to be collected from customers after invoicing. A lower DSO means faster cash inflow into your bank account.',
    formula: 'DSO = (Accounts Receivable ÷ Total Credit Sales) × Days in Period',
    hinglish: 'Customer ko invoice bhejne ke baad kitne dino me payment aapke bank account me aati hai.',
    practicalTip: 'Offering 1-2% early payment discounts can trim DSO by 10 to 15 days.',
  },
  capex: {
    key: 'capex',
    term: 'CapEx (Capital Expenditure)',
    shortLabel: 'CapEx',
    definition:
      'Funds spent to acquire, upgrade, or maintain physical long-term assets such as machinery, computers, servers, vehicles, or premises.',
    formula: 'CapEx = Purchases of Property, Equipment, and Long-Term Assets',
    hinglish: 'Bade aur lambe samay ke assets (computers, machine, office renovation) par kharcha.',
    practicalTip: 'Postpone discretionary CapEx whenever your cash runway drops below 45 days.',
  },
  minReserve: {
    key: 'minReserve',
    term: 'Minimum Cash Reserve',
    shortLabel: 'Min Reserve',
    definition:
      'A non-negotiable safety cash buffer set aside to cover critical commitments (salaries, office rent, GST, vendor dues) even during severe revenue collection delays.',
    formula: 'Recommended: 3 Months × Average Monthly Operating Expenses',
    hinglish: 'Woh zaruri emergency buffer jo har halat me bank me rehna chahiye taaki salary aur rent kabhi na ruke.',
    practicalTip: 'Never lock minimum reserve funds in long-tenure investments with exit barriers.',
  },
  currentBalance: {
    key: 'currentBalance',
    term: 'Current Balance',
    shortLabel: 'Current Balance',
    definition:
      'Total liquid funds immediately accessible in operative bank current accounts, cash reserves, and liquid equivalents.',
    formula: 'Current Balance = Starting Balance + Total Inflows − Total Outflows',
    hinglish: 'Sabhi business bank accounts me maujood total liquid cash jo turant use kiya ja sakta hai.',
    practicalTip: 'Reconcile ledger deposits and disbursements weekly against bank statements.',
  },
  workingCapital: {
    key: 'workingCapital',
    term: 'Working Capital',
    shortLabel: 'Working Capital',
    definition:
      'The operational liquidity available to fund day-to-day business operations and manage the timing gap between expenses and customer collections.',
    formula: 'Working Capital = Operating Cash Inflows − Operating Commitments',
    hinglish: 'Rozmarra ke business operations chalane ke liye zaroori cash.',
    practicalTip: 'Monitoring cash flow weekly prevents unexpected working capital bottlenecks.',
  },
};

/**
 * Generate context-aware "Recommended Next Action" card for each screen.
 * Answers "What should the finance manager/founder do next?"
 */
export function getRecommendedNextAction(
  view: 'dashboard' | 'cashflow' | 'forecast' | 'vault3d',
  metrics: CashHealthMetrics,
  _language: AppLanguage = 'en'
): RecommendedAction {
  const status = getHealthStatus(metrics);

  switch (view) {
    case 'dashboard':
      if (status === 'critical') {
        return {
          id: 'action-dashboard-critical',
          title: 'Accelerate Invoice Collections & Defer Non-Urgent CapEx',
          description: `Current balance is below your safety buffer (${formatINR(metrics.minCashRequired)}). Prioritize calling overdue client debtors and hold all non-essential vendor advances.`,
          hinglishDescription: `Balance safety buffer se kam hai. Overdue client invoices follow up karein aur bade kharche 2 hafte ke liye postpone karein.`,
          actionLabel: 'Review Cash Flow Ledger',
          actionView: 'cashflow',
          priority: 'high',
          category: 'receivables',
        };
      }
      if (status === 'watch') {
        return {
          id: 'action-dashboard-watch',
          title: 'Review Upcoming Monthly Commitments',
          description: `You have ${metrics.daysOfCashLeft} days of runway. Verify scheduled payroll and rent due within the next 15 days to prevent reserve dips.`,
          hinglishDescription: `${metrics.daysOfCashLeft} din ka runway hai. Agle 15 dino me hone wale salary aur rent kharche check karke reserve safe rakhein.`,
          actionLabel: 'Open Forecast Simulator',
          actionView: 'forecast',
          priority: 'medium',
          category: 'reserve',
        };
      }
      return {
        id: 'action-dashboard-healthy',
        title: 'Deploy Safe Surplus into Overnight Liquid Funds',
        description: `You have ${formatINR(metrics.safeSurplus)} in safe surplus earning 0% in your current account. Deploy into liquid funds yielding ~6.8% with instant T+1 liquidity.`,
        hinglishDescription: `Aapke paas ${formatINR(metrics.safeSurplus)} ka safe surplus hai. Ise Liquid Fund me daal kar 6.8% return kama sakte hain.`,
        actionLabel: 'Explore Allocation Blueprint',
        actionView: 'forecast',
        priority: 'low',
        category: 'surplus',
      };

    case 'cashflow':
      return {
        id: 'action-cashflow-reconcile',
        title: 'Set Minimum Reserve to 3 Months of Operating Spend',
        description: `Based on your monthly average burn of ${formatINR(metrics.monthlyAverageExpense)}, standard Indian SME practice recommends maintaining a safety buffer of ${formatINR(metrics.recommendedReserve)}.`,
        hinglishDescription: `Mahine ka kharcha ${formatINR(metrics.monthlyAverageExpense)} hai. 3 mahine ke hisab se ${formatINR(metrics.recommendedReserve)} safety buffer set karein.`,
        actionLabel: 'Apply 3-Month Recommended Reserve',
        actionView: 'cashflow',
        priority: 'medium',
        category: 'reserve',
      };

    case 'forecast':
      return {
        id: 'action-forecast-stress-test',
        title: 'Stress-Test Liquidity Against 15-Day Payment Delays',
        description:
          'Simulate what happens if your top 3 clients delay invoices by 15-30 days to ensure your working capital never breaches minimum reserve.',
        hinglishDescription:
          'What-If simulator me 15-din client payment delay test karein taaki advance me pata chale buffer safe rahega ya nahi.',
        actionLabel: 'Simulate Customer Payment Delay',
        actionView: 'forecast',
        priority: 'medium',
        category: 'receivables',
      };

    case 'vault3d':
      return {
        id: 'action-vault-audit',
        title: 'Audit Vault Reserve Ingot Ratio',
        description:
          'Your 3D vault visualizes the ratio between non-negotiable reserve bars (blue) and investable surplus bars (gold). Maintain at least 60% in reserve buffer.',
        hinglishDescription:
          '3D vault me blue (safety buffer) aur gold (surplus) ingots ka proportion check karein.',
        actionLabel: 'Return to Executive Dashboard',
        actionView: 'dashboard',
        priority: 'low',
        category: 'reserve',
      };
  }
}

// =========================================================================
// Phase 2: Multiple Bank Accounts & Cash Position Aggregation
// =========================================================================

/**
 * Generate default bank accounts for Indian SME setup
 */
export function createDefaultAccounts(initialBalance = 350000): BankAccount[] {
  return [
    {
      id: 'acc-primary',
      name: 'Primary Operating Current A/c',
      bankName: 'HDFC Bank',
      accountType: 'current',
      accountNumberMasked: '•••• 4092',
      initialBalance,
      isDefault: true,
      color: '#10b981', // Emerald
      createdAt: new Date().toISOString(),
    },
    {
      id: 'acc-reserve',
      name: 'Tax & Reserve Savings A/c',
      bankName: 'ICICI Bank',
      accountType: 'savings',
      accountNumberMasked: '•••• 8821',
      initialBalance: 0,
      isDefault: false,
      color: '#3b82f6', // Blue
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Calculate per-account balances and consolidated total cash position.
 * Existing transactions without accountId are automatically attributed to the default account.
 */
export function calculateTotalCashPosition(
  accounts: BankAccount[],
  transactions: Transaction[]
): TotalCashPosition {
  const safeAccounts = accounts.length > 0 ? accounts : createDefaultAccounts();
  const defaultAccount = safeAccounts.find((a) => a.isDefault) || safeAccounts[0];

  const breakdownMap = new Map<
    string,
    { currentBalance: number; totalInflow: number; totalOutflow: number; count: number }
  >();

  safeAccounts.forEach((acc) => {
    breakdownMap.set(acc.id, {
      currentBalance: acc.initialBalance,
      totalInflow: 0,
      totalOutflow: 0,
      count: 0,
    });
  });

  transactions.forEach((tx) => {
    const accId = tx.accountId && breakdownMap.has(tx.accountId) ? tx.accountId : defaultAccount.id;
    const stats = breakdownMap.get(accId)!;
    stats.count += 1;

    if (tx.type === 'income') {
      stats.totalInflow += tx.amount;
      stats.currentBalance += tx.amount;
    } else {
      stats.totalOutflow += tx.amount;
      stats.currentBalance -= tx.amount;
    }
  });

  const accountBreakdown: AccountBalanceSummary[] = safeAccounts.map((account) => {
    const stats = breakdownMap.get(account.id)!;
    return {
      account,
      currentBalance: stats.currentBalance,
      totalInflow: stats.totalInflow,
      totalOutflow: stats.totalOutflow,
      transactionCount: stats.count,
    };
  });

  const totalBalance = accountBreakdown.reduce((sum, item) => sum + item.currentBalance, 0);
  const totalInitialBalance = safeAccounts.reduce((sum, item) => sum + item.initialBalance, 0);
  const totalInflow = accountBreakdown.reduce((sum, item) => sum + item.totalInflow, 0);
  const totalOutflow = accountBreakdown.reduce((sum, item) => sum + item.totalOutflow, 0);

  return {
    totalBalance,
    totalInitialBalance,
    totalInflow,
    totalOutflow,
    accountBreakdown,
  };
}

// =========================================================================
// Phase 2: CSV / Excel Import Tokenizer, Parser & Per-Row Validator
// Shared identically between client preview and Express server endpoint
// =========================================================================

/**
 * Tokenize CSV text into 2D array of rows and columns.
 * Supports quotes, commas inside quotes, CRLF/LF line breaks, and BOM stripping.
 */
export function parseCSVLines(rawCSV: string): string[][] {
  const cleanCSV = rawCSV.replace(/^\uFEFF/, '').trim();
  if (!cleanCSV) return [];

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < cleanCSV.length; i++) {
    const char = cleanCSV[i];
    const nextChar = cleanCSV[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \r\n
      }
      currentRow.push(currentField.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentField = '';
    } else {
      currentField += char;
    }
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Normalize bank dates into standard YYYY-MM-DD
 */
export function normalizeDateString(rawDate: string): string | null {
  if (!rawDate) return null;
  const clean = rawDate.trim().replace(/[/\.]/g, '-');

  // Check YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(clean)) {
    const [y, m, d] = clean.split('-');
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const testDate = new Date(iso);
    return isNaN(testDate.getTime()) ? null : iso;
  }

  // Check DD-MM-YYYY (Standard Indian bank statement format)
  if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(clean)) {
    const [d, m, y] = clean.split('-');
    const iso = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    const testDate = new Date(iso);
    return isNaN(testDate.getTime()) ? null : iso;
  }

  // Check generic parse
  const parsed = new Date(rawDate);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }

  return null;
}

/**
 * Sanitize currency number strings (removes ₹, $, commas, spaces)
 */
export function cleanCurrencyAmount(rawAmount: any): number {
  if (typeof rawAmount === 'number') return isFinite(rawAmount) ? rawAmount : 0;
  if (!rawAmount || typeof rawAmount !== 'string') return 0;
  const cleaned = rawAmount.replace(/[₹$,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) || !isFinite(val) ? 0 : Math.abs(val);
}

const KNOWN_CATEGORIES = ALL_TRANSACTION_CATEGORIES;

/**
 * Smart category matcher from transaction description / narration
 */
export function inferTransactionCategory(
  narration: string,
  type: TransactionType
): TransactionCategory {
  const text = narration.toLowerCase();

  if (type === 'income') {
    if (text.includes('client') || text.includes('invoice') || text.includes('receivable')) return 'Client Payment';
    if (text.includes('sale') || text.includes('pos') || text.includes('order')) return 'Product Sales';
    if (text.includes('consult') || text.includes('retainer') || text.includes('service')) return 'Consulting / Services';
    return 'Other Inflow';
  } else {
    if (text.includes('salary') || text.includes('payroll') || text.includes('stipend')) return 'Staff Salaries';
    if (text.includes('rent') || text.includes('cowork') || text.includes('wework')) return 'Office Rent';
    if (text.includes('gst') || text.includes('tax') || text.includes('tds')) return 'Taxes & GST';
    if (text.includes('vendor') || text.includes('supplier') || text.includes('raw material')) return 'Vendor / Supplier';
    if (text.includes('inventory') || text.includes('stock')) return 'Inventory / Stock';
    if (text.includes('aws') || text.includes('cloud') || text.includes('software') || text.includes('saas') || text.includes('google')) return 'Software & SaaS';
    if (text.includes('ad') || text.includes('meta') || text.includes('facebook') || text.includes('marketing')) return 'Marketing & Ads';
    if (text.includes('wifi') || text.includes('electric') || text.includes('power') || text.includes('utility')) return 'Utilities & Wifi';
    if (text.includes('shipping') || text.includes('courier') || text.includes('delhivery')) return 'Logistics & Shipping';
    return 'Miscellaneous Expense';
  }
}

/**
 * Validate and parse CSV statement rows into ready-to-import transactions.
 * Returns parsed rows, detected headers, and per-row error messages.
 */
export function parseAndValidateCSV(
  rawCSV: string,
  mapping: CSVColumnMapping,
  defaultAccountId = 'acc-primary'
): CSVParseValidationResponse {
  const table = parseCSVLines(rawCSV);
  if (table.length < 2) {
    return {
      totalRows: 0,
      validCount: 0,
      errorCount: 0,
      totalInflow: 0,
      totalOutflow: 0,
      rows: [],
      detectedHeaders: table[0] || [],
    };
  }

  const headers = table[0].map((h) => h.trim());
  const headerIndices: Record<string, number> = {};
  headers.forEach((h, idx) => {
    headerIndices[h] = idx;
    headerIndices[h.toLowerCase()] = idx;
  });

  const getColVal = (row: string[], colName?: string): string => {
    if (!colName) return '';
    const idx = headerIndices[colName] ?? headerIndices[colName.toLowerCase()];
    return idx !== undefined && row[idx] !== undefined ? row[idx].trim() : '';
  };

  const parsedRows: ParsedImportRow[] = [];
  let validCount = 0;
  let errorCount = 0;
  let totalInflow = 0;
  let totalOutflow = 0;

  for (let r = 1; r < table.length; r++) {
    const row = table[r];
    if (row.length === 0 || row.every((c) => c.trim() === '')) {
      continue; // skip blank rows
    }

    const rawRowDict: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rawRowDict[h] = row[idx] || '';
    });

    const rawDate = getColVal(row, mapping.dateColumn);
    const rawDesc = getColVal(row, mapping.descriptionColumn);
    const rawDebit = mapping.debitColumn ? getColVal(row, mapping.debitColumn) : '';
    const rawCredit = mapping.creditColumn ? getColVal(row, mapping.creditColumn) : '';
    const rawAmount = mapping.amountColumn ? getColVal(row, mapping.amountColumn) : '';
    const rawType = mapping.typeColumn ? getColVal(row, mapping.typeColumn) : '';
    const rawCategory = mapping.categoryColumn ? getColVal(row, mapping.categoryColumn) : '';

    // Validation 1: Date
    const isoDate = normalizeDateString(rawDate);
    if (!isoDate) {
      parsedRows.push({
        rowIndex: r,
        rawRow: rawRowDict,
        isValid: false,
        error: `Row ${r}: Invalid date "${rawDate}". Expected YYYY-MM-DD or DD/MM/YYYY.`,
      });
      errorCount++;
      continue;
    }

    // Validation 2: Description
    const note = rawDesc || 'Bank Transaction';
    if (note.length > 500) {
      parsedRows.push({
        rowIndex: r,
        rawRow: rawRowDict,
        isValid: false,
        error: `Row ${r}: Description exceeds maximum length (500 chars).`,
      });
      errorCount++;
      continue;
    }

    // Validation 3: Amounts & Type
    let txType: TransactionType = 'expense';
    let amount = 0;

    if (mapping.debitColumn || mapping.creditColumn) {
      const debitVal = cleanCurrencyAmount(rawDebit);
      const creditVal = cleanCurrencyAmount(rawCredit);

      if (creditVal > 0 && debitVal === 0) {
        txType = 'income';
        amount = creditVal;
      } else if (debitVal > 0 && creditVal === 0) {
        txType = 'expense';
        amount = debitVal;
      } else if (creditVal > 0 && debitVal > 0) {
        // If both columns populated, pick higher or debit
        txType = creditVal > debitVal ? 'income' : 'expense';
        amount = Math.max(creditVal, debitVal);
      }
    } else if (mapping.amountColumn) {
      const parsedAmt = cleanCurrencyAmount(rawAmount);
      const lowerType = rawType.toLowerCase();

      if (lowerType.includes('cr') || lowerType.includes('dep') || lowerType.includes('in')) {
        txType = 'income';
      } else if (lowerType.includes('dr') || lowerType.includes('with') || lowerType.includes('out')) {
        txType = 'expense';
      } else if (rawAmount.includes('+')) {
        txType = 'income';
      } else if (rawAmount.includes('-')) {
        txType = 'expense';
      }

      amount = parsedAmt;
    }

    if (amount <= 0) {
      parsedRows.push({
        rowIndex: r,
        rawRow: rawRowDict,
        isValid: false,
        error: `Row ${r}: Transaction amount must be greater than zero.`,
      });
      errorCount++;
      continue;
    }

    // Validation 4: Category
    let category: TransactionCategory;
    const matchedCategory = KNOWN_CATEGORIES.find(
      (c) => c.toLowerCase() === rawCategory.toLowerCase()
    );
    if (matchedCategory) {
      category = matchedCategory;
    } else {
      category = inferTransactionCategory(note, txType);
    }

    // Row is valid
    const parsedTx: Omit<Transaction, 'id'> = {
      date: isoDate,
      type: txType,
      amount,
      category,
      note,
      accountId: defaultAccountId,
      paymentMethod: 'NEFT / RTGS',
    };

    if (txType === 'income') {
      totalInflow += amount;
    } else {
      totalOutflow += amount;
    }

    validCount++;
    parsedRows.push({
      rowIndex: r,
      rawRow: rawRowDict,
      isValid: true,
      parsedTransaction: parsedTx,
    });
  }

  return {
    totalRows: table.length - 1,
    validCount,
    errorCount,
    totalInflow,
    totalOutflow,
    rows: parsedRows,
    detectedHeaders: headers,
  };
}

// ==========================================
// Phase 3: Presets, Upcoming Flows & Calculations
// ==========================================

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'delayed-receivable-30d',
    title: 'Biggest client pays 30 days late',
    tagline: '30-Day Collections Freeze',
    description: 'Models a 30-day delay in customer invoice clearances and delays planned expected receivables.',
    icon: 'Clock',
    badgeColor: 'amber',
    scenario: {
      incomeChangePercent: 0,
      expenseChangePercent: 0,
      receivableDelayDays: 30,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
    },
  },
  {
    id: 'sales-drop-30pct',
    title: 'Sales drop 30%',
    tagline: 'Demand Contraction',
    description: 'Models an immediate 30% sustained slump in monthly client revenue and cash inflows.',
    icon: 'TrendingDown',
    badgeColor: 'rose',
    scenario: {
      incomeChangePercent: -30,
      expenseChangePercent: 0,
      receivableDelayDays: 0,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
    },
  },
  {
    id: 'one-time-expense',
    title: 'One-time expense (₹1,50,000)',
    tagline: 'Surprise Outflow',
    description: 'Simulates an urgent equipment replacement, machinery breakdown, or tax advance payment of ₹1.5L.',
    icon: 'AlertCircle',
    badgeColor: 'purple',
    scenario: {
      incomeChangePercent: 0,
      expenseChangePercent: 0,
      receivableDelayDays: 0,
      oneTimeExpenseAmount: 150000,
      oneTimeExpenseDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    },
  },
  {
    id: 'cost-cut-20pct',
    title: 'Cost cutting mode (-20% expenses)',
    tagline: 'Overhead Rationalization',
    description: 'Cuts discretionary software, negotiates supplier rates, and pares operational burn by 20%.',
    icon: 'Scissors',
    badgeColor: 'blue',
    scenario: {
      incomeChangePercent: 0,
      expenseChangePercent: -20,
      receivableDelayDays: 0,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
    },
  },
  {
    id: 'combined-crisis',
    title: 'Combined crisis (Sales -25% & 45D delay)',
    tagline: 'Severe Liquidity Crunch',
    description: 'Stress-tests solvency if market headwinds reduce revenue by 25% while receivables stall 45 days.',
    icon: 'Flame',
    badgeColor: 'red',
    scenario: {
      incomeChangePercent: -25,
      expenseChangePercent: 5,
      receivableDelayDays: 45,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
    },
  },
  {
    id: 'growth-expansion',
    title: 'Growth expansion (+30% sales, +15% spend)',
    tagline: 'Scale & Festive Surge',
    description: 'Simulates festive seasonal volume: sales increase by 30% alongside a 15% bump in fulfillment costs.',
    icon: 'Sparkles',
    badgeColor: 'emerald',
    scenario: {
      incomeChangePercent: 30,
      expenseChangePercent: 15,
      receivableDelayDays: 0,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
    },
  },
];

/**
 * Seed realistic default upcoming cash payments and receipts for an Indian SME
 */
export function createDefaultUpcomingCashFlows(primaryAccountId = 'acc-primary'): UpcomingCashFlow[] {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Helper to format ISO date
  const makeDate = (day: number, monthOffset = 0) => {
    const d = new Date(currentYear, currentMonth + monthOffset, day);
    return d.toISOString().split('T')[0];
  };

  return [
    {
      id: 'flow-payroll-1',
      title: 'Monthly Staff Payroll & Salaries',
      category: 'payroll',
      amount: 145000,
      type: 'expense',
      dueDate: makeDate(1, now.getDate() > 1 ? 1 : 0),
      recurrence: 'monthly',
      status: 'pending',
      accountId: primaryAccountId,
      notes: 'Net salaries for 6 core team members',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'flow-rent-1',
      title: 'Office Space Lease & High-Speed Internet',
      category: 'rent',
      amount: 45000,
      type: 'expense',
      dueDate: makeDate(10, now.getDate() > 10 ? 1 : 0),
      recurrence: 'monthly',
      status: 'pending',
      accountId: primaryAccountId,
      notes: 'Coworking space lease + broadband clearance',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'flow-gst-1',
      title: 'GST Monthly Tax Filing (GSTR-3B)',
      category: 'gst',
      amount: 62000,
      type: 'expense',
      dueDate: makeDate(20, now.getDate() > 20 ? 1 : 0),
      recurrence: 'monthly',
      status: 'pending',
      accountId: primaryAccountId,
      notes: 'Net GST liability after Input Tax Credit (ITC)',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'flow-vendor-1',
      title: 'Raw Material Supplier Clearance',
      category: 'vendor_invoice',
      amount: 75000,
      type: 'expense',
      dueDate: makeDate(25, now.getDate() > 25 ? 1 : 0),
      recurrence: 'monthly',
      status: 'pending',
      accountId: primaryAccountId,
      notes: 'Net-30 supplier invoice payment',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'flow-receivable-1',
      title: 'Alpha Corp Project Milestone 2 Clearance',
      category: 'expected_receivable',
      amount: 280000,
      type: 'income',
      dueDate: makeDate(18, now.getDate() > 18 ? 1 : 0),
      recurrence: 'none',
      status: 'pending',
      accountId: primaryAccountId,
      notes: 'Contractual payment milestone approved by client',
      createdAt: new Date().toISOString(),
    },
  ];
}

/**
 * Compare two scenarios side-by-side on the same timeline with a plain-language summary line
 */
export function compareTwoScenarios(
  scenarioA: SavedScenario,
  scenarioB: SavedScenario,
  startingBalance: number,
  transactions: Transaction[],
  daysCount = 60,
  minCashRequired = 300000,
  upcomingCashFlows?: UpcomingCashFlow[]
): ScenarioComparisonResult {
  const forecastA = generateForecast(
    startingBalance,
    transactions,
    daysCount,
    scenarioA.scenario,
    upcomingCashFlows
  );

  const forecastB = generateForecast(
    startingBalance,
    transactions,
    daysCount,
    scenarioB.scenario,
    upcomingCashFlows
  );

  const endingA = forecastA[forecastA.length - 1]?.projectedBalance ?? startingBalance;
  const endingBalanceA = scenarioA.isBaseCase
    ? endingA
    : (forecastA[forecastA.length - 1]?.scenarioBalance ?? endingA);

  const endingB = forecastB[forecastB.length - 1]?.projectedBalance ?? startingBalance;
  const endingBalanceB = scenarioB.isBaseCase
    ? endingB
    : (forecastB[forecastB.length - 1]?.scenarioBalance ?? endingB);

  const endingBalanceDelta = endingBalanceB - endingBalanceA;

  // Find first day balance dips below zero (Insolvency)
  const shortfallA = forecastA.find((d) =>
    (scenarioA.isBaseCase ? d.projectedBalance : (d.scenarioBalance ?? d.projectedBalance)) < 0
  );
  const shortfallB = forecastB.find((d) =>
    (scenarioB.isBaseCase ? d.projectedBalance : (d.scenarioBalance ?? d.projectedBalance)) < 0
  );

  // Find first day balance dips below minimum safety reserve
  const reserveDipA = forecastA.find((d) =>
    (scenarioA.isBaseCase ? d.projectedBalance : (d.scenarioBalance ?? d.projectedBalance)) < minCashRequired
  );
  const reserveDipB = forecastB.find((d) =>
    (scenarioB.isBaseCase ? d.projectedBalance : (d.scenarioBalance ?? d.projectedBalance)) < minCashRequired
  );

  const today = new Date();
  const getDaysDiff = (dateStr: string | null) => {
    if (!dateStr) return null;
    const diff = Math.ceil((new Date(dateStr).getTime() - today.getTime()) / (1000 * 3600 * 24));
    return Math.max(0, diff);
  };

  const daysToInsolvencyA = shortfallA ? getDaysDiff(shortfallA.date) : null;
  const daysToInsolvencyB = shortfallB ? getDaysDiff(shortfallB.date) : null;
  const daysToReserveBreachA = reserveDipA ? getDaysDiff(reserveDipA.date) : null;
  const daysToReserveBreachB = reserveDipB ? getDaysDiff(reserveDipB.date) : null;

  // Determine overall verdict
  let verdict: 'better' | 'worse' | 'neutral' | 'critical' = 'neutral';
  if (shortfallB && !shortfallA) {
    verdict = 'critical';
  } else if (reserveDipB && !reserveDipA) {
    verdict = 'worse';
  } else if (endingBalanceDelta < -50000) {
    verdict = 'worse';
  } else if (endingBalanceDelta > 50000) {
    verdict = 'better';
  }

  // Generate plain-language result line
  let plainLanguageSummary = '';
  let hinglishSummary = '';
  const nameA = scenarioA.name;
  const nameB = scenarioB.name;

  if (shortfallB && !shortfallA) {
    const deficitAmount = Math.abs(
      scenarioB.isBaseCase ? (shortfallB.projectedBalance) : (shortfallB.scenarioBalance ?? shortfallB.projectedBalance)
    );
    plainLanguageSummary = `Under "${nameB}", cash reserves run completely dry on ${shortfallB.formattedDate} (Day ${daysToInsolvencyB}) with an estimated ${formatINR(deficitAmount)} cash deficit, whereas "${nameA}" remains solvent through Day ${daysCount} with ${formatINR(endingBalanceA)}.`;
    hinglishSummary = `"${nameB}" scenario mein cash ${shortfallB.formattedDate} (Day ${daysToInsolvencyB}) ko khatam ho jayega (${formatINR(deficitAmount)} ka shortfall), jabki "${nameA}" Day ${daysCount} tak ${formatINR(endingBalanceA)} ke sath safe rehta hai.`;
  } else if (reserveDipB && !reserveDipA) {
    plainLanguageSummary = `Under "${nameB}", cash dips below your ${formatINR(minCashRequired)} safety buffer on ${reserveDipB.formattedDate} (Day ${daysToReserveBreachB}) leaving ${formatINR(endingBalanceB)} at Day ${daysCount}, while "${nameA}" stays safely buffered throughout.`;
    hinglishSummary = `"${nameB}" scenario mein cash ${reserveDipB.formattedDate} ko aapke safety buffer se kam ho jayega, jabki "${nameA}" poore time reserve ke upar rehta hai.`;
  } else if (endingBalanceDelta < 0) {
    plainLanguageSummary = `"${nameB}" ends Day ${daysCount} with ${formatINR(endingBalanceB)} (${formatINR(Math.abs(endingBalanceDelta))} less cash than "${nameA}" at ${formatINR(endingBalanceA)}).`;
    hinglishSummary = `"${nameB}" Day ${daysCount} par ${formatINR(endingBalanceB)} par rahega, jo "${nameA}" ke ${formatINR(endingBalanceA)} se ${formatINR(Math.abs(endingBalanceDelta))} kam hai.`;
  } else if (endingBalanceDelta > 0) {
    plainLanguageSummary = `"${nameB}" delivers a stronger cash buffer, finishing Day ${daysCount} at ${formatINR(endingBalanceB)} (+${formatINR(endingBalanceDelta)} higher than "${nameA}").`;
    hinglishSummary = `"${nameB}" Day ${daysCount} par ${formatINR(endingBalanceB)} pahuchta hai, jo "${nameA}" se +${formatINR(endingBalanceDelta)} zyada cash create karta hai.`;
  } else {
    plainLanguageSummary = `"${nameA}" and "${nameB}" follow identical financial trajectories, both ending with ${formatINR(endingBalanceA)} at Day ${daysCount}.`;
    hinglishSummary = `Dono scenarios ka cash flow ek jaisa hai, Day ${daysCount} par ${formatINR(endingBalanceA)}.`;
  }

  return {
    scenarioA,
    scenarioB,
    forecastA,
    forecastB,
    endingBalanceA: Math.round(endingBalanceA),
    endingBalanceB: Math.round(endingBalanceB),
    endingBalanceDelta: Math.round(endingBalanceDelta),
    shortfallDateA: shortfallA?.date ?? null,
    shortfallDateB: shortfallB?.date ?? null,
    reserveDipDateA: reserveDipA?.date ?? null,
    reserveDipDateB: reserveDipB?.date ?? null,
    daysToReserveBreachA,
    daysToReserveBreachB,
    daysToInsolvencyA,
    daysToInsolvencyB,
    plainLanguageSummary,
    hinglishSummary,
    verdict,
  };
}

// ==========================================
// Phase 3: "How is this calculated?" Explanations
// Generated directly from the same math functions
// ==========================================

export function explainCurrentBalance(
  initialBalance: number,
  transactions: Transaction[],
  accounts?: BankAccount[]
): MetricCalculationExplanation {
  let totalInflow = 0;
  let totalOutflow = 0;

  transactions.forEach((tx) => {
    if (tx.type === 'income') totalInflow += tx.amount;
    else totalOutflow += tx.amount;
  });

  const totalCalculated = initialBalance + totalInflow - totalOutflow;
  const accountsCount = accounts && accounts.length > 0 ? accounts.length : 1;

  const inputs: MetricInputBreakdown[] = [
    {
      label: 'Verified Opening Balance',
      value: formatINR(initialBalance),
      numericValue: initialBalance,
      description: 'Baseline cash set during initial wizard setup or sum of bank accounts',
      source: 'UserSettings / BankAccounts',
    },
    {
      label: 'Total Inflow (Receipts)',
      value: `+${formatINR(totalInflow)}`,
      numericValue: totalInflow,
      description: `Sum of all verified customer payments & receipts (${transactions.filter((t) => t.type === 'income').length} entries)`,
      source: 'Transactions collection',
    },
    {
      label: 'Total Outflow (Disbursements)',
      value: `-${formatINR(totalOutflow)}`,
      numericValue: totalOutflow,
      description: `Sum of all vendor invoices, salaries, rent & taxes (${transactions.filter((t) => t.type === 'expense').length} entries)`,
      source: 'Transactions collection',
    },
    {
      label: 'Active Connected Accounts',
      value: `${accountsCount} Account${accountsCount > 1 ? 's' : ''}`,
      numericValue: accountsCount,
      description: 'Operative bank accounts tracked in CashWise',
      source: 'Accounts collection',
    },
  ];

  return {
    metricKey: 'currentBalance',
    title: 'Current Available Cash (Liquid Position)',
    formulaName: 'Net Liquid Cash Equation',
    formulaDisplay: 'Current Balance = Opening Balance + Total Inflow - Total Outflow',
    inputs,
    computationSteps: [
      `1. Opening Balance Baseline = ${formatINR(initialBalance)}`,
      `2. Add Cumulative Inflows = +${formatINR(totalInflow)}`,
      `3. Subtract Cumulative Outflows = -${formatINR(totalOutflow)}`,
      `4. Arithmetic: ${formatINR(initialBalance)} + ${formatINR(totalInflow)} - ${formatINR(totalOutflow)} = ${formatINR(totalCalculated)}`,
    ],
    finalResultFormatted: formatINR(totalCalculated),
    interpretation:
      totalCalculated >= 0
        ? `You have ${formatINR(totalCalculated)} immediately accessible across your ${accountsCount} operative accounts for day-to-day settlements.`
        : `Negative cash position of ${formatINR(totalCalculated)}. Your business is currently operating on an overdraft or credit buffer.`,
    actionableTip:
      'Reconcile weekly against your actual net-banking statements to prevent accounting drift from unrecorded bank charges.',
    hinglishExplanation:
      `Yeh aapke sabhi bank accounts ka live liquid balance hai: Opening Balance (${formatINR(initialBalance)}) + Inflow (${formatINR(totalInflow)}) - Outflow (${formatINR(totalOutflow)}) = ${formatINR(totalCalculated)}.`,
  };
}

export function explainRunway(
  currentBalance: number,
  avgDailyExpense: number,
  avgDailyIncome: number,
  daysSpan: number
): MetricCalculationExplanation {
  const runwayDays =
    currentBalance <= 0
      ? 0
      : avgDailyExpense <= 0
      ? 999
      : Math.round(currentBalance / avgDailyExpense);

  const inputs: MetricInputBreakdown[] = [
    {
      label: 'Current Liquid Cash',
      value: formatINR(currentBalance),
      numericValue: currentBalance,
      description: 'Immediately accessible liquid capital in operating accounts',
      source: 'calculateCashHealth / Accounts',
    },
    {
      label: 'Average Daily Outflow (Burn Rate)',
      value: `${formatINR(avgDailyExpense)}/day`,
      numericValue: avgDailyExpense,
      description: `Calculated across the latest ${daysSpan}-day transaction sample`,
      source: 'Total Expense ÷ Days Span',
    },
    {
      label: 'Average Daily Inflow',
      value: `${formatINR(avgDailyIncome)}/day`,
      numericValue: avgDailyIncome,
      description: 'Normalized daily customer collection pace',
      source: 'Total Inflow ÷ Days Span',
    },
    {
      label: 'Net Daily Burn',
      value: `${formatINR(avgDailyExpense - avgDailyIncome)}/day`,
      numericValue: avgDailyExpense - avgDailyIncome,
      description: 'Daily cash drain rate after accounting for regular inflows',
      source: 'Daily Outflow - Daily Inflow',
    },
  ];

  return {
    metricKey: 'runway',
    title: 'Cash Runway (Days of Survival)',
    formulaName: 'Runway Velocity Formula',
    formulaDisplay: 'Runway (Days) = Current Liquid Cash ÷ Average Daily Outflow',
    inputs,
    computationSteps: [
      `1. Available Liquid Cash = ${formatINR(currentBalance)}`,
      `2. Average Daily Burn Rate = ${formatINR(avgDailyExpense)} per calendar day`,
      `3. Division: ${formatINR(currentBalance)} ÷ ${formatINR(avgDailyExpense)} = ${(currentBalance / (avgDailyExpense || 1)).toFixed(1)} Days`,
      `4. Rounded Result: ${runwayDays >= 999 ? '90+ Days' : `${runwayDays} Days`}`,
    ],
    finalResultFormatted: runwayDays >= 999 ? '90+ Days' : `${runwayDays} Days`,
    interpretation:
      runwayDays >= 60
        ? `Healthy runway! Your business can comfortably cover operational commitments for ~${runwayDays} days without urgent external funding.`
        : runwayDays >= 30
        ? `Moderate runway (~${runwayDays} days). Keep a close watch on pending client invoices to avoid tightening.`
        : `Critical runway! Only ${runwayDays} days of operating cash remaining. Accelerate receivables and defer non-critical capital expenses.`,
    actionableTip:
      'SMEs should ideally maintain a minimum of 45-60 days of runway to insulate against payment delays and supply chain friction.',
    hinglishExplanation:
      `Aapke paas ${formatINR(currentBalance)} cash hai aur roz ka kharcha lagbhag ${formatINR(avgDailyExpense)} hai. Bina kisi naye inflow ke aapka business lagbhag ${runwayDays} din chal sakta hai.`,
  };
}

export function explainSafeSurplus(
  currentBalance: number,
  minCashRequired: number
): MetricCalculationExplanation {
  const safeSurplus = currentBalance - minCashRequired;
  const isDeficit = safeSurplus < 0;

  const inputs: MetricInputBreakdown[] = [
    {
      label: 'Current Liquid Balance',
      value: formatINR(currentBalance),
      numericValue: currentBalance,
      description: 'Total liquid balance currently in verified accounts',
      source: 'TotalCashPosition / Metrics',
    },
    {
      label: 'Minimum Safety Reserve',
      value: formatINR(minCashRequired),
      numericValue: minCashRequired,
      description: 'Mandatory untouchable emergency buffer for payroll & statutory taxes',
      source: 'UserSettings.minCashRequired',
    },
  ];

  return {
    metricKey: 'safeSurplus',
    title: 'Safe Surplus (Free Cash Above Reserve)',
    formulaName: 'Free Working Capital Buffer',
    formulaDisplay: 'Safe Surplus = Current Balance - Minimum Safety Reserve',
    inputs,
    computationSteps: [
      `1. Current Available Liquid Cash = ${formatINR(currentBalance)}`,
      `2. Less: Mandatory Safety Reserve Buffer = -${formatINR(minCashRequired)}`,
      `3. Net Difference: ${formatINR(currentBalance)} - ${formatINR(minCashRequired)} = ${formatINR(safeSurplus)}`,
    ],
    finalResultFormatted: formatINR(safeSurplus),
    interpretation: !isDeficit
      ? `You have ${formatINR(safeSurplus)} of unencumbered capital that can be deployed to earn overnight/liquid mutual fund yield without risking payroll.`
      : `Working capital deficit of ${formatINR(Math.abs(safeSurplus))}. Your current cash is below your safety threshold. Do not lock funds into investments.`,
    actionableTip:
      'Never allocate more than 85% of your Safe Surplus into yield instruments; keep 15% as immediate cash-in-transit cushion.',
    hinglishExplanation:
      `Aapke total balance (${formatINR(currentBalance)}) me se safety reserve (${formatINR(minCashRequired)}) hatane ke baad bacha hua free cash ${formatINR(safeSurplus)} hai.`,
  };
}

export function explainMinimumReserve(
  minCashRequired: number,
  monthlyAverageExpense: number,
  recommendedReserve: number
): MetricCalculationExplanation {
  const targetMonths = 3;
  const threeMonthsExpense = Math.round(monthlyAverageExpense * targetMonths);

  const inputs: MetricInputBreakdown[] = [
    {
      label: 'User Configured Reserve Floor',
      value: formatINR(minCashRequired),
      numericValue: minCashRequired,
      description: 'Your chosen minimum cash balance threshold',
      source: 'UserSettings',
    },
    {
      label: 'Average Monthly Operating Expense',
      value: `${formatINR(monthlyAverageExpense)}/month`,
      numericValue: monthlyAverageExpense,
      description: 'Derived from average daily burn × 30 calendar days',
      source: 'Transaction history',
    },
    {
      label: '3-Month Standard SME Recommended Buffer',
      value: formatINR(recommendedReserve),
      numericValue: recommendedReserve,
      description: 'Recommended industry benchmark (3 months of operating expenses)',
      source: 'CFO Best Practice Formula',
    },
  ];

  return {
    metricKey: 'minReserve',
    title: 'Minimum Safety Reserve Buffer',
    formulaName: 'Prudent SME Runway Reserve Target',
    formulaDisplay: 'Recommended Reserve = Monthly Operating Expense × 3 Months',
    inputs,
    computationSteps: [
      `1. Average Monthly Spend = ${formatINR(monthlyAverageExpense)}`,
      `2. Target Safety Horizon = 3 Months`,
      `3. Recommended Target = ${formatINR(monthlyAverageExpense)} × 3 = ${formatINR(threeMonthsExpense)}`,
      `4. Currently Configured Threshold = ${formatINR(minCashRequired)}`,
    ],
    finalResultFormatted: formatINR(minCashRequired),
    interpretation:
      minCashRequired >= threeMonthsExpense
        ? `Your reserve setting of ${formatINR(minCashRequired)} exceeds the 3-month benchmark (${formatINR(threeMonthsExpense)}). Exceptional solvency protection.`
        : `Your current reserve (${formatINR(minCashRequired)}) is below the recommended 3-month benchmark of ${formatINR(threeMonthsExpense)}. Consider boosting it as cash flows grow.`,
    actionableTip:
      'Reserve funds should always sit in instant-access savings accounts or 1-day T+0 liquid funds with instant redemption.',
    hinglishExplanation:
      `Yeh aapka aapatkalin (emergency) buffer hai. Standard SME niyam ke anusaar 3 mahine ka kharcha (${formatINR(threeMonthsExpense)}) reserve mein hona chahiye.`,
  };
}

export function explainNextShortfall(
  shortfallInfo: ShortfallInfo,
  currentBalance: number,
  minCashRequired: number
): MetricCalculationExplanation {
  const inputs: MetricInputBreakdown[] = [
    {
      label: 'Current Starting Cash',
      value: formatINR(currentBalance),
      numericValue: currentBalance,
      description: 'Available cash balance today',
      source: 'TotalCashPosition',
    },
    {
      label: 'Safety Threshold',
      value: formatINR(minCashRequired),
      numericValue: minCashRequired,
      description: 'Reserve buffer limit',
      source: 'UserSettings.minCashRequired',
    },
    {
      label: 'Projected Breach Date',
      value: shortfallInfo.formattedDate,
      description: shortfallInfo.reason,
      source: 'generateForecast engine',
    },
  ];

  return {
    metricKey: 'shortfall',
    title: 'Next Cash Shortfall / Buffer Breach Date',
    formulaName: 'Cumulative Cash Velocity Projection',
    formulaDisplay: 'Shortfall = First calendar day where Projected Balance < 0 or < Minimum Reserve',
    inputs,
    computationSteps: [
      `1. Today Starting Balance = ${formatINR(currentBalance)}`,
      `2. Simulate daily net change = Daily Inflow - Daily Outflow + Scheduled Bills`,
      `3. Status: ${shortfallInfo.hasShortfall ? `Risk flagged on ${shortfallInfo.formattedDate}` : 'No shortfall detected within 90-day horizon'}`,
      `4. Underlying Reason: ${shortfallInfo.reason}`,
    ],
    finalResultFormatted: shortfallInfo.formattedDate,
    interpretation: shortfallInfo.hasShortfall
      ? `Cash model warns of potential strain around ${shortfallInfo.formattedDate}. ${shortfallInfo.reason}.`
      : 'Healthy outlook! Cash flows are projected to sustain operations without dipping into negative balances for the next 90 days.',
    actionableTip:
      'When a shortfall is forecasted, the best defense is following up on overdue customer receivables rather than taking high-interest unsecured debt.',
    hinglishExplanation:
      `Forecast engine har din ke kharche aur kamayi ko jodkar dekhta hai ki kis din balance 0 ya minimum buffer se kam hoga: ${shortfallInfo.formattedDate}.`,
  };
}

export function explainBurnRate(
  burnRatePerDay: number,
  totalExpense: number,
  daysSpan: number
): MetricCalculationExplanation {
  const inputs: MetricInputBreakdown[] = [
    {
      label: 'Total Historical Outflows',
      value: formatINR(totalExpense),
      numericValue: totalExpense,
      description: `Cumulative debits recorded in the last ${daysSpan} days`,
      source: 'Transactions history',
    },
    {
      label: 'Observation Time Window',
      value: `${daysSpan} Days`,
      numericValue: daysSpan,
      description: 'Time span analyzed for average calculation',
      source: 'Date range between oldest and newest transaction',
    },
  ];

  return {
    metricKey: 'burnRate',
    title: 'Daily Operating Burn Rate',
    formulaName: 'Average Daily Outflow Formula',
    formulaDisplay: 'Burn Rate = Total Outflows ÷ Number of Days in Analysis Span',
    inputs,
    computationSteps: [
      `1. Sum of Outflows = ${formatINR(totalExpense)}`,
      `2. Time Span Analyzed = ${daysSpan} Days`,
      `3. Calculation: ${formatINR(totalExpense)} ÷ ${daysSpan} = ${formatINR(burnRatePerDay)} per day`,
      `4. Monthly Equivalent (30D): ${formatINR(burnRatePerDay * 30)}/month`,
    ],
    finalResultFormatted: `${formatINR(burnRatePerDay)}/day`,
    interpretation: `Your business consumes an average of ${formatINR(burnRatePerDay)} every day (${formatINR(burnRatePerDay * 30)} monthly) to cover payroll, rent, inventory, and operations.`,
    actionableTip:
      'Separate fixed burn (rent, permanent salaries) from variable burn (ad spend, freelance contractors) to know how much you can immediately cut in a pinch.',
    hinglishExplanation:
      `Aapka business chalane ke liye roz lagbhag ${formatINR(burnRatePerDay)} ka kharcha hota hai (${formatINR(totalExpense)} total expense / ${daysSpan} din).`,
  };
}

/**
 * Centralized Calculation Explanation Dispatcher
 * Directly calls the exact calculation explainers to guarantee 100% mathematical parity.
 */
export function getMetricCalculationExplanation(
  metricKey: MetricCalculationKey,
  data: {
    initialBalance: number;
    currentBalance: number;
    minCashRequired: number;
    transactions: Transaction[];
    accounts?: BankAccount[];
    metrics: CashHealthMetrics;
    shortfallInfo: ShortfallInfo;
  }
): MetricCalculationExplanation {
  switch (metricKey) {
    case 'currentBalance':
      return explainCurrentBalance(data.initialBalance, data.transactions, data.accounts);
    case 'runway':
      return explainRunway(
        data.metrics.currentBalance,
        data.metrics.burnRatePerDay,
        data.metrics.avgDailyIncome,
        Math.max(14, Math.min(90, data.transactions.length))
      );
    case 'safeSurplus':
      return explainSafeSurplus(data.metrics.currentBalance, data.minCashRequired);
    case 'minReserve':
      return explainMinimumReserve(
        data.minCashRequired,
        data.metrics.monthlyAverageExpense,
        data.metrics.recommendedReserve
      );
    case 'shortfall':
      return explainNextShortfall(data.shortfallInfo, data.metrics.currentBalance, data.minCashRequired);
    case 'burnRate':
      return explainBurnRate(
        data.metrics.burnRatePerDay,
        data.transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
        Math.max(14, Math.min(90, data.transactions.length))
      );
    default:
      return explainCurrentBalance(data.initialBalance, data.transactions, data.accounts);
  }
}

// ==========================================
// Phase 4: Alert Rules Evaluation & Notification Engine
// Shared by Client UI & Server API
// ==========================================

export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'rule-runway-threshold',
    name: 'Runway drops below 30 days',
    type: 'runway_below_threshold',
    enabled: true,
    thresholdValue: 30,
    channels: ['in_app', 'whatsapp'],
    notifyEmail: 'founder@example.com',
    notifyPhone: '+91 98765 43210',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-reserve-breach',
    name: 'Balance projected below safety reserve within 14 days',
    type: 'balance_below_reserve',
    enabled: true,
    thresholdValue: 14,
    channels: ['in_app', 'email'],
    notifyEmail: 'founder@example.com',
    notifyPhone: '+91 98765 43210',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rule-negative-cash',
    name: 'Projected cash deficit or insolvency within 30 days',
    type: 'negative_balance_projected',
    enabled: true,
    thresholdValue: 30,
    channels: ['in_app', 'whatsapp', 'email'],
    notifyEmail: 'founder@example.com',
    notifyPhone: '+91 98765 43210',
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Shared evaluation function for all stored alert rules
 * Evaluates runway thresholds, projected reserve dips, and insolvency threats
 */
export function evaluateAlertRules(
  rules: AlertRule[],
  metrics: CashHealthMetrics,
  shortfallInfo: ShortfallInfo,
  forecast: ForecastDay[] = []
): TriggeredAlert[] {
  const triggered: TriggeredAlert[] = [];
  const now = new Date().toISOString();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    if (rule.type === 'runway_below_threshold') {
      const daysOfCash = metrics.daysOfCashLeft;
      if (daysOfCash < rule.thresholdValue && daysOfCash < 999) {
        const isCritical = daysOfCash <= 14;
        triggered.push({
          id: `alert-runway-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ruleId: rule.id,
          ruleType: rule.type,
          severity: isCritical ? 'critical' : 'warning',
          title: isCritical ? '🚨 Critical Runway Alert' : '⚠️ Low Runway Warning',
          message: `Cash runway has dropped to ${daysOfCash} days (below your ${rule.thresholdValue}-day trigger threshold). Available cash: ${formatINR(metrics.currentBalance)}.`,
          messageHinglish: `Aapka cash runway ab sirf ${daysOfCash} din bacha hai (${rule.thresholdValue} din se kam). Turant payments collect karein.`,
          currentValue: daysOfCash,
          thresholdValue: rule.thresholdValue,
          triggeredAt: now,
          isRead: false,
          recommendation: 'Prioritize collection calls on top 3 overdue receivables and defer discretionary vendor payables.',
        });
      }
    } else if (rule.type === 'balance_below_reserve') {
      // Look within the threshold window days in the forecast
      const horizon = Math.min(forecast.length, rule.thresholdValue);
      const breachDay = forecast.slice(0, horizon).find((d) => d.isBelowMinimum || d.projectedBalance < metrics.minCashRequired);
      const hasUpcomingBreach =
        breachDay !== undefined ||
        (shortfallInfo.hasShortfall &&
          shortfallInfo.daysUntilShortfall !== null &&
          shortfallInfo.daysUntilShortfall <= rule.thresholdValue &&
          shortfallInfo.type === 'reserve_breach');

      if (hasUpcomingBreach) {
        const breachDateStr = breachDay ? breachDay.formattedDate : shortfallInfo.formattedDate;
        const breachDays = breachDay
          ? Math.max(1, Math.ceil((new Date(breachDay.date).getTime() - new Date().getTime()) / 86400000))
          : (shortfallInfo.daysUntilShortfall ?? rule.thresholdValue);

        triggered.push({
          id: `alert-reserve-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ruleId: rule.id,
          ruleType: rule.type,
          severity: 'warning',
          title: '⚠️ Safety Reserve Breach Imminent',
          message: `Projected cash balance dips below your ${formatINR(metrics.minCashRequired)} minimum reserve on ${breachDateStr} (~${breachDays} days).`,
          messageHinglish: `Agale ~${breachDays} din mein (${breachDateStr}) aapka cash balance ${formatINR(metrics.minCashRequired)} minimum reserve se kam ho sakta hai.`,
          currentValue: metrics.safeSurplus,
          thresholdValue: metrics.minCashRequired,
          triggeredAt: now,
          isRead: false,
          recommendation: 'Protect safety buffer by shifting capital from secondary accounts or accelerating invoice discounts.',
        });
      }
    } else if (rule.type === 'negative_balance_projected') {
      const horizon = Math.min(forecast.length, rule.thresholdValue);
      const insolvencyDay = forecast.slice(0, horizon).find((d) => d.projectedBalance < 0);
      const hasInsolvency =
        insolvencyDay !== undefined ||
        (shortfallInfo.hasShortfall &&
          shortfallInfo.type === 'insolvency' &&
          shortfallInfo.daysUntilShortfall !== null &&
          shortfallInfo.daysUntilShortfall <= rule.thresholdValue);

      if (hasInsolvency) {
        const targetDate = insolvencyDay ? insolvencyDay.formattedDate : shortfallInfo.formattedDate;
        const targetAmount = insolvencyDay ? Math.abs(insolvencyDay.projectedBalance) : shortfallInfo.shortfallAmount;

        triggered.push({
          id: `alert-insolvency-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          ruleId: rule.id,
          ruleType: rule.type,
          severity: 'critical',
          title: '🚨 Cash Insolvency Threat Flagged',
          message: `Severe deficit projected on ${targetDate}. Operating balance projected to fall into negative by ${formatINR(targetAmount)}.`,
          messageHinglish: `Grave warning: ${targetDate} ko aapka bank balance negative ho sakta hai (-${formatINR(targetAmount)}). Turant backup fund arrange karein.`,
          currentValue: -targetAmount,
          thresholdValue: 0,
          triggeredAt: now,
          isRead: false,
          recommendation: 'Urgent: Arrange an overdraft line or bridge funding immediately before deficit date.',
        });
      }
    }
  }

  return triggered;
}

/**
 * Dispatch interface for email / WhatsApp alert delivery
 * Returns delivery receipt and simulation record
 */
export async function dispatchAlertMock(
  alert: TriggeredAlert,
  channel: 'email' | 'whatsapp',
  recipient: string
): Promise<AlertDispatchResult> {
  const sentAt = new Date().toISOString();
  let messagePreview = '';

  if (channel === 'whatsapp') {
    messagePreview = `[CashWise WhatsApp Alert] ${alert.title}: ${alert.message} | Log in to review scenario options.`;
  } else {
    messagePreview = `Subject: [CashWise Alert] ${alert.title}\n\nDear Founder,\n\n${alert.message}\n\nHinglish summary: ${alert.messageHinglish}\n\nGenerated by CashWise Working Capital Optimizer.`;
  }

  // Simulate network dispatch with realistic latency
  await new Promise((r) => setTimeout(r, 40));

  return {
    success: true,
    channel,
    recipient,
    sentAt,
    messagePreview,
    status: 'delivered',
  };
}

/**
 * Generate complete Monthly Report data package using the same unified metrics functions
 */
export function generateMonthlyReportData(
  transactions: Transaction[],
  initialBalance: number,
  minCashRequired: number,
  upcomingFlows: UpcomingCashFlow[] = [],
  userProfile: { name: string; businessName: string; role: UserRole } = {
    name: 'Rajesh Sharma',
    businessName: 'Apex Craft Digital & Retail',
    role: 'owner',
  },
  daysSpan = 30
): MonthlyReportData {
  const metrics = calculateCashHealth(transactions, initialBalance, minCashRequired);
  const headlineSummary = generateHeadlineSummary(metrics, transactions, 'en');
  const shortfallInfo = getNextShortfallInfo(metrics.currentBalance, minCashRequired, transactions, 90);
  const healthStatus = getHealthStatus(metrics);
  const forecast = generateForecast(metrics.currentBalance, transactions, daysSpan, undefined, upcomingFlows);
  const recommendedAction = getRecommendedNextAction('dashboard', metrics, 'en');

  const lowestProjectedBalance = forecast.reduce(
    (min, d) => Math.min(min, d.projectedBalance),
    metrics.currentBalance
  );
  const endingBalance = forecast[forecast.length - 1]?.projectedBalance ?? metrics.currentBalance;

  const now = new Date();
  const reportingPeriod = now.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  return {
    reportId: `CW-REP-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`,
    generatedAt: now.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    reportingPeriod,
    businessName: userProfile.businessName || 'CashWise Enterprise',
    preparedBy: `${userProfile.name} (${userProfile.role === 'owner' ? 'Business Owner' : 'Finance Officer'})`,
    userRole: userProfile.role,
    metrics,
    headlineSummary,
    shortfallInfo,
    healthStatus,
    forecastSummary: {
      startingBalance: metrics.currentBalance,
      lowestProjectedBalance,
      endingBalance,
      daysCount: daysSpan,
    },
    upcomingLiabilities: upcomingFlows.filter((f) => f.status === 'pending'),
    recommendedAction,
  };
}
