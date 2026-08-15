import { useCallback, useEffect, useState } from "react";
import { fetchAllDiscoverSuggestions } from "../api/discoverApi";

/**
 * Discover専用ページ用の、条件を満たす産地すべての提案一覧を取得する。
 *
 * features/insights/hooks/useInsights.js と同じ構成（loading/error/dataの
 * 3状態、フィルターを持たずマウント時と`reload()`呼び出し時のみ取得）。
 */
export const useAllDiscoverSuggestions = () => {
  const [origins, setOrigins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchAllDiscoverSuggestions({ signal: controller.signal });
        setOrigins(result.origins);
      } catch (caught) {
        if (caught.name === "AbortError") return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { origins, isLoading, error, reload };
};
