import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { runSystemDiagnostics } from './src/lib/diagnostics';

console.log('Starting StockMeta Studio...');

// --- RUN DEBUG PROTOCOL ---
runSystemDiagnostics();
// ---------------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('FATAL: Root element not found');
  throw new Error("Could not find root element to mount to");
}

console.log('Mounting React App...');
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);