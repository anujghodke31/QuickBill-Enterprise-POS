import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/app';
import { refreshSession } from './lib/api';
import './styles/index.css';

// Restore the session from the refresh cookie before routes decide where to go.
void refreshSession();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
