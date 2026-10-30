import { Router, Request, Response } from 'express';
import {
  calculateCashHealth,
  generateHeadlineSummary,
  getNextShortfallInfo,
  getHealthStatus,
  FINANCE_TERMS,
  getMetricCalculationExplanation,
} from '../../src/utils/finance';
import {
  ApiResponse,
  MetricCalculationKey,
  MetricsCalculationRequest,
  MetricsCalculationResponse,
} from '../../src/types/finance';
import { verifyAuthToken } from '../middleware/auth';

export const financeRouter = Router();

// 1. Health check
financeRouter.get('/health', (_req: Request, res: Response) => {
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
financeRouter.get('/finance/terms', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: FINANCE_TERMS,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// 3. Centralized Metrics & Headline Summary Calculation
financeRouter.post(
  '/finance/metrics',
  verifyAuthToken,
  (req: Request<unknown, unknown, MetricsCalculationRequest>, res: Response) => {
    try {
      const { transactions, initialBalance, minCashRequired, language = 'en' } = req.body;

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

// 4. "How is this calculated?" Metric Explanation API
financeRouter.get('/finance/metrics/explanation/:key', (req: Request, res: Response) => {
  const { key } = req.params;
  const validKeys: MetricCalculationKey[] = ['currentBalance', 'runway', 'safeSurplus', 'minReserve', 'shortfall', 'burnRate'];

  if (!validKeys.includes(key as MetricCalculationKey)) {
    return res.status(400).json({
      success: false,
      error: `Validation Error: Invalid metric key "${key}". Must be one of: ${validKeys.join(', ')}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

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

