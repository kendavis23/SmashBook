import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 3001,
    },
    test: {
        environment: "jsdom",
        setupFiles: ["./src/test-setup.ts"],
        globals: true,
        env: {
            VITE_API_BASE_URL: "http://localhost:8080",
            VITE_APP_ENV: "development",
        },
    },
});
