import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["@badminton/booking-ui", "@badminton/booking-contracts"],
  },
  build: {
    commonjsOptions: { include: [/node_modules/, /packages\/.*\/dist/] },
  },
  server: { proxy: { "/api": "http://localhost:3000" } },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    clearMocks: true,
  },
});
