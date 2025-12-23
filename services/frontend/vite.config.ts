import { defineConfig } from "vite";
import path from "path"

export default defineConfig({
  appType: 'spa', // enable spa fallback
  root: '.',
  build: {
    outDir: 'dist'
  },
  
  resolve: {
    alias: {
      'shared': path.resolve(__dirname, '../shared'),
    }
  },

  server: {
	watch: {
      usePolling: true,
      interval: 1000, // check for changes every second
    },
    port: Number(process.env.PORT),
    strictPort: true,
    // Disable HMR when running behind nginx proxy to avoid WebSocket connection errors
    // The app will still work, just without hot module replacement
    // Set HMR_ENABLED=true in environment to enable HMR
    hmr: process.env.HMR_ENABLED === 'true' ? {
      clientPort: process.env.HMR_CLIENT_PORT ? Number(process.env.HMR_CLIENT_PORT) : 8443,
      protocol: 'wss',
      host: 'localhost'
    } : false
  }
});
