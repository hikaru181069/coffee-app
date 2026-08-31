import { useEffect, useState } from "react";
import { fetchOriginQuality } from "../api/originQualityApi";

/**
 * 産地の品質スコアを取得する。
 *
 * features/discover/hooks/useOriginDiscovery.js と同じ構成（loading/error/
 * dataの3状態、マウント時に1回だけ取得）。呼び出し側（EntityDetailPage.jsx）は
 * type === "origin" のときだけこのフックを使うコンポーネントを描画するため、
 * nodeId は常に渡される前提（無い場合のガードは持たない）。
 */
export const useOriginQuality = (nodeId) => {
  const [scores, setScores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchOriginQuality(nodeId, { signal: controller.signal });
        setScores(result.scores);
      } catch (caught) {
        if (caught.name === "AbortError") return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [nodeId]);

  return { scores, isLoading, error };
};
