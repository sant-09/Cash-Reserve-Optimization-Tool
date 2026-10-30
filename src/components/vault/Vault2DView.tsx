import React from 'react';
import {
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  Wallet,
  Building2,
  Clock,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Unlock,
  CheckCircle2,
  Layers,
  Info,
} from 'lucide-react';
import { useCash } from '../../context/CashContext';
import { formatINR, formatCompactINR } from '../../utils/finance';

export const Vault2DView: React.FC = () => {
  const { metrics, minCashRequired, totalCashPosition, accounts } = useCash();

  const totalBalance = metrics.currentBalance;
  const isSurplus = metrics.safeSurplus >= 0;

  // Calculate reserve vs surplus percentages
  const reservePercent = totalBalance > 0
    ? Math.min(100, Math.max(0, (minCashRequired / totalBalance) * 100))
    : 100;
  const surplusPercent = totalBalance > 0
    ? Math.max(0, 100 - reservePercent)
    : 0;

  return (
    <div
      role="region"
      aria-label="Flat 2D Capital Vault Architectural Breakdown"
      className="space-y-6 w-full animate-fade-in"
    >
      {/* 1. Primary Vault Fortress Summary Banner */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Flat 2D Architectural View
              </span>
              <span className="text-slate-400 text-xs">·</span>
              <span className="text-xs text-slate-300 font-medium">
                High-Contrast Financial Chamber Ledger
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Total Operative Cash In Vault
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold tracking-tight font-mono text-white mt-1">
                {formatINR(totalBalance)}
              </div>
            </div>
            <p className="text-xs text-slate-400 max-w-xl">
              Physical & digital liquidity partitioned strictly between non-negotiable safety reserves and deployable free surplus.
            </p>
          </div>

          {/* Quick KPI Quad */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 shrink-0">
            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-blue-400" />
                <span>Cash Runway</span>
              </div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {metrics.daysOfCashLeft} Days
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <span>Monthly Burn</span>
              </div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {formatCompactINR(metrics.monthlyAverageExpense)}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/60 col-span-2 sm:col-span-1">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Bank Accounts</span>
              </div>
              <div className="text-lg font-bold font-mono text-white mt-0.5">
                {accounts.length} Active
              </div>
            </div>
          </div>
        </div>

        {/* Proportional Vault Partition Bar */}
        <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
              <span className="font-semibold">Chamber A: Minimum Safety Reserve ({reservePercent.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full inline-block ${isSurplus ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className="font-semibold">
                {isSurplus
                  ? `Chamber B: Safe Free Surplus (${surplusPercent.toFixed(0)}%)`
                  : `Chamber B: Reserve Deficit (-${formatCompactINR(Math.abs(metrics.safeSurplus))})`}
              </span>
            </div>
          </div>

          <div
            className="w-full h-4 bg-slate-800 rounded-full overflow-hidden flex shadow-inner p-0.5"
            role="progressbar"
            aria-valuenow={reservePercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Vault Chamber Allocation Ratio"
          >
            <div
              style={{ width: `${reservePercent}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-500"
              title={`Minimum Reserve Buffer: ${formatINR(minCashRequired)}`}
            />
            {isSurplus && surplusPercent > 0 && (
              <div
                style={{ width: `${surplusPercent}%` }}
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 ml-0.5"
                title={`Safe Free Surplus: ${formatINR(metrics.safeSurplus)}`}
              />
            )}
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Dual Chamber Ingot Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* Chamber A: Minimum Safety Reserve */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                  Chamber 01
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Minimum Operating Reserve
                </h3>
              </div>
            </div>

            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Locked Buffer</span>
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Exact Target Threshold
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-white mt-0.5">
              {formatINR(minCashRequired)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <span>Coverage:</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {(minCashRequired / (metrics.monthlyAverageExpense || 1)).toFixed(1)} Months Operating Burn
              </span>
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Guarantees non-negotiable staff payroll and mandatory GST / tax payments.</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>Protects business from sudden invoice collection defaults or 30-day client delays.</span>
            </div>
          </div>
        </div>

        {/* Chamber B: Safe Free Surplus / Deficit */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                  isSurplus
                    ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-400'
                }`}
              >
                {isSurplus ? <Sparkles className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <div>
                <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                  Chamber 02
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Safe Free Capital Surplus
                </h3>
              </div>
            </div>

            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${
                isSurplus
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800'
              }`}
            >
              {isSurplus ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Deployable</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  <span>Deficit Breached</span>
                </>
              )}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Exact Net Free Cash
            </div>
            <div
              className={`text-2xl sm:text-3xl font-extrabold font-mono mt-0.5 ${
                isSurplus
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatINR(metrics.safeSurplus)}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Formula: Current Balance ({formatINR(totalBalance)}) − Safety Reserve ({formatINR(minCashRequired)})
            </div>
          </div>

          <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
            {isSurplus ? (
              <>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>100% safe to deploy into Overnight Mutual Funds or 7-day Flexible FDs.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Zero risk of bounced payroll cheques or vendor overdraft penalties.</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Buffer breached by {formatINR(Math.abs(metrics.safeSurplus))}. Avoid all CapEx withdrawals.</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>Accelerate customer invoice follow-ups to replenish the minimum safety net.</span>
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* 3. Account-Level Vault Breakdown Table */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-500" />
              <span>Chamber Liquidity Distribution By Bank Account</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown of how your total cash position is distributed across registered accounts.
            </p>
          </div>

          <span className="text-xs font-mono text-slate-400">
            {accounts.length} bank accounts tracked
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs" aria-label="Account Balances Breakdown">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] font-bold">
                <th className="py-2.5 px-3">Bank & Account Name</th>
                <th className="py-2.5 px-3">Account Type</th>
                <th className="py-2.5 px-3">Account Mask</th>
                <th className="py-2.5 px-3 text-right">Current Balance (₹)</th>
                <th className="py-2.5 px-3 text-right">Share of Vault</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {totalCashPosition.accountBreakdown.map((item) => {
                const acc = item.account;
                const sharePercent = totalBalance > 0
                  ? ((item.currentBalance / totalBalance) * 100).toFixed(1)
                  : '0.0';

                return (
                  <tr key={acc.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: acc.color || '#10b981' }}
                      />
                      <span>{acc.name}</span>
                      {acc.isDefault && (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Primary
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-600 dark:text-slate-400">
                      {acc.accountType}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500 dark:text-slate-400">
                      {acc.accountNumberMasked || '—'}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {formatINR(item.currentBalance)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-semibold text-slate-600 dark:text-slate-300">
                      {sharePercent}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
