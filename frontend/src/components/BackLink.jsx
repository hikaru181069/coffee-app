import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * 「リンク経由でしか辿り着けないページ」共通の戻る導線。
 *
 * EntityDetailPage・DiagnosisPageは、Home/Stats/Graph/検索結果など
 * 複数の画面から遷移してくる可能性があり、RecordDetailPageのBreadcrumb
 * （`/records`への固定リンク）のように遷移元を1つに決め打ちできない。
 * そのため、ブラウザ履歴を1つ戻る`navigate(-1)`を使い、実際に来た場所へ
 * 正しく戻れるようにする（2026-08、UI/UXレビューでこの2ページに戻る
 * 導線が無いことが分かり、場当たり的に別々の実装をするのではなく
 * 共通コンポーネントとして切り出した）。
 */
function BackLink() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className="inline-flex items-center gap-1 text-sm text-text-tertiary transition-colors duration-150 hover:text-text"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {t("common.back")}
    </button>
  );
}

export default BackLink;
