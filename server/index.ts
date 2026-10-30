import { fileURLToPath } from 'url';
import { app, PORT, startServer } from './app';

export { app, PORT, startServer };
export * from './middleware';
export * from './store';
export * from './routes';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}

