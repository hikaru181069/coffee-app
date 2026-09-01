/**
 * 一覧・グラフ・統計など、複数の画面で使う「中身が無いとき」の共通表示。
 *
 * 2026-08、features/coffee-records/components/RecordListStates.jsx・
 * features/stats/components/StatsEmptyState.jsx・
 * features/graph/components/GraphStates.jsx が、ほぼ同じマークアップ
 * （枠線+アイコン+タイトル+説明+操作）を個別にコピーしていたため、
 * 共通コンポーネントへ切り出した（空状態には次の行動を示す、
 * docs/design.md「UI Rules」）。
 *
 * variant="error" は危険色の枠線・文字色に切り替える。
 * fillHeight はGraph画面のようにキャンバス全体の高さいっぱいに
 * 中央寄せしたい場合に使う。
 */
function EmptyState({ icon: Icon, title, description, action, variant = "default", fillHeight = false, role }) {
  const isError = variant === "error";

  const containerClass = [
    "flex flex-col items-center gap-3 rounded-xl border px-6 py-12 text-center",
    fillHeight ? "h-full min-h-64 justify-center" : "",
    isError ? "border-danger/40 bg-danger/5" : "border-dashed border-line/60",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div role={role} className={containerClass}>
      {Icon && (
        <Icon
          size={32}
          aria-hidden="true"
          className={isError ? "text-danger" : "text-text-tertiary"}
          strokeWidth={1.5}
        />
      )}
      {title && (
        <div>
          <p className={isError ? "text-sm text-text" : "text-sm font-medium text-text"}>{title}</p>
          {description && <p className="mt-1 text-sm italic text-text-tertiary">{description}</p>}
        </div>
      )}
      {action}
    </div>
  );
}

export default EmptyState;
