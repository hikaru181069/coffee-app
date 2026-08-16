/// <reference types="vitest/config" />
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    // 0.0.0.0 で待受ける(=コンテナの外からもアクセスできるようにする)。
    // Docker無しでローカル実行する場合も、localhostでのアクセスは今まで通り可能。
    host: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.js",
    // グラフ描画（GraphCanvas.jsx等）はcanvasに依存しjsdomでは動かないため、
    // 現時点ではロジック層・単純なコンポーネントのテストのみを対象にする
    globals: false,
  },
});
