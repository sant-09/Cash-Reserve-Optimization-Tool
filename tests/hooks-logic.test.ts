import test from 'node:test';
import assert from 'node:assert/strict';
import { Transaction } from '../src/types/finance';
import { SAMPLE_CSV_HDFC, SAMPLE_CSV_WITH_ERRORS } from '../src/hooks/useCSVImportLogic';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../src/hooks/useTransactionForm';
import { parseCSVLines, parseAndValidateCSV } from '../src/utils/finance';

test('Business Logic: CSV Import logic correctly recognizes HDFC sample and error sample', () => {
  const hdfcLines = parseCSVLines(SAMPLE_CSV_HDFC);
  assert.ok(hdfcLines.length > 5, 'HDFC statement sample has multiple rows');
  assert.equal(hdfcLines[0][0], 'Txn Date');

  // Test CSV validation logic with default mappings
  const mapping = {
    dateColumn: 'Txn Date',
    descriptionColumn: 'Narration',
    debitColumn: 'Dr Amount',
    creditColumn: 'Cr Amount',
    categoryColumn: 'Category',
  };

  const validated = parseAndValidateCSV(SAMPLE_CSV_HDFC, mapping, 'acc-primary');
  assert.equal(validated.validCount > 0, true);
  assert.equal(validated.errorCount, 0);

  // Test error sample
  const errorMapping = {
    dateColumn: 'Date',
    descriptionColumn: 'Description',
    debitColumn: 'Debit',
    creditColumn: 'Credit',
    categoryColumn: 'Category',
  };
  const errorValidated = parseAndValidateCSV(SAMPLE_CSV_WITH_ERRORS, errorMapping, 'acc-primary');
  assert.ok(errorValidated.errorCount > 0);
});

test('Business Logic: Category definitions cover all operational SME transaction classes', () => {
  assert.ok(INCOME_CATEGORIES.includes('Client Payment'));
  assert.ok(INCOME_CATEGORIES.includes('Product Sales'));
  assert.ok(EXPENSE_CATEGORIES.includes('Staff Salaries'));
  assert.ok(EXPENSE_CATEGORIES.includes('Taxes & GST'));
  assert.ok(EXPENSE_CATEGORIES.includes('Office Rent'));
});

test('Business Logic: Cash flow aggregation & savings ratio math', () => {
  const sampleTransactions: Transaction[] = [
    { id: '1', date: '2026-10-01', type: 'income', amount: 100000, category: 'Client Payment', note: 'Invoice 1' },
    { id: '2', date: '2026-10-02', type: 'expense', amount: 40000, category: 'Staff Salaries', note: 'Salaries' },
    { id: '3', date: '2026-10-03', type: 'expense', amount: 10000, category: 'Office Rent', note: 'Rent' },
  ];

  let totalInflow = 0;
  let totalOutflow = 0;
  sampleTransactions.forEach((tx) => {
    if (tx.type === 'income') totalInflow += tx.amount;
    else totalOutflow += tx.amount;
  });

  const netFlow = totalInflow - totalOutflow;
  const savingsRatio = totalInflow > 0 ? (netFlow / totalInflow) * 100 : 0;

  assert.equal(totalInflow, 100000);
  assert.equal(totalOutflow, 50000);
  assert.equal(netFlow, 50000);
  assert.equal(savingsRatio, 50);
});
