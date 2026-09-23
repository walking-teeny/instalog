import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// After a new deploy, tabs left open from before it keep running the old JS bundle
// indefinitely (nothing else ever reloads them). Detect that by checking whether the
// currently-loaded script file is still referenced by the live index.html; if a new
// build has gone out, its filename changes (Vite content-hashes it), so it won't be —
// at which point we log out and reload so the tab picks up the new code cleanly.
if (import.meta.env.PROD) {
  const currentEntryPath = new URL(import.meta.url).pathname;
  const POLL_MS = 5 * 60 * 1000;

  setInterval(async () => {
    try {
      const res = await fetch('/', { cache: 'no-store' });
      const html = await res.text();
      if (!html.includes(currentEntryPath)) {
        localStorage.removeItem('instalog_auth_token');
        window.location.reload();
      }
    } catch {
      // network hiccup — just check again next interval
    }
  }, POLL_MS);
}
