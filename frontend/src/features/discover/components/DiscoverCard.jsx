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
 *     CoffeeRecord + 静的CQIデータが正、docs/discover.md）
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
 * 2026-08、Discover行のリンク先を、提案の根拠になった産地（例: Guatemala）
 * のEntity Detailページから、Discover専用ページ（`/discover`、
 * `pages/DiscoverPage.jsx`）へ変更した。以前は「話題になっている産地
 * （例: Costa Rica）ではなく、提案の根拠になった産地のページに飛ぶ」
 * という遠回りな導線になっていたため。一度は別に「すべて見る」リンクを
 * 追加して補っていたが、ユーザーから「Discover行自体を`/discover`への
 * 導線にすれば、別リンクは不要」という指摘を受け、Discover行のリンク先を
 * 差し替えて「すべて見る」リンクは削除した。
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
    <div className="flex h-full flex-col gap-4 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-6">
      <span className="text-xs font-semibold uppercase tracking-wide text-ctp-subtext0">Discover</span>

      <div className="flex flex-1 flex-col justify-center gap-3">
        {insightText && (
          <Link
            to="/graph"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-ctp-surface0/60"
          >
            <Sparkles size={22} aria-hidden="true" className="flex-shrink-0 text-ctp-mauve" />
            <p className="text-base text-ctp-text">{insightText}</p>
          </Link>
        )}

        {hasTeaser && (
          <Link
            to="/discover"
            className="flex items-center gap-3 rounded-lg p-2 transition-colors duration-150 hover:bg-ctp-surface0/60"
          >
            <Compass size={22} aria-hidden="true" className="flex-shrink-0 text-ctp-green" />
            <p className="text-base text-ctp-text">
              {t("discover.teaserLink", { suggestedLabel: teaser.suggestedOrigin.label })}
            </p>
          </Link>
        )}
      </div>
    </div>
  );
}

export default DiscoverCard;
