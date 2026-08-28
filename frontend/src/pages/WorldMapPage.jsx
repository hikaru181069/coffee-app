import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGraph } from "../features/graph/hooks/useGraph";
import { GraphErrorState, GraphLoadingState } from "../features/graph/components/GraphStates";
import { buildVisitedByNumericId } from "../features/map/utils/visitedOrigins";
import WorldMap from "../features/map/components/WorldMap";
import WorldMapLegend from "../features/map/components/WorldMapLegend";
import BackLink from "../components/BackLink";
import { primaryButtonClass } from "../features/coffee-records/components/formStyles";
import { contentContainerClass } from "../styles/pageContainer";

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
 */
function WorldMapPage() {
  const { t } = useTranslation();
  const { graph, isLoading, error, reload } = useGraph(MAP_FILTERS);

  const visitedByNumericId = useMemo(() => {
    if (!graph) return new Map();
    const originNodes = graph.nodes.filter((node) => node.type === "origin");
    return buildVisitedByNumericId(originNodes);
  }, [graph]);

  const renderBody = () => {
    if (isLoading) return <GraphLoadingState />;
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
      <div className="rounded-2xl border border-surface-2 bg-raised p-4 shadow-elevated sm:p-6">
        <WorldMap visitedByNumericId={visitedByNumericId} />
        <div className="mt-4">
          <WorldMapLegend />
        </div>
      </div>
    );
  };

  return (
    <div className={contentContainerClass}>
      <BackLink />
      <header className="mt-3">
        <h1 className="text-xl font-bold text-text">{t("map.title")}</h1>
        <p className="mt-1 text-sm text-text-tertiary">{t("map.subtitle")}</p>
      </header>

      <div className="mt-6">{renderBody()}</div>
    </div>
  );
}

export default WorldMapPage;
