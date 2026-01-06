import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { runSystemDiagnostics } from './src/lib/diagnostics';

// --- SELF-HEALING SCRIPT ---
// พี่อุ๊กครับ ส่วนนี้คือ "เงื่อนไขเช็ค Code ตัวเอง" ตามที่พี่สั่งครับ
// มันจะตรวจสอบว่ามี importmap หลงเหลือในหน้านี้ไหม ถ้ามี -> ลบทิ้งทันที เพื่อไม่ให้ตีกับ Vite
try {
  const rogueImportMap = document.querySelector('script[type="importmap"]');
  if (rogueImportMap) {
    console.warn("⚠️ Detected rogue importmap. Removing it via self-healing script to prevent conflicts.");
    rogueImportMap.remove();
  }
} catch (e) {
  // Ignore errors if DOM is not ready, though this runs after body parse usually
}
// ---------------------------

// --- RUN DEBUG PROTOCOL ---
// รันตรวจสอบระบบทันทีที่โหลด
runSystemDiagnostics();
// ---------------------------

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);