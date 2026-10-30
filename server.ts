import { fileURLToPath } from 'url';
import { startServer } from './server/index';

export * from './server/index';

// Start server when executed directly: e.g. `tsx server.ts`
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

