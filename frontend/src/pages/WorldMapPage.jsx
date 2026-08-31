import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGraph } from "../features/graph/hooks/useGraph";
import { GraphErrorState } from "../features/graph/components/GraphStates";
import { getNodeVisual } from "../features/graph/utils/nodeVisuals";
import { getOriginAccentClass } from "../features/coffee-records/utils/originAccent";
import { buildVisitedByNumericId } from "../features/map/utils/visitedOrigins";
import { buildQualityByNumericId } from "../features/map/utils/originQualityMap";
import WorldMap from "../features/map/components/WorldMap";
import WorldMapLegend from "../features/map/components/WorldMapLegend";
import WorldMapSkeleton from "../features/map/components/WorldMapSkeleton";
import BackLink from "../components/BackLink";
import StatCard from "../components/StatCard";
import { useMasterData } from "../features/coffee-records/hooks/useMasterData";
import { useAllOriginQuality } from "../features/originQuality/hooks/useAllOriginQuality";
import { cardClass, primaryButtonClass } from "../features/coffee-records/components/formStyles";
import { contentContainerClass } from "../styles/pageContainer";

/** 地図の色分けモード切り替え。LanguageSwitcher.jsxと同じ見た目の2択トグル */
function ColorModeToggle({ mode, onChange, t }) {
  const MODES = [
    { value: "visited", labelKey: "map.colorModeVisited" },
    { value: "quality", labelKey: "map.colorModeQuality" },
  ];

  return (
    <div
      role="group"
      aria-label={t("map.colorModeAriaLabel")}
      className="inline-flex overflow-hidden rounded-full border border-surface-3 text-xs font-semibold"
    >
      {MODES.map(({ value, labelKey }) => {
        const isActive = mode === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            aria-pressed={isActive}
            className={`px-2.5 py-1.5 transition-colors duration-150 ${
              isActive
                ? "bg-inverse text-on-inverse"
                : "text-text-secondary hover:bg-surface-1/60 hover:text-text"
            }`}
          >
            {t(labelKey)}
          </button>
        );
      })}
    </div>
  );
}

const MAP_FILTERS = { nodeTypes: ["origin"], recordType: "", ratingMin: "" };

/**
 * 世界地図ページ。自分が記録した産地を世界地図上でハイライトする。
 *
 * 2026-08、「産地によってコーヒーのキャラクターが変わる」という理由から、
 * 産地にフォーカスした機能群の第一歩として追加した（docs/mvp.mdでは
 * MVP当時のOut of Scopeだったが、MVP完了後のPost-MVP機能として
 * Diagnosis・Discover等と同じ扱いにする）。
 *
 * docs/design.mdの「ナビ項目は4つと少なく保つ方針」を踏襲し、常設ナビ
 * には追加しない（Diagnosisと同じ扱い）。Statsページの「Collection」
 * セクションからのリンクでのみ到達する。
 *
 * 専用のAPIは持たず、既存のGET /api/graph?nodeTypes=originをそのまま
 * 使う（グラフは都度計算する、docs/knowledge-graph.mdの方針と同じで
 * 世界地図専用のデータも持たない）。
 *
 * 2026-08、「地図しか無く寂しい」という指摘を受け、(1)訪れた産地数の
 * サマリー（StatCard、Stats/EntityDetailと同じ意匠）と(2)訪れた産地の
 * 一覧（EntityDetailPage.jsxのRelatedAttributeGroupと同じチップ）を
 * 追加した。産地の総数（分母）は記録済みデータからは分からないため、
 * フォームの選択肢取得と同じuseMasterDataを再利用する。マスターデータの
 * 取得は「失敗しても致命的ではない」設計（useMasterData.js参照）のため、
 * 読み込み中・失敗時は分母を省き訪問数だけを表示する（地図本体の表示を
 * ブロックしない）。Discoverの産地提案とは役割が重複しないよう、
 * ここでは記録済みデータの集計のみに留める（docs/features.md「World Map」
 * 「Discover」参照）。
 *
 * 一覧の各チップには、地図の塗り色と同じ`getOriginAccentClass`（産地名
 * からのハッシュで決まる固定パレット）の小さな点を添えている。地図上の
 * 色と一覧の色が同じ産地なら常に一致するため、地図で見た色を手がかりに
 * 一覧から該当の産地を探せる（この対応は「訪問状況」モードの話。下記の
 * 「品質スコア」モードでは一覧側の色は変えない。単なる産地一覧として
 * 一貫性を保つほうを優先した）。
 *
 * 2026-08、読み込み中の表示はGraph画面の`GraphLoadingState`（円+線を
 * 模した知識グラフ専用の骨格）を流用していたが、地図・サマリー・産地
 * 一覧という実際の構成と見た目が違いすぎるという指摘を受け、専用の
 * `WorldMapSkeleton`を新設した。エラー表示（`GraphErrorState`）はグラフ
 * 形状に依存しない汎用的な見た目のため、そのまま流用している。
 *
 * 2026-08、産地フォーカス機能群の続きとして「品質スコアで色分け」モードを
 * 追加した（docs/features.md「Origin Quality」参照）。CQIデータは
 * ログインユーザーの記録に依存しない静的データのため、`useAllOriginQuality`
 * は`useGraph`の読み込み状態とは独立にマウント時へ1回だけ取得する
 * （取得中・失敗時は品質スコアモードに切り替えても単に色が付かないだけで、
 * 地図本体の表示（訪問状況モード）をブロックしない。useMasterDataと
 * 同じ「失敗しても致命的ではない」設計）。
 */
function WorldMapPage() {
  const { t } = useTranslation();
  const { graph, isLoading, error, reload } = useGraph(MAP_FILTERS);
  const { masterData, isLoading: isMasterDataLoading } = useMasterData();
  const { origins: qualityOrigins } = useAllOriginQuality();
  const originVisual = getNodeVisual("origin");
  const [colorMode, setColorMode] = useState("visited");

  const visitedByNumericId = useMemo(() => {
    if (!graph) return new Map();
    const originNodes = graph.nodes.filter((node) => node.type === "origin");
    return buildVisitedByNumericId(originNodes);
  }, [graph]);

  const qualityByNumericId = useMemo(() => buildQualityByNumericId(qualityOrigins), [qualityOrigins]);

  const visitedOrigins = useMemo(
    () =>
      Array.from(visitedByNumericId.values()).sort(
        (a, b) => b.recordCount - a.recordCount || a.label.localeCompare(b.label),
      ),
    [visitedByNumericId],
  );

  const totalOriginCount = !isMasterDataLoading && masterData.origins.length > 0 ? masterData.origins.length : null;

  const renderBody = () => {
    if (isLoading) return <WorldMapSkeleton />;
    if (error) return <GraphErrorState error={error} onRetry={reload} />;

    if (visitedByNumericId.size === 0) {
      return (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line/60 px-6 py-12 text-center">
          <Globe size={32} aria-hidden="true" className="text-text-tertiary" strokeWidth={1.5} />
          <div>
            <p className="text-sm font-medium text-text">{t("map.emptyTitle")}</p>
            <p className="mt-1 text-sm italic text-text-tertiary">{t("map.emptyDesc")}</p>
          </div>
          <Link to="/records/new" className={`${primaryButtonClass} mt-1`}>
            {t("records.emptyCta")}
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className={cardClass}>
          <div className="flex flex-wrap gap-3">
            <StatCard
              label={t("map.visitedStat")}
              value={totalOriginCount != null ? `${visitedByNumericId.size} / ${totalOriginCount}` : `${visitedByNumericId.size}`}
              icon={originVisual.icon}
              iconColorClass={originVisual.colorClass}
              iconBgClass={originVisual.bgTintClass}
              flat
            />
          </div>
        </div>

        <div className={cardClass}>
          <div className="mb-4 flex justify-end">
            <ColorModeToggle mode={colorMode} onChange={setColorMode} t={t} />
          </div>
          <WorldMap
            visitedByNumericId={visitedByNumericId}
            colorMode={colorMode}
            qualityByNumericId={qualityByNumericId}
          />
          <div className="mt-4">
            <WorldMapLegend colorMode={colorMode} />
          </div>
        </div>

        <section className={cardClass}>
          <h2 className="text-base font-semibold text-text">{t("map.visitedOriginsHeading")}</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {visitedOrigins.map((item) => (
              <Link
                key={item.id}
                to={`/entities/${encodeURIComponent(item.id)}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-surface-1 px-3.5 py-1.5 text-sm text-text-secondary transition-all duration-150 hover:-translate-y-px hover:border-line/60 hover:bg-surface-2 hover:text-text"
              >
                <span
                  aria-hidden="true"
                  className={`h-2 w-2 flex-shrink-0 rounded-full ${getOriginAccentClass(item.label)}`}
                />
                {item.label}
                <span className="font-mono text-xs text-text-tertiary">{item.recordCount}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  };

  return (
    <div className={contentContainerClass}>
      {/* fallbackは、URL直接アクセス等で戻れる履歴が無い場合の行き先。
          Statsページの「Collection」セクションからのリンクでのみ到達する
          ため、Statsを自然な既定値にする */}
      <BackLink fallback="/stats" />
      <header className="mt-3">
        <h1 className="text-xl font-bold text-text">{t("map.title")}</h1>
        <p className="mt-1 text-sm text-text-tertiary">{t("map.subtitle")}</p>
      </header>

      <div className="mt-6">{renderBody()}</div>
    </div>
  );
}

export default WorldMapPage;
