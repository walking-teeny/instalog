// Vercel serverless entry point. vercel.json routes every /api/* request here;
// the built frontend (dist/) is served separately by Vercel as static files.
import { createApp } from '../server/app.js';

const app = createApp();

export default app;
