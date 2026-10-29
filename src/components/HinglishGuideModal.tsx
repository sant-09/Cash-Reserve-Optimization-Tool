import React from 'react';
import { X, ShieldCheck, Sparkles, TrendingUp, AlertTriangle, BookOpen } from 'lucide-react';

interface HinglishGuideModalProps {
  onClose: () => void;
}

export const HinglishGuideModal: React.FC<HinglishGuideModalProps> = ({ onClose }) => {
  const concepts = [
    {
      title: 'Current Cash Balance (कुल बैंक बैलेंस)',
      icon: <Sparkles className="w-4 h-4 text-emerald-500" />,
      english: 'The liquid money currently sitting across all your current accounts and business wallets.',
      hinglish: 'Aapke sabhi business bank accounts me abhi kitna cash ready pada hai.',
    },
    {
      title: 'Minimum Cash Reserve (इमरजेंसी सुरक्षा कवच)',
      icon: <ShieldCheck className="w-4 h-4 text-blue-500" />,
      english: 'The non-negotiable safety buffer (typically 3 months of operating expenses) to cover rent, salaries, and bills even if client payments get delayed.',
      hinglish: 'Woh zaruri paisa jo emergency ke liye hamesha current account me rehna chahiye (kam se kam 3 mahine ke kharche).',
    },
    {
      title: 'Safe Surplus (इन्वेस्ट करने योग्य अतिरिक्त कैश)',
      icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
      english: 'Balance minus Minimum Cash Reserve. Money that is not needed for daily operations and can be safely deployed into liquid funds or short FDs.',
      hinglish: 'Current balance minus safety buffer. Yeh surplus paisa aap bina tension Liquid Fund ya FD me invest karke extra return kama sakte hain.',
    },
    {
      title: 'Days of Cash Left / Runway (कैश कितने दिन चलेगा)',
      icon: <AlertTriangle className="w-4 h-4 text-amber-500" />,
      english: 'Calculated as Current Balance ÷ Average Daily Expense. Shows how many days your business can survive if zero new income comes in.',
      hinglish: 'Agar kal se ek rupaye ki bhi nayi income na aaye, toh maujooda balance se kitne din tak business chalega.',
    },
    {
      title: 'Liquid Mutual Funds vs FD (पैसा कहाँ लगाएं?)',
      icon: <BookOpen className="w-4 h-4 text-indigo-500" />,
      english: 'Liquid funds provide ~6.5-6.8% return with instant withdrawal (T+1). Short-term FDs provide ~7% guaranteed return for 30-90 days.',
      hinglish: 'Current account me 0% interest milta hai. Liquid funds me 6.5% milta hai aur 24 ghante me paisa wapas aa jata hai.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                CashWise Business Glossary
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Simple English & Hinglish explanations for non-finance business owners
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-4 divide-y divide-slate-100 dark:divide-slate-800">
          {concepts.map((item, idx) => (
            <div key={idx} className={idx > 0 ? 'pt-4' : ''}>
              <div className="flex items-center gap-2 mb-1.5">
                {item.icon}
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  {item.title}
                </h3>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-1.5">
                {item.english}
              </p>
              <div className="p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300">
                <span className="font-semibold text-emerald-800 dark:text-emerald-400">आसान भाषा: </span>
                {item.hinglish}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 rounded-lg transition-colors"
          >
            Got it, thanks!
          </button>
        </div>

      </div>
    </div>
  );
};
