import express, { Express } from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './routes';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

export const app: Express = express();
export const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Mount modular API routes under /api
app.use('/api', apiRouter);

// Setup Vite dev server or production static files
export async function setupFrontendMiddleware(serverApp: Express) {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      root: projectRoot,
      server: { middlewareMode: true },
      appType: 'spa',
    });
    serverApp.use(vite.middlewares);
  } else {
    serverApp.use(express.static(path.join(projectRoot, 'dist')));
    serverApp.get('*', (_req, res) => {
      res.sendFile(path.join(projectRoot, 'dist', 'index.html'));
    });
  }
}

export async function startServer() {
  await setupFrontendMiddleware(app);

  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`CashWise server listening on http://0.0.0.0:${PORT}`);
    });
  }
}

