import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

/* ── Self-hosted fonts via @fontsource ── */
import '@fontsource/work-sans/400.css';
import '@fontsource/work-sans/500.css';
import '@fontsource/work-sans/600.css';
import '@fontsource/space-grotesk/600.css';
import '@fontsource/space-grotesk/700.css';

import './index.css';
import './form-fixes.css';
import './styles/theme.css';

import { initThemeSync } from './lib/theme';

initThemeSync();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
