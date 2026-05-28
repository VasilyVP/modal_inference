import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => {
          if (path === "/api/generate") {
            return "/generate";
          }
          return path.replace(/^\/api/, "");
        },
      },
    },
  },
});
