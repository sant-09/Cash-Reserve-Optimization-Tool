export type TransactionType = 'income' | 'expense';

export type TransactionCategory =
  | 'Client Payment'
  | 'Product Sales'
  | 'Consulting / Services'
  | 'Other Inflow'
  | 'Staff Salaries'
  | 'Office Rent'
  | 'Inventory / Stock'
  | 'Vendor / Supplier'
  | 'Utilities & Wifi'
  | 'Taxes & GST'
  | 'Marketing & Ads'
  | 'Software & SaaS'
  | 'Logistics & Shipping'
  | 'Miscellaneous Expense';

export const INCOME_CATEGORIES: readonly TransactionCategory[] = [
  'Client Payment',
  'Product Sales',
  'Consulting / Services',
  'Other Inflow',
] as const;

export const EXPENSE_CATEGORIES: readonly TransactionCategory[] = [
  'Staff Salaries',
  'Office Rent',
  'Inventory / Stock',
  'Vendor / Supplier',
  'Utilities & Wifi',
  'Taxes & GST',
  'Marketing & Ads',
  'Software & SaaS',
  'Logistics & Shipping',
  'Miscellaneous Expense',
] as const;

export const ALL_TRANSACTION_CATEGORIES: readonly TransactionCategory[] = [
  ...INCOME_CATEGORIES,
  ...EXPENSE_CATEGORIES,
] as const;

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  note: string;
  paymentMethod?: 'UPI' | 'NEFT / RTGS' | 'Cheque' | 'Card' | 'Cash';
  isRecurring?: boolean;
  accountId?: string; // Links transaction to specific BankAccount (defaults to primary)
}

export interface CashHealthMetrics {
  currentBalance: number;
  minCashRequired: number;
  safeSurplus: number;
  burnRatePerDay: number;
  avgDailyExpense: number;
  avgDailyIncome: number;
  monthlyAverageExpense: number;
  monthlyAverageIncome: number;
  daysOfCashLeft: number; // Runway
  isLowCash: boolean;
  shortfallDate: string | null;
  recommendedReserve: number; // 3-month expense
}

export interface ForecastDay {
  date: string;
  formattedDate: string;
  projectedBalance: number;
  scenarioBalance?: number;
  scenarioBBalance?: number;
  netDailyChange: number;
  isShortfall: boolean;
  isBelowMinimum: boolean;
  upcomingInflow?: number;
  upcomingOutflow?: number;
  upcomingEvents?: UpcomingCashFlow[];
}

// ==========================================
// Phase 3: Forecasting & Scenarios Types
// ==========================================

export type UpcomingCashFlowCategory =
  | 'payroll'
  | 'gst'
  | 'rent'
  | 'vendor_invoice'
  | 'expected_receivable'
  | 'tax'
  | 'loan_emi'
  | 'other';

export type UpcomingCashFlowRecurrence = 'none' | 'weekly' | 'monthly' | 'quarterly';

export type UpcomingCashFlowStatus = 'pending' | 'completed' | 'cancelled';

export interface UpcomingCashFlow {
  id: string;
  title: string;
  category: UpcomingCashFlowCategory;
  amount: number;
  type: TransactionType; // 'income' | 'expense'
  dueDate: string; // YYYY-MM-DD
  recurrence?: UpcomingCashFlowRecurrence;
  status: UpcomingCashFlowStatus;
  accountId?: string;
  notes?: string;
  userId?: string;
  createdAt?: string;
}

export interface SavedScenario {
  id: string;
  name: string;
  description?: string;
  isBaseCase?: boolean;
  scenario: WhatIfScenario;
  createdAt: string;
  updatedAt?: string;
  userId?: string;
}

export interface ScenarioPreset {
  id: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  scenario: WhatIfScenario;
  badgeColor: string;
}

export interface ScenarioComparisonResult {
  scenarioA: SavedScenario;
  scenarioB: SavedScenario;
  forecastA: ForecastDay[];
  forecastB: ForecastDay[];
  endingBalanceA: number;
  endingBalanceB: number;
  endingBalanceDelta: number; // B - A
  shortfallDateA: string | null;
  shortfallDateB: string | null;
  reserveDipDateA: string | null;
  reserveDipDateB: string | null;
  daysToReserveBreachA: number | null;
  daysToReserveBreachB: number | null;
  daysToInsolvencyA: number | null;
  daysToInsolvencyB: number | null;
  plainLanguageSummary: string;
  hinglishSummary?: string;
  verdict: 'better' | 'worse' | 'neutral' | 'critical';
}

export type MetricCalculationKey =
  | 'currentBalance'
  | 'runway'
  | 'safeSurplus'
  | 'minReserve'
  | 'shortfall'
  | 'burnRate';

export interface MetricInputBreakdown {
  label: string;
  value: string;
  numericValue?: number;
  description?: string;
  source?: string;
}

export interface MetricCalculationExplanation {
  metricKey: MetricCalculationKey;
  title: string;
  formulaName: string;
  formulaDisplay: string;
  inputs: MetricInputBreakdown[];
  computationSteps: string[];
  finalResultFormatted: string;
  interpretation: string;
  actionableTip: string;
  hinglishExplanation?: string;
}


export interface WhatIfScenario {
  incomeChangePercent: number; // -50 to +50
  expenseChangePercent: number; // -50 to +50
  oneTimeExpenseAmount: number; // ₹
  oneTimeExpenseDate: string; // YYYY-MM-DD
  receivableDelayDays: number; // Days customers delay payment
}

export interface InvestmentOption {
  id: string;
  category: 'low_risk' | 'medium_risk';
  instrument: string;
  expectedReturn: string;
  lockIn: string;
  suggestedAllocationPercent: number;
  suggestedAmount: number;
  riskDescription: string;
  liquiditySpeed: string;
}

export interface SmartRecommendation {
  status: 'healthy' | 'caution' | 'critical';
  headline: string;
  keepAmount: number;
  investAmount: number;
  nextCashNeedDate: string;
  nextCashNeedReason: string;
  advicePoints: string[];
  hinglishTip: string;
}

// ==========================================
// Phase 1: Dashboard Clarity & Shared Types
// ==========================================

export type HealthStatus = 'healthy' | 'watch' | 'critical';

export type AppLanguage = 'en' | 'hinglish';

export interface UserSettings {
  minCashRequired: number;
  initialBalance?: number;
  language: AppLanguage;
  schemaVersion: number;
  updatedAt?: string;
  onboardingCompleted?: boolean;
  primaryAccountId?: string;
}

export interface ShortfallInfo {
  hasShortfall: boolean;
  shortfallDate: string | null; // YYYY-MM-DD
  formattedDate: string; // e.g., "14 Dec" or "None in 90 days"
  daysUntilShortfall: number | null;
  type: 'insolvency' | 'reserve_breach' | 'none';
  shortfallAmount: number;
  reason: string;
}

export interface HeadlineSummary {
  plainText: string;
  hinglishText: string;
  runwayDays: number;
  safeSurplus: number;
  nextRiskDate: string | null;
  nextRiskFormattedDate: string;
  nextRiskReason: string;
  status: HealthStatus;
}

export type FinanceTermKey =
  | 'burnRate'
  | 'runway'
  | 'safeSurplus'
  | 'dso'
  | 'capex'
  | 'minReserve'
  | 'currentBalance'
  | 'workingCapital';

export interface FinanceTermDefinition {
  key: FinanceTermKey;
  term: string;
  shortLabel: string;
  definition: string;
  formula?: string;
  hinglish: string;
  practicalTip: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  description: string;
  hinglishDescription?: string;
  actionLabel: string;
  actionView?: 'dashboard' | 'cashflow' | 'forecast' | 'vault3d';
  priority: 'high' | 'medium' | 'low';
  category: 'surplus' | 'reserve' | 'receivables' | 'burn' | 'capex';
}

// ==========================================
// Phase 2: Bank Accounts & Data Import Types
// ==========================================

export type AccountType = 'current' | 'savings' | 'overdraft' | 'cash';

export interface BankAccount {
  id: string;
  name: string; // e.g. "HDFC Operating Current A/c"
  accountNumberMasked?: string; // e.g. "•••• 4092"
  bankName: string; // e.g. "HDFC Bank"
  accountType: AccountType;
  initialBalance: number;
  isDefault?: boolean;
  color?: string; // hex code or tailwind color name
  createdAt?: string;
}

export interface AccountBalanceSummary {
  account: BankAccount;
  currentBalance: number;
  totalInflow: number;
  totalOutflow: number;
  transactionCount: number;
}

export interface TotalCashPosition {
  totalBalance: number;
  totalInitialBalance: number;
  totalInflow: number;
  totalOutflow: number;
  accountBreakdown: AccountBalanceSummary[];
}

export interface CSVColumnMapping {
  dateColumn: string;
  descriptionColumn: string;
  debitColumn?: string; // Outflow/expense column
  creditColumn?: string; // Inflow/income column
  amountColumn?: string; // Single amount column
  typeColumn?: string; // Single amount column with Dr/Cr indicator
  categoryColumn?: string;
}

export interface ParsedImportRow {
  rowIndex: number;
  rawRow: Record<string, string>;
  parsedTransaction?: Omit<Transaction, 'id'>;
  error?: string;
  isValid: boolean;
}

export interface CSVParseValidationRequest {
  rawCSV: string;
  mapping: CSVColumnMapping;
  defaultAccountId?: string;
  dateFormat?: string; // 'auto' | 'YYYY-MM-DD' | 'DD/MM/YYYY' | 'MM/DD/YYYY'
}

export interface CSVParseValidationResponse {
  totalRows: number;
  validCount: number;
  errorCount: number;
  totalInflow: number;
  totalOutflow: number;
  rows: ParsedImportRow[];
  detectedHeaders: string[];
}

export interface BatchImportTransactionsRequest {
  transactions: Omit<Transaction, 'id'>[];
  accountId: string;
}

export interface BatchImportTransactionsResponse {
  success: boolean;
  importedCount: number;
  createdTransactions: Transaction[];
}

// Server API Request/Response Shapes
export interface MetricsCalculationRequest {
  transactions: Transaction[];
  initialBalance: number;
  minCashRequired: number;
  language?: AppLanguage;
}

export interface MetricsCalculationResponse {
  metrics: CashHealthMetrics;
  headlineSummary: HeadlineSummary;
  shortfallInfo: ShortfallInfo;
  status: HealthStatus;
}

export interface UpdateUserSettingsRequest {
  language?: AppLanguage;
  minCashRequired?: number;
  initialBalance?: number;
  onboardingCompleted?: boolean;
  primaryAccountId?: string;
}

export interface UpdateUserSettingsResponse {
  success: boolean;
  settings: UserSettings;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// ==========================================
// Phase 4: Collaboration, Reports & Alerts
// ==========================================

export type UserRole = 'owner' | 'finance';

export interface UserProfile {
  uid?: string;
  email: string;
  name: string;
  businessName: string;
  role: UserRole;
  photoURL?: string;
  isFirebaseUser?: boolean;
}

// --- Alert Rules & In-App Notifications ---
export type AlertRuleType =
  | 'runway_below_threshold'
  | 'balance_below_reserve'
  | 'negative_balance_projected';

export interface AlertRule {
  id: string;
  name: string;
  type: AlertRuleType;
  enabled: boolean;
  thresholdValue: number; // e.g. 30 days for runway, 14 days for reserve dip
  channels: ('in_app' | 'email' | 'whatsapp')[];
  notifyEmail?: string;
  notifyPhone?: string;
  updatedAt?: string;
}

export interface TriggeredAlert {
  id: string;
  ruleId: string;
  ruleType: AlertRuleType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  messageHinglish: string;
  currentValue: number;
  thresholdValue: number;
  triggeredAt: string;
  isRead: boolean;
  recommendation?: string;
}

export interface AlertDispatchResult {
  success: boolean;
  channel: 'email' | 'whatsapp';
  recipient: string;
  sentAt: string;
  messagePreview: string;
  status: 'delivered' | 'simulated' | 'failed';
}

// --- Activity Log (Audit Trail) ---
export type ActivityActionType =
  | 'TRANSACTION_CREATED'
  | 'TRANSACTION_DELETED'
  | 'SETTINGS_UPDATED'
  | 'ACCOUNT_CREATED'
  | 'ACCOUNT_DELETED'
  | 'SCENARIO_SAVED'
  | 'UPCOMING_FLOW_CREATED'
  | 'ALERT_RULE_UPDATED';

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userEmail: string;
  userName: string;
  userRole: UserRole;
  action: ActivityActionType;
  entityType: 'transaction' | 'settings' | 'account' | 'scenario' | 'upcoming_flow' | 'alert_rule';
  entityId: string;
  description: string;
  details?: Record<string, any>;
}

// --- Monthly Printable / PDF Report ---
export interface MonthlyReportData {
  reportId: string;
  generatedAt: string;
  reportingPeriod: string;
  businessName: string;
  preparedBy: string;
  userRole: UserRole;
  metrics: CashHealthMetrics;
  headlineSummary: HeadlineSummary;
  shortfallInfo: ShortfallInfo;
  healthStatus: HealthStatus;
  forecastSummary: {
    startingBalance: number;
    lowestProjectedBalance: number;
    endingBalance: number;
    daysCount: number;
  };
  upcomingLiabilities: UpcomingCashFlow[];
  recommendedAction: RecommendedAction;
}

// ==========================================
// Phase 5: 3D Vault & Flat 2D View Types
// ==========================================
export type VaultDisplayMode = '3d' | '2d';


