import { Router, Request, Response } from 'express';
import { ApiResponse, UpdateUserSettingsRequest, UserSettings } from '../../src/types/finance';
import { verifyAuthToken, requireRole } from '../middleware/auth';
import { logActivity } from '../store/mockDb';

export const userRouter = Router();

// User Settings, Language & Onboarding Preferences
userRouter.get('/user/settings', verifyAuthToken, (_req: Request, res: Response) => {
  const defaultSettings: UserSettings = {
    minCashRequired: 300000,
    initialBalance: 350000,
    language: 'en',
    schemaVersion: 2,
    onboardingCompleted: true,
    primaryAccountId: 'acc-primary',
    updatedAt: new Date().toISOString(),
  };

  res.json({
    success: true,
    data: defaultSettings,
    timestamp: new Date().toISOString(),
  } as ApiResponse<UserSettings>);
});

userRouter.post(
  '/user/settings',
  verifyAuthToken,
  requireRole(['owner']),
  (req: Request<unknown, unknown, UpdateUserSettingsRequest>, res: Response) => {
    const { language, minCashRequired, initialBalance, onboardingCompleted, primaryAccountId } = req.body;

    if (language !== undefined && language !== 'en' && language !== 'hinglish') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "language" must be "en" or "hinglish"',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (minCashRequired !== undefined && (typeof minCashRequired !== 'number' || minCashRequired < 0)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "minCashRequired" must be a non-negative number',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (initialBalance !== undefined && (typeof initialBalance !== 'number' || !isFinite(initialBalance))) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "initialBalance" must be a valid number',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    if (onboardingCompleted !== undefined && typeof onboardingCompleted !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: "onboardingCompleted" must be a boolean',
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    const updatedSettings: UserSettings = {
      minCashRequired: minCashRequired ?? 300000,
      initialBalance: initialBalance ?? 350000,
      language: language ?? 'en',
      schemaVersion: 2,
      onboardingCompleted: onboardingCompleted ?? true,
      primaryAccountId: primaryAccountId ?? 'acc-primary',
      updatedAt: new Date().toISOString(),
    };

    logActivity(
      req,
      'SETTINGS_UPDATED',
      'settings',
      'user-settings',
      `Updated settings: Reserve ₹${(updatedSettings.minCashRequired).toLocaleString('en-IN')}`,
      req.body
    );

    return res.json({
      success: true,
      data: updatedSettings,
      timestamp: new Date().toISOString(),
    } as ApiResponse<UserSettings>);
  }
);
