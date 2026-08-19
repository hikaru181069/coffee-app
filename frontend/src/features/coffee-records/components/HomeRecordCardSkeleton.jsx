import { useTranslation } from "react-i18next";

/**
 * 読み込み中のHome画面「Recent Records」。HomeRecordCard.jsx
 * （産地アクセントバー+ラベル/タイトル+評価/精製方法/フレーバー）と
 * 同じ形を、実際に使われる`grid grid-cols-1 sm:grid-cols-3`のグリッドで
 * 出す。features/coffee-records/components/RecordListStates.jsxの
 * RecordListSkeletonは`/records`・検索結果の縦積みリスト用の形であり、
 * Home画面のグリッドとは形が違うため、読み込み完了時にレイアウトが
 * 飛んでいた（別コンポーネントとして切り出した理由）。
 */
function HomeRecordCardSkeleton({ count = 3 }) {
  const { t } = useTranslation();
  return (
    <ul aria-busy="true" aria-label={t("common.loading")} className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className="rounded-2xl border border-surface-2 bg-raised p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <div className="skeleton-block h-3 w-0.5 rounded-full" />
            <div className="skeleton-block h-3 w-16 rounded" />
          </div>
          <div className="mt-2 flex items-start justify-between gap-2">
            <div className="skeleton-block h-4 w-2/3 rounded" />
            <div className="skeleton-block h-4 w-8 rounded" />
          </div>
          <div className="skeleton-block mt-2 h-3.5 w-1/2 rounded" />
          <div className="skeleton-block mt-2 h-3 w-3/4 rounded" />
        </li>
      ))}
    </ul>
  );
}

export default HomeRecordCardSkeleton;
