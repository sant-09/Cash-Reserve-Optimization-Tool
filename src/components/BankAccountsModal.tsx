import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Check,
  X,
  CreditCard,
  ShieldCheck,
  Star,
  Wallet,
  Landmark,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useCash } from '../context/CashContext';
import { AccountType, BankAccount } from '../types/finance';
import { formatINR } from '../utils/finance';

interface BankAccountsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BankAccountsModal: React.FC<BankAccountsModalProps> = ({ isOpen, onClose }) => {
  const {
    accounts,
    totalCashPosition,
    addAccount,
    updateAccount,
    deleteAccount,
    setDefaultAccount,
    canPerform,
  } = useCash();

  const canDelete = canPerform('delete_account');

  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('HDFC Bank');
  const [accountType, setAccountType] = useState<AccountType>('current');
  const [initialBalance, setInitialBalance] = useState<number>(0);
  const [accountNumberMasked, setAccountNumberMasked] = useState('');
  const [color, setColor] = useState('#10b981');
  const [isDefault, setIsDefault] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setName('');
    setBankName('HDFC Bank');
    setAccountType('current');
    setInitialBalance(0);
    setAccountNumberMasked('');
    setColor('#10b981');
    setIsDefault(false);
    setError(null);
    setIsAddingNew(false);
    setEditingAccountId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAddingNew(true);
  };

  const handleStartEdit = (account: BankAccount) => {
    setEditingAccountId(account.id);
    setName(account.name);
    setBankName(account.bankName);
    setAccountType(account.accountType);
    setInitialBalance(account.initialBalance);
    setAccountNumberMasked(account.accountNumberMasked || '');
    setColor(account.color || '#10b981');
    setIsDefault(!!account.isDefault);
    setIsAddingNew(false);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }
    if (!bankName.trim()) {
      setError('Bank name is required.');
      return;
    }

    if (editingAccountId) {
      await updateAccount(editingAccountId, {
        name: name.trim(),
        bankName: bankName.trim(),
        accountType,
        initialBalance: Number(initialBalance) || 0,
        accountNumberMasked: accountNumberMasked.trim() || undefined,
        color,
      });
      if (isDefault) {
        await setDefaultAccount(editingAccountId);
      }
    } else {
      await addAccount({
        name: name.trim(),
        bankName: bankName.trim(),
        accountType,
        initialBalance: Number(initialBalance) || 0,
        accountNumberMasked: accountNumberMasked.trim() || undefined,
        color,
        isDefault,
      });
    }

    resetForm();
  };

  const handleDelete = async (id: string) => {
    if (accounts.length <= 1) {
      alert('You must have at least one active bank account.');
      return;
    }
    if (confirm('Are you sure you want to delete this bank account?')) {
      await deleteAccount(id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Manage Bank Accounts
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Operative current accounts, tax savings reserve, and overdraft facilities.
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

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          
          {/* Total Cash Position Header Banner */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                Consolidated Liquid Cash Position
              </span>
              <div className="text-2xl font-black font-mono mt-0.5">
                {formatINR(totalCashPosition.totalBalance)}
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Total Inflows</span>
                <span className="text-emerald-400 font-bold">+{formatINR(totalCashPosition.totalInflow)}</span>
              </div>
              <div className="border-l border-slate-800 pl-4">
                <span className="text-slate-400 block text-[10px] uppercase">Total Outflows</span>
                <span className="text-rose-400 font-bold">-{formatINR(totalCashPosition.totalOutflow)}</span>
              </div>
            </div>
          </div>

          {/* Account List */}
          {!isAddingNew && !editingAccountId && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Connected Accounts ({accounts.length})
                </span>
                <button
                  type="button"
                  onClick={handleStartAdd}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-xl transition-all shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bank Account</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {totalCashPosition.accountBreakdown.map((item) => {
                  const acc = item.account;
                  return (
                    <div
                      key={acc.id}
                      className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-xs"
                          style={{ backgroundColor: acc.color || '#10b981' }}
                        >
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                              {acc.name}
                            </h3>
                            {acc.isDefault && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700">
                                <Star className="w-2.5 h-2.5 fill-current" />
                                Default
                              </span>
                            )}
                            <span className="text-[10px] uppercase font-bold text-slate-400 px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60">
                              {acc.accountType}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                            <span>{acc.bankName}</span>
                            {acc.accountNumberMasked && (
                              <>
                                <span>·</span>
                                <span className="font-mono">{acc.accountNumberMasked}</span>
                              </>
                            )}
                            <span>·</span>
                            <span>{item.transactionCount} transactions</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-700">
                        <div className="text-left sm:text-right">
                          <div className="text-xs text-slate-400">Current Balance</div>
                          <div className="text-sm font-extrabold text-slate-900 dark:text-white font-mono">
                            {formatINR(item.currentBalance)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          {!acc.isDefault && (
                            <button
                              type="button"
                              onClick={() => setDefaultAccount(acc.id)}
                              title="Set as Default Account"
                              className="p-1.5 text-slate-400 hover:text-amber-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleStartEdit(acc)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                          >
                            Edit
                          </button>
                          {accounts.length > 1 && (
                            <button
                              type="button"
                              disabled={!canDelete}
                              onClick={() => handleDelete(acc.id)}
                              title={canDelete ? 'Delete account' : '🔒 Owner role required to delete bank accounts'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                canDelete
                                  ? 'text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                                  : 'opacity-40 cursor-not-allowed text-slate-300 dark:text-slate-600'
                              }`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Add / Edit Form */}
          {(isAddingNew || editingAccountId) && (
            <form onSubmit={handleSave} className="space-y-4 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingAccountId ? 'Edit Bank Account' : 'Add New Bank Account'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. ICICI Bank, HDFC, SBI"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Nickname *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Tax & Reserve Savings"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Account Type *
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as AccountType)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="current">Current A/c (Operative)</option>
                    <option value="savings">Savings A/c (Reserve)</option>
                    <option value="overdraft">Overdraft (OD / CC)</option>
                    <option value="cash">Petty Cash / Cash-in-Hand</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Initial Balance (₹) *
                  </label>
                  <input
                    type="number"
                    step="100"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Masked A/c Number (optional)
                  </label>
                  <input
                    type="text"
                    value={accountNumberMasked}
                    onChange={(e) => setAccountNumberMasked(e.target.value)}
                    placeholder="•••• 8821"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-all ${
                          color === c ? 'scale-110 border-slate-900 dark:border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="defaultAccountCheckbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <label
                  htmlFor="defaultAccountCheckbox"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Make this my default primary operative account
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 rounded-xl shadow-xs"
                >
                  {editingAccountId ? 'Save Changes' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Total cash balances update automatically when recording ledger transactions.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
