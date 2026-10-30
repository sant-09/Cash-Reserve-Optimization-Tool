import { Router, Request, Response } from 'express';
import { ActivityLogEntry, ApiResponse } from '../../src/types/finance';
import { verifyAuthToken } from '../middleware/auth';
import { inMemoryActivityLogs } from '../store/mockDb';

export const activityRouter = Router();

// Activity Log Audit Trail (Read-only for all authenticated users)
activityRouter.get('/activity-logs', verifyAuthToken, (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: inMemoryActivityLogs,
    timestamp: new Date().toISOString(),
  } as ApiResponse<ActivityLogEntry[]>);
});

