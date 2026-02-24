import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/lcars": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
