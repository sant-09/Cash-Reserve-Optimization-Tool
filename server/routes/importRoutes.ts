import { Router, Request, Response } from 'express';
import {
  ApiResponse,
  BatchImportTransactionsRequest,
  BatchImportTransactionsResponse,
  CSVParseValidationRequest,
  CSVParseValidationResponse,
  Transaction,
} from '../../src/types/finance';
import { parseAndValidateCSV } from '../../src/utils/finance';
import { verifyAuthToken } from '../middleware/auth';

export const importRouter = Router();

// CSV / Excel Import Parsing & Validation
importRouter.post(
  '/import/validate',
  verifyAuthToken,
  (req: Request<unknown, unknown, CSVParseValidationRequest>, res: Response) => {
    try {
      const { rawCSV, mapping, defaultAccountId = 'acc-primary' } = req.body;

      if (!rawCSV || typeof rawCSV !== 'string' || rawCSV.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "rawCSV" string content is required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      if (!mapping || !mapping.dateColumn || !mapping.descriptionColumn) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "dateColumn" and "descriptionColumn" mapping are required',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      const validationResult = parseAndValidateCSV(rawCSV, mapping, defaultAccountId);

      return res.json({
        success: true,
        data: validationResult,
        timestamp: new Date().toISOString(),
      } as ApiResponse<CSVParseValidationResponse>);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Server Error during CSV parsing: ${err.message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
);

// Batch Import Transactions
importRouter.post(
  '/import/batch',
  verifyAuthToken,
  (req: Request<unknown, unknown, BatchImportTransactionsRequest>, res: Response) => {
    try {
      const { transactions, accountId = 'acc-primary' } = req.body;

      if (!Array.isArray(transactions) || transactions.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error: "transactions" must be a non-empty array',
          timestamp: new Date().toISOString(),
        } as ApiResponse);
      }

      const timestamp = Date.now();
      const createdTransactions: Transaction[] = transactions.map((t, idx) => ({
        ...t,
        id: `tx-import-${timestamp}-${idx}`,
        accountId: t.accountId || accountId,
      }));

      return res.json({
        success: true,
        data: {
          importedCount: createdTransactions.length,
          createdTransactions,
        },
        timestamp: new Date().toISOString(),
      } as ApiResponse<BatchImportTransactionsResponse>);
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        error: `Server Error during batch import: ${err.message || 'Unknown error'}`,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }
  }
);

