import { useState } from 'react';
import { useCash } from '../context/CashContext';
import { AccountType, BankAccount } from '../types/finance';

export interface AccountFormData {
  name: string;
  bankName: string;
  accountType: AccountType;
  initialBalance: number;
  accountNumberMasked: string;
  color: string;
  isDefault: boolean;
}

/**
 * Custom hook containing bank accounts modal state,
 * form lifecycle, validation, and CRUD operations.
 */
export function useAccountForm() {
  const {
    accounts,
    totalCashPosition,
    primaryAccountId,
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

  const handleDelete = async (accountId: string) => {
    if (accounts.length <= 1) {
      alert('You must have at least one active bank account.');
      return;
    }
    if (!canDelete.allowed) {
      alert(canDelete.reason);
      return;
    }
    if (window.confirm('Are you sure you want to remove this bank account?')) {
      await deleteAccount(accountId);
      if (editingAccountId === accountId) {
        resetForm();
      }
    }
  };

  const handleSetDefault = async (accountId: string) => {
    await setDefaultAccount(accountId);
  };

  return {
    accounts,
    totalCashPosition,
    primaryAccountId,
    canDelete,
    isAddingNew,
    setIsAddingNew,
    editingAccountId,
    name,
    setName,
    bankName,
    setBankName,
    accountType,
    setAccountType,
    initialBalance,
    setInitialBalance,
    accountNumberMasked,
    setAccountNumberMasked,
    color,
    setColor,
    isDefault,
    setIsDefault,
    error,
    resetForm,
    handleStartAdd,
    handleStartEdit,
    handleSave,
    handleDelete,
    handleSetDefault,
    setDefaultAccount,
  };
}
