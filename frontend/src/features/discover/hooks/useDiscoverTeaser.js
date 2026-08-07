import { useEffect, useState } from "react";
import { fetchDiscoverTeaser } from "../api/discoverApi";

/**
 * Home画面用のDiscover導線（全産地横断で1件）を取得する。
 *
 * features/insights/hooks/useInsights.js と同じ構成（loading/error/dataの
 * 3状態、フィルターを持たずマウント時に1回だけ取得）。
 */
export const useDiscoverTeaser = () => {
  const [teaser, setTeaser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchDiscoverTeaser({ signal: controller.signal });
        setTeaser(result.teaser);
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

  return { teaser, isLoading, error };
};
