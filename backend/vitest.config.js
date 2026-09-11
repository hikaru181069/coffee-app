import { defineConfig } from "vitest/config";

/**
 * 2026-09、Jest（node --experimental-vm-modulesという実験的フラグに依存）
 * からVitestへ切り替えた。TypeScript化にあたり、esbuildベースのVitestは
 * 追加設定無しにTS/ESMをネイティブに扱えるため、frontendと同じテスト
 * ツールへ統一しつつ実験的フラグを取り除ける。
 *
 * globals: true にしているのは、既存テストが describe/test/expect を
 * @jest/globals からのimport無しで暗黙のグローバルとして使っているため
 * （書き換えを避け、移行の差分を最小にする）。
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.js"],
    testTimeout: 30000,
  },
});
