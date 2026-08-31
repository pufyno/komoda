import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// spec/derived/ leží nad koreňom appky — dev server k nemu musí mať prístup.
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  build: { outDir: "dist", sourcemap: false },
});
