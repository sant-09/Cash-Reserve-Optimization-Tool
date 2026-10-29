import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CashProvider, useCash } from './context/CashContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { DashboardView } from './components/DashboardView';
import { CashFlowView } from './components/CashFlowView';
import { ForecastView } from './components/ForecastView';
import { ThreeCashScene } from './components/ThreeCashScene';
import { RecommendedActionCard } from './components/RecommendedActionCard';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { CSVImportModal } from './components/CSVImportModal';
import { CalculationModal } from './components/CalculationModal';
import { UpcomingTimelineModal } from './components/UpcomingTimelineModal';
import { SaveScenarioModal } from './components/SaveScenarioModal';
import { MonthlyReportModal } from './components/MonthlyReportModal';
import { AlertSettingsModal } from './components/AlertSettingsModal';
import { ActivityLogModal } from './components/ActivityLogModal';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const {
    activeView,
    showOnboardingWizard,
    setShowOnboardingWizard,
    showExplanationModal,
    closeExplanation,
    explanationKey,
    showUpcomingModal,
    setShowUpcomingModal,
    showSaveScenarioModal,
    setShowSaveScenarioModal,
    showReportModal,
    setShowReportModal,
    showAlertSettingsModal,
    setShowAlertSettingsModal,
    showActivityLogModal,
    setShowActivityLogModal,
  } = useCash();
  const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors duration-200">
      {!isAuthenticated ? (
        <LoginView />
      ) : (
        <>
          <Navbar />
      
      <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'cashflow' && <CashFlowView />}
        {activeView === 'forecast' && <ForecastView />}
        {activeView === 'vault3d' && (
          <div className="max-w-7xl mx-auto space-y-6 pb-12">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                  Visual Capital Vault
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Optional visual representation with interactive 3D WebGL ingot fortress and high-contrast Flat 2D architectural ledger.
                </p>
              </div>
            </div>
            <ThreeCashScene />
            {/* Screen Ending Recommended Next Action Card */}
            <RecommendedActionCard view="vault3d" />
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 py-4 px-4 sm:px-6 lg:px-8 text-xs text-slate-500 dark:text-slate-400 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">CashWise</span>
            <span aria-hidden="true">·</span>
            <span>Cash Reserve Optimization Tool for Small Businesses</span>
          </div>
          <div className="flex items-center gap-3 text-[11px]">
            <span>Firebase Firestore Sync & Local Storage</span>
            <span aria-hidden="true">·</span>
            <span>Smart Working Capital Management</span>
          </div>
        </div>
      </footer>

      {/* 3-Step First-Run Onboarding Wizard (Phase 2) */}
      <OnboardingWizardModal
        isOpen={showOnboardingWizard}
        onClose={() => setShowOnboardingWizard(false)}
        onOpenImportModal={() => setIsImportModalOpen(true)}
      />

      {/* Standalone CSV Import Modal (Phase 2) */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      {/* Phase 3: "How is this calculated?" Calculation Explanation Modal */}
      <CalculationModal
        isOpen={showExplanationModal}
        onClose={closeExplanation}
        metricKey={explanationKey}
      />

      {/* Phase 3: Upcoming Payments & Receipts Timeline Modal */}
      <UpcomingTimelineModal
        isOpen={showUpcomingModal}
        onClose={() => setShowUpcomingModal(false)}
      />

      {/* Phase 3: Save Named What-If Scenario Modal */}
      <SaveScenarioModal
        isOpen={showSaveScenarioModal}
        onClose={() => setShowSaveScenarioModal(false)}
      />

      {/* Phase 4: Printable / PDF Monthly Executive Report */}
      <MonthlyReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />

      {/* Phase 4: Alert Settings & Multi-Channel Dispatch Modal */}
      <AlertSettingsModal
        isOpen={showAlertSettingsModal}
        onClose={() => setShowAlertSettingsModal(false)}
      />

      {/* Phase 4: Activity & Audit Log Modal (Server-Recorded, Read-Only) */}
      <ActivityLogModal
        isOpen={showActivityLogModal}
        onClose={() => setShowActivityLogModal(false)}
      />
        </>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CashProvider>
        <AppContent />
      </CashProvider>
    </AuthProvider>
  );
}
