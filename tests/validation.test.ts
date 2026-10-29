import test from 'node:test';
import assert from 'node:assert/strict';

// Helper mirror of validation rules defined in firestore.rules & server.ts
export function validateUserSettings(data: any): { valid: boolean; error?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Data must be an object' };
  }

  if (typeof data.minCashRequired !== 'number' || data.minCashRequired < 0) {
    return { valid: false, error: 'minCashRequired must be a non-negative number' };
  }

  if ('language' in data && data.language !== 'en' && data.language !== 'hinglish') {
    return { valid: false, error: 'language must be either "en" or "hinglish"' };
  }

  if ('initialBalance' in data && (typeof data.initialBalance !== 'number' || !isFinite(data.initialBalance))) {
    return { valid: false, error: 'initialBalance must be a finite number' };
  }

  if ('schemaVersion' in data && (typeof data.schemaVersion !== 'number' || data.schemaVersion < 1)) {
    return { valid: false, error: 'schemaVersion must be an integer >= 1' };
  }

  if ('onboardingCompleted' in data && typeof data.onboardingCompleted !== 'boolean') {
    return { valid: false, error: 'onboardingCompleted must be a boolean' };
  }

  if ('primaryAccountId' in data && (typeof data.primaryAccountId !== 'string' || data.primaryAccountId.length > 128)) {
    return { valid: false, error: 'primaryAccountId must be a string up to 128 characters' };
  }

  return { valid: true };
}

export function validateBankAccount(data: any): { valid: boolean; error?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Data must be an object' };
  }

  const required = ['id', 'name', 'bankName', 'accountType', 'initialBalance'];
  for (const field of required) {
    if (!(field in data)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  if (typeof data.id !== 'string' || data.id.length === 0 || data.id.length > 128) {
    return { valid: false, error: 'Invalid account id' };
  }

  if (typeof data.name !== 'string' || data.name.length === 0 || data.name.length > 100) {
    return { valid: false, error: 'Account name must be 1 to 100 characters' };
  }

  if (typeof data.bankName !== 'string' || data.bankName.length === 0 || data.bankName.length > 100) {
    return { valid: false, error: 'Bank name must be 1 to 100 characters' };
  }

  const allowedTypes = ['current', 'savings', 'overdraft', 'cash'];
  if (!allowedTypes.includes(data.accountType)) {
    return { valid: false, error: 'accountType must be one of current, savings, overdraft, cash' };
  }

  if (typeof data.initialBalance !== 'number' || !isFinite(data.initialBalance)) {
    return { valid: false, error: 'initialBalance must be a finite number' };
  }

  if ('accountNumberMasked' in data && (typeof data.accountNumberMasked !== 'string' || data.accountNumberMasked.length > 30)) {
    return { valid: false, error: 'accountNumberMasked must be string <= 30' };
  }

  if ('isDefault' in data && typeof data.isDefault !== 'boolean') {
    return { valid: false, error: 'isDefault must be a boolean' };
  }

  if ('color' in data && (typeof data.color !== 'string' || data.color.length > 30)) {
    return { valid: false, error: 'color must be string <= 30' };
  }

  return { valid: true };
}

export function validateTransactionData(data: any, userId: string): { valid: boolean; error?: string } {
  if (typeof data !== 'object' || data === null) {
    return { valid: false, error: 'Data must be an object' };
  }

  const required = ['id', 'date', 'type', 'amount', 'category', 'userId'];
  for (const field of required) {
    if (!(field in data)) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  if (typeof data.id !== 'string' || data.id.length === 0 || data.id.length > 128) {
    return { valid: false, error: 'Invalid transaction id' };
  }

  if (typeof data.date !== 'string' || data.date.length > 20) {
    return { valid: false, error: 'Invalid date string' };
  }

  if (data.type !== 'income' && data.type !== 'expense') {
    return { valid: false, error: 'Type must be income or expense' };
  }

  if (typeof data.amount !== 'number' || data.amount <= 0 || !isFinite(data.amount)) {
    return { valid: false, error: 'Amount must be greater than 0' };
  }

  if (typeof data.category !== 'string' || data.category.length > 100) {
    return { valid: false, error: 'Category exceeds max length' };
  }

  if (data.userId !== userId) {
    return { valid: false, error: 'Ownership check failed: userId mismatch' };
  }

  if ('accountId' in data && (typeof data.accountId !== 'string' || data.accountId.length > 128)) {
    return { valid: false, error: 'accountId must be string <= 128' };
  }

  return { valid: true };
}

test('validateUserSettings accepts valid Phase 1 settings', () => {
  const validV2 = {
    minCashRequired: 250000,
    initialBalance: 300000,
    language: 'en',
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
  };
  assert.equal(validateUserSettings(validV2).valid, true);

  const validHinglish = {
    minCashRequired: 0,
    language: 'hinglish',
    schemaVersion: 2,
  };
  assert.equal(validateUserSettings(validHinglish).valid, true);

  // Backward compatibility: old document without new fields
  const oldDoc = {
    minCashRequired: 150000,
  };
  assert.equal(validateUserSettings(oldDoc).valid, true);
});

test('validateUserSettings accepts and validates Phase 2 onboarding and account fields', () => {
  const validPhase2 = {
    minCashRequired: 300000,
    initialBalance: 350000,
    language: 'en',
    schemaVersion: 2,
    onboardingCompleted: true,
    primaryAccountId: 'acc-primary',
  };
  assert.equal(validateUserSettings(validPhase2).valid, true);

  // Invalid onboardingCompleted type
  assert.equal(validateUserSettings({ ...validPhase2, onboardingCompleted: 'yes' }).valid, false);

  // Invalid primaryAccountId type
  assert.equal(validateUserSettings({ ...validPhase2, primaryAccountId: 12345 }).valid, false);
});

test('validateUserSettings rejects invalid settings', () => {
  assert.equal(validateUserSettings({ minCashRequired: -500 }).valid, false);
  assert.equal(validateUserSettings({ minCashRequired: 200000, language: 'french' }).valid, false);
  assert.equal(validateUserSettings({ minCashRequired: 200000, schemaVersion: 0 }).valid, false);
  assert.equal(validateUserSettings({ minCashRequired: 200000, initialBalance: NaN }).valid, false);
});

test('validateBankAccount accepts valid bank accounts and rejects invalid shapes', () => {
  const validAccount = {
    id: 'acc-hdfc-01',
    name: 'Primary Operating Current A/c',
    bankName: 'HDFC Bank',
    accountType: 'current',
    initialBalance: 350000,
    accountNumberMasked: '•••• 4092',
    isDefault: true,
    color: '#10b981',
  };
  assert.equal(validateBankAccount(validAccount).valid, true);

  // Rejects invalid account type
  assert.equal(validateBankAccount({ ...validAccount, accountType: 'crypto' }).valid, false);

  // Rejects non-numeric initial balance
  assert.equal(validateBankAccount({ ...validAccount, initialBalance: '350000' }).valid, false);

  // Rejects missing required field
  const { bankName, ...missingBank } = validAccount;
  assert.equal(validateBankAccount(missingBank).valid, false);
});

test('validateTransactionData enforces ownership, positive amounts, types, and accountId', () => {
  const validTx = {
    id: 'tx-123',
    date: '2026-10-28',
    type: 'income',
    amount: 50000,
    category: 'Client Payment',
    userId: 'user-abc',
    accountId: 'acc-hdfc-01',
  };
  assert.equal(validateTransactionData(validTx, 'user-abc').valid, true);

  // Valid without accountId (backward compatibility)
  const { accountId, ...txWithoutAcc } = validTx;
  assert.equal(validateTransactionData(txWithoutAcc, 'user-abc').valid, true);

  // Rejects ownership mismatch
  assert.equal(validateTransactionData(validTx, 'different-user').valid, false);

  // Rejects zero or negative amount
  assert.equal(validateTransactionData({ ...validTx, amount: 0 }, 'user-abc').valid, false);
  assert.equal(validateTransactionData({ ...validTx, amount: -100 }, 'user-abc').valid, false);

  // Rejects invalid type
  assert.equal(validateTransactionData({ ...validTx, type: 'transfer' }, 'user-abc').valid, false);

  // Rejects non-string accountId
  assert.equal(validateTransactionData({ ...validTx, accountId: 999 }, 'user-abc').valid, false);
});
