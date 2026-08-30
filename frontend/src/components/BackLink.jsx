import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

/**
 * 「リンク経由でしか辿り着けないページ」共通の戻る導線。
 *
 * EntityDetailPage・DiagnosisPage・WorldMapPage・RecordDetailPageは、
 * Home/Stats/Graph/検索結果など複数の画面から遷移してくる可能性があり、
 * 遷移元を1つに決め打ちできない。そのため、ブラウザ履歴を1つ戻る
 * `navigate(-1)`を使い、実際に来た場所へ正しく戻れるようにする
 * （2026-08、UI/UXレビューでこの2ページに戻る導線が無いことが分かり、
 * 場当たり的に別々の実装をするのではなく共通コンポーネントとして
 * 切り出した。後にRecordDetail/RecordFormの独自実装もこれへ統一した）。
 *
 * 2026-08、URLを直接開いた場合（ブックマーク・共有リンク・新規タブ）は
 * そのタブ内にアプリ内の遷移履歴が無く、`navigate(-1)`が期待通りに
 * 動かないことが分かった（動作確認中に実際に遭遇）。React Routerは
 * そのタブでアプリ内遷移が一度も起きていない場合、`location.key`が
 * 固定値`"default"`になるため、これを使って「戻れる履歴が実在するか」
 * を判定できる。履歴が無い場合は`fallback`（省略時は`"/"`）へ遷移する。
 */
function BackLink({ fallback = "/" }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleClick = () => {
    if (location.key === "default") {
      navigate(fallback);
      return;
    }
    navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-sm text-text-tertiary transition-colors duration-150 hover:text-text"
    >
      <ArrowLeft size={14} aria-hidden="true" />
      {t("common.back")}
    </button>
  );
}

export default BackLink;
