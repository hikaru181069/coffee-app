// 日時ユーティリティ（日本時間 = JST 基準）
//
// MLB Stats API が返す日時はすべて UTC（ISO文字列）。
// 日本のユーザー向けに、表示と「今日」の判定を JST (Asia/Tokyo) に統一する。
// 1か所にまとめておくことで、タイムゾーンの扱いがブレない。

const TZ = "Asia/Tokyo";

/**
 * MLB の「今日の試合日」を "YYYY-MM-DD" 形式で返す（米国東部時間 = ET 基準）。
 *
 * 重要: MLB の試合は米国の日付で管理される。日本の朝に行われている試合は
 * 米国では「前日」の扱い。ここを JST で「今日」にすると、まだ始まっていない
 * 試合日を見にいってしまい、今まさに行われている試合が表示されない。
 * そのため "今日のスケジュール" は ET 基準で判定する。
 * （表示する時刻自体は JST。日付の"区切り"だけ米国基準にするのがポイント）
 */
export const mlbToday = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

/**
 * ISO日時 → 日本時間の日付ラベル（既定: 例 "Thu, June 5, 2026"）。
 * opts で Intl の DateTimeFormat オプションを上書きできる。
 */
export const formatGameDate = (iso, opts = {}) =>
  new Date(iso).toLocaleDateString("en-US", {
    timeZone: TZ,
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
    ...opts,
  });

/**
 * ISO日時 → 日本時間の開始時刻（例 "8:05 AM"）。
 */
export const formatGameTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-US", {
    timeZone: TZ,
    hour: "numeric",
    minute: "2-digit",
  });
