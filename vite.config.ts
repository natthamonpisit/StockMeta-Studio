import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    base: './', 
    server: {
      host: true
    },
    // [FIX] Force Vite to bundle these dependencies.
    // This prevents the "Uncaught TypeError: Failed to resolve module specifier" 
    // and ensures the bundled React matches the version used in the app code.
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react', 'uuid', 'exifreader'],
    },
    plugins: [
      react() 
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});