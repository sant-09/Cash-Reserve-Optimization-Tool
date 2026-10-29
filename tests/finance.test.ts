import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCashHealth,
  formatINR,
  formatCompactINR,
  getHealthStatus,
  getNextShortfallInfo,
  generateHeadlineSummary,
  FINANCE_TERMS,
  getRecommendedNextAction,
} from '../src/utils/finance';
import { Transaction } from '../src/types/finance';

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    date: '2026-10-01',
    type: 'income',
    amount: 200000,
    category: 'Client Payment',
    note: 'Invoice 101',
  },
  {
    id: 'tx-2',
    date: '2026-10-05',
    type: 'expense',
    amount: 50000,
    category: 'Staff Salaries',
    note: 'October advance',
  },
  {
    id: 'tx-3',
    date: '2026-10-10',
    type: 'expense',
    amount: 30000,
    category: 'Office Rent',
    note: 'October rent',
  },
];

test('calculateCashHealth maintains backward-compatible financial logic', () => {
  const initialBalance = 200000;
  const minCashRequired = 150000;
  const metrics = calculateCashHealth(mockTransactions, initialBalance, minCashRequired);

  // Total income = 200,000, Total expense = 80,000
  // Net cash = 120,000 -> Current Balance = 320,000
  assert.equal(metrics.currentBalance, 320000);
  assert.equal(metrics.minCashRequired, 150000);
  assert.equal(metrics.safeSurplus, 170000); // 320,000 - 150,000
  assert.equal(metrics.isLowCash, false);
  assert.ok(metrics.burnRatePerDay > 0);
  assert.ok(metrics.daysOfCashLeft > 0);
});

test('getHealthStatus accurately identifies healthy, watch, and critical tiers', () => {
  // Healthy tier: high surplus and runway >= 45 days
  const healthyMetrics = {
    currentBalance: 500000,
    minCashRequired: 200000,
    safeSurplus: 300000,
    burnRatePerDay: 5000,
    avgDailyExpense: 5000,
    avgDailyIncome: 7000,
    monthlyAverageExpense: 150000,
    monthlyAverageIncome: 210000,
    daysOfCashLeft: 100,
    isLowCash: false,
    shortfallDate: null,
    recommendedReserve: 450000,
  };
  assert.equal(getHealthStatus(healthyMetrics), 'healthy');

  // Watch tier: moderate surplus or runway between 21 and 44 days
  const watchMetrics = {
    ...healthyMetrics,
    safeSurplus: 40000, // below 50k
    daysOfCashLeft: 30,
  };
  assert.equal(getHealthStatus(watchMetrics), 'watch');

  // Critical tier: negative safe surplus / below minimum reserve
  const criticalMetrics = {
    ...healthyMetrics,
    currentBalance: 150000,
    minCashRequired: 200000,
    safeSurplus: -50000,
    daysOfCashLeft: 15,
    isLowCash: true,
  };
  assert.equal(getHealthStatus(criticalMetrics), 'critical');
});

test('getNextShortfallInfo accurately projects risks within 90 days', () => {
  // Case A: When balance is below reserve right now
  const immediateDip = getNextShortfallInfo(100000, 200000, mockTransactions, 90);
  assert.equal(immediateDip.hasShortfall, true);
  assert.equal(immediateDip.type, 'reserve_breach');
  assert.equal(immediateDip.formattedDate, 'Immediate');
  assert.equal(immediateDip.shortfallAmount, 100000);

  // Case B: Insolvent right now
  const insolventNow = getNextShortfallInfo(-20000, 100000, mockTransactions, 90);
  assert.equal(insolventNow.hasShortfall, true);
  assert.equal(insolventNow.type, 'insolvency');
  assert.equal(insolventNow.shortfallAmount, 20000);

  // Case C: Strong balance with no projected breach
  const robustShortfall = getNextShortfallInfo(5000000, 200000, mockTransactions, 90);
  assert.equal(robustShortfall.hasShortfall, false);
  assert.equal(robustShortfall.type, 'none');
  assert.equal(robustShortfall.formattedDate, 'None in 90 days');
});

test('generateHeadlineSummary formats plain language and Hinglish summaries', () => {
  const metrics = calculateCashHealth(mockTransactions, 300000, 200000);

  // English summary
  const summaryEn = generateHeadlineSummary(metrics, mockTransactions, 'en');
  assert.ok(summaryEn.plainText.startsWith('Runway:'));
  assert.ok(summaryEn.plainText.includes('Safe surplus:'));
  assert.ok(summaryEn.plainText.includes('Next risk:'));
  assert.equal(summaryEn.status, 'healthy');

  // Hinglish summary
  const summaryHinglish = generateHeadlineSummary(metrics, mockTransactions, 'hinglish');
  assert.ok(summaryHinglish.plainText.includes('din'));
  assert.ok(summaryHinglish.plainText.includes('Agla risk:'));

  // Deficit scenario
  const deficitMetrics = calculateCashHealth([], 100000, 200000);
  const deficitSummary = generateHeadlineSummary(deficitMetrics, [], 'en');
  assert.ok(deficitSummary.plainText.includes('Working capital deficit:'));
  assert.equal(deficitSummary.status, 'critical');
});

test('FINANCE_TERMS glossary defines all required terms', () => {
  const requiredTerms = ['burnRate', 'runway', 'safeSurplus', 'dso', 'capex', 'minReserve', 'currentBalance', 'workingCapital'] as const;

  for (const term of requiredTerms) {
    const entry = FINANCE_TERMS[term];
    assert.ok(entry, `Missing term: ${term}`);
    assert.ok(entry.term.length > 0);
    assert.ok(entry.definition.length > 0);
    assert.ok(entry.hinglish.length > 0);
  }
});

test('getRecommendedNextAction returns context-aware recommendations for all screens', () => {
  const metrics = calculateCashHealth(mockTransactions, 300000, 200000);

  const screens = ['dashboard', 'cashflow', 'forecast', 'vault3d'] as const;
  for (const screen of screens) {
    const action = getRecommendedNextAction(screen, metrics, 'en');
    assert.ok(action.id.startsWith('action-'));
    assert.ok(action.title.length > 0);
    assert.ok(action.description.length > 0);
    assert.ok(action.actionLabel.length > 0);
    assert.ok(action.actionView);
  }
});
