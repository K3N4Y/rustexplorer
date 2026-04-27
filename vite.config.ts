import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    exclude: ["**/.worktrees/**", "**/node_modules/**", "**/dist/**"],
  },

  build: {
    target: "esnext",
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/")
          ) {
            return "vendor-react";
          }

          if (
            id.includes("node_modules/radix-ui/") ||
            id.includes("node_modules/@radix-ui/") ||
            id.includes("node_modules/lucide-react/") ||
            id.includes("node_modules/class-variance-authority/") ||
            id.includes("node_modules/clsx/") ||
            id.includes("node_modules/tailwind-merge/") ||
            id.includes("node_modules/tw-animate-css/") ||
            id.includes("node_modules/shadcn/") ||
            id.includes("node_modules/@fontsource-variable/")
          ) {
            return "vendor-ui";
          }

          if (
            id.includes("node_modules/pdfjs-dist/") ||
            id.includes("node_modules/react-syntax-highlighter/") ||
            id.includes("node_modules/react-markdown/") ||
            id.includes("node_modules/remark-gfm/")
          ) {
            return "vendor-preview";
          }

          if (
            id.includes("node_modules/cmdk/") ||
            id.includes("node_modules/sonner/") ||
            id.includes("node_modules/@tanstack/react-virtual/")
          ) {
            return "vendor-utils";
          }

          if (id.includes("node_modules/@tauri-apps/")) {
            return "vendor-tauri";
          }
        },
      },
    },
  },

  esbuild: {
    drop: command === "build" ? ["console", "debugger"] : [],
  },

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
}));
