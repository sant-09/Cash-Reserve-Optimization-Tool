import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ArrowRight, ShieldCheck, CheckCircle2, TrendingUp, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCash } from '../context/CashContext';

export const LoginView: React.FC = () => {
  const { login, fillDemoCredentials, signInWithGoogle } = useAuth();
  const { isDarkMode, toggleDarkMode } = useCash();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    setTimeout(() => {
      const res = login(email, password);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to authenticate');
      }
      setIsSubmitting(false);
    }, 200);
  };

  const handleUseDemo = () => {
    const creds = fillDemoCredentials();
    setEmail(creds.email);
    setPassword(creds.pass);
    setErrorMessage(null);
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Top Bar with Brand & Global Theme Toggle */}
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white font-bold shadow-sm">
                <span className="text-lg">₹</span>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                  CashWise
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none mt-1">
                  Cash Reserve Optimizer
                </span>
              </div>
            </div>

            {/* Dark Mode Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={isDarkMode}
              onClick={toggleDarkMode}
              className="group relative flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-95 bg-slate-100 hover:bg-slate-200/80 border-slate-200/80 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:border-slate-700 dark:text-slate-200"
              title={
                isDarkMode
                  ? 'Dark Mode Active · Alt+D or Click to switch to Light'
                  : 'Light Mode Active · Alt+D or Click to switch to Dark'
              }
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div className="relative w-4 h-4 flex items-center justify-center">
                <Sun
                  className={`w-3.5 h-3.5 text-amber-400 absolute transition-all duration-300 ${
                    isDarkMode ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'
                  }`}
                />
                <Moon
                  className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 absolute transition-all duration-300 ${
                    isDarkMode ? '-rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                  }`}
                />
              </div>
              <span className="text-[11px] font-medium tracking-tight">
                {isDarkMode ? 'Dark' : 'Light'}
              </span>
              <span
                className={`w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
                  isDarkMode ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`block w-2.5 h-2.5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
                    isDarkMode ? 'translate-x-2.5' : 'translate-x-0'
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Side: Value proposition and 3 core questions */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Built for Indian SMEs & Founders</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]">
            Master your working capital. <br />
            <span className="text-emerald-600 dark:text-emerald-400">
              Never run out of cash.
            </span>
          </h1>

          <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
            CashWise answers the 3 crucial questions every business owner asks every morning:
          </p>

          <div className="space-y-3.5 max-w-lg">
            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0 text-xs">
                1
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                  How much cash should I keep?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Calculate the exact emergency operating reserve (typically 3 months of expenses) so salaries and vendor dues are never delayed.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0 text-xs">
                2
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                  How much should I invest?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Discover your Safe Surplus. Don't let excess cash idle at 0% in current accounts—deploy it into overnight or liquid funds yielding ~6.8%.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-xl bg-white dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 font-bold shrink-0 text-xs">
                3
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                  When will I need cash next?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Get a 30 to 90-day cash runway projection with early warning signals for upcoming GST filings, payrolls, and invoice delays.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              100% Private & Local in Browser
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Indian Rupee (₹) Native
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Smart What-If Scenarios
            </span>
          </div>
        </div>

        {/* Right Side: Login Box */}
        <div className="lg:col-span-5">
          <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Sign In to CashWise
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Enter your credentials or use the one-click demo login below.
              </p>
            </div>

            {/* Firebase Auth Google Sign-In */}
            <button
              type="button"
              onClick={async () => {
                setErrorMessage(null);
                setIsSubmitting(true);
                const res = await signInWithGoogle();
                if (!res.success) {
                  setErrorMessage(res.error || 'Google Sign-In was cancelled or failed.');
                }
                setIsSubmitting(false);
              }}
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-semibold text-xs sm:text-sm rounded-xl shadow-xs transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google (Firebase Auth)</span>
            </button>

            <div className="relative flex items-center justify-center">
              <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
              <span className="bg-white dark:bg-slate-900 px-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider shrink-0">
                Or demo access
              </span>
            </div>

            {/* Quick Demo Autofill Banner */}
            <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-emerald-950 dark:text-emerald-300">
                  Demo Account
                </div>
                <div className="text-[11px] text-emerald-800/90 dark:text-emerald-400/90 font-mono mt-0.5">
                  demo@cashwise.com · demo123
                </div>
              </div>
              <button
                type="button"
                onClick={handleUseDemo}
                className="px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 rounded-lg shadow-xs transition-colors whitespace-nowrap"
              >
                Auto-fill
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900/60 animate-shake">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. demo@cashwise.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="e.g. demo123"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Security disclaimer required by prompt */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-slate-700 dark:text-slate-300">Note:</span> Demo security only, real auth needs a backend. All company financial data is stored locally in your browser’s localStorage.
              </p>
            </div>

          </div>
        </div>

        </div>
      </div>
    </div>
  );
};
