import { defineConfig } from "vite";

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist'
  },
  server: {
    port: 3000,    // 👈 set port here
    strictPort: true // 👈 optional, forces Vite to fail if 3000 is busy
  }
});
