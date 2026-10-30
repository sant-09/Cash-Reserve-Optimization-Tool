import { Router, Request, Response } from 'express';
import { ApiResponse, BankAccount } from '../../src/types/finance';
import { createDefaultAccounts } from '../../src/utils/finance';
import { verifyAuthToken, requireRole } from '../middleware/auth';
import { logActivity } from '../store/mockDb';

export const accountRouter = Router();

// Bank Accounts Management
accountRouter.get('/accounts', verifyAuthToken, (_req: Request, res: Response) => {
  const accounts = createDefaultAccounts();
  res.json({
    success: true,
    data: accounts,
    timestamp: new Date().toISOString(),
  } as ApiResponse<BankAccount[]>);
});

accountRouter.post('/accounts', verifyAuthToken, (req: Request<unknown, unknown, Partial<BankAccount>>, res: Response) => {
  const { name, bankName, accountType, initialBalance, accountNumberMasked, color, isDefault } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Account "name" is required',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  if (!bankName || typeof bankName !== 'string' || bankName.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: "bankName" is required',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  const validTypes = ['current', 'savings', 'overdraft', 'cash'];
  if (!accountType || !validTypes.includes(accountType)) {
    return res.status(400).json({
      success: false,
      error: `Validation Error: "accountType" must be one of: ${validTypes.join(', ')}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  if (typeof initialBalance !== 'number' || isNaN(initialBalance) || !isFinite(initialBalance)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: "initialBalance" must be a valid number',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  const newAccount: BankAccount = {
    id: `acc-${Date.now()}`,
    name: name.trim(),
    bankName: bankName.trim(),
    accountType,
    initialBalance,
    accountNumberMasked: accountNumberMasked ? accountNumberMasked.trim() : undefined,
    color: color || '#10b981',
    isDefault: !!isDefault,
    createdAt: new Date().toISOString(),
  };

  logActivity(req, 'ACCOUNT_CREATED', 'account', newAccount.id, `Created bank account: ${newAccount.name}`);

  return res.json({
    success: true,
    data: newAccount,
    timestamp: new Date().toISOString(),
  } as ApiResponse<BankAccount>);
});

// Delete Bank Account (Owner Role Enforced)
accountRouter.delete('/accounts/:id', verifyAuthToken, requireRole(['owner']), (req: Request, res: Response) => {
  const { id } = req.params;
  logActivity(req, 'ACCOUNT_DELETED', 'account', id, `Deleted bank account: ${id}`);
  return res.json({
    success: true,
    data: { id, deleted: true },
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

