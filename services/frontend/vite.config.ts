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
    strictPort: true
  }
});
