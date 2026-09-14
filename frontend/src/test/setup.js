// Vitestのsetupfiles（vite.config.jsのtest.setupFiles）から読み込まれる。
// テスト本体より前に実行される。
//
// @testing-library/jest-dom は toBeInTheDocument() 等のDOM用matcherを
// expect に追加する。バックエンド（Jest）と違い、Vitestはjest-domの
// matcherを自動では登録しないため、ここで明示的にimportする。
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// vite.config.jsのtest.globalsをfalseにしている（グローバルへ暗黙で
// describe/test/expect等を生やさず、各テストファイルでvitestから明示的に
// importする方針のため）。その副作用として@testing-library/reactの
// 自動クリーンアップ（内部でglobalのafterEachを探して登録する仕組み）が
// 効かず、テストごとに前のrender()結果がDOMに残ってしまう。ここで
// 明示的にafterEachへ登録する
afterEach(cleanup);

// i18n本体を初期化し、言語をjaに固定する。
// react-i18next のLanguageDetectorがjsdomのnavigator.language（実行環境
// によって"en-US"等になる）を拾ってしまい、fallbackLng（ja）より優先
// されてテスト結果が環境依存になっていたため、明示的に固定する。
import i18n from "../i18n";

i18n.changeLanguage("ja");

// jsdomはIntersectionObserverを実装していない。hooks/useReveal.jsを使う
// コンポーネント（RelatedRecordRow・SimilarRecords等のスクロールイン
// 演出）をレンダーするとReferenceErrorになるため、最小限のダミー実装を
// グローバルに用意する。発火（isIntersecting）はさせず、observe/
// unobserve/disconnectを何もしないメソッドとして提供するだけでよい
// （テストの関心事は演出のタイミングではなく表示内容のため）。
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.IntersectionObserver = MockIntersectionObserver;

// jsdomはwindow.matchMediaを実装していない。RecordFormPage.jsxの
// prefers-reduced-motion判定（保存の瞬間の演出、2026-09）で呼ばれると
// TypeErrorになるため、常にmatches:falseを返す最小限のダミー実装を
// 用意する（テストの関心事はアニメーション演出の有無ではなく保存後の
// 遷移そのものであるため、reduced-motionではない状態に固定してよい）。
globalThis.matchMedia = (query) => ({
  matches: false,
  media: query,
  addEventListener() {},
  removeEventListener() {},
});
