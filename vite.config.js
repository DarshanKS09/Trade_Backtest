import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api/binance": {
        target: "https://api.binance.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/binance/, ""),
      },
      "/api/yahoo": {
        target: "https://query1.finance.yahoo.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/yahoo/, ""),
      },
    },
  },
});
