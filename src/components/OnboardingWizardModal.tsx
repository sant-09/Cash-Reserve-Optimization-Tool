import React, { useState } from 'react';
import {
  Wallet,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  X,
  CreditCard,
  PlusCircle,
} from 'lucide-react';
import { useCash } from '../context/CashContext';
import { formatINR } from '../utils/finance';
import { AccountType } from '../types/finance';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenImportModal?: () => void;
}

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  onClose,
  onOpenImportModal,
}) => {
  const {
    initialBalance: currentInitBal,
    minCashRequired: currentMinCash,
    completeOnboarding,
    language,
  } = useCash();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Opening balance & primary bank
  const [openingBalance, setOpeningBalance] = useState<number>(currentInitBal || 350000);
  const [bankName, setBankName] = useState<string>('HDFC Bank');
  const [accountName, setAccountName] = useState<string>('Primary Operating Current A/c');
  const [accountType, setAccountType] = useState<AccountType>('current');
  const [accountNumberMasked, setAccountNumberMasked] = useState<string>('•••• 4092');

  // Step 2: Minimum reserve
  const [minReserve, setMinReserve] = useState<number>(currentMinCash || 300000);

  // Loading state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!isOpen) return null;

  // Calculate live preview metrics
  const projectedSurplus = openingBalance - minReserve;

  const handleNextFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (openingBalance < 0 || isNaN(openingBalance)) {
      alert('Please enter a valid positive opening balance.');
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (minReserve < 0 || isNaN(minReserve)) {
      alert('Please enter a valid minimum reserve amount.');
      return;
    }
    setStep(3);
  };

  const handleFinishWithSample = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        initialBalance: openingBalance,
        minCashRequired: minReserve,
        primaryAccountName: accountName,
        bankName,
        loadSample: true,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishClean = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        initialBalance: openingBalance,
        minCashRequired: minReserve,
        primaryAccountName: accountName,
        bankName,
        loadSample: false,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishAndImport = async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding({
        initialBalance: openingBalance,
        minCashRequired: minReserve,
        primaryAccountName: accountName,
        bankName,
        loadSample: false,
      });
      onClose();
      if (onOpenImportModal) {
        onOpenImportModal();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Progress Bar & Header */}
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                CW
              </span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Setup Wizard · Step {step} of 3
              </span>
            </div>
            <button
              onClick={handleFinishClean}
              title="Skip setup and use defaults"
              className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              Skip to Dashboard
            </button>
          </div>

          {/* Stepper indicator dots & bar */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, title: 'Opening Balance' },
              { num: 2, title: 'Minimum Reserve' },
              { num: 3, title: 'Transactions' },
            ].map((s) => (
              <div key={s.num} className="space-y-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    step >= s.num
                      ? 'bg-emerald-600 dark:bg-emerald-500'
                      : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
                <span
                  className={`text-[11px] font-medium block truncate ${
                    step === s.num
                      ? 'text-slate-900 dark:text-white font-bold'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {s.num}. {s.title}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6 sm:p-8 space-y-6">

          {/* STEP 1: OPENING BALANCE & PRIMARY ACCOUNT */}
          {step === 1 && (
            <form onSubmit={handleNextFromStep1} className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {language === 'hinglish'
                    ? 'Aapka Opening Cash Balance aur Bank Account'
                    : 'What is your current liquid cash balance?'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Enter the total operative cash currently sitting in your business bank accounts or cash-in-hand.
                </p>
              </div>

              {/* Amount input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Starting Liquid Balance (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full pl-9 pr-4 py-3 text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="350000"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[11px] text-slate-400 mr-1">Quick presets:</span>
                  {[
                    { label: '₹1.5 Lakh', val: 150000 },
                    { label: '₹3.5 Lakh (Standard)', val: 350000 },
                    { label: '₹5.0 Lakh', val: 500000 },
                    { label: '₹10 Lakh', val: 1000000 },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setOpeningBalance(preset.val)}
                      className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all ${
                        openingBalance === preset.val
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Primary Account Details */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Primary Operative Bank Account
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank, ICICI, SBI"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Account Nickname
                    </label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Primary Operating Current A/c"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Account Type
                    </label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as AccountType)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="current">Current A/c (Operative)</option>
                      <option value="savings">Savings A/c (Reserve)</option>
                      <option value="overdraft">Overdraft (OD / CC)</option>
                      <option value="cash">Petty Cash / Cash-in-Hand</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                      Masked A/c Number (optional)
                    </label>
                    <input
                      type="text"
                      value={accountNumberMasked}
                      onChange={(e) => setAccountNumberMasked(e.target.value)}
                      placeholder="•••• 4092"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Next Step Button */}
              <div className="flex items-center justify-end pt-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-md transition-all active:scale-95"
                >
                  <span>Continue to Step 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: MINIMUM SAFETY RESERVE */}
          {step === 2 && (
            <form onSubmit={handleNextFromStep2} className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {language === 'hinglish'
                    ? 'Aapka Non-Negotiable Minimum Safety Buffer'
                    : 'Set your Non-Negotiable Minimum Reserve'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  This safety buffer protects payroll and office rent from client payment delays. CashWise alerts you whenever cash is projected to breach this floor.
                </p>
              </div>

              {/* Reserve Amount Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Minimum Reserve Buffer (₹ INR)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={minReserve}
                    onChange={(e) => setMinReserve(Math.max(0, Number(e.target.value)))}
                    required
                    className="w-full pl-9 pr-4 py-3 text-lg font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="300000"
                  />
                </div>

                {/* SME Benchmark Presets */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {[
                    { label: '₹1.5 Lakh', desc: '1-Month Lean Buffer', val: 150000 },
                    { label: '₹3.0 Lakh', desc: '3-Month SME Standard', val: 300000 },
                    { label: '₹5.0 Lakh', desc: '6-Month Safe Buffer', val: 500000 },
                  ].map((item) => (
                    <button
                      key={item.val}
                      type="button"
                      onClick={() => setMinReserve(item.val)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        minReserve === item.val
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {item.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Math Preview Card */}
              <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Projected Working Capital Health
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                      Opening Balance
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {formatINR(openingBalance)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">
                      Minimum Reserve
                    </div>
                    <div className="text-sm font-bold text-slate-900 dark:text-white font-mono">
                      {formatINR(minReserve)}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/80 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Safe Surplus Available:
                  </span>
                  <span
                    className={`text-sm font-bold font-mono ${
                      projectedSurplus >= 0
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-rose-600 dark:text-rose-400'
                    }`}
                  >
                    {projectedSurplus >= 0
                      ? `+${formatINR(projectedSurplus)} (Deployable)`
                      : `${formatINR(projectedSurplus)} (Deficit)`}
                  </span>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-md transition-all active:scale-95"
                >
                  <span>Continue to Step 3</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: ADD OR IMPORT TRANSACTIONS */}
          {step === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">
                  {language === 'hinglish'
                    ? 'Data Shuru Karein: Sample Data ya Bank Import'
                    : 'How would you like to initialize your ledger?'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Choose how to populate your initial cash flow records. You can always import more statements later.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {/* Option 1: Load Sample Data */}
                <div className="relative p-5 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 hover:border-emerald-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-emerald-600 text-white">
                        Recommended
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        Load Realistic Indian SME Sample Data
                      </h3>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Populate 18 realistic transactions for "Apex Craft Digital LLP": client milestones, payroll, office rent, GST, and 30-day runway projections.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinishWithSample}
                    className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 shadow-xs transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Loading...' : 'Load Sample & Finish'}
                  </button>
                </div>

                {/* Option 2: Import Bank CSV/Excel */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <FileSpreadsheet className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      Import Bank Statement (CSV / Excel)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Upload your bank statement with custom column mapping (date, description, debit, credit) and live row validation.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinishAndImport}
                    className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Open CSV Importer
                  </button>
                </div>

                {/* Option 3: Clean Ledger */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-slate-500" />
                      Start with a Clean Ledger
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Begin fresh with only your opening balance ({formatINR(openingBalance)}). Record transactions manually as they happen.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleFinishClean}
                    className="shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all active:scale-95 disabled:opacity-50"
                  >
                    Start Fresh
                  </button>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Step 2</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer info note */}
        <div className="px-6 sm:px-8 py-3 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-800/20 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
          <span>You can revisit the Setup Wizard anytime from Navbar · Settings</span>
          <span className="font-mono">CashWise Schema v2</span>
        </div>

      </div>
    </div>
  );
};
