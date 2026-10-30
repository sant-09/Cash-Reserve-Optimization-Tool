import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseCSVLines,
  normalizeDateString,
  cleanCurrencyAmount,
  inferTransactionCategory,
  parseAndValidateCSV,
  calculateTotalCashPosition,
  exportTransactionsToCSV,
} from '../src/utils/finance';
import { BankAccount, CSVColumnMapping, Transaction } from '../src/types/finance';

test('parseCSVLines parses standard, quoted, and BOM CSV strings', () => {
  const csvWithBOM = '\uFEFFDate,Description,Debit,Credit\n2026-10-01,"Payment to Vendor, Inc",15000,\n2026-10-02,Client Inflow,,45000\n';
  const rows = parseCSVLines(csvWithBOM);

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['Date', 'Description', 'Debit', 'Credit']);
  assert.equal(rows[1][1], 'Payment to Vendor, Inc');
  assert.equal(rows[1][2], '15000');
  assert.equal(rows[2][3], '45000');
});

test('normalizeDateString parses multiple bank date formats', () => {
  // YYYY-MM-DD
  assert.equal(normalizeDateString('2026-10-28'), '2026-10-28');
  assert.equal(normalizeDateString('2026/10/28'), '2026-10-28');

  // Indian Bank Statement format DD/MM/YYYY or DD-MM-YYYY
  assert.equal(normalizeDateString('15/10/2026'), '2026-10-15');
  assert.equal(normalizeDateString('05-09-2026'), '2026-09-05');

  // Invalid date
  assert.equal(normalizeDateString('invalid-date'), null);
});

test('cleanCurrencyAmount removes currency symbols and formatting', () => {
  assert.equal(cleanCurrencyAmount('₹ 1,50,000.00'), 150000);
  assert.equal(cleanCurrencyAmount('$45,200'), 45200);
  assert.equal(cleanCurrencyAmount(12000), 12000);
  assert.equal(cleanCurrencyAmount(''), 0);
});

test('inferTransactionCategory accurately tags SME income and expense narrations', () => {
  assert.equal(inferTransactionCategory('Monthly Salary for Tech Team', 'expense'), 'Staff Salaries');
  assert.equal(inferTransactionCategory('Rent for Indiranagar Office', 'expense'), 'Office Rent');
  assert.equal(inferTransactionCategory('AWS Cloud hosting invoice', 'expense'), 'Software & SaaS');
  assert.equal(inferTransactionCategory('Payment received from Acme Corp client', 'income'), 'Client Payment');
  assert.equal(inferTransactionCategory('Shopify store online sales settlement', 'income'), 'Product Sales');
});

test('parseAndValidateCSV parses valid CSV and flags per-row validation errors', () => {
  const sampleCSV = `Txn Date,Narration,Dr Amount,Cr Amount,Tag
2026-10-01,Client Retainer Inflow,,150000,Client Payment
2026-10-03,Office Coworking Space,45000,,Office Rent
99/99/9999,Malformed Date Row,,50000,Other Inflow
2026-10-05,Zero Amount Row,0,,Vendor / Supplier
2026-10-08,Raw Material Purchase,25000,,Vendor / Supplier`;

  const mapping: CSVColumnMapping = {
    dateColumn: 'Txn Date',
    descriptionColumn: 'Narration',
    debitColumn: 'Dr Amount',
    creditColumn: 'Cr Amount',
    categoryColumn: 'Tag',
  };

  const result = parseAndValidateCSV(sampleCSV, mapping, 'acc-primary');

  assert.equal(result.totalRows, 5);
  assert.equal(result.validCount, 3);
  assert.equal(result.errorCount, 2);
  assert.equal(result.totalInflow, 150000);
  assert.equal(result.totalOutflow, 70000); // 45k + 25k

  // Row 1: Valid income
  assert.equal(result.rows[0].isValid, true);
  assert.equal(result.rows[0].parsedTransaction?.amount, 150000);
  assert.equal(result.rows[0].parsedTransaction?.type, 'income');
  assert.equal(result.rows[0].parsedTransaction?.accountId, 'acc-primary');

  // Row 2: Valid expense
  assert.equal(result.rows[1].isValid, true);
  assert.equal(result.rows[1].parsedTransaction?.amount, 45000);
  assert.equal(result.rows[1].parsedTransaction?.type, 'expense');

  // Row 3: Malformed date error
  assert.equal(result.rows[2].isValid, false);
  assert.ok(result.rows[2].error?.includes('Invalid date'));

  // Row 4: Zero amount error
  assert.equal(result.rows[3].isValid, false);
  assert.ok(result.rows[3].error?.includes('amount must be greater than zero'));

  // Row 5: Valid expense
  assert.equal(result.rows[4].isValid, true);
  assert.equal(result.rows[4].parsedTransaction?.amount, 25000);
});

test('Multiple Bank Accounts: calculateTotalCashPosition with default migration', () => {
  const accounts: BankAccount[] = [
    {
      id: 'acc-hdfc',
      name: 'HDFC Current A/c',
      bankName: 'HDFC Bank',
      accountType: 'current',
      initialBalance: 300000,
      isDefault: true,
    },
    {
      id: 'acc-icici',
      name: 'ICICI Savings A/c',
      bankName: 'ICICI Bank',
      accountType: 'savings',
      initialBalance: 100000,
      isDefault: false,
    },
  ];

  const transactions: Transaction[] = [
    // Existing transaction WITHOUT accountId (must migrate to default acc-hdfc)
    {
      id: 'tx-legacy-1',
      date: '2026-10-10',
      type: 'income',
      amount: 150000,
      category: 'Client Payment',
      note: 'Legacy invoice without accountId',
    },
    // New transaction explicitly for ICICI
    {
      id: 'tx-new-1',
      date: '2026-10-12',
      type: 'expense',
      amount: 20000,
      category: 'Taxes & GST',
      note: 'TDS advance',
      accountId: 'acc-icici',
    },
    // Expense on HDFC
    {
      id: 'tx-new-2',
      date: '2026-10-15',
      type: 'expense',
      amount: 50000,
      category: 'Staff Salaries',
      note: 'Salaries',
      accountId: 'acc-hdfc',
    },
  ];

  const position = calculateTotalCashPosition(accounts, transactions);

  // Initial balances: 300k (HDFC) + 100k (ICICI) = 400k
  assert.equal(position.totalInitialBalance, 400000);

  // Inflows: 150k on HDFC
  assert.equal(position.totalInflow, 150000);

  // Outflows: 50k on HDFC + 20k on ICICI = 70k
  assert.equal(position.totalOutflow, 70000);

  // Total balance: 400k + 150k - 70k = 480k
  assert.equal(position.totalBalance, 480000);

  // Per-account breakdown
  const hdfcSummary = position.accountBreakdown.find((b) => b.account.id === 'acc-hdfc')!;
  assert.ok(hdfcSummary);
  // HDFC: initial 300k + 150k (migrated legacy) - 50k = 400,000
  assert.equal(hdfcSummary.currentBalance, 400000);
  assert.equal(hdfcSummary.transactionCount, 2);

  const iciciSummary = position.accountBreakdown.find((b) => b.account.id === 'acc-icici')!;
  assert.ok(iciciSummary);
  // ICICI: initial 100k - 20k = 80,000
  assert.equal(iciciSummary.currentBalance, 80000);
  assert.equal(iciciSummary.transactionCount, 1);
});

test('exportTransactionsToCSV preserves UTF-8 BOM and account structure', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx-bom-1',
      date: '2026-10-28',
      type: 'income',
      amount: 50000,
      category: 'Client Payment',
      note: 'Export check',
      accountId: 'acc-primary',
    },
  ];

  const csv = exportTransactionsToCSV(transactions, {
    businessName: 'Apex Craft LLP',
    includeSummaryHeader: true,
    includeRunningBalance: true,
    initialBalance: 100000,
  });

  // Verify UTF-8 BOM character (\uFEFF) is at index 0
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.ok(csv.includes('Apex Craft LLP'));
  assert.ok(csv.includes('Client Payment'));
  assert.ok(csv.includes('50000'));
});
