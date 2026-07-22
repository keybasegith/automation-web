import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    // Mirror the tsconfig "@/*" -> project root alias.
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    // Only *.test.ts belongs to vitest. lib/forms/__tests__/consistency.spec.ts
    // is written for Node's built-in runner (`node --test`), so it is left alone.
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
  },
});
