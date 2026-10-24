import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './shared/i18n';
import App from './App.tsx';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html is missing #root');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error: unknown) => {
      console.error('service worker registration failed', error);
    });
  });
}
