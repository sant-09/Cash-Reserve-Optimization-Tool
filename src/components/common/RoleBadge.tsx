import React, { useState } from 'react';
import { ShieldCheck, ShieldAlert, ChevronDown, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/finance';

export const RoleBadge: React.FC = () => {
  const { user, switchRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const currentRole: UserRole = user?.role || 'owner';
  const isOwner = currentRole === 'owner';

  const handleRoleSelect = (role: UserRole) => {
    switchRole(role);
    setDropdownOpen(false);
  };

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        title={`Active Role: ${isOwner ? 'Business Owner (Full permissions)' : 'Finance Officer (Restricted: cannot alter reserves or delete accounts)'} - Click to switch for testing`}
        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all ${
          isOwner
            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40'
            : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
        }`}
      >
        {isOwner ? (
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
        ) : (
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
        )}
        <span className="capitalize">{isOwner ? 'Owner 👑' : 'Finance 📊'}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {dropdownOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setDropdownOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-50 p-2 space-y-1 text-xs">
            <div className="px-2 py-1.5 border-b border-slate-100 dark:border-slate-800">
              <p className="font-bold text-slate-800 dark:text-slate-100">Role-Based Access (RBAC)</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Switch roles to verify backend API rejection & UI permission guards.
              </p>
            </div>

            {/* Option 1: Owner */}
            <button
              onClick={() => handleRoleSelect('owner')}
              className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                isOwner
                  ? 'bg-amber-50/80 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-medium'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-base leading-none mt-0.5">👑</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Owner Role</span>
                  {isOwner && <Check className="w-3.5 h-3.5 text-amber-600" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Full permissions. Can update minimum reserve thresholds, delete accounts, and configure alert triggers.
                </p>
              </div>
            </button>

            {/* Option 2: Finance */}
            <button
              onClick={() => handleRoleSelect('finance')}
              className={`w-full flex items-start gap-2.5 p-2 rounded-lg text-left transition-colors ${
                !isOwner
                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 font-medium'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span className="text-base leading-none mt-0.5">📊</span>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Finance Role</span>
                  {!isOwner && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Operational access. Can view ledger & forecasts, but backend rejects reserve changes & account deletions.
                </p>
              </div>
            </button>

            {!isOwner && (
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5 mt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Finance role active: Settings and account delete controls are disabled with clear permission tooltips.</span>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
