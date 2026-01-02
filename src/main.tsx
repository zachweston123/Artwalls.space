import { createRoot } from 'react-dom/client';
import App from './App';

import './index.css';
import './form-fixes.css';
import './styles/theme.css';

import { initThemeSync } from './lib/theme';

initThemeSync();

createRoot(document.getElementById('root')!).render(
  <App />
);
