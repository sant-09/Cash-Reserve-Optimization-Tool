import React from 'react';
import {
  Printer,
  X,
  FileText,
  Calendar,
  Building,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Shield,
  ArrowRight,
  Download,
} from 'lucide-react';
import { useCash } from '../context/CashContext';
import { formatINR } from '../utils/finance';

interface MonthlyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ isOpen, onClose }) => {
  const { monthlyReportData } = useCash();

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const {
    reportId,
    generatedAt,
    reportingPeriod,
    businessName,
    preparedBy,
    userRole,
    metrics,
    headlineSummary,
    shortfallInfo,
    healthStatus,
    forecastSummary,
    upcomingLiabilities,
    recommendedAction,
  } = monthlyReportData;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden print:shadow-none print:border-none print:max-w-none print:rounded-none">
        
        {/* Modal Controls Header (Hidden in Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Monthly Executive Liquidity Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Boardroom-ready cash flow snapshot generated from live verified metrics.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Report Document Body */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-800 dark:text-slate-200 print:text-black print:p-0 print:space-y-4">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between border-b-2 border-emerald-600 pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-emerald-700 dark:text-emerald-400 print:text-emerald-700">
                  CashWise
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 print:border print:border-slate-300">
                  Official Audit Snapshot
                </span>
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight mt-1 text-slate-900 dark:text-white print:text-black">
                {businessName}
              </h1>
              <p className="text-xs text-slate-500 print:text-slate-600">
                Monthly Working Capital & Safety Reserve Performance Report
              </p>
            </div>

            <div className="text-right text-xs space-y-0.5 print:text-xs">
              <p className="font-bold text-slate-700 dark:text-slate-300 print:text-black">
                Period: <span className="text-emerald-700 font-extrabold">{reportingPeriod}</span>
              </p>
              <p className="text-slate-500">Report Ref: <span className="font-mono">{reportId}</span></p>
              <p className="text-slate-500">Generated: {generatedAt}</p>
              <p className="text-slate-500">Auditor / Author: {preparedBy}</p>
            </div>
          </div>

          {/* Executive KPI Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              1. Core Financial Solvency Indicators
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 print:border-slate-300 print:bg-white">
                <span className="text-[11px] text-slate-500 font-medium">Total Liquid Cash</span>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white print:text-black mt-0.5">
                  {formatINR(metrics.currentBalance)}
                </p>
                <span className="text-[10px] text-slate-400">Sum of operative bank accounts</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 print:border-slate-300 print:bg-white">
                <span className="text-[11px] text-slate-500 font-medium">Required Safety Reserve</span>
                <p className="text-lg font-extrabold text-slate-900 dark:text-white print:text-black mt-0.5">
                  {formatINR(metrics.minCashRequired)}
                </p>
                <span className="text-[10px] text-slate-400">Payroll & statutory threshold</span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 print:border-slate-300 print:bg-white">
                <span className="text-[11px] text-slate-500 font-medium">Safe Surplus / (Deficit)</span>
                <p className={`text-lg font-extrabold mt-0.5 ${
                  metrics.safeSurplus >= 0 ? 'text-emerald-600 dark:text-emerald-400 print:text-emerald-700' : 'text-rose-600 dark:text-rose-400 print:text-rose-700'
                }`}>
                  {formatINR(metrics.safeSurplus)}
                </p>
                <span className="text-[10px] text-slate-400">
                  {metrics.safeSurplus >= 0 ? 'Freely deployable buffer' : 'Reserve deficit warning'}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 print:border-slate-300 print:bg-white">
                <span className="text-[11px] text-slate-500 font-medium">Survival Runway</span>
                <p className={`text-lg font-extrabold mt-0.5 ${
                  metrics.daysOfCashLeft >= 45 ? 'text-emerald-600' : metrics.daysOfCashLeft >= 20 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                  {metrics.daysOfCashLeft >= 999 ? '90+ Days' : `${metrics.daysOfCashLeft} Days`}
                </p>
                <span className="text-[10px] text-slate-400">At ~{formatINR(metrics.burnRatePerDay)}/day burn</span>
              </div>
            </div>
          </div>

          {/* CFO Executive Verdict & Narrative */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-emerald-50/40 dark:bg-emerald-950/20 print:border-slate-300 print:bg-slate-50 space-y-2">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 print:text-emerald-900">
                2. CFO Executive Summary & Assessment
              </h4>
            </div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 print:text-black leading-relaxed">
              "{headlineSummary.plainText}"
            </p>
            {headlineSummary.hinglishText && (
              <p className="text-[11px] italic text-slate-500 border-t border-emerald-200/50 dark:border-emerald-900/40 pt-1.5">
                Hinglish Note: {headlineSummary.hinglishText}
              </p>
            )}
          </div>

          {/* 30-Day Outlook & Trajectory */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              3. 30-Day Liquidity Trajectory & Horizon Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 print:border-slate-300">
                <span className="text-slate-500">Starting Liquid Position</span>
                <p className="font-bold text-sm mt-0.5">{formatINR(forecastSummary.startingBalance)}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 print:border-slate-300">
                <span className="text-slate-500">Lowest Projected Dip</span>
                <p className={`font-bold text-sm mt-0.5 ${forecastSummary.lowestProjectedBalance < metrics.minCashRequired ? 'text-amber-600' : 'text-slate-800 dark:text-white'}`}>
                  {formatINR(forecastSummary.lowestProjectedBalance)}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 print:border-slate-300">
                <span className="text-slate-500">Day 30 Ending Balance</span>
                <p className="font-bold text-sm mt-0.5">{formatINR(forecastSummary.endingBalance)}</p>
              </div>
            </div>
          </div>

          {/* Shortfall Risk Diagnostics */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              4. Liquidity Shortfall & Breach Assessment
            </h3>
            <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
              shortfallInfo.hasShortfall
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200 print:border-rose-400'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 print:border-emerald-400'
            }`}>
              {shortfallInfo.hasShortfall ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-bold">
                  {shortfallInfo.hasShortfall ? `Risk Flagged: ${shortfallInfo.formattedDate}` : 'Healthy Projection: Zero Shortfalls in 90 Days'}
                </p>
                <p className="text-[11px] mt-0.5">{shortfallInfo.reason}</p>
                {shortfallInfo.hasShortfall && (
                  <p className="text-[11px] font-semibold mt-1">
                    Estimated Gap: {formatINR(shortfallInfo.shortfallAmount)} needed to maintain statutory safety threshold.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Liabilities Table */}
          {upcomingLiabilities.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                5. Scheduled Liabilities & Receivables Commitments
              </h3>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden print:border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 print:bg-slate-100 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2 px-3">Due Date</th>
                      <th className="py-2 px-3">Title / Obligation</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-slate-200">
                    {upcomingLiabilities.slice(0, 6).map((flow) => (
                      <tr key={flow.id}>
                        <td className="py-2 px-3 font-mono">{flow.dueDate}</td>
                        <td className="py-2 px-3 font-medium">{flow.title}</td>
                        <td className="py-2 px-3 capitalize">
                          <span className={`inline-block px-1.5 py-0.5 rounded-sm text-[10px] font-bold ${
                            flow.type === 'income' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {flow.type}
                          </span>
                        </td>
                        <td className={`py-2 px-3 text-right font-bold ${
                          flow.type === 'income' ? 'text-emerald-600' : 'text-slate-800 dark:text-slate-200'
                        }`}>
                          {flow.type === 'income' ? '+' : '-'}{formatINR(flow.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recommended CFO Actions */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              6. Strategic Action Recommendation
            </h3>
            <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 print:border-slate-300 print:bg-white text-xs space-y-1">
              <p className="font-bold text-slate-900 dark:text-white print:text-black">
                {recommendedAction.title}
              </p>
              <p className="text-slate-600 dark:text-slate-300 print:text-slate-700">
                {recommendedAction.description}
              </p>
            </div>
          </div>

          {/* Footer Signature Block */}
          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-between items-end text-xs text-slate-400 print:text-black">
            <div>
              <p className="text-[10px]">Document generated by CashWise Working Capital Optimizer</p>
              <p className="text-[10px]">Confidential · For Internal Business Decision Support Only</p>
            </div>
            <div className="text-right border-t border-slate-300 dark:border-slate-700 pt-2 w-48">
              <p className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">{preparedBy}</p>
              <p className="text-[10px] text-slate-400">Authorized Signature</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
