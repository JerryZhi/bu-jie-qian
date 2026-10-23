import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    watch: {
      // Downloaded PNGs can be temporarily locked on Windows. They are not source files.
      ignored: ["**/output/**", "**/.playwright-mcp/**"],
    },
  },
});
