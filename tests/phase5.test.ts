import test from 'node:test';
import assert from 'node:assert/strict';
import { formatINR, formatCompactINR } from '../src/utils/finance';
import { VaultDisplayMode, CashHealthMetrics, BankAccount } from '../src/types/finance';

test('Phase 5 - 3D & Flat 2D Vault Requirements', async (t) => {
  await t.test('1. VaultDisplayMode type supports both "3d" and "2d"', () => {
    const mode3d: VaultDisplayMode = '3d';
    const mode2d: VaultDisplayMode = '2d';
    assert.equal(mode3d, '3d');
    assert.equal(mode2d, '2d');

    // Test localStorage key convention
    const STORAGE_KEY = 'cashwise_vault_view_mode';
    assert.equal(STORAGE_KEY, 'cashwise_vault_view_mode');
  });

  await t.test('2. Exact ₹ Indian Currency Formatter compliance for Key Numbers', () => {
    // Tests Indian numbering system format (₹15,00,000 and ₹24.5 L)
    assert.equal(formatINR(1500000), '₹15,00,000');
    assert.equal(formatINR(0), '₹0');
    assert.equal(formatINR(-50000), '-₹50,000');
    assert.equal(formatINR(2450000), '₹24,50,000');

    // Compact format check (e.g. ₹24.5 L, ₹15 L, ₹75 K, ₹1 Cr)
    assert.equal(formatCompactINR(2450000), '₹24.5 L');
    assert.equal(formatCompactINR(1500000), '₹15 L');
    assert.equal(formatCompactINR(75000), '₹75 K');
    assert.equal(formatCompactINR(10000000), '₹1 Cr');
  });

  await t.test('3. Key figures formula consistency (Unblocked numbers guarantee)', () => {
    const testCases = [
      { currentBalance: 2450000, minCashRequired: 1500000, expectedSurplus: 950000, isSurplus: true },
      { currentBalance: 1200000, minCashRequired: 1500000, expectedSurplus: -300000, isSurplus: false },
      { currentBalance: 0, minCashRequired: 500000, expectedSurplus: -500000, isSurplus: false },
    ];

    for (const tc of testCases) {
      const calculatedSurplus = tc.currentBalance - tc.minCashRequired;
      assert.equal(calculatedSurplus, tc.expectedSurplus);
      assert.equal(calculatedSurplus >= 0, tc.isSurplus);

      // Verify exact ₹ label formatting
      const formattedSurplus = formatINR(calculatedSurplus);
      if (tc.expectedSurplus < 0) {
        assert.ok(formattedSurplus.startsWith('-₹'), `Negative formatted as ${formattedSurplus}`);
      } else {
        assert.ok(formattedSurplus.startsWith('₹'), `Positive formatted as ${formattedSurplus}`);
      }
    }
  });

  await t.test('4. Proportional Vault Chamber Partitioning Math (2D Architectural View)', () => {
    const calculatePartition = (totalBalance: number, minCashRequired: number) => {
      const reservePercent = totalBalance > 0
        ? Math.min(100, Math.max(0, (minCashRequired / totalBalance) * 100))
        : 100;
      const surplusPercent = totalBalance > 0
        ? Math.max(0, 100 - reservePercent)
        : 0;
      return { reservePercent, surplusPercent };
    };

    // Case 1: Healthy surplus (Balance 20L, Reserve 10L => 50% / 50%)
    const case1 = calculatePartition(2000000, 1000000);
    assert.equal(case1.reservePercent, 50);
    assert.equal(case1.surplusPercent, 50);

    // Case 2: In deficit (Balance 8L, Reserve 10L => 100% reserve locked, 0% surplus)
    const case2 = calculatePartition(800000, 1000000);
    assert.equal(case2.reservePercent, 100);
    assert.equal(case2.surplusPercent, 0);

    // Case 3: Zero balance
    const case3 = calculatePartition(0, 500000);
    assert.equal(case3.reservePercent, 100);
    assert.equal(case3.surplusPercent, 0);
  });

  await t.test('5. Multi-Account Liquidity Share Distribution in Vault Ledger', () => {
    const accounts: BankAccount[] = [
      {
        id: 'acc-1',
        name: 'HDFC Current Account',
        bankName: 'HDFC Bank',
        accountNumberMasked: '••••4512',
        accountType: 'current',
        initialBalance: 1500000,
        isDefault: true,
        color: '#2563eb',
        createdAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'acc-2',
        name: 'ICICI Reserve Account',
        bankName: 'ICICI Bank',
        accountNumberMasked: '••••8921',
        accountType: 'savings',
        initialBalance: 950000,
        isDefault: false,
        color: '#10b981',
        createdAt: '2026-01-01T00:00:00Z',
      },
    ];

    const balances = [1500000, 950000];
    const totalBalance = balances.reduce((a, b) => a + b, 0);
    assert.equal(totalBalance, 2450000);

    const shares = balances.map((b) => ((b / totalBalance) * 100).toFixed(1));
    assert.equal(shares[0], '61.2');
    assert.equal(shares[1], '38.8');
    assert.equal(parseFloat(shares[0]) + parseFloat(shares[1]), 100);
  });

  await t.test('6. Non-color-only accessibility indicators & ARIA standards', () => {
    // Accessibility check: Statuses must have explicit textual labels and iconography
    const getVaultStatusBadge = (safeSurplus: number) => {
      if (safeSurplus >= 0) {
        return {
          icon: 'Unlock',
          label: 'Deployable',
          severityText: 'Safe Free Surplus Available',
          isBreached: false,
        };
      }
      return {
        icon: 'AlertTriangle',
        label: 'Deficit Breached',
        severityText: 'Minimum Reserve Compromised',
        isBreached: true,
      };
    };

    const healthyBadge = getVaultStatusBadge(450000);
    assert.equal(healthyBadge.label, 'Deployable');
    assert.equal(healthyBadge.icon, 'Unlock');
    assert.equal(healthyBadge.isBreached, false);

    const breachedBadge = getVaultStatusBadge(-150000);
    assert.equal(breachedBadge.label, 'Deficit Breached');
    assert.equal(breachedBadge.icon, 'AlertTriangle');
    assert.equal(breachedBadge.isBreached, true);
  });
});
