import { Router, Request, Response } from 'express';
import { ApiResponse, SavedScenario, ScenarioComparisonResult } from '../../src/types/finance';
import { SCENARIO_PRESETS, compareTwoScenarios } from '../../src/utils/finance';
import { verifyAuthToken } from '../middleware/auth';
import {
  inMemoryScenarios,
  inMemoryUpcomingFlows,
  logActivity,
  setInMemoryScenarios,
} from '../store/mockDb';

export const scenarioRouter = Router();

// One-click scenario presets
scenarioRouter.get('/scenarios/presets', (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: SCENARIO_PRESETS,
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// Get saved scenarios
scenarioRouter.get('/scenarios', verifyAuthToken, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: inMemoryScenarios,
    timestamp: new Date().toISOString(),
  } as ApiResponse<SavedScenario[]>);
});

// Save new scenario
scenarioRouter.post('/scenarios', verifyAuthToken, (req: Request, res: Response) => {
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

// Delete saved scenario
scenarioRouter.delete('/scenarios/:id', verifyAuthToken, (req: Request, res: Response) => {
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

  setInMemoryScenarios(inMemoryScenarios.filter((s) => s.id !== id));

  return res.json({
    success: true,
    data: { id, deleted: true },
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

// Compare two scenarios side-by-side
scenarioRouter.post('/forecast/compare', verifyAuthToken, (req: Request, res: Response) => {
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

