import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { generateInitialTransactions } from '../data/sampleData';
import {
  AppLanguage,
  BankAccount,
  CashHealthMetrics,
  HeadlineSummary,
  HealthStatus,
  MetricCalculationKey,
  SavedScenario,
  ScenarioPreset,
  ShortfallInfo,
  SmartRecommendation,
  TotalCashPosition,
  Transaction,
  UpcomingCashFlow,
  UpcomingCashFlowStatus,
  UserSettings,
  WhatIfScenario,
  AlertRule,
  TriggeredAlert,
  AlertDispatchResult,
  ActivityLogEntry,
  MonthlyReportData,
  UserRole,
} from '../types/finance';
import {
  calculateCashHealth,
  calculateTotalCashPosition,
  createDefaultAccounts,
  createDefaultUpcomingCashFlows,
  generateHeadlineSummary,
  generateSmartRecommendation,
  getHealthStatus,
  getNextShortfallInfo,
  SCENARIO_PRESETS,
  DEFAULT_ALERT_RULES,
  evaluateAlertRules,
  dispatchAlertMock,
  generateMonthlyReportData,
  generateForecast,
} from '../utils/finance';
import { useAuth } from './AuthContext';
import {
  db,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';

export type AppView = 'dashboard' | 'cashflow' | 'forecast' | 'vault3d';

interface CashContextType {
  transactions: Transaction[];
  initialBalance: number;
  minCashRequired: number;
  metrics: CashHealthMetrics;
  recommendation: SmartRecommendation;
  headlineSummary: HeadlineSummary;
  shortfallInfo: ShortfallInfo;
  healthStatus: HealthStatus;
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  // Language preference & toggle
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  // Transaction actions
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  batchImportTransactions: (txs: Omit<Transaction, 'id'>[], targetAccountId?: string) => Promise<number>;
  // Reserve adjustment
  setMinCashRequired: (amount: number) => Promise<void>;
  applyAutoRecommendedReserve: (months?: number) => void;
  setInitialBalance: (amount: number) => Promise<void>;
  // Bank Accounts Management (Phase 2)
  accounts: BankAccount[];
  totalCashPosition: TotalCashPosition;
  primaryAccountId: string;
  addAccount: (account: Omit<BankAccount, 'id'>) => Promise<BankAccount>;
  updateAccount: (id: string, patch: Partial<BankAccount>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  setDefaultAccount: (id: string) => Promise<void>;
  // Onboarding Wizard (Phase 2)
  onboardingCompleted: boolean;
  showOnboardingWizard: boolean;
  setShowOnboardingWizard: (show: boolean) => void;
  completeOnboarding: (config: {
    initialBalance: number;
    minCashRequired: number;
    primaryAccountName?: string;
    bankName?: string;
    loadSample?: boolean;
  }) => Promise<void>;
  // Reset
  resetToSampleData: () => Promise<void>;
  // Low cash banner/toast
  dismissedLowCashToast: boolean;
  dismissLowCashToast: () => void;
  // What-If scenarios & Presets (Phase 3)
  scenario: WhatIfScenario;
  updateScenario: (patch: Partial<WhatIfScenario>) => void;
  resetScenario: () => void;
  activePresetId: string | null;
  applyPreset: (presetId: string) => void;
  savedScenarios: SavedScenario[];
  saveScenario: (name: string, scenario: WhatIfScenario, description?: string) => Promise<SavedScenario>;
  updateSavedScenario: (id: string, patch: Partial<SavedScenario>) => Promise<void>;
  deleteScenario: (id: string) => Promise<void>;
  compareScenarioId: string | null;
  setCompareScenarioId: (id: string | null) => void;
  showSaveScenarioModal: boolean;
  setShowSaveScenarioModal: (show: boolean) => void;
  // Upcoming Cash Flows (Phase 3)
  upcomingCashFlows: UpcomingCashFlow[];
  addUpcomingCashFlow: (item: Omit<UpcomingCashFlow, 'id'>) => Promise<UpcomingCashFlow>;
  updateUpcomingCashFlow: (id: string, patch: Partial<UpcomingCashFlow>) => Promise<void>;
  deleteUpcomingCashFlow: (id: string) => Promise<void>;
  markUpcomingCashFlowStatus: (id: string, status: UpcomingCashFlowStatus, convertToTx?: boolean) => Promise<void>;
  showUpcomingModal: boolean;
  setShowUpcomingModal: (show: boolean) => void;
  // "How is this calculated?" Explanations (Phase 3)
  explanationKey: MetricCalculationKey | null;
  showExplanationModal: boolean;
  openExplanation: (key: MetricCalculationKey) => void;
  closeExplanation: () => void;
  // Theme
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  // Cloud sync status
  isCloudSyncing: boolean;
  // Phase 4: RBAC & Permission Helper
  canPerform: (action: 'manage_settings' | 'delete_account' | 'configure_alerts') => { allowed: boolean; reason?: string };
  // Phase 4: Alert Rules & In-App Notifications
  alertRules: AlertRule[];
  triggeredAlerts: TriggeredAlert[];
  unreadAlertCount: number;
  readAlertIds: string[];
  markAlertAsRead: (id: string) => void;
  dismissAlert: (id: string) => void;
  markAllAlertsAsRead: () => void;
  updateAlertRule: (ruleId: string, patch: Partial<AlertRule>) => Promise<void>;
  dispatchTestAlert: (alert: TriggeredAlert, channel: 'email' | 'whatsapp', recipient: string) => Promise<AlertDispatchResult>;
  showAlertSettingsModal: boolean;
  setShowAlertSettingsModal: (show: boolean) => void;
  showNotificationsDrawer: boolean;
  setShowNotificationsDrawer: (show: boolean) => void;
  // Phase 4: Activity Log (Audit Trail)
  activityLogs: ActivityLogEntry[];
  refreshActivityLogs: () => Promise<void>;
  showActivityLogModal: boolean;
  setShowActivityLogModal: (show: boolean) => void;
  recordActivity: (action: ActivityLogEntry['action'], entityType: ActivityLogEntry['entityType'], entityId: string, description: string, details?: Record<string, any>) => void;
  // Phase 4: Monthly Printable Report
  showReportModal: boolean;
  setShowReportModal: (show: boolean) => void;
  monthlyReportData: MonthlyReportData;
}

const SCHEMA_VERSION = 4;

const STORAGE_KEYS = {
  SCHEMA_VERSION: 'cashwise_schema_version',
  TX: 'cashwise_transactions',
  INITIAL_BAL: 'cashwise_initial_balance',
  MIN_CASH: 'cashwise_min_cash',
  THEME: 'cashwise_theme',
  LANGUAGE: 'cashwise_language',
  SETTINGS: 'cashwise_settings',
  ACCOUNTS: 'cashwise_accounts',
  ONBOARDING: 'cashwise_onboarding_completed',
  UPCOMING: 'cashwise_upcoming_cashflows',
  SCENARIOS: 'cashwise_saved_scenarios',
  ALERTS: 'cashwise_alert_rules',
  ACTIVITY: 'cashwise_activity_logs',
};

const DEFAULT_SAVED_SCENARIOS: SavedScenario[] = [
  {
    id: 'scen-base',
    name: 'Base Case (Default Trajectory)',
    description: 'Current business run rate and scheduled bills without economic stress shocks',
    isBaseCase: true,
    scenario: {
      incomeChangePercent: 0,
      expenseChangePercent: 0,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
      receivableDelayDays: 0,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'scen-delayed',
    name: 'Delayed Client Collections (30 Days)',
    description: 'Major clients delay invoice clearances by 30 days, squeezing short-term liquidity',
    isBaseCase: false,
    scenario: {
      incomeChangePercent: 0,
      expenseChangePercent: 0,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
      receivableDelayDays: 30,
    },
    createdAt: new Date().toISOString(),
  },
  {
    id: 'scen-drop',
    name: 'Sales drop 30%',
    description: 'Models a 30% contraction in ongoing monthly client sales and operating inflows',
    isBaseCase: false,
    scenario: {
      incomeChangePercent: -30,
      expenseChangePercent: 0,
      oneTimeExpenseAmount: 0,
      oneTimeExpenseDate: '',
      receivableDelayDays: 0,
    },
    createdAt: new Date().toISOString(),
  },
];

const CashContext = createContext<CashContextType | undefined>(undefined);

export const CashProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [initialBalance, setInitialBalanceState] = useState<number>(350000);
  const [minCashRequired, setMinCashRequiredState] = useState<number>(300000);
  const [accounts, setAccounts] = useState<BankAccount[]>(() => createDefaultAccounts(350000));
  const [language, setLanguageState] = useState<AppLanguage>('en');
  const [onboardingCompleted, setOnboardingCompletedState] = useState<boolean>(true);
  const [showOnboardingWizard, setShowOnboardingWizard] = useState<boolean>(false);
  const [primaryAccountId, setPrimaryAccountId] = useState<string>('acc-primary');
  const [dismissedLowCashToast, setDismissedLowCashToast] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Phase 3 State: Upcoming Cash Flows, Scenarios & Calculation Explanations
  const [upcomingCashFlows, setUpcomingCashFlows] = useState<UpcomingCashFlow[]>(() =>
    createDefaultUpcomingCashFlows('acc-primary')
  );
  const [savedScenarios, setSavedScenarios] = useState<SavedScenario[]>(DEFAULT_SAVED_SCENARIOS);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [compareScenarioId, setCompareScenarioId] = useState<string | null>('scen-delayed');
  const [showUpcomingModal, setShowUpcomingModal] = useState<boolean>(false);
  const [showSaveScenarioModal, setShowSaveScenarioModal] = useState<boolean>(false);
  const [explanationKey, setExplanationKey] = useState<MetricCalculationKey | null>(null);
  const [showExplanationModal, setShowExplanationModal] = useState<boolean>(false);

  // Phase 4 State: RBAC, Alerts, Activity Logs & Monthly Report
  const [alertRules, setAlertRules] = useState<AlertRule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ALERTS);
      return saved ? JSON.parse(saved) : DEFAULT_ALERT_RULES;
    } catch {
      return DEFAULT_ALERT_RULES;
    }
  });
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);
  const [showAlertSettingsModal, setShowAlertSettingsModal] = useState<boolean>(false);
  const [showNotificationsDrawer, setShowNotificationsDrawer] = useState<boolean>(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVITY);
      return saved ? JSON.parse(saved) : [
        {
          id: 'log-seed-1',
          timestamp: new Date().toISOString(),
          userId: user?.uid || 'user-default',
          userEmail: user?.email || 'demo@cashwise.com',
          userName: user?.name || 'Rajesh Sharma',
          userRole: user?.role || 'owner',
          action: 'SETTINGS_UPDATED',
          entityType: 'settings',
          entityId: 'settings-primary',
          description: 'Configured minimum reserve threshold to ₹3,00,000',
        }
      ];
    } catch {
      return [];
    }
  });
  const [showActivityLogModal, setShowActivityLogModal] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // Default scenario for What-If
  const defaultScenario: WhatIfScenario = {
    incomeChangePercent: 0,
    expenseChangePercent: 0,
    oneTimeExpenseAmount: 0,
    oneTimeExpenseDate: '',
    receivableDelayDays: 0,
  };
  const [scenario, setScenario] = useState<WhatIfScenario>(defaultScenario);

  // Initialize theme with cross-tab and system preference sync
  useEffect(() => {
    try {
      const applyTheme = (dark: boolean) => {
        setIsDarkMode(dark);
        if (dark) {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
      };

      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
      const mediaQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
      const isSystemDark = mediaQuery ? mediaQuery.matches : false;
      const shouldBeDark = savedTheme === 'dark' || (!savedTheme && isSystemDark);

      applyTheme(shouldBeDark);

      // Listen to cross-tab storage changes
      const handleStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEYS.THEME) {
          if (e.newValue === 'dark') applyTheme(true);
          else if (e.newValue === 'light') applyTheme(false);
          else if (mediaQuery) applyTheme(mediaQuery.matches);
        }
        if (e.key === STORAGE_KEYS.LANGUAGE) {
          if (e.newValue === 'en' || e.newValue === 'hinglish') {
            setLanguageState(e.newValue);
          }
        }
      };
      window.addEventListener('storage', handleStorage);

      const handleMediaChange = (e: MediaQueryListEvent) => {
        const currentSaved = localStorage.getItem(STORAGE_KEYS.THEME);
        if (!currentSaved) {
          applyTheme(e.matches);
        }
      };

      if (mediaQuery?.addEventListener) {
        mediaQuery.addEventListener('change', handleMediaChange);
      }

      return () => {
        window.removeEventListener('storage', handleStorage);
        if (mediaQuery?.removeEventListener) {
          mediaQuery.removeEventListener('change', handleMediaChange);
        }
      };
    } catch {
      // ignore
    }
  }, []);

  // Compute live multiple bank accounts cash position
  const totalCashPosition = useMemo(
    () => calculateTotalCashPosition(accounts, transactions),
    [accounts, transactions]
  );

  // Sync data with Firestore when Firebase user is logged in
  useEffect(() => {
    if (user?.uid && user.isFirebaseUser) {
      setIsCloudSyncing(true);
      const txCollectionPath = `users/${user.uid}/transactions`;
      const txRef = collection(db, 'users', user.uid, 'transactions');
      const accountsRef = collection(db, 'users', user.uid, 'accounts');
      const settingsRef = doc(db, 'users', user.uid, 'settings', 'cashReserve');

      // 1. Listen to accounts subcollection (Phase 2)
      const unsubscribeAccounts = onSnapshot(
        accountsRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: BankAccount[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as BankAccount);
            });
            setAccounts(list);
            const defaultAcc = list.find((a) => a.isDefault) || list[0];
            if (defaultAcc) setPrimaryAccountId(defaultAcc.id);
          } else {
            // Seed initial accounts in Firestore
            const defaultAccs = createDefaultAccounts(initialBalance);
            setAccounts(defaultAccs);
            defaultAccs.forEach(async (acc) => {
              try {
                await setDoc(doc(db, 'users', user.uid!, 'accounts', acc.id), acc);
              } catch (err) {
                console.warn('Accounts seeding error:', err);
              }
            });
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/accounts`);
        }
      );

      // 2. Listen to transactions subcollection (with accountId migration)
      const unsubscribeTx = onSnapshot(
        txRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: Transaction[] = [];
            let unassignedFound = false;
            snapshot.forEach((docSnap) => {
              const data = docSnap.data() as Transaction;
              if (!data.accountId) {
                unassignedFound = true;
                data.accountId = 'acc-primary';
              }
              list.push(data);
            });
            list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setTransactions(list);

            // Persist migrated accountId back to Firestore if missing
            if (unassignedFound) {
              list.forEach(async (tx) => {
                if (tx.accountId === 'acc-primary') {
                  try {
                    await updateDoc(doc(db, 'users', user.uid!, 'transactions', tx.id), {
                      accountId: 'acc-primary',
                    });
                  } catch {
                    // ignore
                  }
                }
              });
            }
          } else {
            // Check if onboarding was completed
            // First time Firebase user without transactions:
            const sample = generateInitialTransactions();
            setTransactions(sample.transactions);
            sample.transactions.forEach(async (t) => {
              try {
                await setDoc(doc(db, 'users', user.uid!, 'transactions', t.id), {
                  ...t,
                  accountId: 'acc-primary',
                  userId: user.uid,
                });
              } catch (err) {
                console.warn('Initial seeding error:', err);
              }
            });
          }
          setIsCloudSyncing(false);
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, txCollectionPath);
        }
      );

      // 3. Listen to settings doc
      const unsubscribeSettings = onSnapshot(
        settingsRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data?.minCashRequired !== undefined) {
              setMinCashRequiredState(data.minCashRequired);
            }
            if (data?.initialBalance !== undefined) {
              setInitialBalanceState(data.initialBalance);
            }
            if (data?.language === 'en' || data?.language === 'hinglish') {
              setLanguageState(data.language);
            }
            if (data?.onboardingCompleted !== undefined) {
              setOnboardingCompletedState(data.onboardingCompleted);
              setShowOnboardingWizard(!data.onboardingCompleted);
            }
            if (data?.primaryAccountId) {
              setPrimaryAccountId(data.primaryAccountId);
            }
          } else {
            // Document doesn't exist yet: trigger setup wizard
            setOnboardingCompletedState(false);
            setShowOnboardingWizard(true);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/settings/cashReserve`);
        }
      );

      // 4. Listen to upcoming cash flows subcollection (Phase 3)
      const upcomingRef = collection(db, 'users', user.uid, 'upcoming_cashflows');
      const unsubscribeUpcoming = onSnapshot(
        upcomingRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: UpcomingCashFlow[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as UpcomingCashFlow);
            });
            list.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            setUpcomingCashFlows(list);
          } else {
            // Seed initial sample upcoming commitments in Firestore
            const defaults = createDefaultUpcomingCashFlows(primaryAccountId);
            setUpcomingCashFlows(defaults);
            defaults.forEach(async (flow) => {
              try {
                await setDoc(doc(db, 'users', user.uid!, 'upcoming_cashflows', flow.id), {
                  ...flow,
                  userId: user.uid,
                });
              } catch (err) {
                console.warn('Upcoming flow seeding error:', err);
              }
            });
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/upcoming_cashflows`);
        }
      );

      // 5. Listen to saved scenarios subcollection (Phase 3)
      const scenariosRef = collection(db, 'users', user.uid, 'scenarios');
      const unsubscribeScenarios = onSnapshot(
        scenariosRef,
        (snapshot) => {
          if (!snapshot.empty) {
            const list: SavedScenario[] = [];
            snapshot.forEach((docSnap) => {
              list.push(docSnap.data() as SavedScenario);
            });
            list.sort((a, b) => (a.isBaseCase ? -1 : b.isBaseCase ? 1 : 0));
            setSavedScenarios(list);
          } else {
            // Seed default saved scenarios
            setSavedScenarios(DEFAULT_SAVED_SCENARIOS);
            DEFAULT_SAVED_SCENARIOS.forEach(async (scen) => {
              try {
                await setDoc(doc(db, 'users', user.uid!, 'scenarios', scen.id), {
                  ...scen,
                  userId: user.uid,
                });
              } catch (err) {
                console.warn('Scenario seeding error:', err);
              }
            });
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}/scenarios`);
        }
      );

      return () => {
        unsubscribeAccounts();
        unsubscribeTx();
        unsubscribeSettings();
        unsubscribeUpcoming();
        unsubscribeScenarios();
      };
    } else {
      // LocalStorage / Demo mode with Schema v3 migration & accounts
      try {
        const rawVersion = localStorage.getItem(STORAGE_KEYS.SCHEMA_VERSION);
        const version = rawVersion ? parseInt(rawVersion, 10) : 1;

        const savedTx = localStorage.getItem(STORAGE_KEYS.TX);
        const savedInitBal = localStorage.getItem(STORAGE_KEYS.INITIAL_BAL);
        const savedMinCash = localStorage.getItem(STORAGE_KEYS.MIN_CASH);
        const savedLang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as AppLanguage | null;
        const savedAccounts = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
        const savedOnboarding = localStorage.getItem(STORAGE_KEYS.ONBOARDING);
        const savedUpcoming = localStorage.getItem(STORAGE_KEYS.UPCOMING);
        const savedScenariosRaw = localStorage.getItem(STORAGE_KEYS.SCENARIOS);

        const initBal = savedInitBal ? Number(savedInitBal) : 350000;
        const minCash = savedMinCash ? Number(savedMinCash) : 300000;
        const lang: AppLanguage = savedLang === 'hinglish' ? 'hinglish' : 'en';

        setInitialBalanceState(initBal);
        setMinCashRequiredState(minCash);
        setLanguageState(lang);

        // Accounts migration / load
        let activeAccounts: BankAccount[] = [];
        if (savedAccounts) {
          try {
            activeAccounts = JSON.parse(savedAccounts);
          } catch {
            activeAccounts = createDefaultAccounts(initBal);
          }
        } else {
          activeAccounts = createDefaultAccounts(initBal);
          localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(activeAccounts));
        }
        setAccounts(activeAccounts);

        // Onboarding flag
        if (savedOnboarding !== null) {
          const isDone = savedOnboarding === 'true';
          setOnboardingCompletedState(isDone);
          setShowOnboardingWizard(!isDone);
        } else {
          const hasExistingTx = !!savedTx;
          setOnboardingCompletedState(hasExistingTx);
          setShowOnboardingWizard(!hasExistingTx);
          localStorage.setItem(STORAGE_KEYS.ONBOARDING, hasExistingTx ? 'true' : 'false');
        }

        // Transactions migration: assign accountId if missing
        if (savedTx) {
          const parsedList: Transaction[] = JSON.parse(savedTx);
          const defaultAccId = activeAccounts.find((a) => a.isDefault)?.id || 'acc-primary';
          const migratedList = parsedList.map((t) => ({
            ...t,
            accountId: t.accountId || defaultAccId,
          }));
          setTransactions(migratedList);
          localStorage.setItem(STORAGE_KEYS.TX, JSON.stringify(migratedList));
        } else {
          const sample = generateInitialTransactions();
          const defaultAccId = activeAccounts.find((a) => a.isDefault)?.id || 'acc-primary';
          const sampleWithAccounts = sample.transactions.map((t) => ({
            ...t,
            accountId: t.accountId || defaultAccId,
          }));
          setTransactions(sampleWithAccounts);
          localStorage.setItem(STORAGE_KEYS.TX, JSON.stringify(sampleWithAccounts));
        }

        // Phase 3: Upcoming Cash Flows load
        if (savedUpcoming) {
          try {
            setUpcomingCashFlows(JSON.parse(savedUpcoming));
          } catch {
            const defaults = createDefaultUpcomingCashFlows('acc-primary');
            setUpcomingCashFlows(defaults);
            localStorage.setItem(STORAGE_KEYS.UPCOMING, JSON.stringify(defaults));
          }
        } else {
          const defaults = createDefaultUpcomingCashFlows('acc-primary');
          setUpcomingCashFlows(defaults);
          localStorage.setItem(STORAGE_KEYS.UPCOMING, JSON.stringify(defaults));
        }

        // Phase 3: Saved Scenarios load
        if (savedScenariosRaw) {
          try {
            setSavedScenarios(JSON.parse(savedScenariosRaw));
          } catch {
            setSavedScenarios(DEFAULT_SAVED_SCENARIOS);
            localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(DEFAULT_SAVED_SCENARIOS));
          }
        } else {
          setSavedScenarios(DEFAULT_SAVED_SCENARIOS);
          localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(DEFAULT_SAVED_SCENARIOS));
        }

        localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());
      } catch {
        const sample = generateInitialTransactions();
        setTransactions(sample.transactions);
        setInitialBalanceState(sample.initialBalance);
        setMinCashRequiredState(sample.minCashRequired);
        setAccounts(createDefaultAccounts(sample.initialBalance));
        setUpcomingCashFlows(createDefaultUpcomingCashFlows('acc-primary'));
        setSavedScenarios(DEFAULT_SAVED_SCENARIOS);
      }
    }
  }, [user?.uid, user?.isFirebaseUser]);

  // Persist to localStorage if not a Firebase user
  useEffect(() => {
    if (!user?.isFirebaseUser && transactions.length > 0) {
      localStorage.setItem(STORAGE_KEYS.TX, JSON.stringify(transactions));
    }
  }, [transactions, user?.isFirebaseUser]);

  useEffect(() => {
    if (!user?.isFirebaseUser && accounts.length > 0) {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    }
  }, [accounts, user?.isFirebaseUser]);

  useEffect(() => {
    if (!user?.isFirebaseUser) {
      localStorage.setItem(STORAGE_KEYS.INITIAL_BAL, initialBalance.toString());
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());
    }
  }, [initialBalance, user?.isFirebaseUser]);

  useEffect(() => {
    if (!user?.isFirebaseUser) {
      localStorage.setItem(STORAGE_KEYS.MIN_CASH, minCashRequired.toString());
      localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());
    }
  }, [minCashRequired, user?.isFirebaseUser]);

  useEffect(() => {
    if (!user?.isFirebaseUser && upcomingCashFlows.length > 0) {
      localStorage.setItem(STORAGE_KEYS.UPCOMING, JSON.stringify(upcomingCashFlows));
    }
  }, [upcomingCashFlows, user?.isFirebaseUser]);

  useEffect(() => {
    if (!user?.isFirebaseUser && savedScenarios.length > 0) {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(savedScenarios));
    }
  }, [savedScenarios, user?.isFirebaseUser]);

  // Compute live metrics & headline summary based on total cash position
  const metrics = calculateCashHealth(transactions, totalCashPosition.totalInitialBalance || initialBalance, minCashRequired);
  const recommendation = generateSmartRecommendation(metrics, transactions);
  const headlineSummary = generateHeadlineSummary(metrics, transactions, language);
  const shortfallInfo = getNextShortfallInfo(metrics.currentBalance, minCashRequired, transactions, 90);
  const healthStatus = getHealthStatus(metrics);

  // Phase 4: Shared Alert Rules Evaluation & Monthly Report Generator
  const forecastForAlerts = useMemo(
    () => generateForecast(totalCashPosition.totalBalance, transactions, 30, scenario, upcomingCashFlows),
    [totalCashPosition.totalBalance, transactions, scenario, upcomingCashFlows]
  );

  const rawTriggeredAlerts = useMemo(
    () => evaluateAlertRules(alertRules, metrics, shortfallInfo, forecastForAlerts),
    [alertRules, metrics, shortfallInfo, forecastForAlerts]
  );

  const triggeredAlerts = useMemo(
    () =>
      rawTriggeredAlerts
        .filter((a) => !dismissedAlertIds.includes(a.id))
        .map((a) => ({
          ...a,
          isRead: readAlertIds.includes(a.id),
        })),
    [rawTriggeredAlerts, dismissedAlertIds, readAlertIds]
  );

  const unreadAlertCount = useMemo(
    () => triggeredAlerts.filter((a) => !a.isRead).length,
    [triggeredAlerts]
  );

  const dismissAlert = (id: string) => {
    setDismissedAlertIds((prev) => [...prev, id]);
  };

  const markAlertAsRead = (id: string) => {
    setReadAlertIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const markAllAlertsAsRead = () => {
    setReadAlertIds(triggeredAlerts.map((a) => a.id));
  };

  const refreshActivityLogs = async () => {
    try {
      const res = await fetch('/api/activity-logs');
      if (res.ok) {
        const body = await res.json();
        if (body.success && Array.isArray(body.data)) {
          setActivityLogs(body.data);
          localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(body.data));
        }
      }
    } catch {}
  };

  const canPerform = (action: 'manage_settings' | 'delete_account' | 'configure_alerts') => {
    const isOwner = (user?.role ?? 'owner') === 'owner';
    if (isOwner) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Owner permission required: You are currently signed in as Finance role. Modifying safety reserves, deleting bank accounts, or altering automated alert rules is restricted to Business Owners.',
    };
  };

  const recordActivity = (
    action: ActivityLogEntry['action'],
    entityType: ActivityLogEntry['entityType'],
    entityId: string,
    description: string,
    details?: Record<string, any>
  ) => {
    const role: UserRole = user?.role ?? 'owner';
    const entry: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toISOString(),
      userId: user?.uid || 'user-default',
      userEmail: user?.email || (role === 'owner' ? 'demo@cashwise.com' : 'finance@cashwise.com'),
      userName: user?.name || (role === 'owner' ? 'Rajesh Sharma' : 'Finance Officer'),
      userRole: role,
      action,
      entityType,
      entityId,
      description,
      details,
    };
    setActivityLogs((prev) => {
      const updated = [entry, ...prev].slice(0, 200);
      try {
        localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const updateAlertRule = async (ruleId: string, patch: Partial<AlertRule>) => {
    const check = canPerform('configure_alerts');
    if (!check.allowed) {
      alert(check.reason);
      return;
    }
    setAlertRules((prev) => {
      const updated = prev.map((r) => (r.id === ruleId ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r));
      try {
        localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
    recordActivity('ALERT_RULE_UPDATED', 'alert_rule', ruleId, `Updated alert rule: ${patch.name || ruleId}`);
  };

  const dispatchTestAlert = async (
    alert: TriggeredAlert,
    channel: 'email' | 'whatsapp',
    recipient: string
  ): Promise<AlertDispatchResult> => {
    return await dispatchAlertMock(alert, channel, recipient);
  };

  const monthlyReportData = useMemo(
    () =>
      generateMonthlyReportData(
        transactions,
        totalCashPosition.totalBalance,
        minCashRequired,
        upcomingCashFlows,
        {
          name: user?.name || 'Rajesh Sharma',
          businessName: user?.businessName || 'Apex Craft Digital & Retail',
          role: user?.role || 'owner',
        },
        30
      ),
    [transactions, totalCashPosition.totalBalance, minCashRequired, upcomingCashFlows, user]
  );

  // Handlers
  const addTransaction = async (newTx: Omit<Transaction, 'id'>) => {
    const id = `tx-${Date.now()}`;
    const defaultAccId = accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || 'acc-primary';
    const tx: Transaction = {
      ...newTx,
      id,
      accountId: newTx.accountId || defaultAccId,
    };

    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'transactions', id), {
          ...tx,
          userId: user.uid,
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      setTransactions((prev) => [tx, ...prev]);
    }
  };

  const batchImportTransactions = async (
    newTxs: Omit<Transaction, 'id'>[],
    targetAccountId?: string
  ): Promise<number> => {
    const defaultAccId = targetAccountId || accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || 'acc-primary';
    const timestamp = Date.now();
    const created: Transaction[] = newTxs.map((t, idx) => ({
      ...t,
      id: `tx-import-${timestamp}-${idx}`,
      accountId: t.accountId || defaultAccId,
    }));

    if (user?.uid && user.isFirebaseUser) {
      for (const tx of created) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'transactions', tx.id), {
            ...tx,
            userId: user.uid,
          });
        } catch (err) {
          console.warn('Batch import error:', err);
        }
      }
    } else {
      setTransactions((prev) => [...created, ...prev]);
    }

    return created.length;
  };

  const updateTransaction = async (id: string, patch: Partial<Transaction>) => {
    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'transactions', id), patch);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      setTransactions((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...patch } : t))
      );
    }
  };

  const deleteTransaction = async (id: string) => {
    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/transactions/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      setTransactions((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Bank Accounts Management Handlers
  const addAccount = async (accountData: Omit<BankAccount, 'id'>): Promise<BankAccount> => {
    const id = `acc-${Date.now()}`;
    const newAccount: BankAccount = { ...accountData, id, createdAt: new Date().toISOString() };

    const updatedAccounts: BankAccount[] = newAccount.isDefault
      ? [...accounts.map((a) => ({ ...a, isDefault: false })), newAccount]
      : [...accounts, newAccount];

    setAccounts(updatedAccounts);

    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/accounts/${id}`;
      try {
        await setDoc(doc(db, 'users', user.uid, 'accounts', id), newAccount);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updatedAccounts));
    }

    return newAccount;
  };

  const updateAccount = async (id: string, patch: Partial<BankAccount>) => {
    const updated = accounts.map((a) => (a.id === id ? { ...a, ...patch } : a));
    setAccounts(updated);

    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/accounts/${id}`;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'accounts', id), patch);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
    }
  };

  const deleteAccount = async (id: string) => {
    const check = canPerform('delete_account');
    if (!check.allowed) {
      alert(check.reason);
      return;
    }
    if (accounts.length <= 1) {
      alert('At least one bank account must be maintained.');
      return;
    }
    const target = accounts.find((a) => a.id === id);
    const updated = accounts.filter((a) => a.id !== id);
    if (!updated.some((a) => a.isDefault) && updated.length > 0) {
      updated[0].isDefault = true;
    }
    setAccounts(updated);

    recordActivity('ACCOUNT_DELETED', 'account', id, `Deleted bank account: ${target?.name || id}`);

    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/accounts/${id}`;
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'accounts', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, path);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
    }
  };

  const setDefaultAccount = async (id: string) => {
    const updated = accounts.map((a) => ({
      ...a,
      isDefault: a.id === id,
    }));
    setAccounts(updated);
    setPrimaryAccountId(id);

    if (user?.uid && user.isFirebaseUser) {
      for (const a of updated) {
        try {
          await updateDoc(doc(db, 'users', user.uid, 'accounts', a.id), { isDefault: a.isDefault });
        } catch (err) {
          console.warn('Set default account error:', err);
        }
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
    }
  };

  // Onboarding Completion Handler
  const completeOnboarding = async (config: {
    initialBalance: number;
    minCashRequired: number;
    primaryAccountName?: string;
    bankName?: string;
    loadSample?: boolean;
  }) => {
    await setInitialBalance(config.initialBalance);
    await setMinCashRequired(config.minCashRequired);

    if (config.primaryAccountName || config.bankName) {
      const updated = accounts.map((a) => {
        if (a.isDefault || a.id === 'acc-primary') {
          return {
            ...a,
            name: config.primaryAccountName || a.name,
            bankName: config.bankName || a.bankName,
            initialBalance: config.initialBalance,
          };
        }
        return a;
      });
      setAccounts(updated);
      if (!user?.isFirebaseUser) {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(updated));
      }
    }

    if (config.loadSample) {
      const sample = generateInitialTransactions();
      const defaultAccId = accounts.find((a) => a.isDefault)?.id || 'acc-primary';
      const sampleTxs = sample.transactions.map((t) => ({ ...t, accountId: defaultAccId }));
      setTransactions(sampleTxs);
      if (user?.uid && user.isFirebaseUser) {
        for (const t of sampleTxs) {
          try {
            await setDoc(doc(db, 'users', user.uid, 'transactions', t.id), {
              ...t,
              userId: user.uid,
            });
          } catch (err) {
            console.warn('Sample error:', err);
          }
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.TX, JSON.stringify(sampleTxs));
      }
    }

    setOnboardingCompletedState(true);
    setShowOnboardingWizard(false);
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');

    const updatedSettings: UserSettings = {
      minCashRequired: config.minCashRequired,
      initialBalance: config.initialBalance,
      language,
      schemaVersion: SCHEMA_VERSION,
      onboardingCompleted: true,
      primaryAccountId: accounts[0]?.id || 'acc-primary',
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));

    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/settings/cashReserve`;
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'settings', 'cashReserve'),
          {
            onboardingCompleted: true,
            minCashRequired: config.minCashRequired,
            initialBalance: config.initialBalance,
            primaryAccountId: accounts[0]?.id || 'acc-primary',
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const setLanguage = async (newLang: AppLanguage) => {
    setLanguageState(newLang);
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, newLang);
    localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());

    const updatedSettings: UserSettings = {
      minCashRequired,
      initialBalance,
      language: newLang,
      schemaVersion: SCHEMA_VERSION,
      onboardingCompleted,
      primaryAccountId,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));

    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/settings/cashReserve`;
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'settings', 'cashReserve'),
          { language: newLang, schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const setMinCashRequired = async (amount: number) => {
    const check = canPerform('manage_settings');
    if (!check.allowed) {
      alert(check.reason);
      return;
    }
    const val = Math.max(0, amount);
    setMinCashRequiredState(val);
    localStorage.setItem(STORAGE_KEYS.MIN_CASH, val.toString());
    localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());

    recordActivity('SETTINGS_UPDATED', 'settings', 'minCashRequired', `Updated safety reserve threshold to ₹${val.toLocaleString('en-IN')}`, { minCashRequired: val });

    const updatedSettings: UserSettings = {
      minCashRequired: val,
      initialBalance,
      language,
      schemaVersion: SCHEMA_VERSION,
      onboardingCompleted,
      primaryAccountId,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));

    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/settings/cashReserve`;
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'settings', 'cashReserve'),
          { minCashRequired: val, language, schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const setInitialBalance = async (amount: number) => {
    setInitialBalanceState(amount);
    localStorage.setItem(STORAGE_KEYS.INITIAL_BAL, amount.toString());
    localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());

    // Also update primary account initial balance if only 1 account
    if (accounts.length > 0) {
      const updated = accounts.map((a) => (a.isDefault ? { ...a, initialBalance: amount } : a));
      setAccounts(updated);
    }

    const updatedSettings: UserSettings = {
      minCashRequired,
      initialBalance: amount,
      language,
      schemaVersion: SCHEMA_VERSION,
      onboardingCompleted,
      primaryAccountId,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));

    if (user?.uid && user.isFirebaseUser) {
      const path = `users/${user.uid}/settings/cashReserve`;
      try {
        await setDoc(
          doc(db, 'users', user.uid, 'settings', 'cashReserve'),
          { initialBalance: amount, language, schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString() },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, path);
      }
    }
  };

  const applyAutoRecommendedReserve = (months = 3) => {
    const check = canPerform('manage_settings');
    if (!check.allowed) {
      alert(check.reason);
      return;
    }
    const monthlyExp = metrics.monthlyAverageExpense;
    const target = Math.round(monthlyExp * months);
    setMinCashRequired(target > 0 ? target : 250000);
  };

  const resetToSampleData = async () => {
    const sample = generateInitialTransactions();
    const defaultAccs = createDefaultAccounts(sample.initialBalance);
    const sampleTxsWithAccounts = sample.transactions.map((t) => ({
      ...t,
      accountId: 'acc-primary',
    }));

    setAccounts(defaultAccs);
    setInitialBalanceState(sample.initialBalance);
    setMinCashRequiredState(sample.minCashRequired);
    setLanguageState('en');
    setScenario(defaultScenario);
    setDismissedLowCashToast(false);
    setOnboardingCompletedState(true);
    setShowOnboardingWizard(false);

    localStorage.setItem(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION.toString());
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, 'en');
    localStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
    localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(defaultAccs));

    if (user?.uid && user.isFirebaseUser) {
      for (const t of sampleTxsWithAccounts) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'transactions', t.id), {
            ...t,
            userId: user.uid,
          });
        } catch (err) {
          console.warn('Reset error:', err);
        }
      }
      for (const a of defaultAccs) {
        try {
          await setDoc(doc(db, 'users', user.uid, 'accounts', a.id), a);
        } catch (err) {
          console.warn('Reset account error:', err);
        }
      }
      try {
        await setDoc(doc(db, 'users', user.uid, 'settings', 'cashReserve'), {
          initialBalance: sample.initialBalance,
          minCashRequired: sample.minCashRequired,
          language: 'en',
          schemaVersion: SCHEMA_VERSION,
          onboardingCompleted: true,
          primaryAccountId: 'acc-primary',
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        console.warn('Reset settings error:', err);
      }
    } else {
      setTransactions(sampleTxsWithAccounts);
      localStorage.setItem(STORAGE_KEYS.TX, JSON.stringify(sampleTxsWithAccounts));
      localStorage.setItem(STORAGE_KEYS.INITIAL_BAL, sample.initialBalance.toString());
      localStorage.setItem(STORAGE_KEYS.MIN_CASH, sample.minCashRequired.toString());
    }
  };

  const dismissLowCashToast = () => {
    setDismissedLowCashToast(true);
  };

  const updateScenario = (patch: Partial<WhatIfScenario>) => {
    setScenario((prev) => ({ ...prev, ...patch }));
    // If customized away from preset, clear active preset highlight
    setActivePresetId(null);
  };

  const resetScenario = () => {
    setScenario(defaultScenario);
    setActivePresetId(null);
  };

  // Phase 3: One-click Scenario Presets
  const applyPreset = (presetId: string) => {
    const found = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setScenario({ ...found.scenario });
      setActivePresetId(presetId);
    }
  };

  // Phase 3: Saved Named Scenarios CRUD
  const saveScenario = async (
    name: string,
    scenarioData: WhatIfScenario,
    description?: string
  ): Promise<SavedScenario> => {
    const newScen: SavedScenario = {
      id: `scen-${Date.now()}`,
      name: name.trim(),
      description: description?.trim(),
      isBaseCase: false,
      scenario: { ...scenarioData },
      createdAt: new Date().toISOString(),
      userId: user?.uid,
    };

    const updated = [...savedScenarios, newScen];
    setSavedScenarios(updated);

    if (user?.uid && user.isFirebaseUser) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'scenarios', newScen.id), newScen);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/scenarios/${newScen.id}`);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(updated));
    }

    return newScen;
  };

  const updateSavedScenario = async (id: string, patch: Partial<SavedScenario>) => {
    const updated = savedScenarios.map((s) => (s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s));
    setSavedScenarios(updated);

    if (user?.uid && user.isFirebaseUser) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'scenarios', id), {
          ...patch,
          updatedAt: new Date().toISOString(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/scenarios/${id}`);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(updated));
    }
  };

  const deleteScenario = async (id: string) => {
    const target = savedScenarios.find((s) => s.id === id);
    if (target?.isBaseCase) {
      throw new Error('Cannot delete the default Base Case scenario.');
    }

    const updated = savedScenarios.filter((s) => s.id !== id);
    setSavedScenarios(updated);
    if (compareScenarioId === id) {
      setCompareScenarioId(null);
    }

    if (user?.uid && user.isFirebaseUser) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'scenarios', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/scenarios/${id}`);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.SCENARIOS, JSON.stringify(updated));
    }
  };

  // Phase 3: Upcoming Cash Flows CRUD
  const addUpcomingCashFlow = async (item: Omit<UpcomingCashFlow, 'id'>): Promise<UpcomingCashFlow> => {
    const newFlow: UpcomingCashFlow = {
      ...item,
      id: `flow-${Date.now()}`,
      accountId: item.accountId || primaryAccountId,
      createdAt: new Date().toISOString(),
      userId: user?.uid,
    };

    const updated = [...upcomingCashFlows, newFlow].sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    setUpcomingCashFlows(updated);

    if (user?.uid && user.isFirebaseUser) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'upcoming_cashflows', newFlow.id), newFlow);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/upcoming_cashflows/${newFlow.id}`);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.UPCOMING, JSON.stringify(updated));
    }

    return newFlow;
  };

  const updateUpcomingCashFlow = async (id: string, patch: Partial<UpcomingCashFlow>) => {
    const updated = upcomingCashFlows.map((f) => (f.id === id ? { ...f, ...patch } : f)).sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
    setUpcomingCashFlows(updated);

    if (user?.uid && user.isFirebaseUser) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'upcoming_cashflows', id), patch);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}/upcoming_cashflows/${id}`);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.UPCOMING, JSON.stringify(updated));
    }
  };

  const deleteUpcomingCashFlow = async (id: string) => {
    const updated = upcomingCashFlows.filter((f) => f.id !== id);
    setUpcomingCashFlows(updated);

    if (user?.uid && user.isFirebaseUser) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'upcoming_cashflows', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/upcoming_cashflows/${id}`);
      }
    } else {
      localStorage.setItem(STORAGE_KEYS.UPCOMING, JSON.stringify(updated));
    }
  };

  const markUpcomingCashFlowStatus = async (
    id: string,
    status: UpcomingCashFlowStatus,
    convertToTx = false
  ) => {
    const flow = upcomingCashFlows.find((f) => f.id === id);
    await updateUpcomingCashFlow(id, { status });

    if (convertToTx && flow && status === 'completed') {
      // Map category to TransactionCategory
      let category: any = 'Other Inflow';
      if (flow.type === 'expense') {
        if (flow.category === 'payroll') category = 'Staff Salaries';
        else if (flow.category === 'gst') category = 'Taxes & GST';
        else if (flow.category === 'rent') category = 'Office Rent';
        else if (flow.category === 'vendor_invoice') category = 'Vendor / Supplier';
        else category = 'Miscellaneous Expense';
      } else {
        if (flow.category === 'expected_receivable') category = 'Client Payment';
        else category = 'Product Sales';
      }

      await addTransaction({
        date: new Date().toISOString().split('T')[0],
        type: flow.type,
        amount: flow.amount,
        category,
        note: `Cleared: ${flow.title}`,
        accountId: flow.accountId || primaryAccountId,
        paymentMethod: 'NEFT / RTGS',
      });
    }
  };

  // Phase 3: Calculation Explanations Modal
  const openExplanation = (key: MetricCalculationKey) => {
    setExplanationKey(key);
    setShowExplanationModal(true);
  };

  const closeExplanation = () => {
    setShowExplanationModal(false);
    setExplanationKey(null);
  };

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        document.documentElement.style.colorScheme = 'dark';
        localStorage.setItem(STORAGE_KEYS.THEME, 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.style.colorScheme = 'light';
        localStorage.setItem(STORAGE_KEYS.THEME, 'light');
      }
      return next;
    });
  };

  return (
    <CashContext.Provider
      value={{
        transactions,
        initialBalance,
        minCashRequired,
        metrics,
        recommendation,
        headlineSummary,
        shortfallInfo,
        healthStatus,
        activeView,
        setActiveView,
        language,
        setLanguage,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        batchImportTransactions,
        setMinCashRequired,
        applyAutoRecommendedReserve,
        setInitialBalance,
        accounts,
        totalCashPosition,
        primaryAccountId,
        addAccount,
        updateAccount,
        deleteAccount,
        setDefaultAccount,
        onboardingCompleted,
        showOnboardingWizard,
        setShowOnboardingWizard,
        completeOnboarding,
        resetToSampleData,
        dismissedLowCashToast,
        dismissLowCashToast,
        scenario,
        updateScenario,
        resetScenario,
        activePresetId,
        applyPreset,
        savedScenarios,
        saveScenario,
        updateSavedScenario,
        deleteScenario,
        compareScenarioId,
        setCompareScenarioId,
        showSaveScenarioModal,
        setShowSaveScenarioModal,
        upcomingCashFlows,
        addUpcomingCashFlow,
        updateUpcomingCashFlow,
        deleteUpcomingCashFlow,
        markUpcomingCashFlowStatus,
        showUpcomingModal,
        setShowUpcomingModal,
        explanationKey,
        showExplanationModal,
        openExplanation,
        closeExplanation,
        isDarkMode,
        toggleDarkMode,
        isCloudSyncing,
        canPerform,
        alertRules,
        triggeredAlerts,
        unreadAlertCount,
        readAlertIds,
        markAlertAsRead,
        dismissAlert,
        markAllAlertsAsRead,
        updateAlertRule,
        dispatchTestAlert,
        showAlertSettingsModal,
        setShowAlertSettingsModal,
        showNotificationsDrawer,
        setShowNotificationsDrawer,
        activityLogs,
        refreshActivityLogs,
        showActivityLogModal,
        setShowActivityLogModal,
        recordActivity,
        showReportModal,
        setShowReportModal,
        monthlyReportData,
      }}
    >
      {children}
    </CashContext.Provider>
  );
};

export const useCash = () => {
  const context = useContext(CashContext);
  if (!context) {
    throw new Error('useCash must be used within a CashProvider');
  }
  return context;
};
