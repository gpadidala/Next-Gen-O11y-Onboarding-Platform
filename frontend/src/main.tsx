import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import '@/styles/globals.css';
import { getSavedTheme } from '@/hooks/useTheme';

// Apply saved theme before first paint to prevent flash of unstyled content
const saved = getSavedTheme();
if (saved !== 'light') {
  document.documentElement.setAttribute('data-theme', saved);
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Root element not found. Ensure there is a <div id="root"></div> in your index.html.'
  );
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
