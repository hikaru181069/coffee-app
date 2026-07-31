import { useCallback, useEffect, useState } from "react";
import { fetchGraph } from "../api/graphApi";

/**
 * 知識グラフを取得する。
 *
 * features/coffee-records/hooks/useCoffeeRecords.js と同じ構成:
 * loading/error/dataの3状態のみを持ち、AbortControllerで
 * 画面離脱・連続フィルター変更時の古いレスポンス上書きを防ぐ。
 */
export const useGraph = (filters) => {
  const [graph, setGraph] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        setGraph(await fetchGraph(JSON.parse(filtersKey), { signal: controller.signal }));
      } catch (caught) {
        if (caught.name === "AbortError") return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [filtersKey, reloadKey]);

  return { graph, isLoading, error, reload };
};
