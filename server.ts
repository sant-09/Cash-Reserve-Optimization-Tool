import { fileURLToPath } from 'url';
import { app, startServer } from './server/app';

export { app, startServer };
export {
  inMemoryActivityLogs,
  logActivity,
  inMemoryAlertRules,
  inMemoryScenarios,
  inMemoryUpcomingFlows,
  inMemoryAccounts,
} from './server/store';
export { verifyAuthToken, requireRole } from './server/middleware';

// Start server when executed directly: e.g. `tsx server.ts`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
