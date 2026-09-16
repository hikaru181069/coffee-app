/**
 * ページ全体を包む外枠のクラス。
 *
 * 2026-08、各ページが個別にmax-widthをバラバラな値（900px/1100px/1480px/
 * 768pxなど）で持っており、根拠のないまま狭く固定されていた
 * （デスクトップで左右の空白が目立つ原因）。ページの性質で2段階に統一する。
 *
 * - wideContainerClass: 一覧・ダッシュボード系（Home/Records/Stats）。
 *   画面幅をほぼ使い切る
 * - contentContainerClass: 読み物系（RecordDetail/Profile/EntityDetail）。
 *   単一カラムの本文が間延びしないよう適度な幅に留める（初回は1024pxに
 *   したが、変化が乏しいとのフィードバックを受けて1200pxへ拡大した）
 *
 * 2026-09、RecordFormは「コーヒーキャンバス」への作り直しで産地バッジ+
 * 味覚レーダーの2カラム・複数行のPropertyButton群を持つようになり、
 * 単一カラムの読み物ではなくなった。contentContainerClass（1200px）の
 * ままだとデスクトップの広い画面で窮屈に見えるという指摘を受け、
 * wideContainerClassへ移した（このファイル固有の例外。他の読み物系
 * ページには広げない）。
 */

export const wideContainerClass =
  "coffee-page mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6";

export const contentContainerClass =
  "coffee-page mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6";
