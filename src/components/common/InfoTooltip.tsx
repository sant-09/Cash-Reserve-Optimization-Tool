import React, { useState, useRef, useEffect } from 'react';
import { Info, X, Sparkles, Calculator } from 'lucide-react';
import { FinanceTermKey } from '../../types/finance';
import { FINANCE_TERMS } from '../../utils/finance';
import { useCash } from '../../context/CashContext';

interface InfoTooltipProps {
  termKey: FinanceTermKey;
  className?: string;
  size?: 'sm' | 'md';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  termKey,
  className = '',
  size = 'sm',
}) => {
  const { language } = useCash();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const termData = FINANCE_TERMS[termKey];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!termData) return null;

  return (
    <div ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`inline-flex items-center justify-center rounded-full text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500`}
        aria-label={`Definition of ${termData.term}`}
        title={`Finance term info: ${termData.term}`}
      >
        <Info className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2.5 h-2.5 bg-slate-900 border-r border-b border-slate-700 rotate-45" />

          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 font-bold text-xs text-white">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{termData.term}</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-md transition-colors"
              aria-label="Close tooltip"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Definition */}
          <div className="py-2 space-y-2 text-xs">
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {termData.definition}
            </p>

            {/* Formula (if any) */}
            {termData.formula && (
              <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/80 text-[10px] text-slate-300 flex items-start gap-1.5 font-mono">
                <Calculator className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                <span className="break-all">{termData.formula}</span>
              </div>
            )}

            {/* Hinglish Explanation */}
            {language === 'hinglish' ? (
              <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/60 text-[11px] text-emerald-200">
                <span className="font-bold text-emerald-300">आसान भाषा: </span>
                <span>{termData.hinglish}</span>
              </div>
            ) : (
              <details className="text-[10px] text-slate-400 group">
                <summary className="cursor-pointer hover:text-emerald-400 select-none flex items-center gap-1">
                  <span>Hinglish summary</span>
                </summary>
                <p className="pt-1 text-[11px] text-emerald-300/90 leading-snug">
                  {termData.hinglish}
                </p>
              </details>
            )}

            {/* Business Tip */}
            <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              <span>Tip: {termData.practicalTip}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
