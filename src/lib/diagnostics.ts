/**
 * [DEBUG PROTOCOL]
 * ไฟล์นี้ทำหน้าที่ตรวจสอบความพร้อมของระบบก่อนเริ่มทำงาน (System Health Check)
 * พี่อุ๊กสามารถดูผลลัพธ์ได้ที่ Browser Console (F12)
 */

export function runSystemDiagnostics() {
  const timestamp = new Date().toLocaleTimeString();
  console.group(`🚀 StockMeta Studio - System Diagnostics [${timestamp}]`);

  // 1. CHECK API KEY
  // process.env.API_KEY ถูก Inject โดย Vite (ดู vite.config.ts)
  const apiKey = process.env.API_KEY;
  if (apiKey && apiKey.length > 0 && apiKey !== 'undefined') {
    console.log(`%c[PASS] API_KEY found (${apiKey.length} chars)`, 'color: #4ade80');
  } else {
    console.error(`%c[FAIL] API_KEY is MISSING! AI features will fallback to simulation mode.`, 'color: #f87171; font-weight: bold;');
    console.warn('-> Please check your .env file or Vercel Environment Variables.');
  }

  // 2. CHECK BROWSER STORAGE (IndexedDB)
  if ('indexedDB' in window) {
    console.log(`%c[PASS] IndexedDB supported`, 'color: #4ade80');
  } else {
    console.error(`%c[FAIL] IndexedDB not supported. Data will not persist!`, 'color: #f87171');
  }

  // 3. CHECK MEMORY
  // @ts-ignore
  if (navigator.deviceMemory) {
    // @ts-ignore
    console.log(`[INFO] Device Memory: ~${navigator.deviceMemory} GB`);
  }

  // 4. CHECK NETWORK STATUS
  console.log(`[INFO] Network Status: ${navigator.onLine ? 'Online' : 'Offline'}`);
  window.addEventListener('offline', () => console.warn('%c[WARN] Network lost!', 'color: orange'));
  window.addEventListener('online', () => console.log('%c[INFO] Network restored', 'color: green'));

  console.groupEnd();
}