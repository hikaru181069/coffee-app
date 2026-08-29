import { useTranslation } from "react-i18next";
import { cardClass } from "./formStyles";

/**
 * 読み込み中の記録詳細ページ。RecordDetailPage.jsxの実際の構成
 * （Breadcrumb→Header→cardClassで囲んだCoffee Details/Tasting Note/
 * 味覚グラフ・Connections→編集/削除ボタン）と同じ形の骨格を出す。
 *
 * 2026-08、RecordDetailPage.jsxが`divide-y`区切りから`cardClass`
 * （枠線+背景+影のカード）へ移行した際にこのスケルトンの更新が漏れ、
 * 読み込み完了時にレイアウトが動く不具合があった（ローディングスケルトン
 * のレビューで発覚）。Coffee Detailsのタイルも、当時に追加された
 * 色付きアイコンバッジ付きの`flex flex-wrap`に合わせている。
 */
function RecordDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <div className="skeleton-block h-4 w-24 rounded" />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="skeleton-block h-7 w-56 rounded" />
          <div className="skeleton-block h-4 w-40 rounded" />
        </div>
        <div className="skeleton-block h-8 w-28 rounded-full" />
      </div>

      <div className="mt-6 flex flex-col gap-6">
        <section className={cardClass}>
          <div className="skeleton-block h-4 w-28 rounded" />
          <div className="mt-5 flex flex-wrap gap-x-8 gap-y-6">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="flex min-w-36 items-start gap-3">
                <div className="skeleton-block h-9 w-9 flex-shrink-0 rounded-full" />
                <div className="flex flex-col gap-1.5">
                  <div className="skeleton-block h-3 w-14 rounded" />
                  <div className="skeleton-block h-4 w-20 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={cardClass}>
          <div className="skeleton-block h-4 w-24 rounded" />
          <div className="mt-3 flex flex-col gap-2">
            <div className="skeleton-block h-4 w-full rounded" />
            <div className="skeleton-block h-4 w-full rounded" />
            <div className="skeleton-block h-4 w-2/3 rounded" />
          </div>
        </section>

        <section className={cardClass}>
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="skeleton-block h-4 w-28 rounded" />
              <div className="skeleton-block mt-4 aspect-square w-full rounded-xl" />
            </div>
            <div>
              <div className="skeleton-block h-4 w-32 rounded" />
              <div className="skeleton-block mt-4 aspect-square w-full rounded-xl" />
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="skeleton-block h-9 w-24 rounded-lg" />
        <div className="skeleton-block h-9 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export default RecordDetailSkeleton;
