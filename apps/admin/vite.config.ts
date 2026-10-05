import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const gateway = env.DEV_API_GATEWAY_URL || "http://localhost:8081";
  return {
    plugins: [react()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      host: "0.0.0.0",
      port: 5174,
      proxy: {
        "/api": gateway,
        "/graphql": gateway,
        "/socket.io": { target: gateway, ws: true },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            icons: ["react-icons", "lucide-react"],
            calendar: ["react-datepicker"],
            dialogs: ["@headlessui/react"],
          },
        },
      },
    },
    test: {
      env: { TZ: "Asia/Ho_Chi_Minh" },
      environment: "jsdom",
      setupFiles: ["./test/setup.ts"],
      clearMocks: true,
    },
  };
});
