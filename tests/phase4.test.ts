import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { app, inMemoryActivityLogs } from '../server';
import { generateInitialTransactions } from '../src/data/sampleData';
import {
  calculateCashHealth,
  generateHeadlineSummary,
  getNextShortfallInfo,
  getHealthStatus,
  getRecommendedNextAction,
  DEFAULT_ALERT_RULES,
  evaluateAlertRules,
  dispatchAlertMock,
  generateMonthlyReportData,
  generateForecast,
} from '../src/utils/finance';
import {
  AlertRule,
  CashHealthMetrics,
  ShortfallInfo,
  TriggeredAlert,
  UserRole,
} from '../src/types/finance';

function makeRequest(
  server: http.Server,
  options: {
    path: string;
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  }
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const address = server.address() as any;
    const reqOptions: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: address.port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token-valid-abc123',
        ...options.headers,
      },
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
        } catch {
          resolve({ status: res.statusCode || 500, body: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

test('Requirement 13: RBAC backend rejection (Owner vs Finance role)', async (t) => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    // 1. Finance role attempting to update settings should be REJECTED with 403 Forbidden
    const financeSettingRes = await makeRequest(server, {
      path: '/api/user/settings',
      method: 'POST',
      headers: {
        'x-user-role': 'finance',
        'x-user-email': 'finance@cashwise.com',
      },
      body: { minCashRequired: 400000 },
    });

    assert.equal(financeSettingRes.status, 403, 'Finance role must be rejected with HTTP 403');
    assert.equal(financeSettingRes.body.success, false);
    assert.match(
      financeSettingRes.body.error,
      /Forbidden: Action requires \[owner\] role/,
      'Error message must indicate owner requirement'
    );

    // 2. Owner role updating settings succeeds with HTTP 200
    const ownerSettingRes = await makeRequest(server, {
      path: '/api/user/settings',
      method: 'POST',
      headers: {
        'x-user-role': 'owner',
        'x-user-email': 'owner@cashwise.com',
      },
      body: { minCashRequired: 450000 },
    });

    assert.equal(ownerSettingRes.status, 200, 'Owner role must be authorized with HTTP 200');
    assert.equal(ownerSettingRes.body.success, true);
    assert.equal(ownerSettingRes.body.data.minCashRequired, 450000);

    // 3. Finance role attempting to delete an account should be REJECTED with 403 Forbidden
    const financeDeleteAccountRes = await makeRequest(server, {
      path: '/api/accounts/acc-secondary-test',
      method: 'DELETE',
      headers: {
        'x-user-role': 'finance',
      },
    });

    assert.equal(financeDeleteAccountRes.status, 403, 'Finance role must be rejected on account deletion');
    assert.equal(financeDeleteAccountRes.body.success, false);

    // 4. Finance role attempting to update alert rules should be REJECTED with 403 Forbidden
    const financeRulesRes = await makeRequest(server, {
      path: '/api/alerts/rules',
      method: 'POST',
      headers: {
        'x-user-role': 'finance',
      },
      body: { rules: DEFAULT_ALERT_RULES },
    });

    assert.equal(financeRulesRes.status, 403, 'Finance role must be rejected on alert rules configuration');
    assert.equal(financeRulesRes.body.success, false);

    // 5. Owner role updating alert rules succeeds with HTTP 200
    const ownerRulesRes = await makeRequest(server, {
      path: '/api/alerts/rules',
      method: 'POST',
      headers: {
        'x-user-role': 'owner',
      },
      body: { rules: DEFAULT_ALERT_RULES },
    });

    assert.equal(ownerRulesRes.status, 200, 'Owner role can configure alert rules');
    assert.equal(ownerRulesRes.body.success, true);
  } finally {
    server.close();
  }
});

test('Requirement 14: Printable / PDF Monthly Report generated with unified mathematical parity', async () => {
  const { transactions } = generateInitialTransactions();
  const initialBalance = 400000;
  const minCashRequired = 300000;

  // Compute canonical metrics directly
  const canonicalMetrics = calculateCashHealth(transactions, initialBalance, minCashRequired);
  const canonicalHeadline = generateHeadlineSummary(canonicalMetrics, transactions, 'en');
  const canonicalShortfall = getNextShortfallInfo(canonicalMetrics.currentBalance, minCashRequired, transactions, 90);
  const canonicalStatus = getHealthStatus(canonicalMetrics);
  const canonicalAction = getRecommendedNextAction('dashboard', canonicalMetrics, 'en');

  // Generate monthly report data
  const reportData = generateMonthlyReportData(
    transactions,
    initialBalance,
    minCashRequired,
    [],
    { name: 'Rajesh Sharma', businessName: 'Apex Craft Digital', role: 'owner' },
    30
  );

  // Assert exact mathematical parity
  assert.equal(reportData.metrics.currentBalance, canonicalMetrics.currentBalance, 'Current balance must match');
  assert.equal(reportData.metrics.monthlyAverageExpense, canonicalMetrics.monthlyAverageExpense, 'Monthly expense must match');
  assert.equal(reportData.metrics.safeSurplus, canonicalMetrics.safeSurplus, 'Safe surplus must match');
  assert.equal(reportData.metrics.daysOfCashLeft, canonicalMetrics.daysOfCashLeft, 'Days of cash left must match');
  assert.equal(reportData.headlineSummary.plainText, canonicalHeadline.plainText, 'Headline summary must match');
  assert.equal(reportData.shortfallInfo.hasShortfall, canonicalShortfall.hasShortfall, 'Shortfall flag must match');
  assert.equal(reportData.healthStatus, canonicalStatus, 'Health status must match');
  assert.equal(reportData.recommendedAction.title, canonicalAction.title, 'Recommended action must match');

  // Verify forecast summary structure
  assert.ok(reportData.forecastSummary.daysCount === 30, 'Forecast days count should be 30');
  assert.ok(typeof reportData.forecastSummary.startingBalance === 'number');
  assert.ok(typeof reportData.forecastSummary.lowestProjectedBalance === 'number');
  assert.ok(typeof reportData.forecastSummary.endingBalance === 'number');
});

test('Requirement 14: GET /api/report/monthly endpoint parity', async () => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const res = await makeRequest(server, {
      path: '/api/report/monthly?days=30',
      method: 'GET',
      headers: {
        'x-user-role': 'owner',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.reportId.startsWith('CW-REP-'));
    assert.ok(res.body.data.metrics);
    assert.ok(res.body.data.headlineSummary);
    assert.ok(res.body.data.forecastSummary);
    assert.ok(res.body.data.recommendedAction);
  } finally {
    server.close();
  }
});

test('Requirement 15: Alert settings evaluation & multi-channel mock dispatch', async () => {
  const { transactions } = generateInitialTransactions();
  const rules: AlertRule[] = [
    {
      id: 'rule-runway',
      name: 'Runway Alert',
      type: 'runway_below_threshold',
      enabled: true,
      thresholdValue: 60, // 60 days threshold
      channels: ['in_app', 'email'],
    },
    {
      id: 'rule-reserve',
      name: 'Reserve Breach Alert',
      type: 'balance_below_reserve',
      enabled: true,
      thresholdValue: 30,
      channels: ['in_app', 'whatsapp'],
    },
    {
      id: 'rule-negative',
      name: 'Negative Balance Alert',
      type: 'negative_balance_projected',
      enabled: true,
      thresholdValue: 30,
      channels: ['in_app', 'email', 'whatsapp'],
    },
  ];

  // Case A: Metrics with low runway (10 days) and reserve breach
  const distressedMetrics: CashHealthMetrics = {
    currentBalance: 50000,
    minCashRequired: 300000,
    safeSurplus: -250000,
    burnRatePerDay: 3333,
    avgDailyExpense: 3333,
    avgDailyIncome: 1333,
    monthlyAverageExpense: 100000,
    monthlyAverageIncome: 40000,
    daysOfCashLeft: 10,
    isLowCash: true,
    shortfallDate: '2026-11-15',
    recommendedReserve: 300000,
  };

  const shortfallInfo: ShortfallInfo = {
    hasShortfall: true,
    shortfallDate: '2026-11-15',
    formattedDate: '15 Nov',
    daysUntilShortfall: 18,
    type: 'reserve_breach',
    shortfallAmount: 250000,
    reason: 'Reserve breach in 18 days',
  };

  const forecast = generateForecast(50000, transactions, 30);

  const triggeredAlerts = evaluateAlertRules(rules, distressedMetrics, shortfallInfo, forecast);

  assert.ok(triggeredAlerts.length >= 1, 'Should trigger at least runway alert');
  const runwayAlert = triggeredAlerts.find((a) => a.ruleType === 'runway_below_threshold');
  assert.ok(runwayAlert, 'Runway alert must be triggered');
  assert.equal(runwayAlert?.severity, 'critical', '15 days should trigger critical runway severity');
  assert.ok(runwayAlert?.recommendation, 'Alert must include recommended action');

  // Test WhatsApp Dispatch Mock
  const waReceipt = await dispatchAlertMock(runwayAlert!, 'whatsapp', '+91 98765 43210');
  assert.equal(waReceipt.success, true);
  assert.equal(waReceipt.channel, 'whatsapp');
  assert.equal(waReceipt.recipient, '+91 98765 43210');
  assert.match(waReceipt.messagePreview, /\[CashWise WhatsApp Alert\]/);

  // Test Email Dispatch Mock
  const emailReceipt = await dispatchAlertMock(runwayAlert!, 'email', 'cfo@company.com');
  assert.equal(emailReceipt.success, true);
  assert.equal(emailReceipt.channel, 'email');
  assert.match(emailReceipt.messagePreview, /Subject: \[CashWise Alert\]/);
});

test('Requirement 15: POST /api/alerts/evaluate and dispatch-test endpoints', async () => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    const evalRes = await makeRequest(server, {
      path: '/api/alerts/evaluate',
      method: 'POST',
      body: {
        rules: DEFAULT_ALERT_RULES,
        metrics: {
          currentBalance: 50000,
          monthlyAverageExpense: 100000,
          monthlyBurnRate: 100000,
          monthlyAverageInflow: 40000,
          netMonthlyBurn: 60000,
          safeSurplus: -250000,
          isLowCash: true,
          daysOfCashLeft: 15,
          minCashRequired: 300000,
        },
        shortfallInfo: {
          hasShortfall: true,
          shortfallDate: '2026-11-15',
          formattedDate: '15 Nov',
          daysUntilShortfall: 18,
          type: 'reserve_breach',
          shortfallAmount: 250000,
          reason: 'Reserve breach in 18 days',
        },
      },
    });

    assert.equal(evalRes.status, 200);
    assert.equal(evalRes.body.success, true);
    assert.ok(Array.isArray(evalRes.body.data));

    // Test Alert Dispatch Simulation Endpoint
    const dispatchRes = await makeRequest(server, {
      path: '/api/alerts/dispatch-test',
      method: 'POST',
      body: {
        alert: {
          id: 'test-alert-1',
          ruleId: 'rule-runway',
          ruleType: 'runway_below_threshold',
          severity: 'warning',
          title: 'Runway Low',
          message: 'Projected runway 22 days',
          messageHinglish: '22 din bache hain',
          currentValue: 22,
          thresholdValue: 30,
          triggeredAt: new Date().toISOString(),
          isRead: false,
        },
        channel: 'whatsapp',
        recipient: '+919999988888',
      },
    });

    assert.equal(dispatchRes.status, 200);
    assert.equal(dispatchRes.body.success, true);
    assert.equal(dispatchRes.body.data.channel, 'whatsapp');
  } finally {
    server.close();
  }
});

test('Requirement 16: Activity Log immutable server trail', async () => {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));

  try {
    // 1. Perform an action (Settings Update as Owner)
    const updateRes = await makeRequest(server, {
      path: '/api/user/settings',
      method: 'POST',
      headers: {
        'x-user-role': 'owner',
        'x-user-email': 'owner@corp.com',
        'x-user-name': 'Founder Rajesh',
      },
      body: { minCashRequired: 320000 },
    });
    assert.equal(updateRes.status, 200);

    // 2. Fetch activity logs - must be read-only and include the recent server-written action
    const logRes = await makeRequest(server, {
      path: '/api/activity-logs',
      method: 'GET',
    });

    assert.equal(logRes.status, 200);
    assert.equal(logRes.body.success, true);
    assert.ok(Array.isArray(logRes.body.data));
    assert.ok(logRes.body.data.length > 0);

    const latestLog = logRes.body.data[0];
    assert.equal(latestLog.action, 'SETTINGS_UPDATED');
    assert.equal(latestLog.userRole, 'owner');
    assert.equal(latestLog.userEmail, 'owner@corp.com');
    assert.equal(latestLog.userName, 'Founder Rajesh');
    assert.ok(latestLog.timestamp);
    assert.ok(latestLog.description.includes('3,20,000') || latestLog.description.includes('320,000'));
  } finally {
    server.close();
  }
});
