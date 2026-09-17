import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './server/app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8787;

const app = createApp();

// Non-Vercel deploys (Fly.io, Railway, Render, ...) serve the built frontend
// from this same process. On Vercel, api/index.ts is the entry point instead
// and the frontend is served as static files by the platform.
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, 'dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`[server] Listening on http://localhost:${PORT}`);
});
