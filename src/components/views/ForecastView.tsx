import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import {
  AlertTriangle,
  RotateCcw,
  Percent,
  Calendar,
  Clock,
  CheckCircle,
  HelpCircle,
  Layers,
  Sparkles,
  TrendingDown,
  Scissors,
  Flame,
  BookmarkPlus,
  ArrowRightLeft,
  Calculator,
  ArrowUpRight,
  ArrowDownLeft,
  Info,
} from 'lucide-react';
import { useForecastData } from '../../hooks';
import { formatCompactINR, formatINR, SCENARIO_PRESETS } from '../../utils/finance';
import { InfoTooltip } from '../common/InfoTooltip';
import { RecommendedActionCard } from '../common/RecommendedActionCard';

export const ForecastView: React.FC = () => {
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
    horizonDays,
    setHorizonDays,
    isComparisonMode,
    setIsComparisonMode,
    selectedScenarioAId,
    setSelectedScenarioAId,
    selectedScenarioBId,
    setSelectedScenarioBId,
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
  } = useForecastData();

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      
      {/* 1. Page Header with Action Hub */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Runway Forecast & What-If Stress Testing
            </h1>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
              Phase 3 Engine
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Simulate revenue contractions, collection delays, and capital outlays with scheduled commitments.
          </p>
        </div>

        {/* Top Controls: Horizon + Save Scenario + Compare Mode */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Horizon Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            {([30, 60, 90] as const).map((days) => (
              <button
                key={days}
                onClick={() => setHorizonDays(days)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  horizonDays === days
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {days}D Horizon
              </button>
            ))}
          </div>

          {/* Side-by-Side Comparison Mode Toggle */}
          <button
            onClick={() => setIsComparisonMode(!isComparisonMode)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-2xs ${
              isComparisonMode
                ? 'bg-purple-600 text-white shadow-purple-500/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{isComparisonMode ? 'Side-by-Side Active' : 'Compare Two Scenarios'}</span>
          </button>

          {/* Save Named Scenario Button */}
          <button
            onClick={() => setShowSaveScenarioModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold transition-colors shadow-2xs"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save Scenario</span>
          </button>
        </div>
      </div>

      {/* 2. Upcoming Payments & Receipts Timeline Strip */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-slate-50 to-blue-50 dark:from-emerald-950/40 dark:via-slate-900 dark:to-blue-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Upcoming Scheduled Commitments Integrated:</span>
              <span className="font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded-md text-[11px]">
                {horizonUpcomingSummary.count} Active
              </span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
              Committed Outflow: <strong className="text-rose-600 dark:text-rose-400 font-mono">-{formatINR(horizonUpcomingSummary.totalOutflow)}</strong> · Expected Receipts: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">+{formatINR(horizonUpcomingSummary.totalInflow)}</strong> (Next {horizonDays} Days)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={() => setShowUpcomingModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 text-xs font-bold transition-colors shadow-2xs"
          >
            Manage Upcoming Timeline
          </button>
        </div>
      </div>

      {/* 3. Side-by-Side Comparison Controls & Plain-Language Result Banner */}
      {isComparisonMode && (
        <div className="p-5 rounded-3xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/80 shadow-xs space-y-4 animate-in slide-in-from-top-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-200/60 dark:border-purple-800/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-xl bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                <ArrowRightLeft className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Side-by-Side Scenario Comparison
                </h3>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Select two named scenarios to compare ending balances and reserve breach risks on one chart
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className={`px-2.5 py-1 rounded-full font-bold uppercase text-[10px] tracking-wider ${
                comparisonResult.verdict === 'critical'
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200 border border-rose-300'
                  : comparisonResult.verdict === 'worse'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200 border border-amber-300'
                  : comparisonResult.verdict === 'better'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200 border border-emerald-300'
                  : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
              }`}>
                Verdict: {comparisonResult.verdict}
              </span>
            </div>
          </div>

          {/* Scenario Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Scenario A */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  Scenario A (Solid Emerald Line)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  End: {formatINR(comparisonResult.endingBalanceA)}
                </span>
              </div>
              <select
                value={selectedScenarioAId}
                onChange={(e) => setSelectedScenarioAId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
              >
                {savedScenarios.map((scen) => (
                  <option key={scen.id} value={scen.id}>
                    {scen.name} {scen.isBaseCase ? '(Base Case)' : ''}
                  </option>
                ))}
              </select>
              {scenarioA.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  "{scenarioA.description}"
                </p>
              )}
            </div>

            {/* Scenario B */}
            <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                  Scenario B (Dashed Purple Line)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  End: {formatINR(comparisonResult.endingBalanceB)}
                </span>
              </div>
              <select
                value={selectedScenarioBId}
                onChange={(e) => setSelectedScenarioBId(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-semibold text-xs"
              >
                {savedScenarios.map((scen) => (
                  <option key={scen.id} value={scen.id}>
                    {scen.name} {scen.isBaseCase ? '(Base Case)' : ''}
                  </option>
                ))}
              </select>
              {scenarioB.description && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  "{scenarioB.description}"
                </p>
              )}
            </div>
          </div>

          {/* Requirement 11: PLAIN-LANGUAGE RESULT LINE */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-purple-200/80 dark:border-purple-800 space-y-2 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Comparative Result Line (Plain Language Analysis):</span>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed">
              "{comparisonResult.plainLanguageSummary}"
            </p>
            {language === 'hinglish' && comparisonResult.hinglishSummary && (
              <p className="text-xs text-purple-700 dark:text-purple-300 italic pt-1 border-t border-purple-100 dark:border-purple-900/60">
                🇮🇳 {comparisonResult.hinglishSummary}
              </p>
            )}

            {/* Quick Metrics Comparison Strip */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600 dark:text-slate-400">
              <span>
                Ending Delta: <strong className={comparisonResult.endingBalanceDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-mono' : 'text-rose-600 dark:text-rose-400 font-mono'}>
                  {comparisonResult.endingBalanceDelta >= 0 ? `+${formatINR(comparisonResult.endingBalanceDelta)}` : formatINR(comparisonResult.endingBalanceDelta)}
                </strong>
              </span>
              <span>·</span>
              <span>
                Day {horizonDays} Capital Buffer: <strong className="font-mono text-slate-800 dark:text-slate-200">{formatINR(comparisonResult.endingBalanceB)}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Shortfall Alert Banners (Active Single Scenario Mode) */}
      {!isComparisonMode && (
        scenarioShortfall ? (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900 flex items-start gap-3 text-rose-900 dark:text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold">
                  Warning: Cash shortfall expected on {scenarioShortfall.formattedDate} ({scenarioShortfall.date})
                </h2>
                <button
                  onClick={() => openExplanation('shortfall')}
                  className="text-[11px] underline font-semibold text-rose-700 dark:text-rose-300 hover:text-rose-900"
                >
                  📐 How is this calculated?
                </button>
              </div>
              <p className="text-xs text-rose-700 dark:text-rose-300">
                Under this simulated scenario, your cash balance will run completely dry in approximately{' '}
                <span className="font-bold">{daysToScenarioShortfall} days</span>. You will need an estimated{' '}
                {formatINR(Math.abs(scenarioShortfall.scenarioBalance || 0))} working capital injection to stay solvent.
              </p>
            </div>
          </div>
        ) : scenarioReserveDip ? (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/70 border border-amber-200 dark:border-amber-900 flex items-start gap-3 text-amber-900 dark:text-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold">
                  Caution: Cash buffer will dip below Minimum Reserve on {scenarioReserveDip.formattedDate}
                </h2>
                <button
                  onClick={() => openExplanation('minReserve')}
                  className="text-[11px] underline font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-900"
                >
                  📐 How is this calculated?
                </button>
              </div>
              <p className="text-xs text-amber-700 dark:text-amber-300">
                While not negative, your balance drops below your {formatINR(minCashRequired)} safety threshold.
                Avoid locking surplus cash into long-term illiquid investments.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-between gap-3 text-emerald-900 dark:text-emerald-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <div>
                <h2 className="text-sm font-bold">
                  Solvent Runway: No cash shortfall projected in the next {horizonDays} days
                </h2>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Projected ending cash reserves remain healthy at{' '}
                  <span className="font-bold">{formatINR(endingScenarioBalance)}</span>.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openExplanation('runway')}
                className="text-xs text-emerald-700 dark:text-emerald-400 underline font-semibold"
              >
                📐 Formula
              </button>
              <div className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400 whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/60 px-2 py-1 rounded-lg">
                {horizonDays}D Safe
              </div>
            </div>
          </div>
        )
      )}

      {/* 5. Requirement 10: ONE-CLICK SCENARIO PRESETS BEFORE RAW SLIDERS */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-5">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                One-Click SME Scenario Presets
              </span>
              {activePresetId && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 animate-pulse">
                  Active Preset
                </span>
              )}
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
              Instant Risk & Shock Presets (Click to Apply)
            </h2>
          </div>

          <button
            onClick={resetScenario}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors self-start sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Baseline</span>
          </button>
        </div>

        {/* The Preset Deck */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SCENARIO_PRESETS.map((preset) => {
            const isActive = activePresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`p-3.5 rounded-2xl text-left border transition-all ${
                  isActive
                    ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="font-bold text-xs text-slate-900 dark:text-white">
                    {preset.title}
                  </div>
                  {isActive && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-600 text-white shrink-0">
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                  {preset.description}
                </div>
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[10px] font-mono font-semibold text-slate-600 dark:text-slate-300">
                  <span>Tag: {preset.tagline}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* 6. Raw Interactive What-If Simulation Sliders (Following the Presets) */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Fine-Tune Raw Simulation Sliders:
            </span>
            <span className="text-[11px] text-slate-400">
              {activePresetId ? 'Preset applied (custom adjustments will detach preset)' : 'Manual adjustment mode'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Slider 1: Income Change % */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Income Shift
                </label>
                <span className={`font-mono font-bold ${
                  scenario.incomeChangePercent > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : scenario.incomeChangePercent < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {scenario.incomeChangePercent > 0 ? `+${scenario.incomeChangePercent}%` : `${scenario.incomeChangePercent}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={scenario.incomeChangePercent}
                onChange={(e) => updateScenario({ incomeChangePercent: Number(e.target.value) })}
                className="w-full accent-emerald-600 dark:accent-emerald-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>-50% (Loss of client)</span>
                <span>Baseline</span>
                <span>+50% (Sales boom)</span>
              </div>
            </div>

            {/* Slider 2: Expense Change % */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Expense Shift
                </label>
                <span className={`font-mono font-bold ${
                  scenario.expenseChangePercent > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : scenario.expenseChangePercent < 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {scenario.expenseChangePercent > 0 ? `+${scenario.expenseChangePercent}%` : `${scenario.expenseChangePercent}%`}
                </span>
              </div>
              <input
                type="range"
                min="-50"
                max="50"
                step="5"
                value={scenario.expenseChangePercent}
                onChange={(e) => updateScenario({ expenseChangePercent: Number(e.target.value) })}
                className="w-full accent-rose-600 dark:accent-rose-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>-50% (Cost cut)</span>
                <span>Baseline</span>
                <span>+50% (Expansion)</span>
              </div>
            </div>

            {/* Slider 3: Delayed Customer Receivables (Days) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Receivable Delay
                  </label>
                  <InfoTooltip termKey="dso" />
                </div>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {scenario.receivableDelayDays} Days
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="60"
                step="5"
                value={scenario.receivableDelayDays}
                onChange={(e) => updateScenario({ receivableDelayDays: Number(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 Days (On time)</span>
                <span>30 Days delay</span>
                <span>60 Days delay</span>
              </div>
            </div>

            {/* Input 4: One-Time Big Outflow */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    One-Time Outflow / CapEx (₹)
                  </label>
                  <InfoTooltip termKey="capex" />
                </div>
                <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                  {formatINR(scenario.oneTimeExpenseAmount)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  min="0"
                  step="10000"
                  placeholder="₹ Amount"
                  value={scenario.oneTimeExpenseAmount || ''}
                  onChange={(e) => updateScenario({ oneTimeExpenseAmount: Number(e.target.value) })}
                  className="w-full px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white tabular-nums focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
                <input
                  type="date"
                  value={scenario.oneTimeExpenseDate}
                  onChange={(e) => updateScenario({ oneTimeExpenseDate: e.target.value })}
                  className="w-full px-2 py-1 text-[11px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                e.g. Machinery purchase, GST advance
              </div>
            </div>

          </div>

          {/* Live Outcome Banner for Single Scenario */}
          {!isComparisonMode && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  Simulation Outcome:
                </span>
                <span className="text-slate-600 dark:text-slate-300">
                  {scenarioShortfall ? (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Cash will run short in {daysToScenarioShortfall} days (around {scenarioShortfall.formattedDate}).
                    </span>
                  ) : balanceDelta >= 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Cash position improves by +{formatINR(balanceDelta)} at day {horizonDays}.
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">
                      Cash reserves shrink by -{formatINR(Math.abs(balanceDelta))} at day {horizonDays}.
                    </span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  Baseline End: <strong className="text-slate-800 dark:text-slate-200">{formatINR(endingBaselineBalance)}</strong>
                </span>
                <span>
                  Scenario End: <strong className="text-slate-800 dark:text-slate-200">{formatINR(endingScenarioBalance)}</strong>
                </span>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* 7. Forecast Chart (Single Mode or Side-by-Side Comparison) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                {isComparisonMode
                  ? `Comparing "${scenarioA.name}" vs "${scenarioB.name}" (${horizonDays} Days)`
                  : `Baseline Trend vs Simulated Scenario (${horizonDays} Days)`}
              </h2>
              <button
                onClick={() => openExplanation('currentBalance')}
                className="text-[11px] text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1"
                title="View mathematical calculation breakdown"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Formula</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isComparisonMode
                ? 'Solid emerald: Scenario A · Dashed purple: Scenario B · Dotted blue: Safety Buffer'
                : 'Solid emerald: Current trend · Dashed purple: What-if scenario · Dotted blue: Safety buffer'}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-semibold">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
              {isComparisonMode ? scenarioA.name : 'Current Baseline'}
            </span>
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-semibold">
              <span className="w-3 h-0.5 bg-purple-500 border-b border-dashed inline-block" />
              {isComparisonMode ? scenarioB.name : 'What-If Scenario'}
            </span>
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-semibold">
              <span className="w-3 h-0.5 bg-blue-500 border-b border-dotted inline-block" />
              Min Reserve Buffer
            </span>
          </div>
        </div>

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedComparisonChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 10, fill: '#64748b' }}
                interval={Math.floor(horizonDays / 8)}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#64748b' }}
                tickFormatter={(val) => formatCompactINR(val)}
              />
              <Tooltip
                formatter={(val: any, name: any) => [
                  formatINR(Number(val)),
                  isComparisonMode
                    ? name === 'scenarioABalance'
                      ? scenarioA.name
                      : name === 'scenarioBBalance'
                      ? scenarioB.name
                      : 'Min Reserve'
                    : name === 'projectedBalance'
                    ? 'Current Baseline'
                    : name === 'scenarioBalance'
                    ? 'Simulated Scenario'
                    : 'Min Reserve Buffer',
                ]}
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '0.75rem',
                  color: '#fff',
                  fontSize: '12px',
                }}
              />
              {/* Zero Line */}
              <ReferenceLine y={0} stroke="#ef4444" strokeWidth={1.5} />
              {/* Min Reserve Line */}
              <ReferenceLine
                y={minCashRequired}
                stroke="#3b82f6"
                strokeDasharray="4 4"
                label={{
                  value: 'Min Reserve',
                  fill: '#3b82f6',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
              {/* Lines */}
              <Line
                type="monotone"
                dataKey={isComparisonMode ? 'scenarioABalance' : 'projectedBalance'}
                name={isComparisonMode ? 'scenarioABalance' : 'projectedBalance'}
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey={isComparisonMode ? 'scenarioBBalance' : 'scenarioBalance'}
                name={isComparisonMode ? 'scenarioBBalance' : 'scenarioBalance'}
                stroke="#a855f7"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 8. Safe Surplus Deployment Blueprint */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Safe Surplus Deployment Blueprint
              </h2>
              <InfoTooltip termKey="safeSurplus" />
              <button
                onClick={() => openExplanation('safeSurplus')}
                className="text-xs text-indigo-600 dark:text-indigo-400 underline font-semibold ml-1"
              >
                📐 Formula
              </button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Recommended allocation of your Safe Surplus ({formatINR(metrics.safeSurplus)}) to earn return without jeopardizing payroll
            </p>
          </div>

          <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 font-mono">
            Total Deployable: <strong className="text-emerald-600 dark:text-emerald-400">{formatINR(Math.max(0, metrics.safeSurplus * 0.85))}</strong>
          </div>
        </div>

        {metrics.safeSurplus <= 0 ? (
          <div className="p-6 text-center space-y-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              No Surplus Available to Invest Right Now
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Your current cash balance is at or below your safety buffer ({formatINR(minCashRequired)}).
              Prioritize building your 3-month operating reserve before making any mutual fund or FD investments.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400">
                  <th className="pb-3 pl-2 font-medium">Instrument</th>
                  <th className="pb-3 font-medium">Risk Category</th>
                  <th className="pb-3 font-medium">Expected Yield</th>
                  <th className="pb-3 font-medium">Withdrawal Speed</th>
                  <th className="pb-3 pr-2 text-right font-medium">Suggested Allocation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {investmentOptions.map((opt) => (
                  <tr key={opt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 pl-2 font-semibold text-slate-900 dark:text-white">
                      <div>{opt.instrument}</div>
                      <div className="text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        {opt.riskDescription}
                      </div>
                    </td>
                    <td className="py-3 whitespace-nowrap">
                      <span className={`text-[11px] font-semibold ${
                        opt.category === 'low_risk'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}>
                        {opt.category === 'low_risk' ? 'Low Risk (Liquid)' : 'Moderate Horizon'}
                      </span>
                    </td>
                    <td className="py-3 whitespace-nowrap font-mono font-bold text-slate-800 dark:text-slate-200">
                      {opt.expectedReturn}
                    </td>
                    <td className="py-3 text-slate-600 dark:text-slate-400 text-[11px]">
                      {opt.liquiditySpeed}
                    </td>
                    <td className="py-3 pr-2 text-right whitespace-nowrap tabular-nums">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {formatINR(opt.suggestedAmount)}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {opt.suggestedAllocationPercent}% of free surplus
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <p>
            <span className="font-semibold text-slate-700 dark:text-slate-300">Disclaimer:</span> Illustrative calculation for planning purposes only. Not financial or investment advice. Mutual fund investments and fixed deposits are subject to market risks; consult your chartered accountant before allocating corporate funds.
          </p>
        </div>

      </div>

      {/* Screen Ending Recommended Next Action Card */}
      <RecommendedActionCard view="forecast" />

    </div>
  );
};
