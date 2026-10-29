import React, { useState, useMemo } from 'react';
import {
  FileText,
  X,
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  User,
  Clock,
  Layers,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { useCash } from '../context/CashContext';
import { ActivityActionType, ActivityLogEntry } from '../types/finance';

interface ActivityLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActivityLogModal: React.FC<ActivityLogModalProps> = ({ isOpen, onClose }) => {
  const { activityLogs, refreshActivityLogs } = useCash();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [expandedLogIds, setExpandedLogIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshActivityLogs();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const actionTypes: { value: string; label: string }[] = [
    { value: 'all', label: 'All Actions' },
    { value: 'SETTINGS_UPDATED', label: 'Settings Updates' },
    { value: 'ACCOUNT_CREATED', label: 'Accounts Created' },
    { value: 'ACCOUNT_DELETED', label: 'Accounts Deleted' },
    { value: 'TRANSACTION_CREATED', label: 'Transactions Added' },
    { value: 'TRANSACTION_DELETED', label: 'Transactions Deleted' },
    { value: 'UPCOMING_FLOW_CREATED', label: 'Timeline Flows Added' },
    { value: 'SCENARIO_SAVED', label: 'Scenarios Saved' },
    { value: 'ALERT_RULE_UPDATED', label: 'Alert Rules Updated' },
  ];

  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      const matchesSearch =
        searchQuery === '' ||
        log.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.userEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.entityType.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesAction = selectedAction === 'all' || log.action === selectedAction;
      return matchesSearch && matchesAction;
    });
  }, [activityLogs, searchQuery, selectedAction]);

  if (!isOpen) return null;

  const getActionColor = (action: ActivityActionType) => {
    switch (action) {
      case 'SETTINGS_UPDATED':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-950/80 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'ACCOUNT_DELETED':
      case 'TRANSACTION_DELETED':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'ACCOUNT_CREATED':
      case 'TRANSACTION_CREATED':
      case 'UPCOMING_FLOW_CREATED':
      case 'SCENARIO_SAVED':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'ALERT_RULE_UPDATED':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8 max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Activity & Audit Log
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3 h-3" />
                  Immutable Ledger
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Server-recorded tamper-proof history of who changed what, when, and from where.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Rules Banner */}
        <div className="px-6 py-2.5 bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              <strong>Read-Only Enforcement:</strong> Protected by Firestore security rules (<code>allow create, update, delete: if false</code>). All log writes originate strictly from the backend Express server.
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-500' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Filter by description, user email, or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {actionTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Log Entries Table / List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No activity records found
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Actions performed by users (updating reserve targets, creating bank accounts, importing CSVs) will appear here.
              </p>
            </div>
          ) : (
            filteredLogs.map((log: ActivityLogEntry) => {
              const isExpanded = expandedLogIds.includes(log.id);
              const dateStr = new Date(log.timestamp).toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });

              return (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white">
                        {log.description || `${log.action} on ${log.entityType}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dateStr}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actor details line */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-mono text-[11px] font-medium">{log.userEmail}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          log.userRole === 'owner'
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300'
                        }`}
                      >
                        {log.userRole}
                      </span>
                      {log.entityId && (
                        <span className="text-[10px] font-mono text-slate-400">
                          id: {log.entityId.slice(0, 12)}...
                        </span>
                      )}
                    </div>

                    {log.details && (
                      <button
                        type="button"
                        onClick={() => toggleExpand(log.id)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            <span>Hide Payload</span>
                          </>
                        ) : (
                          <>
                            <ChevronRight className="w-3 h-3" />
                            <span>View Payload</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Expandable JSON payload */}
                  {isExpanded && log.details && (
                    <div className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] overflow-x-auto border border-slate-800">
                      <pre>{JSON.stringify(log.details, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Showing {filteredLogs.length} of {activityLogs.length} entries</span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 rounded-xl transition-colors"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};
