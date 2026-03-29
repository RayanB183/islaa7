import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // loadEnv exposes variables to this config file only.
    // Variables with VITE_ prefix are automatically available in the browser
    // via import.meta.env.VITE_*. Variables WITHOUT VITE_ prefix (e.g. GROQ_API_KEY)
    // are NOT bundled into the browser JS — they stay server-side only.
    const env = loadEnv(mode, '.', '');
    void env; // suppress unused-variable warning (env is available if needed for build config)
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
