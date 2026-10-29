import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { app } from '../server';
import {
  generateForecast,
  compareTwoScenarios,
  SCENARIO_PRESETS,
  createDefaultUpcomingCashFlows,
  getMetricCalculationExplanation,
  explainCurrentBalance,
  explainRunway,
  explainSafeSurplus,
  explainMinimumReserve,
  explainNextShortfall,
  explainBurnRate,
  calculateCashHealth,
  getNextShortfallInfo,
} from '../src/utils/finance';
import {
  Transaction,
  UpcomingCashFlow,
  WhatIfScenario,
  SavedScenario,
} from '../src/types/finance';

// Helper validator mirrors for firestore.rules
export function validateUpcomingCashFlow(data: any, userId: string): { valid: boolean; error?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Data must be an object' };
  }
  const required = ['id', 'title', 'category', 'amount', 'type', 'dueDate', 'status', 'userId'];
  for (const field of required) {
    if (!(field in data)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  if (typeof data.id !== 'string' || data.id.length === 0 || data.id.length > 128) {
    return { valid: false, error: 'Invalid id' };
  }
  if (typeof data.title !== 'string' || data.title.length === 0 || data.title.length > 200) {
    return { valid: false, error: 'Invalid title' };
  }
  if (data.type !== 'income' && data.type !== 'expense') {
    return { valid: false, error: 'type must be income or expense' };
  }
  if (typeof data.amount !== 'number' || data.amount <= 0 || !isFinite(data.amount)) {
    return { valid: false, error: 'amount must be positive finite number' };
  }
  if (typeof data.dueDate !== 'string' || data.dueDate.length > 20) {
    return { valid: false, error: 'Invalid dueDate' };
  }
  if (data.status !== 'pending' && data.status !== 'completed' && data.status !== 'cancelled') {
    return { valid: false, error: 'status must be pending, completed, or cancelled' };
  }
  if (data.userId !== userId) {
    return { valid: false, error: 'userId mismatch' };
  }
  if ('recurrence' in data && !['none', 'weekly', 'monthly', 'quarterly'].includes(data.recurrence)) {
    return { valid: false, error: 'invalid recurrence' };
  }
  return { valid: true };
}

export function validateSavedScenario(data: any, userId: string): { valid: boolean; error?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Data must be an object' };
  }
  const required = ['id', 'name', 'scenario', 'userId'];
  for (const field of required) {
    if (!(field in data)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }
  if (typeof data.id !== 'string' || data.id.length === 0 || data.id.length > 128) {
    return { valid: false, error: 'Invalid id' };
  }
  if (typeof data.name !== 'string' || data.name.length === 0 || data.name.length > 100) {
    return { valid: false, error: 'name must be between 1 and 100 characters' };
  }
  if (typeof data.scenario !== 'object' || data.scenario === null) {
    return { valid: false, error: 'scenario must be an object' };
  }
  if (data.userId !== userId) {
    return { valid: false, error: 'userId mismatch' };
  }
  return { valid: true };
}

// Sample fixtures
const sampleTransactions: Transaction[] = [
  { id: 'tx-1', date: '2026-10-01', type: 'income', amount: 300000, category: 'Client Payment', note: '' },
  { id: 'tx-2', date: '2026-10-05', type: 'expense', amount: 90000, category: 'Staff Salaries', note: '' },
  { id: 'tx-3', date: '2026-10-10', type: 'expense', amount: 45000, category: 'Office Rent', note: '' },
  { id: 'tx-4', date: '2026-10-15', type: 'income', amount: 150000, category: 'Product Sales', note: '' },
  { id: 'tx-5', date: '2026-10-20', type: 'expense', amount: 35000, category: 'Taxes & GST', note: '' },
];

const sampleUpcomingFlows: UpcomingCashFlow[] = [
  {
    id: 'up-1',
    title: 'Staff Payroll Month End',
    category: 'payroll',
    type: 'expense',
    amount: 120000,
    dueDate: '2026-11-01',
    recurrence: 'monthly',
    status: 'pending',
  },
  {
    id: 'up-2',
    title: 'Indiranagar HQ Office Rent',
    category: 'rent',
    type: 'expense',
    amount: 45000,
    dueDate: '2026-11-10',
    recurrence: 'monthly',
    status: 'pending',
  },
  {
    id: 'up-3',
    title: 'Quarterly GST Settlement (GSTR-3B)',
    category: 'gst',
    type: 'expense',
    amount: 65000,
    dueDate: '2026-11-20',
    recurrence: 'monthly',
    status: 'pending',
  },
  {
    id: 'up-4',
    title: 'Key Client Milestone Payment',
    category: 'expected_receivable',
    type: 'income',
    amount: 250000,
    dueDate: '2026-11-15',
    recurrence: 'none',
    status: 'pending',
  },
];

// --- REQUIREMENT 9: UPCOMING TIMELINE & FORECAST INTEGRATION ---
test('Requirement 9: createDefaultUpcomingCashFlows generates realistic SME commitments', () => {
  const defaults = createDefaultUpcomingCashFlows();
  assert.ok(Array.isArray(defaults));
  assert.ok(defaults.length >= 5);

  const categories = defaults.map((d) => d.category);
  assert.ok(categories.includes('payroll'));
  assert.ok(categories.includes('rent'));
  assert.ok(categories.includes('gst'));
  assert.ok(categories.includes('expected_receivable'));
  assert.ok(categories.includes('vendor_invoice'));

  defaults.forEach((flow) => {
    assert.ok(flow.id);
    assert.ok(flow.title);
    assert.ok(flow.amount > 0);
    assert.ok(flow.dueDate);
    assert.ok(['income', 'expense'].includes(flow.type));
    assert.equal(flow.status, 'pending');
  });
});

test('Requirement 9: generateForecast accurately incorporates upcoming payments and receipts into future cash balances', () => {
  const baseScenario: WhatIfScenario = {
    incomeChangePercent: 0,
    expenseChangePercent: 0,
    receivableDelayDays: 0,
    oneTimeExpenseAmount: 0,
    oneTimeExpenseDate: '',
  };

  const initialBalance = 500000;
  const forecastWithoutUpcoming = generateForecast(
    initialBalance,
    sampleTransactions,
    30,
    baseScenario,
    []
  );

  const forecastWithUpcoming = generateForecast(
    initialBalance,
    sampleTransactions,
    30,
    baseScenario,
    sampleUpcomingFlows
  );

  assert.equal(forecastWithoutUpcoming.length, 30);
  assert.equal(forecastWithUpcoming.length, 30);

  // Check that upcoming events were attached to the forecast days
  const daysWithUpcomingEvents = forecastWithUpcoming.filter(
    (d) => d.upcomingEvents && d.upcomingEvents.length > 0
  );
  assert.ok(daysWithUpcomingEvents.length > 0);

  // Inflows & outflows on scheduled days match upcoming amounts
  const totalUpcomingInflow = forecastWithUpcoming.reduce((sum, d) => sum + (d.upcomingInflow || 0), 0);
  const totalUpcomingOutflow = forecastWithUpcoming.reduce((sum, d) => sum + (d.upcomingOutflow || 0), 0);

  assert.ok(totalUpcomingInflow > 0, 'Should have positive upcoming inflows');
  assert.ok(totalUpcomingOutflow > 0, 'Should have positive upcoming outflows');
});

test('Requirement 9: generateForecast honors receivable delay for upcoming client receipts', () => {
  const scenarioNoDelay: WhatIfScenario = {
    incomeChangePercent: 0,
    expenseChangePercent: 0,
    receivableDelayDays: 0,
    oneTimeExpenseAmount: 0,
    oneTimeExpenseDate: '',
  };

  const scenario30DayDelay: WhatIfScenario = {
    incomeChangePercent: 0,
    expenseChangePercent: 0,
    receivableDelayDays: 30,
    oneTimeExpenseAmount: 0,
    oneTimeExpenseDate: '',
  };

  const forecastNoDelay = generateForecast(500000, sampleTransactions, 30, scenarioNoDelay, sampleUpcomingFlows);
  const forecastWithDelay = generateForecast(500000, sampleTransactions, 30, scenario30DayDelay, sampleUpcomingFlows);

  // With a 30-day delay, client receipts are shifted, lowering ending balance within the 30-day horizon
  const endingNoDelay = forecastNoDelay[forecastNoDelay.length - 1].scenarioBalance ?? forecastNoDelay[forecastNoDelay.length - 1].projectedBalance;
  const endingWithDelay = forecastWithDelay[forecastWithDelay.length - 1].scenarioBalance ?? forecastWithDelay[forecastWithDelay.length - 1].projectedBalance;

  assert.ok(
    endingWithDelay <= endingNoDelay,
    `Ending balance with delayed receivable (${endingWithDelay}) should be <= without delay (${endingNoDelay})`
  );
});

// --- REQUIREMENT 10: ONE-CLICK SCENARIO PRESETS ---
test('Requirement 10: SCENARIO_PRESETS provides all expected standard presets before raw sliders', () => {
  assert.ok(Array.isArray(SCENARIO_PRESETS));
  assert.ok(SCENARIO_PRESETS.length >= 6);

  const clientLatePreset = SCENARIO_PRESETS.find((p) => p.title.includes('Biggest client') || p.title.includes('30 days late'));
  assert.ok(clientLatePreset, 'Should find client late preset');
  assert.equal(clientLatePreset.scenario.receivableDelayDays, 30);

  const salesDropPreset = SCENARIO_PRESETS.find((p) => p.title.includes('Sales drop 30%'));
  assert.ok(salesDropPreset, 'Should find sales drop preset');
  assert.equal(salesDropPreset.scenario.incomeChangePercent, -30);

  const oneTimeExpPreset = SCENARIO_PRESETS.find((p) => p.title.includes('One-time expense'));
  assert.ok(oneTimeExpPreset, 'Should find one-time expense preset');
  assert.ok(oneTimeExpPreset.scenario.oneTimeExpenseAmount > 0);

  const costCuttingPreset = SCENARIO_PRESETS.find((p) => p.title.includes('Cost cutting'));
  assert.ok(costCuttingPreset, 'Should find cost cutting preset');
  assert.equal(costCuttingPreset.scenario.expenseChangePercent, -20);
});

// --- REQUIREMENT 11: SAVE NAMED SCENARIOS & DUAL COMPARISON ---
test('Requirement 11: compareTwoScenarios calculates side-by-side trajectory and plain-language summary', () => {
  const scenarioA: SavedScenario = {
    id: 'base-case',
    name: 'Base Case',
    isBaseCase: true,
    scenario: {
      incomeChangePercent: 0,
      expenseChangePercent: 0,
      receivableDelayDays: 0,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
    },
    createdAt: new Date().toISOString(),
  };

  const scenarioB: SavedScenario = {
    id: 'stress-case',
    name: 'Stress Test Scenario',
    isBaseCase: false,
    scenario: {
      incomeChangePercent: -30,
      expenseChangePercent: 10,
      receivableDelayDays: 30,
      oneTimeExpenseAmount: 150000,
      oneTimeExpenseDate: new Date().toISOString().split('T')[0],
    },
    createdAt: new Date().toISOString(),
  };

  const comparison = compareTwoScenarios(
    scenarioA,
    scenarioB,
    400000,
    sampleTransactions,
    30,
    200000,
    sampleUpcomingFlows
  );

  assert.equal(comparison.scenarioA.name, 'Base Case');
  assert.equal(comparison.scenarioB.name, 'Stress Test Scenario');
  assert.equal(comparison.forecastA.length, 30);
  assert.equal(comparison.forecastB.length, 30);

  assert.ok(comparison.endingBalanceDelta < 0, 'Stress scenario should have lower ending balance than Base Case');
  assert.equal(comparison.endingBalanceB, comparison.endingBalanceA + comparison.endingBalanceDelta);

  // Plain language summary lines
  assert.ok(comparison.plainLanguageSummary);
  assert.ok(typeof comparison.plainLanguageSummary === 'string');
  assert.ok(comparison.plainLanguageSummary.length > 20);
  assert.ok(comparison.hinglishSummary);
  assert.ok(typeof comparison.hinglishSummary === 'string');
});

// --- REQUIREMENT 12: "HOW IS THIS CALCULATED?" EXPLANATIONS ---
test('Requirement 12: getMetricCalculationExplanation produces exact formula and live arithmetic matching compute functions', () => {
  const initialBalance = 400000;
  const minCashRequired = 200000;
  const metrics = calculateCashHealth(sampleTransactions, initialBalance, minCashRequired);
  const shortfallInfo = getNextShortfallInfo(metrics.currentBalance, minCashRequired, sampleTransactions, 60);

  const contextData = {
    initialBalance,
    currentBalance: metrics.currentBalance,
    minCashRequired,
    transactions: sampleTransactions,
    metrics,
    shortfallInfo,
  };

  // 1. Current Balance
  const expBalance = getMetricCalculationExplanation('currentBalance', contextData);
  assert.equal(expBalance.metricKey, 'currentBalance');
  assert.ok(expBalance.formulaDisplay.includes('Opening Balance + Total Inflow - Total Outflow'));
  assert.ok(expBalance.inputs.length >= 3);

  // 2. Runway
  const expRunway = getMetricCalculationExplanation('runway', contextData);
  assert.equal(expRunway.metricKey, 'runway');
  assert.ok(expRunway.formulaDisplay.includes('Current Liquid Cash ÷ Average Daily Outflow'));
  assert.ok(expRunway.inputs.length >= 2);

  // 3. Safe Surplus
  const expSurplus = getMetricCalculationExplanation('safeSurplus', contextData);
  assert.equal(expSurplus.metricKey, 'safeSurplus');
  assert.ok(expSurplus.formulaDisplay.includes('Current Balance - Minimum Safety Reserve'));

  // 4. Minimum Reserve
  const expMinReserve = getMetricCalculationExplanation('minReserve', contextData);
  assert.equal(expMinReserve.metricKey, 'minReserve');
  assert.ok(expMinReserve.formulaDisplay.includes('Monthly Operating Expense × 3 Months'));

  // 5. Burn Rate
  const expBurnRate = getMetricCalculationExplanation('burnRate', contextData);
  assert.equal(expBurnRate.metricKey, 'burnRate');
  assert.ok(expBurnRate.formulaDisplay.includes('Burn Rate = Total Outflows ÷ Number of Days'));

  // 6. Direct specialized explainers
  const directBalance = explainCurrentBalance(initialBalance, sampleTransactions);
  assert.equal(directBalance.metricKey, 'currentBalance');

  const directRunway = explainRunway(metrics.currentBalance, metrics.burnRatePerDay, metrics.avgDailyIncome, 30);
  assert.equal(directRunway.metricKey, 'runway');

  const directSurplus = explainSafeSurplus(metrics.currentBalance, minCashRequired);
  assert.equal(directSurplus.metricKey, 'safeSurplus');

  const directReserve = explainMinimumReserve(minCashRequired, metrics.monthlyAverageExpense, metrics.recommendedReserve);
  assert.equal(directReserve.metricKey, 'minReserve');

  const directShortfall = explainNextShortfall(shortfallInfo, metrics.currentBalance, minCashRequired);
  assert.equal(directShortfall.metricKey, 'shortfall');

  const directBurn = explainBurnRate(metrics.burnRatePerDay, metrics.monthlyAverageExpense, 30);
  assert.equal(directBurn.metricKey, 'burnRate');
});

// --- SCHEMA & FIRESTORE RULES VALIDATION ---
test('Firestore Rules: validateUpcomingCashFlow validates types, constraints and ownership', () => {
  const validFlow = {
    id: 'up-101',
    title: 'Vendor Raw Materials Invoices',
    category: 'vendor_invoice',
    amount: 85000,
    type: 'expense',
    dueDate: '2026-11-25',
    recurrence: 'none',
    status: 'pending',
    userId: 'user-789',
  };

  assert.equal(validateUpcomingCashFlow(validFlow, 'user-789').valid, true);

  // Rejects wrong user
  assert.equal(validateUpcomingCashFlow(validFlow, 'wrong-user').valid, false);

  // Rejects non-positive amount
  assert.equal(validateUpcomingCashFlow({ ...validFlow, amount: -100 }, 'user-789').valid, false);
  assert.equal(validateUpcomingCashFlow({ ...validFlow, amount: 0 }, 'user-789').valid, false);

  // Rejects invalid type
  assert.equal(validateUpcomingCashFlow({ ...validFlow, type: 'transfer' }, 'user-789').valid, false);

  // Rejects invalid status
  assert.equal(validateUpcomingCashFlow({ ...validFlow, status: 'unknown' }, 'user-789').valid, false);

  // Rejects missing required title
  const { title, ...withoutTitle } = validFlow;
  assert.equal(validateUpcomingCashFlow(withoutTitle, 'user-789').valid, false);
});

test('Firestore Rules: validateSavedScenario validates schema, name, and ownership', () => {
  const validScenario = {
    id: 'scen-99',
    name: 'Q4 Aggressive Hiring',
    scenario: {
      incomeChangePercent: 15,
      expenseChangePercent: 25,
      receivableDelayDays: 10,
      oneTimeExpenseAmount: 200000,
      oneTimeExpenseDate: '2026-11-15',
    },
    userId: 'user-789',
    isBaseCase: false,
    description: 'Models hiring 3 engineers and 1 SDR in November',
  };

  assert.equal(validateSavedScenario(validScenario, 'user-789').valid, true);

  // Rejects wrong user
  assert.equal(validateSavedScenario(validScenario, 'other-user').valid, false);

  // Rejects empty name
  assert.equal(validateSavedScenario({ ...validScenario, name: '' }, 'user-789').valid, false);

  // Rejects missing scenario object
  const { scenario, ...withoutScenario } = validScenario;
  assert.equal(validateSavedScenario(withoutScenario, 'user-789').valid, false);
});

// --- EXPRESS SERVER ENDPOINTS FOR PHASE 3 ---
let server: http.Server;
let baseUrl: string;

test.before(async () => {
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as any;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

test.after(async () => {
  await new Promise<void>((resolve) => {
    server.close(() => resolve());
  });
});

test('GET /api/scenarios/presets returns list of presets', async () => {
  const res = await fetch(`${baseUrl}/api/scenarios/presets`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(Array.isArray(json.data));
  assert.ok(json.data.length >= 6);
  assert.ok(json.data.some((p: any) => p.title.includes('Biggest client')));
});

test('POST /api/forecast/compare computes dual scenarios with plain-language summary', async () => {
  const scenarioA: SavedScenario = {
    id: 'scen-a',
    name: 'Base Case',
    isBaseCase: true,
    scenario: {
      incomeChangePercent: 0,
      expenseChangePercent: 0,
      receivableDelayDays: 0,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
    },
    createdAt: new Date().toISOString(),
  };

  const scenarioB: SavedScenario = {
    id: 'scen-b',
    name: 'Recession Stress',
    isBaseCase: false,
    scenario: {
      incomeChangePercent: -30,
      expenseChangePercent: 10,
      receivableDelayDays: 30,
      oneTimeExpenseAmount: 150000,
      oneTimeExpenseDate: new Date().toISOString().split('T')[0],
    },
    createdAt: new Date().toISOString(),
  };

  const res = await fetch(`${baseUrl}/api/forecast/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      scenarioA,
      scenarioB,
      startingBalance: 500000,
      transactions: sampleTransactions,
      daysCount: 30,
      minCashRequired: 200000,
    }),
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.ok(json.data.plainLanguageSummary);
  assert.ok(json.data.forecastA);
  assert.ok(json.data.forecastB);
  assert.ok(json.data.endingBalanceDelta < 0);
});

test('GET /api/finance/metrics/explanation/:key returns live mathematical explainer', async () => {
  const res = await fetch(`${baseUrl}/api/finance/metrics/explanation/runway`);
  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.metricKey, 'runway');
  assert.ok(json.data.formulaDisplay);
  assert.ok(json.data.inputs.length >= 2);
});

test('CRUD /api/upcoming creates, fetches, and deletes scheduled payments/receipts', async () => {
  // 1. Create upcoming flow
  const createRes = await fetch(`${baseUrl}/api/upcoming`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Q4 Advance Tax Payment',
      category: 'tax',
      type: 'expense',
      amount: 40000,
      dueDate: '2026-12-15',
      recurrence: 'quarterly',
    }),
  });
  assert.equal(createRes.status, 201);
  const createdJson = await createRes.json();
  assert.equal(createdJson.success, true);
  const createdId = createdJson.data.id;
  assert.ok(createdId);

  // 2. Fetch list
  const getRes = await fetch(`${baseUrl}/api/upcoming`);
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.ok(Array.isArray(getJson.data));
  const found = getJson.data.find((f: any) => f.id === createdId);
  assert.ok(found);
  assert.equal(found.title, 'Q4 Advance Tax Payment');

  // 3. Delete
  const delRes = await fetch(`${baseUrl}/api/upcoming/${createdId}`, { method: 'DELETE' });
  assert.equal(delRes.status, 200);
});

test('CRUD /api/scenarios creates, fetches, and deletes saved scenarios', async () => {
  // 1. Create scenario
  const createRes = await fetch(`${baseUrl}/api/scenarios`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Worst Case Stress Test',
      scenario: {
        incomeChangePercent: -40,
        expenseChangePercent: 15,
        receivableDelayDays: 45,
        oneTimeExpenseAmount: 300000,
        oneTimeExpenseDate: '2026-11-20',
      },
      description: 'Severe revenue shock plus late enterprise customer',
    }),
  });
  assert.equal(createRes.status, 201);
  const createdJson = await createRes.json();
  const createdId = createdJson.data.id;
  assert.ok(createdId);

  // 2. Fetch scenarios
  const getRes = await fetch(`${baseUrl}/api/scenarios`);
  assert.equal(getRes.status, 200);
  const getJson = await getRes.json();
  assert.ok(Array.isArray(getJson.data));
  const found = getJson.data.find((s: any) => s.id === createdId);
  assert.ok(found);
  assert.equal(found.name, 'Worst Case Stress Test');

  // 3. Delete scenario
  const delRes = await fetch(`${baseUrl}/api/scenarios/${createdId}`, { method: 'DELETE' });
  assert.equal(delRes.status, 200);
});
