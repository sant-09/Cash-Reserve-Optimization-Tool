import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../server';
import http from 'http';

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

test('GET /api/health returns healthy status', async () => {
  const res = await fetch(`${baseUrl}/api/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.status, 'healthy');
  assert.equal(data.data.version, '2.0.0');
});

test('GET /api/finance/terms returns glossary dictionary', async () => {
  const res = await fetch(`${baseUrl}/api/finance/terms`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.data.burnRate);
  assert.ok(data.data.runway);
  assert.ok(data.data.safeSurplus);
  assert.ok(data.data.dso);
  assert.ok(data.data.capex);
});

test('POST /api/finance/metrics calculates headline summary and metrics', async () => {
  const payload = {
    transactions: [
      {
        id: 'tx-1',
        date: '2026-10-01',
        type: 'income',
        amount: 300000,
        category: 'Client Payment',
        note: 'Invoice A',
      },
      {
        id: 'tx-2',
        date: '2026-10-05',
        type: 'expense',
        amount: 100000,
        category: 'Staff Salaries',
        note: 'Salaries',
      },
    ],
    initialBalance: 200000,
    minCashRequired: 250000,
    language: 'en',
  };

  const res = await fetch(`${baseUrl}/api/finance/metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.metrics.currentBalance, 400000); // 200k + 300k - 100k
  assert.equal(data.data.metrics.safeSurplus, 150000); // 400k - 250k
  assert.ok(data.data.headlineSummary.plainText.includes('Runway:'));
  assert.ok(data.data.headlineSummary.plainText.includes('Safe surplus:'));
  assert.equal(data.data.status, 'healthy');
});

test('POST /api/finance/metrics returns 400 on invalid input', async () => {
  const badPayload = {
    transactions: 'not-an-array',
    initialBalance: 200000,
    minCashRequired: -50,
  };

  const res = await fetch(`${baseUrl}/api/finance/metrics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(badPayload),
  });

  assert.equal(res.status, 400);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.error.includes('Validation Error'));
});

test('GET and POST /api/user/settings manages language and reserve settings', async () => {
  // GET
  const getRes = await fetch(`${baseUrl}/api/user/settings`);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.equal(getData.data.schemaVersion, 2);

  // POST update to hinglish
  const postRes = await fetch(`${baseUrl}/api/user/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: 'hinglish',
      minCashRequired: 320000,
    }),
  });

  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  assert.equal(postData.data.language, 'hinglish');
  assert.equal(postData.data.minCashRequired, 320000);
});

test('Auth token validation rejects malformed Bearer header', async () => {
  const res = await fetch(`${baseUrl}/api/finance/metrics`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Basic invalidcredentials',
    },
    body: JSON.stringify({ transactions: [], initialBalance: 100, minCashRequired: 50 }),
  });

  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.success, false);
  assert.ok(data.error.includes('Unauthorized'));
});

test('POST /api/import/validate executes server-side CSV parsing and per-row validation', async () => {
  const validCSV = `Date,Description,Debit,Credit
2026-10-01,Client Settlement,,120000
2026-10-02,Staff Payroll,80000,
invalid-date,Bad Date Row,10000,`;

  const payload = {
    rawCSV: validCSV,
    mapping: {
      dateColumn: 'Date',
      descriptionColumn: 'Description',
      debitColumn: 'Debit',
      creditColumn: 'Credit',
    },
    defaultAccountId: 'acc-primary',
  };

  const res = await fetch(`${baseUrl}/api/import/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.totalRows, 3);
  assert.equal(data.data.validCount, 2);
  assert.equal(data.data.errorCount, 1);
  assert.equal(data.data.totalInflow, 120000);
  assert.equal(data.data.totalOutflow, 80000);
  assert.ok(data.data.rows[2].error.includes('Invalid date'));
});

test('POST /api/import/batch creates transactions with accountId', async () => {
  const payload = {
    transactions: [
      {
        date: '2026-10-20',
        type: 'income',
        amount: 50000,
        category: 'Client Payment',
        note: 'Batch imported item',
      },
    ],
    accountId: 'acc-reserve',
  };

  const res = await fetch(`${baseUrl}/api/import/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.data.importedCount, 1);
  assert.equal(data.data.createdTransactions[0].accountId, 'acc-reserve');
  assert.ok(data.data.createdTransactions[0].id.startsWith('tx-import-'));
});

test('GET and POST /api/accounts manages bank accounts', async () => {
  // GET default accounts
  const getRes = await fetch(`${baseUrl}/api/accounts`);
  assert.equal(getRes.status, 200);
  const getData = await getRes.json();
  assert.equal(getData.success, true);
  assert.ok(Array.isArray(getData.data));
  assert.ok(getData.data.length >= 2);

  // POST new account
  const postRes = await fetch(`${baseUrl}/api/accounts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Kotak Tax Reserve A/c',
      bankName: 'Kotak Mahindra Bank',
      accountType: 'savings',
      initialBalance: 75000,
      accountNumberMasked: '•••• 1122',
      color: '#6366f1',
    }),
  });

  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  assert.equal(postData.data.name, 'Kotak Tax Reserve A/c');
  assert.equal(postData.data.accountType, 'savings');
  assert.equal(postData.data.initialBalance, 75000);
});

test('POST /api/user/settings stores onboardingCompleted flag', async () => {
  const postRes = await fetch(`${baseUrl}/api/user/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      onboardingCompleted: true,
      primaryAccountId: 'acc-primary',
    }),
  });

  assert.equal(postRes.status, 200);
  const postData = await postRes.json();
  assert.equal(postData.success, true);
  assert.equal(postData.data.onboardingCompleted, true);
  assert.equal(postData.data.primaryAccountId, 'acc-primary');
});

