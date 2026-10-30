import React, { useMemo, useState } from 'react';
import {
  Calendar,
  X,
  Plus,
  CheckCircle,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  Landmark,
  Trash2,
  AlertCircle,
  FileText,
  Building,
  Receipt,
  Users,
  Briefcase,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useCash } from '../../context/CashContext';
import { formatINR, formatCompactINR } from '../../utils/finance';
import { UpcomingCashFlow, UpcomingCashFlowCategory, UpcomingCashFlowRecurrence } from '../../types/finance';

interface UpcomingTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_ICONS: Record<UpcomingCashFlowCategory, { label: string; icon: any; color: string }> = {
  payroll: { label: 'Staff Payroll', icon: Users, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300' },
  gst: { label: 'GST Tax Filing', icon: Receipt, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300' },
  rent: { label: 'Office Rent & Lease', icon: Building, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-300' },
  vendor_invoice: { label: 'Vendor Invoice', icon: Briefcase, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/60 dark:text-orange-300' },
  expected_receivable: { label: 'Expected Client Receipt', icon: Sparkles, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300' },
  tax: { label: 'Income / Advance Tax', icon: FileText, color: 'text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300' },
  loan_emi: { label: 'Loan EMI / Debt', icon: Landmark, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' },
  other: { label: 'Other Planned Cash', icon: Layers, color: 'text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' },
};

export const UpcomingTimelineModal: React.FC<UpcomingTimelineModalProps> = ({ isOpen, onClose }) => {
  const {
    upcomingCashFlows,
    addUpcomingCashFlow,
    updateUpcomingCashFlow,
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
  const summary30D = useMemo(() => {
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

  // Filtered List
  const filteredList = useMemo(() => {
    return upcomingCashFlows.filter((flow) => {
      if (activeTab === 'all') return true;
      if (activeTab === 'outflow') return flow.type === 'expense';
      if (activeTab === 'income') return flow.type === 'income';
      return true;
    });
  }, [upcomingCashFlows, activeTab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const numAmount = parseFloat(amount);
    if (!title.trim()) {
      setErrorMsg('Please enter a descriptive title for this upcoming payment or receipt.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Amount must be greater than zero.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Please select a valid scheduled due date.');
      return;
    }

    try {
      setIsSubmitting(true);
      await addUpcomingCashFlow({
        title: title.trim(),
        amount: numAmount,
        type,
        category,
        dueDate,
        recurrence,
        status: 'pending',
        accountId: targetAccountId || primaryAccountId,
        notes: notes.trim() || undefined,
      });

      // Reset form
      setTitle('');
      setAmount('');
      setNotes('');
      setShowAddForm(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add upcoming cashflow.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl space-y-6 p-6 sm:p-7 animate-in zoom-in-95">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                  Forecast Engine Schedule
                </span>
                <span className="text-xs text-slate-400">Stored in Firestore</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white mt-0.5">
                Upcoming Payments & Receipts Timeline
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Close timeline modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 30-Day Executive Cash Commitment Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
            <div className="flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <ArrowDownLeft className="w-4 h-4" />
                30D Committed Outflow
              </span>
            </div>
            <div className="text-xl font-extrabold text-rose-900 dark:text-rose-100 mt-2 font-mono">
              {formatINR(summary30D.committedOutflows)}
            </div>
            <div className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
              Payroll, GST, rent & vendors
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
              <span className="flex items-center gap-1.5">
                <ArrowUpRight className="w-4 h-4" />
                30D Expected Inflows
              </span>
            </div>
            <div className="text-xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-2 font-mono">
              {formatINR(summary30D.expectedInflows)}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
              Confirmed client invoices
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${
            summary30D.netImpact >= 0
              ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/50 text-blue-900 dark:text-blue-100'
              : 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50 text-amber-900 dark:text-amber-100'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span>Net Planned Cash Impact</span>
              <Clock className="w-4 h-4 opacity-70" />
            </div>
            <div className="text-xl font-extrabold mt-2 font-mono">
              {summary30D.netImpact >= 0 ? `+${formatINR(summary30D.netImpact)}` : formatINR(summary30D.netImpact)}
            </div>
            <div className="text-[11px] opacity-80 mt-1">
              {summary30D.netImpact >= 0 ? 'Net surplus expected' : 'Working capital drain'}
            </div>
          </div>
        </div>

        {/* Action Controls & Filter Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              All Events ({upcomingCashFlows.length})
            </button>
            <button
              onClick={() => setActiveTab('outflow')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'outflow'
                  ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Payments Out ({upcomingCashFlows.filter((f) => f.type === 'expense').length})
            </button>
            <button
              onClick={() => setActiveTab('income')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'income'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Receipts In ({upcomingCashFlows.filter((f) => f.type === 'income').length})
            </button>
          </div>

          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{showAddForm ? 'Cancel Entry' : 'Schedule Payment / Receipt'}</span>
          </button>
        </div>

        {/* Collapsible Add Form */}
        {showAddForm && (
          <form
            onSubmit={handleCreate}
            className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4 animate-in slide-in-from-top-2"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                New Upcoming Commitment
              </h3>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Instantly incorporated into runway forecast
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                {errorMsg}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {/* Type */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Cash Flow Direction
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setType('expense');
                      setCategory('payroll');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                      type === 'expense'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Payment (Outflow)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setType('income');
                      setCategory('expected_receivable');
                    }}
                    className={`py-1.5 px-2 rounded-lg font-bold border transition-colors ${
                      type === 'income'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    Receipt (Inflow)
                  </button>
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1 sm:col-span-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Description / Narration
                </label>
                <input
                  type="text"
                  placeholder="e.g. October Staff Salaries, Q3 GSTR-3B, Client Retainer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  placeholder="₹ Amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as UpcomingCashFlowCategory)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {type === 'expense' ? (
                    <>
                      <option value="payroll">Staff Payroll (Salaries)</option>
                      <option value="gst">GST Tax Filing (GSTR-3B)</option>
                      <option value="rent">Office Rent & Utilities</option>
                      <option value="vendor_invoice">Vendor Invoice / Supplier</option>
                      <option value="tax">Advance Tax / TDS</option>
                      <option value="loan_emi">Loan EMI / Equipment Lease</option>
                      <option value="other">Other Expense</option>
                    </>
                  ) : (
                    <>
                      <option value="expected_receivable">Client Payment / Invoice Clearance</option>
                      <option value="other">Product / Service Sales</option>
                    </>
                  )}
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Scheduled Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>

              {/* Recurrence */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Recurrence Cadence
                </label>
                <select
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value as UpcomingCashFlowRecurrence)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  <option value="none">One-time payment</option>
                  <option value="monthly">Monthly recurring</option>
                  <option value="weekly">Weekly recurring</option>
                  <option value="quarterly">Quarterly (every 3 mos)</option>
                </select>
              </div>

              {/* Bank Account */}
              <div className="space-y-1">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Designated Bank Account
                </label>
                <select
                  value={targetAccountId}
                  onChange={(e) => setTargetAccountId(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bankName})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <label className="font-semibold text-slate-700 dark:text-slate-300">
                  Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO #8902, Approved by Founder, Net-30"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : 'Add to Forecast Schedule'}
              </button>
            </div>
          </form>
        )}

        {/* Timeline Event Cards List */}
        <div className="space-y-3">
          {filteredList.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                No upcoming commitments matching filter
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Schedule your next payroll, rent, GST, or client milestone to project accurate cash runway.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredList.map((flow) => {
                const categoryConfig = CATEGORY_ICONS[flow.category] || CATEGORY_ICONS.other;
                const IconComponent = categoryConfig.icon;
                const isExpense = flow.type === 'expense';
                const isPending = flow.status === 'pending';
                const targetAccount = accounts.find((a) => a.id === flow.accountId);

                const formattedDate = new Date(flow.dueDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <div
                    key={flow.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isPending
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                        : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                    } flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <div className={`p-2.5 rounded-xl shrink-0 ${categoryConfig.color}`}>
                        <IconComponent className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                            {flow.title}
                          </h4>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                            isExpense
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          }`}>
                            {categoryConfig.label}
                          </span>
                          {flow.recurrence && flow.recurrence !== 'none' && (
                            <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">
                              ↻ {flow.recurrence}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            Due: {formattedDate}
                          </span>
                          {targetAccount && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Landmark className="w-3 h-3 text-slate-400" />
                              {targetAccount.name}
                            </span>
                          )}
                          {flow.notes && (
                            <span className="text-[11px] text-slate-400 italic">
                              "{flow.notes}"
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Actions */}
                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-right">
                        <div className={`text-base font-extrabold font-mono ${
                          isExpense ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {isExpense ? `-${formatINR(flow.amount)}` : `+${formatINR(flow.amount)}`}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          Status: {flow.status}
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="flex items-center gap-1.5">
                        {isPending && (
                          <button
                            type="button"
                            title="Mark as Cleared and optionally convert to real transaction"
                            onClick={() => {
                              const convert = window.confirm(
                                `Mark "${flow.title}" (${formatINR(flow.amount)}) as cleared? Would you like to record it as an active transaction too?`
                              );
                              markUpcomingCashFlowStatus(flow.id, 'completed', convert);
                            }}
                            className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          type="button"
                          title="Delete from schedule"
                          onClick={() => {
                            if (window.confirm(`Delete "${flow.title}" from timeline?`)) {
                              deleteUpcomingCashFlow(flow.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {upcomingCashFlows.filter((f) => f.status === 'pending').length} pending commitments active
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
