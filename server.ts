import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  calculateCashHealth,
  generateHeadlineSummary,
  getNextShortfallInfo,
  getHealthStatus,
  FINANCE_TERMS,
  createDefaultAccounts,
  calculateTotalCashPosition,
  parseAndValidateCSV,
  compareTwoScenarios,
  createDefaultUpcomingCashFlows,
  getMetricCalculationExplanation,
  SCENARIO_PRESETS,
  DEFAULT_ALERT_RULES,
  evaluateAlertRules,
  dispatchAlertMock,
  generateMonthlyReportData,
} from './src/utils/finance';
import {
  ApiResponse,
  BankAccount,
  BatchImportTransactionsRequest,
  BatchImportTransactionsResponse,
  CSVColumnMapping,
  CSVParseValidationRequest,
  CSVParseValidationResponse,
  MetricCalculationKey,
  MetricsCalculationRequest,
  MetricsCalculationResponse,
  SavedScenario,
  ScenarioComparisonResult,
  TotalCashPosition,
  Transaction,
  UpcomingCashFlow,
  UpdateUserSettingsRequest,
  UserSettings,
  UserRole,
  AlertRule,
  TriggeredAlert,
  AlertDispatchResult,
  ActivityLogEntry,
  MonthlyReportData,
} from './src/types/finance';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
const PORT = 3000;

app.use(express.json());

// =========================================================================
// Middleware: Authentication & Role-Based Access Control (RBAC)
// Phase 4: Enforces Owner vs Finance roles with 403 Forbidden rejection
// =========================================================================
export function verifyAuthToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // If no header provided, allow anonymous/demo access
    return next();
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid token format. Must be Bearer <token>',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || token.length < 5) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Malformed or missing authentication token',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  next();
}

/**
 * Enforce RBAC roles on Express routes
 * Rejects unauthorized users with HTTP 403 Forbidden
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawRole = (req.headers['x-user-role'] as string)?.toLowerCase();
    // Default to 'owner' if no role header is sent (backward compatibility for demo/tests)
    const effectiveRole: UserRole = rawRole === 'finance' ? 'finance' : 'owner';

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Action requires [${allowedRoles.join(', ')}] role. Current role is "${effectiveRole}".`,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    (req as any).userRole = effectiveRole;
    next();
  };
}

// =========================================================================
// Phase 4 In-Memory Activity Log & Alert Rules Storage
// =========================================================================
export let inMemoryActivityLogs: ActivityLogEntry[] = [
  {
    id: 'log-seed-1',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    userId: 'user-default',
    userEmail: 'demo@cashwise.com',
    userName: 'Rajesh Sharma',
    userRole: 'owner',
    action: 'SETTINGS_UPDATED',
    entityType: 'settings',
    entityId: 'settings-primary',
    description: 'Configured minimum reserve threshold to ₹3,00,000',
    details: { minCashRequired: 300000 },
  },
];

export function logActivity(
  req: Request<any, any, any, any>,
  action: ActivityLogEntry['action'],
  entityType: ActivityLogEntry['entityType'],
  entityId: string,
  description: string,
  details?: Record<string, any>
): ActivityLogEntry {
  const role: UserRole = (req.headers['x-user-role'] as string)?.toLowerCase() === 'finance' ? 'finance' : 'owner';
  const entry: ActivityLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    userId: (req.headers['x-user-id'] as string) || 'user-default',
    userEmail: (req.headers['x-user-email'] as string) || (role === 'owner' ? 'demo@cashwise.com' : 'finance@cashwise.com'),
    userName: (req.headers['x-user-name'] as string) || (role === 'owner' ? 'Rajesh Sharma' : 'Finance Officer'),
    userRole: role,
    action,
    entityType,
    entityId,
    description,
    details,
  };
  inMemoryActivityLogs.unshift(entry);
  if (inMemoryActivityLogs.length > 200) {
    inMemoryActivityLogs.pop();
  }
  return entry;
}

export let inMemoryAlertRules: AlertRule[] = [...DEFAULT_ALERT_RULES];

// =========================================================================
// API Routes: Finance & Working Capital
// =========================================================================

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      app: 'CashWise Working Capital API',
      version: '2.0.0',
      phase: 1,
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// 2. Finance Glossary Terms
app.get('/api/finance/terms', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: FINANCE_TERMS,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// 3. Centralized Metrics & Headline Summary Calculation
app.post(
  '/api/finance/metrics',
  verifyAuthToken,
  (req: Request<unknown, unknown, MetricsCalculationRequest>, res: Response) => {
    try {
      const { transactions, initialBalance, minCashRequired, language = 'en' } = req.body;

      // Validation
      if (!Array.isArray(transactions)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "transactions" must be an array of Transaction objects',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      if (typeof initialBalance !== 'number' || isNaN(initialBalance) || !isFinite(initialBalance)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "initialBalance" must be a valid finite number',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      if (typeof minCashRequired !== 'number' || isNaN(minCashRequired) || minCashRequired < 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "minCashRequired" must be a non-negative number',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      if (language !== 'en' && language !== 'hinglish') {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "language" must be either "en" or "hinglish"',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      // Calculations using exact same centralized formulas
      const metrics = calculateCashHealth(transactions, initialBalance, minCashRequired);
      const headlineSummary = generateHeadlineSummary(metrics, transactions, language);
      const shortfallInfo = getNextShortfallInfo(metrics.currentBalance, minCashRequired, transactions, 90);
      const status = getHealthStatus(metrics);

      const responseData: MetricsCalculationResponse = {
        metrics,
        headlineSummary,
        shortfallInfo,
        status,
      };

      return res.json({
        success: true,
        data: responseData,
        timestamp: new Date().toISOString(),
      } as ApiResponse<MetricsCalculationResponse>);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Server Error: ${err.message || 'Failed to compute finance metrics'}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
);

// 4. User Settings, Language & Onboarding Preferences
app.get('/api/user/settings', verifyAuthToken, (_req: Request, res: Response) => {
  const defaultSettings: UserSettings = {
    minCashRequired: 300000,
    initialBalance: 350000,
    language: 'en',
    schemaVersion: 2,
    onboardingCompleted: true,
    primaryAccountId: 'acc-primary',
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: defaultSettings,
    timestamp: new Date().toISOString(),
  } as ApiResponse<UserSettings>);
});

app.post(
  '/api/user/settings',
  verifyAuthToken,
  requireRole(['owner']),
  (req: Request<unknown, unknown, UpdateUserSettingsRequest>, res: Response) => {
    const { language, minCashRequired, initialBalance, onboardingCompleted, primaryAccountId } = req.body;

    if (language !== undefined && language !== 'en' && language !== 'hinglish') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "language" must be "en" or "hinglish"',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (minCashRequired !== undefined && (typeof minCashRequired !== 'number' || minCashRequired < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "minCashRequired" must be a non-negative number',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (initialBalance !== undefined && (typeof initialBalance !== 'number' || !isFinite(initialBalance))) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "initialBalance" must be a valid number',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (onboardingCompleted !== undefined && typeof onboardingCompleted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "onboardingCompleted" must be a boolean',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const updatedSettings: UserSettings = {
      minCashRequired: minCashRequired ?? 300000,
      initialBalance: initialBalance ?? 350000,
      language: language ?? 'en',
      schemaVersion: 2,
      onboardingCompleted: onboardingCompleted ?? true,
      primaryAccountId: primaryAccountId ?? 'acc-primary',
      updatedAt: new Date().toISOString(),
    };

    logActivity(
      req,
      'SETTINGS_UPDATED',
      'settings',
      'user-settings',
      `Updated settings: Reserve ₹${(updatedSettings.minCashRequired).toLocaleString('en-IN')}`,
      req.body
    );

    return res.json({
      success: true,
      data: updatedSettings,
      timestamp: new Date().toISOString(),
    } as ApiResponse<UserSettings>);
  }
);

// 5. Phase 2: Bank Accounts Management
app.get('/api/accounts', verifyAuthToken, (_req: Request, res: Response) => {
  const accounts = createDefaultAccounts();
  res.json({
    success: true,
    data: accounts,
    timestamp: new Date().toISOString(),
  } as ApiResponse<BankAccount[]>);
});

app.post('/api/accounts', verifyAuthToken, (req: Request<unknown, unknown, Partial<BankAccount>>, res: Response) => {
  const { name, bankName, accountType, initialBalance, accountNumberMasked, color, isDefault } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Account "name" is required',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  if (!bankName || typeof bankName !== 'string' || bankName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: "bankName" is required',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  const validTypes = ['current', 'savings', 'overdraft', 'cash'];
  if (!accountType || !validTypes.includes(accountType)) {
    return res.status(400).json({
      success: false,
      error: `Validation Error: "accountType" must be one of: ${validTypes.join(', ')}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  if (typeof initialBalance !== 'number' || isNaN(initialBalance) || !isFinite(initialBalance)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: "initialBalance" must be a valid number',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  const newAccount: BankAccount = {
    id: `acc-${Date.now()}`,
    name: name.trim(),
    bankName: bankName.trim(),
    accountType,
    initialBalance,
    accountNumberMasked: accountNumberMasked ? accountNumberMasked.trim() : undefined,
    color: color || '#10b981',
    isDefault: !!isDefault,
    createdAt: new Date().toISOString(),
  };

  logActivity(req, 'ACCOUNT_CREATED', 'account', newAccount.id, `Created bank account: ${newAccount.name}`);

  return res.json({
    success: true,
    data: newAccount,
    timestamp: new Date().toISOString(),
  } as ApiResponse<BankAccount>);
});

// Delete Bank Account (Owner Role Enforced)
app.delete('/api/accounts/:id', verifyAuthToken, requireRole(['owner']), (req: Request, res: Response) => {
  const { id } = req.params;
  logActivity(req, 'ACCOUNT_DELETED', 'account', id, `Deleted bank account: ${id}`);
  return res.json({
    success: true,
    data: { id, deleted: true },
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// 6. Phase 2: CSV / Excel Import Parsing & Validation
app.post(
  '/api/import/validate',
  verifyAuthToken,
  (req: Request<unknown, unknown, CSVParseValidationRequest>, res: Response) => {
    try {
      const { rawCSV, mapping, defaultAccountId = 'acc-primary' } = req.body;

      if (!rawCSV || typeof rawCSV !== 'string' || rawCSV.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "rawCSV" string content is required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      if (!mapping || !mapping.dateColumn || !mapping.descriptionColumn) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "dateColumn" and "descriptionColumn" mapping are required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      // Execute shared centralized parser & validator
      const validationResult = parseAndValidateCSV(rawCSV, mapping, defaultAccountId);

      return res.json({
        success: true,
        data: validationResult,
        timestamp: new Date().toISOString(),
      } as ApiResponse<CSVParseValidationResponse>);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Server Error during CSV parsing: ${err.message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
);

// 7. Phase 2: Batch Import Transactions
app.post(
  '/api/import/batch',
  verifyAuthToken,
  (req: Request<unknown, unknown, BatchImportTransactionsRequest>, res: Response) => {
    try {
      const { transactions, accountId = 'acc-primary' } = req.body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "transactions" must be a non-empty array',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      const timestamp = Date.now();
      const createdTransactions: Transaction[] = transactions.map((t, idx) => ({
        ...t,
        id: `tx-import-${timestamp}-${idx}`,
        accountId: t.accountId || accountId,
      }));

      return res.json({
        success: true,
        data: {
          importedCount: createdTransactions.length,
          createdTransactions,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse<BatchImportTransactionsResponse>);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Server Error during batch import: ${err.message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
);

// =========================================================================
// Phase 3 API Routes: Scenarios, Upcoming Cash Flows & Calculations
// =========================================================================

// In-memory backing store for Phase 3 API endpoints
let inMemoryScenarios: SavedScenario[] = [
  {
    id: 'scen-base',
    name: 'Base Case (Default Trajectory)',
    description: 'Historical run rate and scheduled bills without economic stress shocks',
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
    description: 'Major clients delay payment releases by 30 days',
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

let inMemoryUpcomingFlows: UpcomingCashFlow[] = createDefaultUpcomingCashFlows('acc-primary');

// 8. One-click scenario presets
app.get('/api/scenarios/presets', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: SCENARIO_PRESETS,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// 9. Get saved scenarios
app.get('/api/scenarios', verifyAuthToken, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: inMemoryScenarios,
    timestamp: new Date().toISOString(),
  } as ApiResponse<SavedScenario[]>);
});

// 10. Save new scenario
app.post('/api/scenarios', verifyAuthToken, (req: Request, res: Response) => {
  try {
    const { name, scenario, description } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Scenario "name" is required and must be a non-empty string',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!scenario || typeof scenario !== 'object') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "scenario" configuration object is required',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const newScenario: SavedScenario = {
      id: `scen-${Date.now()}`,
      name: name.trim(),
      description: description ? String(description).trim() : undefined,
      isBaseCase: false,
      scenario: {
        incomeChangePercent: Number(scenario.incomeChangePercent) || 0,
        expenseChangePercent: Number(scenario.expenseChangePercent) || 0,
        receivableDelayDays: Number(scenario.receivableDelayDays) || 0,
        oneTimeExpenseAmount: Number(scenario.oneTimeExpenseAmount) || 0,
        oneTimeExpenseDate: scenario.oneTimeExpenseDate || '',
      },
      createdAt: new Date().toISOString(),
    };

    inMemoryScenarios.push(newScenario);

    logActivity(req, 'SCENARIO_SAVED', 'scenario', newScenario.id, `Saved what-if scenario: ${newScenario.name}`);

    return res.status(201).json({
      success: true,
      data: newScenario,
      timestamp: new Date().toISOString(),
    } as ApiResponse<SavedScenario>);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Server Error saving scenario: ${err.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

// 11. Delete saved scenario
app.delete('/api/scenarios/:id', verifyAuthToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const target = inMemoryScenarios.find((s) => s.id === id);

  if (!target) {
    return res.status(404).json({
      success: false,
      error: `Scenario with id "${id}" not found`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  if (target.isBaseCase) {
    return res.status(400).json({
      success: false,
      error: 'Cannot delete the default Base Case scenario',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  inMemoryScenarios = inMemoryScenarios.filter((s) => s.id !== id);

  return res.json({
    success: true,
    data: { id, deleted: true },
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// 12. Compare two scenarios side-by-side
app.post('/api/forecast/compare', verifyAuthToken, (req: Request, res: Response) => {
  try {
    const {
      scenarioA,
      scenarioB,
      startingBalance = 350000,
      transactions = [],
      daysCount = 60,
      minCashRequired = 300000,
      upcomingCashFlows = inMemoryUpcomingFlows,
    } = req.body;

    if (!scenarioA || !scenarioB) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Both "scenarioA" and "scenarioB" objects are required for comparison',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const comparisonResult = compareTwoScenarios(
      scenarioA,
      scenarioB,
      startingBalance,
      transactions,
      daysCount,
      minCashRequired,
      upcomingCashFlows
    );

    return res.json({
      success: true,
      data: comparisonResult,
      timestamp: new Date().toISOString(),
    } as ApiResponse<ScenarioComparisonResult>);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Server Error comparing scenarios: ${err.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

// 13. Get Upcoming Cash Flows
app.get('/api/upcoming', verifyAuthToken, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: inMemoryUpcomingFlows,
    timestamp: new Date().toISOString(),
  } as ApiResponse<UpcomingCashFlow[]>);
});

// 14. Create Upcoming Cash Flow
app.post('/api/upcoming', verifyAuthToken, (req: Request, res: Response) => {
  try {
    const { title, category, amount, type, dueDate, recurrence = 'none', accountId = 'acc-primary', notes } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "title" is required and must be a non-empty string',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "amount" must be a positive number',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "type" must be either "income" or "expense"',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!dueDate || typeof dueDate !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "dueDate" ISO string is required',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const newFlow: UpcomingCashFlow = {
      id: `flow-${Date.now()}`,
      title: title.trim(),
      category: category || (type === 'income' ? 'expected_receivable' : 'vendor_invoice'),
      amount,
      type,
      dueDate,
      recurrence,
      status: 'pending',
      accountId,
      notes: notes ? String(notes).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    inMemoryUpcomingFlows.push(newFlow);

    logActivity(req, 'UPCOMING_FLOW_CREATED', 'upcoming_flow', newFlow.id, `Scheduled ${newFlow.type}: ${newFlow.title} (₹${newFlow.amount.toLocaleString('en-IN')})`);

    return res.status(201).json({
      success: true,
      data: newFlow,
      timestamp: new Date().toISOString(),
    } as ApiResponse<UpcomingCashFlow>);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Server Error adding upcoming flow: ${err.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

// 15. Delete Upcoming Cash Flow
app.delete('/api/upcoming/:id', verifyAuthToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = inMemoryUpcomingFlows.length;
  inMemoryUpcomingFlows = inMemoryUpcomingFlows.filter((f) => f.id !== id);

  if (inMemoryUpcomingFlows.length === initialLength) {
    return res.status(404).json({
      success: false,
      error: `Upcoming cashflow with id "${id}" not found`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  return res.json({
    success: true,
    data: { id, deleted: true },
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// 16. "How is this calculated?" Metric Explanation API
app.get('/api/finance/metrics/explanation/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const validKeys: MetricCalculationKey[] = ['currentBalance', 'runway', 'safeSurplus', 'minReserve', 'shortfall', 'burnRate'];

  if (!validKeys.includes(key as MetricCalculationKey)) {
    return res.status(400).json({
      success: false,
      error: `Validation Error: Invalid metric key "${key}". Must be one of: ${validKeys.join(', ')}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  // Generate explanation with standard small business baseline
  const explanation = getMetricCalculationExplanation(key as MetricCalculationKey, {
    initialBalance: 350000,
    currentBalance: 520000,
    minCashRequired: 300000,
    transactions: [],
    metrics: {
      currentBalance: 520000,
      minCashRequired: 300000,
      safeSurplus: 220000,
      burnRatePerDay: 7500,
      avgDailyExpense: 7500,
      avgDailyIncome: 11000,
      monthlyAverageExpense: 225000,
      monthlyAverageIncome: 330000,
      daysOfCashLeft: 69,
      isLowCash: false,
      shortfallDate: null,
      recommendedReserve: 675000,
    },
    shortfallInfo: {
      hasShortfall: false,
      shortfallDate: null,
      formattedDate: 'None in 90 days',
      daysUntilShortfall: null,
      type: 'none',
      shortfallAmount: 0,
      reason: 'Healthy cash buffer projected across the entire forecast window.',
    },
  });

  return res.json({
    success: true,
    data: explanation,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// =========================================================================
// Phase 4 Routes: Activity Logs, Alerts & Monthly PDF Reports
// =========================================================================

// 17. Activity Log Audit Trail (Read-only for all authenticated users)
app.get('/api/activity-logs', verifyAuthToken, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: inMemoryActivityLogs,
    timestamp: new Date().toISOString(),
  } as ApiResponse<ActivityLogEntry[]>);
});

// 18. Alert Rules: Fetch active rules
app.get('/api/alerts/rules', verifyAuthToken, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: inMemoryAlertRules,
    timestamp: new Date().toISOString(),
  } as ApiResponse<AlertRule[]>);
});

// 19. Alert Rules: Configure rules (Owner role enforced)
app.post(
  '/api/alerts/rules',
  verifyAuthToken,
  requireRole(['owner']),
  (req: Request, res: Response) => {
    const { rules } = req.body;
    if (!Array.isArray(rules)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "rules" must be an array of AlertRule objects',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    inMemoryAlertRules = rules;
    logActivity(
      req,
      'ALERT_RULE_UPDATED',
      'alert_rule',
      'rules-config',
      `Updated ${rules.length} automated alert rules`,
      { ruleCount: rules.length }
    );

    return res.json({
      success: true,
      data: inMemoryAlertRules,
      timestamp: new Date().toISOString(),
    } as ApiResponse<AlertRule[]>);
  }
);

// 20. Alerts: Run evaluation on shared engine
app.post('/api/alerts/evaluate', verifyAuthToken, (req: Request, res: Response) => {
  try {
    const { metrics, shortfallInfo, forecast = [], rules = inMemoryAlertRules } = req.body;
    if (!metrics || !shortfallInfo) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "metrics" and "shortfallInfo" are required to evaluate alerts',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const triggered = evaluateAlertRules(rules, metrics, shortfallInfo, forecast);

    return res.json({
      success: true,
      data: triggered,
      timestamp: new Date().toISOString(),
    } as ApiResponse<TriggeredAlert[]>);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Server Error evaluating alerts: ${err.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

// 21. Alerts: Test Dispatch (Email / WhatsApp Mock Delivery)
app.post('/api/alerts/dispatch-test', verifyAuthToken, async (req: Request, res: Response) => {
  try {
    const { alert, channel = 'whatsapp', recipient = '+91 98765 43210' } = req.body;
    if (!alert) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "alert" object is required to dispatch',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const result = await dispatchAlertMock(alert, channel, recipient);

    return res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    } as ApiResponse<AlertDispatchResult>);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Server Error dispatching alert: ${err.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

// 22. Monthly Report: Generate report package using shared financial metrics
app.get('/api/report/monthly', verifyAuthToken, (req: Request, res: Response) => {
  try {
    const rawRole = (req.headers['x-user-role'] as string)?.toLowerCase();
    const role: UserRole = rawRole === 'finance' ? 'finance' : 'owner';
    const name = (req.headers['x-user-name'] as string) || 'Rajesh Sharma';
    const businessName = (req.headers['x-business-name'] as string) || 'Apex Craft Digital & Retail';

    const report = generateMonthlyReportData(
      [],
      350000,
      300000,
      inMemoryUpcomingFlows,
      { name, businessName, role },
      30
    );

    return res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    } as ApiResponse<MonthlyReportData>);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Server Error compiling monthly report: ${err.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});


// Setup Vite middlewares in development
export async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  // Only listen when executed directly
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`CashWise server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

// Start server if this is the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

