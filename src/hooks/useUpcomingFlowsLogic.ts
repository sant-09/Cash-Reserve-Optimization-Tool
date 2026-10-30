import { useMemo, useState } from 'react';
import { useCash } from '../context/CashContext';
import {
  UpcomingCashFlow,
  UpcomingCashFlowCategory,
  UpcomingCashFlowRecurrence,
} from '../types/finance';

export interface UpcomingSummary30D {
  committedOutflows: number;
  expectedInflows: number;
  netImpact: number;
  pendingCount: number;
}

/**
 * Custom hook containing 30-day commitments calculation,
 * filtering, and scheduling form logic for UpcomingTimelineModal.
 */
export function useUpcomingFlowsLogic() {
  const {
    upcomingCashFlows,
    addUpcomingCashFlow,
    deleteUpcomingCashFlow,
    markUpcomingCashFlowStatus,
    accounts,
    primaryAccountId,
  } = useCash();

  const [activeTab, setActiveTab] = useState<'all' | 'outflow' | 'income'>('all');
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState<UpcomingCashFlowCategory>('payroll');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [recurrence, setRecurrence] = useState<UpcomingCashFlowRecurrence>('none');
  const [targetAccountId, setTargetAccountId] = useState<string>(primaryAccountId);
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 30-Day Metrics Breakdown
  const summary30D = useMemo<UpcomingSummary30D>(() => {
    const now = new Date();
    const limit30 = new Date(now.getTime() + 30 * 86400000);

    let committedOutflows = 0;
    let expectedInflows = 0;
    let pendingCount = 0;

    upcomingCashFlows.forEach((flow) => {
      if (flow.status !== 'pending') return;
      const flowDate = new Date(flow.dueDate);
      if (flowDate <= limit30 || flow.recurrence === 'monthly' || flow.recurrence === 'weekly') {
        pendingCount++;
        if (flow.type === 'expense') {
          committedOutflows += flow.amount;
        } else {
          expectedInflows += flow.amount;
        }
      }
    });

    const netImpact = expectedInflows - committedOutflows;

    return {
      committedOutflows,
      expectedInflows,
      netImpact,
      pendingCount,
    };
  }, [upcomingCashFlows]);

  // Filtered & sorted flows
  const filteredFlows = useMemo(() => {
    return upcomingCashFlows
      .filter((flow) => {
        if (activeTab === 'outflow') return flow.type === 'expense';
        if (activeTab === 'income') return flow.type === 'income';
        return true;
      })
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [upcomingCashFlows, activeTab]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim()) {
      setErrorMsg('Please specify a title or vendor name');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!dueDate) {
      setErrorMsg('Please pick a projected due date');
      return;
    }

    setIsSubmitting(true);
    try {
      await addUpcomingCashFlow({
        title: title.trim(),
        amount: parsedAmount,
        type,
        category,
        dueDate,
        recurrence,
        accountId: targetAccountId || primaryAccountId,
        notes: notes.trim() || undefined,
        status: 'pending',
      });

      // Reset form
      setTitle('');
      setAmount('');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to schedule payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this scheduled cash item?')) {
      await deleteUpcomingCashFlow(id);
    }
  };

  const handleToggleStatus = async (flow: UpcomingCashFlow) => {
    const nextStatus = flow.status === 'pending' ? 'completed' : 'pending';
    await markUpcomingCashFlowStatus(flow.id, nextStatus);
  };

  return {
    accounts,
    primaryAccountId,
    upcomingCashFlows,
    deleteUpcomingCashFlow,
    markUpcomingCashFlowStatus,
    activeTab,
    setActiveTab,
    showAddForm,
    setShowAddForm,
    isSubmitting,
    title,
    setTitle,
    amount,
    setAmount,
    type,
    setType,
    category,
    setCategory,
    dueDate,
    setDueDate,
    recurrence,
    setRecurrence,
    targetAccountId,
    setTargetAccountId,
    notes,
    setNotes,
    errorMsg,
    summary30D,
    filteredList: filteredFlows,
    handleCreate: handleSubmit,
    handleDelete,
    handleToggleStatus,
  };
}
