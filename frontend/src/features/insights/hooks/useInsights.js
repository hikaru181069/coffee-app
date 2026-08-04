import { useEffect, useState } from "react";
import { fetchInsights } from "../api/insightApi";

/**
 * Insightを取得する。
 *
 * features/graph/hooks/useGraph.js と同じ構成だが、フィルターを持たない
 * ため再読み込み用のreload/filtersKeyは無く、マウント時に1回だけ取得する。
 */
export const useInsights = () => {
  const [insights, setInsights] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchInsights({ signal: controller.signal });
        setInsights(result.insights);
      } catch (caught) {
        if (caught.name === "AbortError") return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, []);

  return { insights, isLoading, error };
};
