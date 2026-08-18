import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAllDiscoverSuggestions } from "../features/discover/hooks/useAllDiscoverSuggestions";
import SuggestionCard from "../features/discover/components/SuggestionCard";
import DiscoverSkeleton from "../features/discover/components/DiscoverSkeleton";
import { RecordsErrorState } from "../features/coffee-records/components/RecordListStates";

/**
 * Discover専用ページ（`/discover`）。
 *
 * docs/discover.md「Discoverページ」参照。HomeのDiscoverカードは
 * 全産地を横断した最良の1件だけ（`buildDiscoverTeaser`）を見せる
 * ティーザーだったが、「Costa Ricaの話なのにGuatemalaのページに飛ぶ」
 * という遠回りな導線がわかりにくいという指摘を受け、自分が記録した
 * すべての産地の提案を、この専用ページで一望できるようにした
 * （`buildAllOriginDiscoveries`）。StatsページがInsightの「単発の一文」に
 * 対する「全体のふりかえり」であるのと同じ関係を、DiscoverページとHomeの
 * Discoverカードの間にも作っている。
 *
 * 常設ナビには追加していない（ユーザーと相談し、「静かな道具」の方針を
 * 優先し、まずはHomeのDiscoverカードからの「すべて見る」リンクだけで
 * 到達できる形にした）。
 *
 * 見出し「Discover」は、LandingPageの「Record / Connect / Discover」と
 * 同じ言語非依存のブランド語として扱い、翻訳しない。
 */
function DiscoverPage() {
  const { t } = useTranslation();
  const { origins, isLoading, error, reload } = useAllDiscoverSuggestions();

  if (isLoading) {
    return (
      <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
        <DiscoverSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
        <RecordsErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-text">Discover</h1>
        <p className="mt-1 text-sm text-text-tertiary">{t("discover.pageSubtitle")}</p>
      </header>

      {origins.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line/60 px-4 py-6 text-center text-sm text-text-tertiary">
          {t("discover.emptyDesc")}
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {origins.map((group) => (
            <section key={group.nodeId}>
              <Link
                to={`/entities/${encodeURIComponent(group.nodeId)}`}
                className="mb-3 inline-block text-sm font-semibold text-text underline underline-offset-2 hover:text-primary"
              >
                {group.originLabel}
              </Link>
              <ul className="flex flex-col gap-3">
                {group.suggestions.map((suggestion) => (
                  <SuggestionCard key={suggestion.suggestedOrigin.label} suggestion={suggestion} />
                ))}
              </ul>
            </section>
          ))}

          <p className="text-xs text-text-tertiary">{t("discover.sourceNote")}</p>
        </div>
      )}
    </div>
  );
}

export default DiscoverPage;
