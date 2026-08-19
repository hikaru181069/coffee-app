/**
 * ページ全体を包む外枠のクラス。
 *
 * 2026-08、各ページが個別にmax-widthをバラバラな値（900px/1100px/1480px/
 * 768pxなど）で持っており、根拠のないまま狭く固定されていた
 * （デスクトップで左右の空白が目立つ原因）。ページの性質で2段階に統一する。
 *
 * - wideContainerClass: 一覧・ダッシュボード系（Home/Records/Stats）。
 *   画面幅をほぼ使い切る
 * - contentContainerClass: 読み物・フォーム系（RecordDetail/RecordForm/
 *   Profile/EntityDetail）。単一カラムの本文・フォームが間延びしないよう
 *   適度な幅に留める（初回は1024pxにしたが、変化が乏しいとのフィードバック
 *   を受けて1200pxへ拡大した）
 */

export const wideContainerClass =
  "coffee-page mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6";

export const contentContainerClass =
  "coffee-page mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6";
