const NOTES_EXCERPT_LENGTH = 60;

/**
 * notesの短い抜粋を作る。関連記録一覧でどんな記録か思い出す手がかりにする。
 *
 * 2026-08、graphService.jsだけが持っていたこの関数を、similarRecordsService.js
 * でも同じ用途（記録一覧の抜粋）で必要になったため共通化した。
 */
export const excerptNotes = (notes) => {
  if (!notes) return "";
  return notes.length > NOTES_EXCERPT_LENGTH ? `${notes.slice(0, NOTES_EXCERPT_LENGTH)}…` : notes;
};
