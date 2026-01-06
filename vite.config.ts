import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  // Fixed: Property 'cwd' does not exist on type 'Process'
  const env = loadEnv(mode, (process as any).cwd(), '');
  
  return {
    plugins: [react()],
    define: {
      // Vital: This allows process.env.API_KEY to work in the browser code
      // It grabs the value from Vercel/System and bakes it into the build
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});