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
});
