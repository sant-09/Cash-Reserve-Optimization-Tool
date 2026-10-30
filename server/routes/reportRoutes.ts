import { Router, Request, Response } from 'express';
import { ApiResponse, MonthlyReportData, UserRole } from '../../src/types/finance';
import { generateMonthlyReportData } from '../../src/utils/finance';
import { verifyAuthToken } from '../middleware/auth';
import { inMemoryUpcomingFlows } from '../store/mockDb';

export const reportRouter = Router();

// Monthly Report: Generate report package using shared financial metrics
reportRouter.get('/report/monthly', verifyAuthToken, (req: Request, res: Response) => {
  try {
    const rawRole = (req.headers['x-user-role'] as string)?.toLowerCase();
    const role: UserRole = rawRole === 'finance' ? 'finance' : 'owner';
    const name = (req.headers['x-user-name'] as string) || 'Rajesh Sharma';
    const businessName = (req.headers['x-business-name'] as string) || 'Apex Craft Digital & Retail';

    const report = generateMonthlyReportData(
      [],
      350000,
      300000,
      inMemoryUpcomingFlows,
      { name, businessName, role },
      30
    );

    return res.json({
      success: true,
      data: report,
      timestamp: new Date().toISOString(),
    } as ApiResponse<MonthlyReportData>);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Server Error compiling monthly report: ${err.message || 'Unknown error'}`,
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }
});
