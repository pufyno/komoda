import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// spec/derived/ leží nad koreňom appky — dev server k nemu musí mať prístup.
export default defineConfig({
  plugins: [react()],
  server: { fs: { allow: [".."] } },
  build: {
    outDir: "dist",
    sourcemap: false,
    // Bez toho minifikátor prepíše "max-width: 900px" na rozsahový zápis
    // "(width <= 900px)", ktorý Safari pred 16.4 nepozná — a celý mobilný
    // layout by na starších iPhonoch vypadol.
    cssTarget: ["chrome90", "safari14", "firefox90", "edge90"],
  },
});
