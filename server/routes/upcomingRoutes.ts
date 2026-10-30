import { Router, Request, Response } from 'express';
import { ApiResponse, UpcomingCashFlow } from '../../src/types/finance';
import { verifyAuthToken } from '../middleware/auth';
import {
  inMemoryUpcomingFlows,
  logActivity,
  setInMemoryUpcomingFlows,
} from '../store/mockDb';

export const upcomingRouter = Router();

// Get Upcoming Cash Flows
upcomingRouter.get('/upcoming', verifyAuthToken, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: inMemoryUpcomingFlows,
    timestamp: new Date().toISOString(),
  } as ApiResponse<UpcomingCashFlow[]>);
});

// Create Upcoming Cash Flow
upcomingRouter.post('/upcoming', verifyAuthToken, (req: Request, res: Response) => {
  try {
    const { title, category, amount, type, dueDate, recurrence = 'none', accountId = 'acc-primary', notes } = req.body;

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "title" is required and must be a non-empty string',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (typeof amount !== 'number' || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "amount" must be a positive number',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (type !== 'income' && type !== 'expense') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "type" must be either "income" or "expense"',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (!dueDate || typeof dueDate !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "dueDate" ISO string is required',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const newFlow: UpcomingCashFlow = {
      id: `flow-${Date.now()}`,
      title: title.trim(),
      category: category || (type === 'income' ? 'expected_receivable' : 'vendor_invoice'),
      amount,
      type,
      dueDate,
      recurrence,
      status: 'pending',
      accountId,
      notes: notes ? String(notes).trim() : undefined,
      createdAt: new Date().toISOString(),
    };

    inMemoryUpcomingFlows.push(newFlow);

    logActivity(
      req,
      'UPCOMING_FLOW_CREATED',
      'upcoming_flow',
      newFlow.id,
      `Scheduled ${newFlow.type}: ${newFlow.title} (₹${newFlow.amount.toLocaleString('en-IN')})`
    );

    return res.status(201).json({
      success: true,
      data: newFlow,
      timestamp: new Date().toISOString(),
    } as ApiResponse<UpcomingCashFlow>);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Server Error adding upcoming flow: ${err.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});

// Delete Upcoming Cash Flow
upcomingRouter.delete('/upcoming/:id', verifyAuthToken, (req: Request, res: Response) => {
  const { id } = req.params;
  const initialLength = inMemoryUpcomingFlows.length;
  const updated = inMemoryUpcomingFlows.filter((f) => f.id !== id);
  setInMemoryUpcomingFlows(updated);

  if (updated.length === initialLength) {
    return res.status(404).json({
      success: false,
      error: `Upcoming cashflow with id "${id}" not found`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  return res.json({
    success: true,
    data: { id, deleted: true },
    timestamp: new Date().toISOString(),
  } as ApiResponse);
});

