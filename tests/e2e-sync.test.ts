import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCashHealth, generateHeadlineSummary, getHealthStatus } from '../src/utils/finance';
import { validateUserSettings, validateTransactionData } from './validation.test';
import { Transaction, UserSettings } from '../src/types/finance';

// Simulated storage abstraction matching LocalStorage and Firestore adapter
class MockStorage {
  private store: Map<string, string> = new Map();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

// Simulated CashContext storage manager with schema versioning & migration
class CashStorageManager {
  private storage: MockStorage;
  static readonly SCHEMA_VERSION = 2;
  static readonly KEYS = {
    SCHEMA_VERSION: 'cashwise_schema_version',
    TX: 'cashwise_transactions',
    INITIAL_BAL: 'cashwise_initial_balance',
    MIN_CASH: 'cashwise_min_cash',
    SETTINGS: 'cashwise_settings',
    LANGUAGE: 'cashwise_language',
  };

  constructor(storage: MockStorage) {
    this.storage = storage;
  }

  // Load and automatically migrate from v1 (unversioned) to v2
  loadSettings(): UserSettings {
    const rawVersion = this.storage.getItem(CashStorageManager.KEYS.SCHEMA_VERSION);
    const version = rawVersion ? parseInt(rawVersion, 10) : 1;

    if (version < 2) {
      // Migrate from v1
      const oldMinCash = this.storage.getItem(CashStorageManager.KEYS.MIN_CASH);
      const oldInitBal = this.storage.getItem(CashStorageManager.KEYS.INITIAL_BAL);

      const migratedSettings: UserSettings = {
        minCashRequired: oldMinCash ? Number(oldMinCash) : 300000,
        initialBalance: oldInitBal ? Number(oldInitBal) : 350000,
        language: 'en',
        schemaVersion: 2,
        updatedAt: new Date().toISOString(),
      };

      this.saveSettings(migratedSettings);
      return migratedSettings;
    }

    const saved = this.storage.getItem(CashStorageManager.KEYS.SETTINGS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          minCashRequired: parsed.minCashRequired ?? 300000,
          initialBalance: parsed.initialBalance ?? 350000,
          language: parsed.language ?? 'en',
          schemaVersion: 2,
          updatedAt: parsed.updatedAt,
        };
      } catch {
        // fallback
      }
    }

    return {
      minCashRequired: 300000,
      initialBalance: 350000,
      language: 'en',
      schemaVersion: 2,
    };
  }

  saveSettings(settings: UserSettings): void {
    this.storage.setItem(CashStorageManager.KEYS.SCHEMA_VERSION, '2');
    this.storage.setItem(CashStorageManager.KEYS.SETTINGS, JSON.stringify(settings));
    this.storage.setItem(CashStorageManager.KEYS.LANGUAGE, settings.language);
    this.storage.setItem(CashStorageManager.KEYS.MIN_CASH, settings.minCashRequired.toString());
    if (settings.initialBalance !== undefined) {
      this.storage.setItem(CashStorageManager.KEYS.INITIAL_BAL, settings.initialBalance.toString());
    }
  }
}

test('End-to-End: LocalStorage v1 to v2 migration preserves existing values and adds language', () => {
  const mockLocalStorage = new MockStorage();

  // Setup legacy v1 unversioned data
  mockLocalStorage.setItem('cashwise_min_cash', '280000');
  mockLocalStorage.setItem('cashwise_initial_balance', '420000');

  const manager = new CashStorageManager(mockLocalStorage);
  const loaded = manager.loadSettings();

  // Preserves existing numbers while upgrading to schema v2
  assert.equal(loaded.minCashRequired, 280000);
  assert.equal(loaded.initialBalance, 420000);
  assert.equal(loaded.language, 'en');
  assert.equal(loaded.schemaVersion, 2);

  // Verifies v2 schema key was written
  assert.equal(mockLocalStorage.getItem('cashwise_schema_version'), '2');
});

test('End-to-End: Firestore Document Sync & Language Toggle round-trip', () => {
  const userId = 'firebase-user-999';

  // 1. User updates settings in UI (toggles to Hinglish and updates reserve buffer)
  const updatedSettings: UserSettings = {
    minCashRequired: 350000,
    initialBalance: 400000,
    language: 'hinglish',
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
  };

  // 2. Validate against Firestore Rules validator
  const rulesValidation = validateUserSettings(updatedSettings);
  assert.equal(rulesValidation.valid, true);

  // 3. User records a new transaction in UI
  const newTx: Transaction = {
    id: 'tx-e2e-1',
    date: '2026-10-28',
    type: 'income',
    amount: 150000,
    category: 'Client Payment',
    note: 'Enterprise retainer payment',
  };

  const txValidation = validateTransactionData({ ...newTx, userId }, userId);
  assert.equal(txValidation.valid, true);

  // 4. Data reloaded from Firestore -> CashContext calculation pipeline
  const transactions = [newTx];
  const metrics = calculateCashHealth(transactions, updatedSettings.initialBalance!, updatedSettings.minCashRequired);
  const headline = generateHeadlineSummary(metrics, transactions, updatedSettings.language);
  const status = getHealthStatus(metrics);

  // Current balance = 400k + 150k = 550,000
  // Safe surplus = 550k - 350k = 200,000
  assert.equal(metrics.currentBalance, 550000);
  assert.equal(metrics.safeSurplus, 200000);
  assert.equal(status, 'healthy');

  // Verify headline reflects Hinglish language toggle
  assert.ok(headline.plainText.includes('din'));
  assert.ok(headline.plainText.includes('Safe surplus: ₹2 L'));
});
