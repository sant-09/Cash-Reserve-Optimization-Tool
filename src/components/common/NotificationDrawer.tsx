import React from 'react';
import {
  Bell,
  X,
  AlertTriangle,
  AlertOctagon,
  Info,
  CheckCheck,
  Sliders,
  ExternalLink,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { useCash } from '../../context/CashContext';
import { TriggeredAlert } from '../../types/finance';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({ isOpen, onClose }) => {
  const {
    triggeredAlerts,
    readAlertIds,
    markAlertAsRead,
    dismissAlert,
    setShowAlertSettingsModal,
    setActiveView,
  } = useCash();

  if (!isOpen) return null;

  const handleMarkAllRead = () => {
    triggeredAlerts.forEach((a) => markAlertAsRead(a.id));
  };

  const getSeverityIcon = (severity: TriggeredAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-blue-500 dark:text-blue-400 shrink-0" />;
    }
  };

  const getSeverityBg = (severity: TriggeredAlert['severity'], isRead: boolean) => {
    if (isRead) {
      return 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-75';
    }
    switch (severity) {
      case 'critical':
        return 'bg-rose-50/90 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 shadow-xs';
      case 'warning':
        return 'bg-amber-50/90 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 shadow-xs';
      default:
        return 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60 shadow-xs';
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Notifications & Alerts
                  </h2>
                  {triggeredAlerts.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                      {triggeredAlerts.length}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Real-time cash runway and safety reserve monitoring
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close notifications"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Bar */}
          <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs">
            <button
              onClick={() => {
                setShowAlertSettingsModal(true);
                onClose();
              }}
              className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 font-semibold transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Thresholds</span>
            </button>

            {triggeredAlerts.length > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* Alert List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {triggeredAlerts.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    All Clear! No Active Alerts
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-1">
                    Your projected runway and safety reserves are within all safe operating limits.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAlertSettingsModal(true);
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-xl"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>View Alert Rules</span>
                </button>
              </div>
            ) : (
              triggeredAlerts.map((alert) => {
                const isRead = readAlertIds.includes(alert.id);
                return (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-2xl border transition-all space-y-2.5 ${getSeverityBg(
                      alert.severity,
                      isRead
                    )}`}
                    onClick={() => markAlertAsRead(alert.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        {getSeverityIcon(alert.severity)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {alert.title}
                            </span>
                            {!isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-slate-400">
                            {new Date(alert.triggeredAt).toLocaleTimeString('en-IN', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissAlert(alert.id);
                        }}
                        title="Dismiss alert"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      {alert.message}
                    </p>

                    {/* Recommendation snippet */}
                    <div className="p-2.5 rounded-xl bg-white/70 dark:bg-slate-900/60 border border-black/5 dark:border-white/5 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Recommended Action: </span>
                        <span>{alert.recommendation}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                        Rule: {alert.ruleType.replace(/_/g, ' ')}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveView('forecast');
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <span>Forecast & Scenarios</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Alerts update automatically on cash flow changes</span>
            <button
              onClick={() => {
                setShowAlertSettingsModal(true);
                onClose();
              }}
              className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
            >
              Alert Channels →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
