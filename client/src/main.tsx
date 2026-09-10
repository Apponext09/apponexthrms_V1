// Auto-logout on browser/tab close. Imported first (side-effect) so stale
// tokens are cleared before the auth store hydrates from localStorage.
import './features/auth/lib/tabSessionGuard';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
