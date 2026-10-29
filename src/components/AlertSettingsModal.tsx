import React, { useState } from 'react';
import {
  Bell,
  X,
  Smartphone,
  Mail,
  Shield,
  CheckCircle,
  AlertTriangle,
  Send,
  Lock,
} from 'lucide-react';
import { useCash } from '../context/CashContext';
import { useAuth } from '../context/AuthContext';
import { AlertRule, AlertDispatchResult } from '../types/finance';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertSettingsModal: React.FC<AlertSettingsModalProps> = ({ isOpen, onClose }) => {
  const { alertRules, updateAlertRule, dispatchTestAlert, triggeredAlerts, canPerform } = useCash();
  const { user } = useAuth();

  const [testStatus, setTestStatus] = useState<AlertDispatchResult | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testPhone, setTestPhone] = useState('+91 98765 43210');
  const [testEmail, setTestEmail] = useState(user?.email || 'founder@example.com');

  if (!isOpen) return null;

  const isOwner = user?.role === 'owner';
  const permission = canPerform('configure_alerts');

  const handleToggleRule = async (rule: AlertRule) => {
    if (!permission.allowed) {
      alert(permission.reason);
      return;
    }
    await updateAlertRule(rule.id, { enabled: !rule.enabled });
  };

  const handleThresholdChange = async (rule: AlertRule, newThreshold: number) => {
    if (!permission.allowed) {
      alert(permission.reason);
      return;
    }
    await updateAlertRule(rule.id, { thresholdValue: Math.max(1, newThreshold) });
  };

  const handleTestDispatch = async (channel: 'whatsapp' | 'email') => {
    setIsSendingTest(true);
    setTestStatus(null);
    try {
      const sampleAlert = triggeredAlerts[0] || {
        id: 'sample-test',
        ruleId: 'rule-runway-threshold',
        ruleType: 'runway_below_threshold' as const,
        severity: 'warning' as const,
        title: '⚠️ Test Runway Alert',
        message: 'Your cash runway has dipped below 30 days. Action recommended.',
        messageHinglish: 'Cash runway 30 din se kam ho gaya hai. Test notification.',
        currentValue: 24,
        thresholdValue: 30,
        triggeredAt: new Date().toISOString(),
        isRead: false,
      };

      const recipient = channel === 'whatsapp' ? testPhone : testEmail;
      const result = await dispatchTestAlert(sampleAlert, channel, recipient);
      setTestStatus(result);
    } catch (e: any) {
      console.error('Dispatch error:', e);
    } finally {
      setIsSendingTest(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Automated Liquidity Alert Rules</span>
                {!isOwner && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    Read-Only (Finance)
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Trigger alerts when cash runway or reserve boundaries are threatened.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Permission restriction warning for Finance Role */}
          {!isOwner && (
            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Owner Role Required to Edit Rules</p>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                  You are currently logged in with the <strong>Finance Role</strong>. Rules are visible for your situational awareness, but only Business Owners can modify trigger thresholds.
                </p>
              </div>
            </div>
          )}

          {/* Alert Rules List */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Trigger Conditions
            </h3>
            {alertRules.map((rule) => (
              <div
                key={rule.id}
                className={`p-4 rounded-xl border transition-all ${
                  rule.enabled
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/40'
                    : 'border-slate-100 dark:border-slate-800/50 bg-slate-50 dark:bg-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {rule.name}
                      </span>
                      {rule.enabled ? (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          Active
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      {rule.type === 'runway_below_threshold' && 'Warns whenever daily expenses drain cash below this minimum days count.'}
                      {rule.type === 'balance_below_reserve' && 'Projects when safety reserve threshold will be breached within this horizon.'}
                      {rule.type === 'negative_balance_projected' && 'Flags urgent insolvency / bank overdraft threats within this horizon.'}
                    </p>

                    {/* Threshold input */}
                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        Trigger Threshold:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="1"
                          max="90"
                          disabled={!isOwner}
                          value={rule.thresholdValue}
                          onChange={(e) => handleThresholdChange(rule, parseInt(e.target.value) || 1)}
                          className="w-16 px-2 py-1 text-xs font-bold text-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 disabled:opacity-50"
                        />
                        <span className="text-xs text-slate-500">Days</span>
                      </div>

                      {/* Channels badge */}
                      <div className="flex items-center gap-1.5 ml-auto text-xs text-slate-400">
                        {rule.channels.includes('whatsapp') && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold">
                            <Smartphone className="w-3 h-3" /> WhatsApp
                          </span>
                        )}
                        {rule.channels.includes('email') && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-[10px] font-semibold">
                            <Mail className="w-3 h-3" /> Email
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Enable Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={rule.enabled}
                    disabled={!isOwner}
                    onClick={() => handleToggleRule(rule)}
                    className={`shrink-0 w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer disabled:opacity-40 ${
                      rule.enabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white shadow-xs transform transition-transform ${
                        rule.enabled ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Test Dispatch Interface (WhatsApp / Email Simulator) */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Notification Dispatch Simulator (WhatsApp / Email)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Test the external alert webhook delivery without waiting for a real crisis.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Founder WhatsApp Phone
                </label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Founder Notification Email
                </label>
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isSendingTest}
                onClick={() => handleTestDispatch('whatsapp')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-all disabled:opacity-50"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Simulate WhatsApp Alert</span>
              </button>

              <button
                type="button"
                disabled={isSendingTest}
                onClick={() => handleTestDispatch('email')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-all disabled:opacity-50"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Simulate Email Alert</span>
              </button>
            </div>

            {/* Test Status Receipt */}
            {testStatus && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Alert Successfully Dispatched via {testStatus.channel.toUpperCase()}!</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  Recipient: <span className="font-mono">{testStatus.recipient}</span> · Sent At: {new Date(testStatus.sentAt).toLocaleTimeString()}
                </p>
                <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 font-mono text-[10px] text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                  {testStatus.messagePreview}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
