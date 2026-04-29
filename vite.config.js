import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [react(), tailwindcss()],
    server: {
        proxy: {
            "/api/deepl-free": {
                target: "https://api-free.deepl.com",
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/api\/deepl-free/, ""),
            },
            "/api/deepl-pro": {
                target: "https://api.deepl.com",
                changeOrigin: true,
                secure: true,
                rewrite: (path) => path.replace(/^\/api\/deepl-pro/, ""),
            },
        },
    },
});
