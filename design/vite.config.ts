import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

const src = fileURLToPath(new URL("./src", import.meta.url));

/* One config, two modes: `--mode lib` emits the package (index.js + index.d.ts
   + ohf.css), anything else serves or builds the showcase. */
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    ...(mode === "lib"
      ? [dts({ include: ["src"], exclude: ["src/**/*.test.ts", "src/**/*.test.tsx"] })]
      : []),
  ],
  resolve: { alias: { "@": src } },
  build:
    mode === "lib"
      ? {
          lib: {
            entry: `${src}/index.ts`,
            formats: ["es"],
            fileName: "index",
            cssFileName: "ohf",
          },
          rollupOptions: { external: ["react", "react-dom", "react/jsx-runtime"] },
          cssCodeSplit: false,
          sourcemap: true,
        }
      : { outDir: "dist-showcase" },
}));
