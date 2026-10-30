import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCash } from '../context/CashContext';
import { AlertDispatchResult, AlertRule } from '../types/finance';

/**
 * Custom hook containing alert rules management,
 * permission checks, and multi-channel test dispatch.
 */
export function useAlertRulesLogic() {
  const { alertRules, updateAlertRule, dispatchTestAlert, triggeredAlerts, canPerform } = useCash();
  const { user } = useAuth();

  const [testStatus, setTestStatus] = useState<AlertDispatchResult | null>(null);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testPhone, setTestPhone] = useState('+91 98765 43210');
  const [testEmail, setTestEmail] = useState(user?.email || 'founder@example.com');

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

  return {
    alertRules,
    user,
    isOwner,
    testStatus,
    isSendingTest,
    testPhone,
    setTestPhone,
    testEmail,
    setTestEmail,
    handleToggleRule,
    handleThresholdChange,
    handleTestDispatch,
  };
}

