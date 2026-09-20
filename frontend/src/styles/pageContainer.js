/**
 * ページ全体を包む外枠のクラス。
 *
 * 2026-08、各ページが個別にmax-widthをバラバラな値（900px/1100px/1480px/
 * 768pxなど）で持っており、根拠のないまま狭く固定されていた
 * （デスクトップで左右の空白が目立つ原因）。ページの性質で2段階に統一する。
 *
 * - wideContainerClass: 一覧・ダッシュボード系（Home/Records/Stats）。
 *   画面幅をほぼ使い切る
 * - contentContainerClass: 読み物・フォーム系（Profile/404）。
 *   単一カラムの本文が間延びしないよう適度な幅に留める（初回は1024pxに
 *   したが、変化が乏しいとのフィードバックを受けて1200pxへ拡大した）
 *
 * 2026-09、RecordFormは「コーヒーキャンバス」への作り直しで産地バッジ+
 * 味覚レーダーの2カラム・複数行のPropertyButton群を持つようになり、
 * 単一カラムの読み物ではなくなった。contentContainerClass（1200px）の
 * ままだとデスクトップの広い画面で窮屈に見えるという指摘を受け、
 * wideContainerClassへ移した。
 *
 * 2026-09、RecordDetail/EntityDetailもダッシュボード風レイアウト
 * （KPIストリップ+lg以上で2カラムグリッド）への作り直しに伴い、同じ理由で
 * wideContainerClassへ移した。WorldMapPageも「地図+統計サマリー+産地
 * 一覧」という一覧・ダッシュボード寄りの内容にもかかわらず
 * contentContainerClassのまま取り残されていたのを、ユーザー指摘を受けて
 * 揃えた。現在contentContainerClassを使うのはProfile・404のみ
 * （フォーム・単発メッセージという、本当に単一カラムの読み物系ページ）。
 */

export const wideContainerClass =
  "coffee-page mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6";

export const contentContainerClass =
  "coffee-page mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6";
