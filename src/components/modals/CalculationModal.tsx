import React, { useMemo } from 'react';
import {
  Calculator,
  X,
  Sparkles,
} from 'lucide-react';
import { useCash } from '../../context/CashContext';
import { getMetricCalculationExplanation } from '../../utils/finance';
import { MetricCalculationKey } from '../../types/finance';

interface CalculationModalProps {
  isOpen: boolean;
  onClose: () => void;
  metricKey: MetricCalculationKey | null;
}

export const CalculationModal: React.FC<CalculationModalProps> = ({
  isOpen,
  onClose,
  metricKey,
}) => {
  const {
    initialBalance,
    metrics,
    minCashRequired,
    transactions,
    accounts,
    shortfallInfo,
    language,
  } = useCash();

  // Compute explanation directly from the exact mathematical function
  const explanation = useMemo(() => {
    if (!metricKey) return null;
    return getMetricCalculationExplanation(metricKey, {
      initialBalance,
      currentBalance: metrics.currentBalance,
      minCashRequired,
      transactions,
      accounts,
      metrics,
      shortfallInfo,
    });
  }, [metricKey, initialBalance, metrics, minCashRequired, transactions, accounts, shortfallInfo]);

  if (!isOpen || !explanation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-6 p-6 sm:p-7 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Formula Breakdown
                </span>
                <span className="text-xs text-slate-400">Zero-Drift Mathematical Parity</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                {explanation.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close calculation panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Mathematical Formula Display Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-slate-50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-100 dark:border-indigo-900/50 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-900 dark:text-indigo-300">
              {explanation.formulaName}
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-white/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Live Formula
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white dark:bg-slate-950 border border-indigo-200/60 dark:border-indigo-800/60 font-mono text-sm sm:text-base font-bold text-indigo-600 dark:text-indigo-400 overflow-x-auto shadow-2xs">
            {explanation.formulaDisplay}
          </div>
        </div>

        {/* 2. Active Inputs Table (Direct from live context) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 dark:text-white">
              Current Live Inputs Plugged In:
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Extracted from your actual transactions & settings
            </span>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 text-[11px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Variable / Input</th>
                  <th className="py-2.5 px-3">Value</th>
                  <th className="py-2.5 px-3 hidden sm:table-cell">Source / Context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {explanation.inputs.map((inp, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-slate-800 dark:text-slate-200">
                      <div>{inp.label}</div>
                      {inp.description && (
                        <div className="text-[10px] text-slate-400 font-normal">
                          {inp.description}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {inp.value}
                    </td>
                    <td className="py-2.5 px-3 text-[11px] text-slate-500 dark:text-slate-400 hidden sm:table-cell">
                      {inp.source || 'CashWise Engine'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Step-by-Step Computation Breakdown */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-900 dark:text-white">
            Step-by-Step Computation:
          </span>
          <div className="space-y-1.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 font-mono text-xs text-slate-700 dark:text-slate-300">
            {explanation.computationSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-indigo-500 dark:text-indigo-400 font-bold">›</span>
                <span>{step}</span>
              </div>
            ))}
            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between font-sans">
              <span className="font-bold text-slate-900 dark:text-white text-xs">
                Final Result Output:
              </span>
              <span className="font-mono text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                {explanation.finalResultFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* 4. Plain-Language Interpretation & Hinglish Tip */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-bold">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>CFO Interpretation & Actionable Recommendation</span>
          </div>
          <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed">
            {explanation.interpretation}
          </p>
          <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 flex items-start gap-2 text-emerald-700 dark:text-emerald-400 text-[11px]">
            <span className="font-bold uppercase tracking-wider text-[10px] bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded-sm shrink-0">
              Practical Tip
            </span>
            <span>{explanation.actionableTip}</span>
          </div>
          {language === 'hinglish' && explanation.hinglishExplanation && (
            <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 italic text-[11px]">
              🇮🇳 <strong>Hinglish Summary:</strong> {explanation.hinglishExplanation}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <span className="text-[11px] text-slate-400">
            Evaluated via <code className="font-mono">src/utils/finance.ts</code>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-xs"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  );
};
