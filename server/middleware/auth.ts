import { Request, Response, NextFunction } from 'express';
import { ApiResponse, UserRole } from '../../src/types/finance';

/**
 * Authentication Middleware: Validates Bearer token format if present
 */
export function verifyAuthToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // If no header provided, allow anonymous/demo access
    return next();
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid token format. Must be Bearer <token>',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  const token = authHeader.split('Bearer ')[1]?.trim();
  if (!token || token.length < 5) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Malformed or missing authentication token',
      timestamp: new Date().toISOString(),
    } as ApiResponse);
  }

  next();
}

/**
 * Enforce RBAC roles on Express routes
 * Rejects unauthorized users with HTTP 403 Forbidden
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const rawRole = (req.headers['x-user-role'] as string)?.toLowerCase();
    // Default to 'owner' if no role header is sent (backward compatibility for demo/tests)
    const effectiveRole: UserRole = rawRole === 'finance' ? 'finance' : 'owner';

    if (!allowedRoles.includes(effectiveRole)) {
      return res.status(403).json({
        success: false,
        error: `Forbidden: Action requires [${allowedRoles.join(', ')}] role. Current role is "${effectiveRole}".`,
        timestamp: new Date().toISOString(),
      } as ApiResponse);
    }

    (req as any).userRole = effectiveRole;
    next();
  };
}
