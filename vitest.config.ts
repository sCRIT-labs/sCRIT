import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": new URL(".", import.meta.url).pathname.replace(/^\//, "").replace(/\/$/, "") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
