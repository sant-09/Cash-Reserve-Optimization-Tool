import { useMemo, useState } from 'react';
import { useCash } from '../context/CashContext';
import { SavedScenario, ScenarioComparisonResult } from '../types/finance';
import {
  compareTwoScenarios,
  generateForecast,
  getInvestmentSuggestions,
} from '../utils/finance';

export interface HorizonUpcomingSummary {
  count: number;
  totalOutflow: number;
  totalInflow: number;
  net: number;
}

/**
 * Custom hook containing all mathematical forecasting,
 * what-if scenario execution, and comparison logic for ForecastView.
 */
export function useForecastData() {
  const {
    transactions,
    minCashRequired,
    metrics,
    scenario,
    updateScenario,
    resetScenario,
    activePresetId,
    applyPreset,
    savedScenarios,
    compareScenarioId,
    setCompareScenarioId,
    setShowSaveScenarioModal,
    upcomingCashFlows,
    setShowUpcomingModal,
    openExplanation,
    language,
  } = useCash();

  // Forecast time horizon: 30, 60, or 90 days
  const [horizonDays, setHorizonDays] = useState<30 | 60 | 90>(60);

  // Side-by-Side Comparison Toggle Mode
  const [isComparisonMode, setIsComparisonMode] = useState<boolean>(false);
  const [selectedScenarioAId, setSelectedScenarioAId] = useState<string>('scen-base');
  const [selectedScenarioBId, setSelectedScenarioBId] = useState<string>('scen-drop');

  // Compute live forecast dataset (Baseline vs Active Scenario, integrated with upcoming cash flows)
  const forecastData = useMemo(() => {
    return generateForecast(metrics.currentBalance, transactions, horizonDays, scenario, upcomingCashFlows);
  }, [metrics.currentBalance, transactions, horizonDays, scenario, upcomingCashFlows]);

  // Scenarios for Side-by-Side Comparison
  const scenarioA = useMemo<SavedScenario>(() => {
    const found = savedScenarios.find((s) => s.id === selectedScenarioAId);
    if (found) return found;
    return (
      savedScenarios.find((s) => s.isBaseCase) || {
        id: 'scen-base',
        name: 'Base Case (Default Trajectory)',
        isBaseCase: true,
        scenario: {
          incomeChangePercent: 0,
          expenseChangePercent: 0,
          receivableDelayDays: 0,
          oneTimeExpenseAmount: 0,
          oneTimeExpenseDate: '',
        },
        createdAt: new Date().toISOString(),
      }
    );
  }, [savedScenarios, selectedScenarioAId]);

  const scenarioB = useMemo<SavedScenario>(() => {
    const found = savedScenarios.find((s) => s.id === selectedScenarioBId);
    if (found) return found;
    return (
      savedScenarios.find((s) => !s.isBaseCase) || {
        id: 'scen-drop',
        name: 'Sales drop 30%',
        isBaseCase: false,
        scenario: {
          incomeChangePercent: -30,
          expenseChangePercent: 0,
          receivableDelayDays: 0,
          oneTimeExpenseAmount: 0,
          oneTimeExpenseDate: '',
        },
        createdAt: new Date().toISOString(),
      }
    );
  }, [savedScenarios, selectedScenarioBId]);

  // Execute full comparison engine
  const comparisonResult = useMemo<ScenarioComparisonResult>(() => {
    return compareTwoScenarios(
      scenarioA,
      scenarioB,
      metrics.currentBalance,
      transactions,
      horizonDays,
      minCashRequired,
      upcomingCashFlows
    );
  }, [scenarioA, scenarioB, metrics.currentBalance, transactions, horizonDays, minCashRequired, upcomingCashFlows]);

  // Combined Chart Data for Comparison Mode
  const combinedComparisonChartData = useMemo(() => {
    if (!isComparisonMode) return forecastData;
    return comparisonResult.forecastA.map((dayA, idx) => {
      const dayB = comparisonResult.forecastB[idx];
      return {
        ...dayA,
        scenarioABalance: scenarioA.isBaseCase ? dayA.projectedBalance : (dayA.scenarioBalance ?? dayA.projectedBalance),
        scenarioBBalance: scenarioB.isBaseCase ? (dayB?.projectedBalance ?? dayA.projectedBalance) : (dayB?.scenarioBalance ?? dayB?.projectedBalance ?? dayA.projectedBalance),
      };
    });
  }, [isComparisonMode, forecastData, comparisonResult, scenarioA.isBaseCase, scenarioB.isBaseCase]);

  // Find shortfall date in active baseline and scenario
  const baselineShortfall = useMemo(() => {
    return forecastData.find((d) => d.projectedBalance < 0);
  }, [forecastData]);

  const scenarioShortfall = useMemo(() => {
    return forecastData.find((d) => (d.scenarioBalance ?? d.projectedBalance) < 0);
  }, [forecastData]);

  const scenarioReserveDip = useMemo(() => {
    return forecastData.find((d) => (d.scenarioBalance ?? d.projectedBalance) < minCashRequired);
  }, [forecastData, minCashRequired]);

  // Ending balances
  const endingBaselineBalance = forecastData[forecastData.length - 1]?.projectedBalance || 0;
  const endingScenarioBalance = forecastData[forecastData.length - 1]?.scenarioBalance || endingBaselineBalance;
  const balanceDelta = endingScenarioBalance - endingBaselineBalance;

  // Investment suggestions based on safe surplus
  const investmentOptions = useMemo(() => {
    return getInvestmentSuggestions(metrics.safeSurplus);
  }, [metrics.safeSurplus]);

  // Days to scenario shortfall
  const daysToScenarioShortfall = useMemo(() => {
    if (!scenarioShortfall) return null;
    const today = new Date();
    const sfDate = new Date(scenarioShortfall.date);
    const diff = Math.ceil((sfDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    return Math.max(0, diff);
  }, [scenarioShortfall]);

  // Active upcoming flows within horizon
  const horizonUpcomingSummary = useMemo<HorizonUpcomingSummary>(() => {
    const limit = new Date(Date.now() + horizonDays * 86400000);
    const relevant = upcomingCashFlows.filter((f) => f.status === 'pending' && new Date(f.dueDate) <= limit);
    const totalOutflow = relevant.filter((f) => f.type === 'expense').reduce((s, f) => s + f.amount, 0);
    const totalInflow = relevant.filter((f) => f.type === 'income').reduce((s, f) => s + f.amount, 0);
    return {
      count: relevant.length,
      totalOutflow,
      totalInflow,
      net: totalInflow - totalOutflow,
    };
  }, [upcomingCashFlows, horizonDays]);

  return {
    transactions,
    minCashRequired,
    metrics,
    scenario,
    updateScenario,
    resetScenario,
    activePresetId,
    applyPreset,
    savedScenarios,
    compareScenarioId,
    setCompareScenarioId,
    setShowSaveScenarioModal,
    upcomingCashFlows,
    setShowUpcomingModal,
    openExplanation,
    language,
    // Horizon & Mode
    horizonDays,
    setHorizonDays,
    isComparisonMode,
    setIsComparisonMode,
    selectedScenarioAId,
    setSelectedScenarioAId,
    selectedScenarioBId,
    setSelectedScenarioBId,
    // Calculations
    forecastData,
    scenarioA,
    scenarioB,
    comparisonResult,
    combinedComparisonChartData,
    baselineShortfall,
    scenarioShortfall,
    scenarioReserveDip,
    endingBaselineBalance,
    endingScenarioBalance,
    balanceDelta,
    investmentOptions,
    daysToScenarioShortfall,
    horizonUpcomingSummary,
  };
}

