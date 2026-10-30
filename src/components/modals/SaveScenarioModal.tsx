import React, { useState } from 'react';
import { BookmarkPlus, X, Sparkles, Check, AlertCircle } from 'lucide-react';
import { useCash } from '../../context/CashContext';
import { formatINR } from '../../utils/finance';

interface SaveScenarioModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SaveScenarioModal: React.FC<SaveScenarioModalProps> = ({ isOpen, onClose }) => {
  const { scenario, saveScenario } = useCash();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a scenario name (e.g. "Q4 Festive Surge", "Supply Shock").');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);
      await saveScenario(name.trim(), scenario, description.trim() || undefined);
      setName('');
      setDescription('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save scenario.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/80 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <BookmarkPlus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                Scenario Vault
              </span>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white mt-0.5">
                Save Named What-If Scenario
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Simulation Parameters Preview */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2 text-xs">
          <div className="font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
            <span>Current Parameters to Save:</span>
            <span className="text-[10px] font-mono font-semibold text-purple-600 dark:text-purple-400">
              Simulation Snapshot
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Income Shift:</span>
              <strong className={scenario.incomeChangePercent >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                {scenario.incomeChangePercent > 0 ? `+${scenario.incomeChangePercent}%` : `${scenario.incomeChangePercent}%`}
              </strong>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Expense Shift:</span>
              <strong className={scenario.expenseChangePercent > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                {scenario.expenseChangePercent > 0 ? `+${scenario.expenseChangePercent}%` : `${scenario.expenseChangePercent}%`}
              </strong>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Receivable Delay:</span>
              <strong className="text-amber-600 dark:text-amber-400">
                {scenario.receivableDelayDays} Days
              </strong>
            </div>

            <div className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">One-Time Outflow:</span>
              <strong className="text-slate-800 dark:text-slate-200">
                {formatINR(scenario.oneTimeExpenseAmount)}
              </strong>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Scenario Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Q4 Worst Case: 30% Slump + Supplier Hike"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-800 dark:text-slate-200">
              Strategic Context / Rationale (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Models delayed payments from top 2 enterprise clients combined with factory maintenance."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold transition-colors disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? 'Saving to Vault...' : 'Save Scenario'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
