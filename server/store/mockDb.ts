import { Request } from 'express';
import {
  ActivityLogEntry,
  AlertRule,
  BankAccount,
  SavedScenario,
  UpcomingCashFlow,
  UserSettings,
  UserRole,
} from '../../src/types/finance';
import {
  DEFAULT_ALERT_RULES,
  createDefaultUpcomingCashFlows,
} from '../../src/utils/finance';

// =========================================================================
// In-Memory Data Stores for Mock API Server
// =========================================================================

export let inMemoryUserSettings: Record<string, UserSettings> = {};

export let inMemoryAccounts: BankAccount[] = [];

export let inMemoryScenarios: SavedScenario[] = [
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

export let inMemoryUpcomingFlows: UpcomingCashFlow[] = createDefaultUpcomingCashFlows('acc-primary');

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

export let inMemoryAlertRules: AlertRule[] = [...DEFAULT_ALERT_RULES];

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

export function setInMemoryUpcomingFlows(flows: UpcomingCashFlow[]) {
  inMemoryUpcomingFlows = flows;
}

export function setInMemoryScenarios(scenarios: SavedScenario[]) {
  inMemoryScenarios = scenarios;
}

export function setInMemoryAlertRules(rules: AlertRule[]) {
  inMemoryAlertRules = rules;
}
