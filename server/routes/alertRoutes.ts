import { Router, Request, Response } from 'express';
import {
  AlertDispatchResult,
  AlertRule,
  ApiResponse,
  TriggeredAlert,
} from '../../src/types/finance';
import { dispatchAlertMock, evaluateAlertRules } from '../../src/utils/finance';
import { verifyAuthToken, requireRole } from '../middleware/auth';
import {
  inMemoryAlertRules,
  logActivity,
  setInMemoryAlertRules,
} from '../store/mockDb';

export const alertRouter = Router();

// Alert Rules: Fetch active rules
alertRouter.get('/alerts/rules', verifyAuthToken, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: inMemoryAlertRules,
    timestamp: new Date().toISOString(),
  } as ApiResponse<AlertRule[]>);
});

// Alert Rules: Configure rules (Owner role enforced)
alertRouter.post(
  '/alerts/rules',
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

    setInMemoryAlertRules(rules);
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

// Alerts: Run evaluation on shared engine
alertRouter.post('/alerts/evaluate', verifyAuthToken, (req: Request, res: Response) => {
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

// Alerts: Test Dispatch (Email / WhatsApp Mock Delivery)
alertRouter.post('/alerts/dispatch-test', verifyAuthToken, async (req: Request, res: Response) => {
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

