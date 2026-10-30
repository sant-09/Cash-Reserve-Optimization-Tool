import { useEffect, useState } from 'react';
import { useCash } from '../context/CashContext';
import {
  Transaction,
  TransactionCategory,
  TransactionType,
} from '../types/finance';

export const INCOME_CATEGORIES: TransactionCategory[] = [
  'Client Payment',
  'Product Sales',
  'Consulting / Services',
  'Other Inflow',
];

export const EXPENSE_CATEGORIES: TransactionCategory[] = [
  'Staff Salaries',
  'Office Rent',
  'Inventory / Stock',
  'Vendor / Supplier',
  'Utilities & Wifi',
  'Taxes & GST',
  'Marketing & Ads',
  'Software & SaaS',
  'Logistics & Shipping',
  'Miscellaneous Expense',
];

/**
 * Custom hook managing transaction creation/editing form state,
 * category auto-switching, and submission validation.
 */
export function useTransactionForm(
  isOpen: boolean,
  initialData?: Transaction | null,
  onSave?: (tx: Omit<Transaction, 'id'>) => void,
  onClose?: () => void
) {
  const { accounts, primaryAccountId } = useCash();
  const [type, setType] = useState<TransactionType>('income');
  const [amount, setAmount] = useState<string>('');
  const [category, setCategory] = useState<TransactionCategory>('Client Payment');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState<string>(primaryAccountId || 'acc-primary');
  const [note, setNote] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'NEFT / RTGS' | 'Cheque' | 'Card' | 'Cash'>('UPI');
  const [isRecurring, setIsRecurring] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setAmount(initialData.amount.toString());
      setCategory(initialData.category);
      setDate(initialData.date);
      setAccountId(initialData.accountId || primaryAccountId || accounts[0]?.id || 'acc-primary');
      setNote(initialData.note);
      setPaymentMethod(initialData.paymentMethod || 'UPI');
      setIsRecurring(!!initialData.isRecurring);
    } else {
      setType('income');
      setAmount('');
      setCategory('Client Payment');
      setDate(new Date().toISOString().split('T')[0]);
      setAccountId(primaryAccountId || accounts[0]?.id || 'acc-primary');
      setNote('');
      setPaymentMethod('UPI');
      setIsRecurring(false);
    }
    setError(null);
  }, [initialData, isOpen, primaryAccountId, accounts]);

  const handleTypeChange = (newType: TransactionType) => {
    setType(newType);
    if (newType === 'income' && !INCOME_CATEGORIES.includes(category)) {
      setCategory('Client Payment');
    } else if (newType === 'expense' && !EXPENSE_CATEGORIES.includes(category)) {
      setCategory('Vendor / Supplier');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }
    if (!date) {
      setError('Please select a valid transaction date');
      return;
    }

    if (onSave) {
      onSave({
        date,
        type,
        amount: numAmount,
        category,
        note: note.trim() || `${type === 'income' ? 'Received' : 'Paid'} for ${category}`,
        paymentMethod,
        isRecurring,
        accountId,
      });
    }

    if (onClose) {
      onClose();
    }
  };

  return {
    accounts,
    type,
    amount,
    setAmount,
    category,
    setCategory,
    date,
    setDate,
    accountId,
    setAccountId,
    note,
    setNote,
    paymentMethod,
    setPaymentMethod,
    isRecurring,
    setIsRecurring,
    error,
    handleTypeChange,
    handleSubmit,
  };
}
