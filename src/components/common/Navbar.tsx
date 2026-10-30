import React, { useState } from 'react';
import {
  TrendingUp,
  CreditCard,
  LineChart,
  LogOut,
  Moon,
  Sun,
  Menu,
  X,
  HelpCircle,
  RotateCcw,
  Box,
  Cloud,
  Languages,
  Sparkles,
  Calendar,
  Bell,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppView, useCash } from '../../context/CashContext';
import { HinglishGuideModal } from '../modals/HinglishGuideModal';
import { RoleBadge } from './RoleBadge';
import { NotificationDrawer } from './NotificationDrawer';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const {
    activeView,
    setActiveView,
    isDarkMode,
    toggleDarkMode,
    resetToSampleData,
    isCloudSyncing,
    language,
    setLanguage,
    setShowOnboardingWizard,
    setShowUpcomingModal,
    unreadAlertCount,
    setShowReportModal,
    setShowActivityLogModal,
    showNotificationsDrawer,
    setShowNotificationsDrawer,
  } = useCash();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Global keyboard shortcut (Alt+D or Ctrl+Shift+D) to toggle dark mode
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.altKey && e.key.toLowerCase() === 'd') || ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'd')) {
        e.preventDefault();
        toggleDarkMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleDarkMode]);

  const navItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: 'cashflow',
      label: 'Cash Flow',
      icon: <CreditCard className="w-4 h-4" />,
    },
    {
      id: 'forecast',
      label: 'Forecast & What-If',
      icon: <LineChart className="w-4 h-4" />,
    },
    {
      id: 'vault3d',
      label: 'Visual Vault',
      icon: <Box className="w-4 h-4" />,
    },
  ];

  const handleSelectView = (view: AppView) => {
    setActiveView(view);
    setMobileMenuOpen(false);
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* Zone 1: Brand Wordmark */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => handleSelectView('dashboard')}
                className="flex items-center gap-2.5 text-left group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg p-1"
              >
                <div className="w-9 h-9 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center text-white font-bold shadow-sm group-hover:bg-emerald-700 transition-colors">
                  <span className="text-lg">₹</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none whitespace-nowrap">
                    CashWise
                  </span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 leading-none mt-1 whitespace-nowrap">
                    Cash Reserve Optimizer
                  </span>
                </div>
              </button>
            </div>

            {/* Zone 2: Navigation Links (Desktop) */}
            <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
              {navItems.map((item) => {
                const isActive = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectView(item.id)}
                    className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-emerald-400 shadow-sm border border-slate-200/50 dark:border-slate-700/50'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-slate-700/50'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Zone 3: Actions & Profile */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Cloud Sync Status */}
              {user?.isFirebaseUser && (
                <div
                  title={isCloudSyncing ? 'Syncing with Firestore...' : 'Connected to Firebase Firestore'}
                  className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
                >
                  <Cloud className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-pulse text-amber-500' : 'text-emerald-500'}`} />
                  <span>Firestore Cloud</span>
                </div>
              )}


              {/* Language Preference Toggle (EN / Hinglish) */}
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'hinglish' : 'en')}
                title={`Language: ${language === 'en' ? 'Standard Finance English (Click to enable Hinglish)' : 'Hinglish Enabled (Click for English)'}`}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all select-none active:scale-95 ${
                  language === 'hinglish'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                aria-label={`Current language: ${language}. Toggle language`}
              >
                <Languages className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono text-[11px] font-bold">
                  {language === 'hinglish' ? 'Hinglish' : 'EN'}
                </span>
              </button>

              {/* Help & Guide Button */}
              <button
                onClick={() => setShowGuide(true)}
                title="Business Owner Finance Guide & Hinglish Tips"
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label="Help Guide"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              {/* Setup Wizard Button (Phase 2) */}
              <button
                onClick={() => setShowOnboardingWizard(true)}
                title="Launch 3-step First-Run Setup Wizard"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Setup Wizard</span>
              </button>

              {/* Upcoming Payments & Receipts Timeline Button (Phase 3) */}
              <button
                onClick={() => setShowUpcomingModal(true)}
                title="Manage Upcoming Payments & Receipts Timeline (Payroll, GST, Rent, Receivables)"
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-500" />
                <span>Timeline</span>
              </button>

              {/* Monthly Executive Report Button (Phase 4) */}
              <button
                onClick={() => setShowReportModal(true)}
                title="Printable / PDF Monthly Executive Report"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap font-medium"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                <span>Monthly Report</span>
              </button>

              {/* Activity & Audit Log Button (Phase 4) */}
              <button
                onClick={() => setShowActivityLogModal(true)}
                title="Server-Recorded Activity & Audit Log (Read-Only)"
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap font-medium"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                <span>Audit Log</span>
              </button>

              {/* In-App Notifications & Alerts Bell (Phase 4) */}
              <button
                type="button"
                onClick={() => setShowNotificationsDrawer(true)}
                title="Alerts & Threshold Notifications"
                className="relative p-2 text-slate-600 dark:text-slate-300 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                aria-label={`Alert notifications (${unreadAlertCount} unread)`}
              >
                <Bell className="w-4 h-4" />
                {unreadAlertCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white animate-pulse">
                    {unreadAlertCount}
                  </span>
                )}
              </button>

              {/* Reset Data Button */}
              <button
                onClick={() => {
                  if (confirm('Reset transactions to realistic Indian business sample data?')) {
                    resetToSampleData();
                  }
                }}
                title="Reset to sample data"
                className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              {/* Global Dark Mode Toggle */}
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
                <span className="hidden xl:inline text-[11px] font-medium tracking-tight">
                  {isDarkMode ? 'Dark' : 'Light'}
                </span>
                {/* Switch indicator pill */}
                <span
                  className={`hidden sm:inline-block w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 ease-in-out ${
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

              {/* Role-Based Access Badge (Phase 4) */}
              <RoleBadge />

              {/* User Avatar & Logout */}
              {user && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                      {user.businessName}
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              )}

              {/* Mobile menu trigger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                aria-label="Toggle Navigation"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 pb-4 space-y-2">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectView(item.id)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 text-sm font-medium rounded-lg text-left transition-colors ${
                    isActive
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 font-semibold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowReportModal(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Monthly Report</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowNotificationsDrawer(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Alerts ({unreadAlertCount})</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowUpcomingModal(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowActivityLogModal(true);
                }}
                className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Audit Log</span>
              </button>
            </div>

            {/* Mobile Language Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-1">
              <div className="flex flex-col">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  Language Preference
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {language === 'hinglish' ? 'Hinglish explanations active' : 'Standard English active'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setLanguage(language === 'en' ? 'hinglish' : 'en')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                  language === 'hinglish'
                    ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                <Languages className="w-3.5 h-3.5" />
                <span>{language === 'hinglish' ? 'Hinglish' : 'English'}</span>
              </button>
            </div>

            {/* Mobile Dark Mode Toggle */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-1">
              <div className="flex flex-col">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
                  Theme Appearance
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {isDarkMode ? 'Dark theme active' : 'Light theme active'}
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isDarkMode}
                onClick={toggleDarkMode}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                <div className="relative w-4 h-4 flex items-center justify-center">
                  <Sun
                    className={`w-3.5 h-3.5 text-amber-400 absolute transition-all duration-200 ${
                      isDarkMode ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
                    }`}
                  />
                  <Moon
                    className={`w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 absolute transition-all duration-200 ${
                      isDarkMode ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
                    }`}
                  />
                </div>
                <span>{isDarkMode ? 'Dark' : 'Light'}</span>
                <span
                  className={`inline-block w-6 h-3.5 rounded-full p-0.5 transition-colors duration-200 ${
                    isDarkMode ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                >
                  <span
                    className={`block w-2.5 h-2.5 rounded-full bg-white shadow-xs transform transition-transform duration-200 ${
                      isDarkMode ? 'translate-x-2.5' : 'translate-x-0'
                    }`}
                  />
                </span>
              </button>
            </div>

            <div className="pt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
              <span>{user?.businessName}</span>
              <button
                onClick={resetToSampleData}
                className="text-emerald-600 dark:text-emerald-400 hover:underline"
              >
                Reload Sample
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Hinglish & Finance Guide Modal */}
      {showGuide && <HinglishGuideModal onClose={() => setShowGuide(false)} />}

      {/* Phase 4: In-App Notifications & Alert Rules Drawer */}
      <NotificationDrawer
        isOpen={showNotificationsDrawer}
        onClose={() => setShowNotificationsDrawer(false)}
      />

    </>
  );
};
