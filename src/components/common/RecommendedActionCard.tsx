import React from 'react';
import { ArrowRight, Sparkles, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useCash, AppView } from '../../context/CashContext';
import { getRecommendedNextAction } from '../../utils/finance';

interface RecommendedActionCardProps {
  view: AppView;
  onActionClick?: () => void;
  className?: string;
}

export const RecommendedActionCard: React.FC<RecommendedActionCardProps> = ({
  view,
  onActionClick,
  className = '',
}) => {
  const { metrics, language, setActiveView } = useCash();
  const action = getRecommendedNextAction(view, metrics, language);

  const priorityStyles = {
    high: {
      badge: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
      label: 'High Priority',
      icon: AlertTriangle,
    },
    medium: {
      badge: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900',
      label: 'Recommended',
      icon: ShieldCheck,
    },
    low: {
      badge: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
      label: 'Growth Optimization',
      icon: Sparkles,
    },
  };

  const currentPriority = priorityStyles[action.priority];
  const PriorityIcon = currentPriority.icon;

  const handleAction = () => {
    if (onActionClick) {
      onActionClick();
    } else if (action.actionView) {
      setActiveView(action.actionView);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const displayText =
    language === 'hinglish' && action.hinglishDescription
      ? action.hinglishDescription
      : action.description;

  return (
    <div
      className={`p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl border border-slate-700/80 relative overflow-hidden ${className}`}
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Recommended Next Action</span>
            </span>
            <span
              className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${currentPriority.badge}`}
            >
              <PriorityIcon className="w-3 h-3" />
              <span>{currentPriority.label}</span>
            </span>
          </div>

          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
            {action.title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {displayText}
          </p>
        </div>

        <div className="shrink-0">
          <button
            onClick={handleAction}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 dark:bg-emerald-400 dark:hover:bg-emerald-300 rounded-xl shadow-md transition-all transform active:scale-95 whitespace-nowrap"
          >
            <span>{action.actionLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
