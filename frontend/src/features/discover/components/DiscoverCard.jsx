import { Link } from "react-router-dom";
import { Sparkles, Compass } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useInsights } from "../../insights/hooks/useInsights";
import { describeInsight } from "../../insights/utils/describeInsight";
import { useDiscoverTeaser } from "../hooks/useDiscoverTeaser";

/**
 * Home画面の「Discover」カード。
 *
 * 2026-08、以前は別々の要素だった InsightBanner（Insightの一文）と
 * DiscoverTeaserLink（Discoverの導線）を、1枚のカードへ視覚的に統合した
 * （ユーザーと相談して決定）。
 *
 * 統合するのは見せ方だけで、裏側のデータ・ロジックは今まで通り完全に
 * 独立している:
 *   - Insight行は useInsights（core/insights/insightBuilder.js、
 *     MongoDBのCoffeeRecordのみが正、docs/insights.md）
 *   - Discover行は useDiscoverTeaser（core/discover/discoverBuilder.js、
 *     CoffeeRecord + 静的CQIデータが正、docs/features.md「Discover」）
 * `docs/insights.md`の「Source of Truth: MongoDBのCoffeeRecordとマスター
 * データを正とする」という記述は、あくまでInsightの6種別の計算ロジック
 * （insightBuilder.js）についての記述であり、この2つを画面上どこに
 * 並べて表示するかとは別の話のため、矛盾しない。
 *
 * 見出し「Discover」は、LandingPageの「Record / Connect / Discover」と
 * 同じ言語非依存のブランド語として扱い、翻訳しない
 * （IMPLEMENTATION.mdのi18n対応エントリ参照）。docs/vision.mdの3本柱の
 * うち、認証後の画面に一度も出てこなかった"Discover"という言葉を、
 * ここで初めて可視化する狙いもある。
 *
 * Insight行・Discover行のどちらか一方だけでも表示する。両方とも無い
 * （読み込み中・エラー含む）ときはカード自体を表示しない
 * （GraphPreview.jsxと同じ「静かな道具」の方針）。
 *
 * 2026-08、一時期はDiscover行のリンク先を専用の一覧ページ（`/discover`）
 * にしていたが、実データで検証したところ条件を満たす産地グループは
 * デモデータでもせいぜい2件程度で、「複数産地を横断して比較する」という
 * 専用ページ固有の価値がほとんど発揮されないと判断し、`/discover`
 * ページ自体を削除した（ユーザーと相談して決定。IMPLEMENTATION.md
 * 参照）。Discover行のリンク先は、提案の根拠になった産地（例: Guatemala）
 * のEntity Detailページ（`/entities/${teaser.nodeId}`）へ戻し、そこに
 * 既に埋め込み表示されている`DiscoverSuggestions`で同じ提案を見せる形に
 * 一本化した。
 */
function DiscoverCard() {
  const { t } = useTranslation();
  const { insights, isLoading: insightsLoading, error: insightsError } = useInsights();
  const { teaser, isLoading: teaserLoading, error: teaserError } = useDiscoverTeaser();

  const insightText =
    !insightsLoading && !insightsError && insights.length > 0 ? describeInsight(insights[0], t) : null;
  const hasTeaser = !teaserLoading && !teaserError && Boolean(teaser);

  if (!insightText && !hasTeaser) return null;

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-surface-2 bg-raised p-6 shadow-elevated">
      <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">Discover</span>

      <div className="flex flex-1 flex-col justify-center gap-3">
        {insightText && (
          <Link
            to="/graph"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-surface-1/60"
          >
            <Sparkles size={22} aria-hidden="true" className="flex-shrink-0 text-text-secondary" />
            <p className="text-base text-text">{insightText}</p>
          </Link>
        )}

        {hasTeaser && (
          <Link
            to={`/entities/${encodeURIComponent(teaser.nodeId)}`}
            className="flex items-center gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-surface-1/60"
          >
            <Compass size={22} aria-hidden="true" className="flex-shrink-0 text-success" />
            <p className="text-base text-text">
              {t("discover.teaserLink", { suggestedLabel: teaser.suggestedOrigin.label })}
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}

export default DiscoverCard;
