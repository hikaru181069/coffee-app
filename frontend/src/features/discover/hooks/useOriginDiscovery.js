import { useEffect, useState } from "react";
import { fetchOriginDiscovery } from "../api/discoverApi";

/**
 * Discoverの提案を取得する。
 *
 * features/insights/hooks/useInsights.js と同じ構成（loading/error/dataの
 * 3状態、マウント時に1回だけ取得）。呼び出し側（EntityDetailPage.jsx）は
 * type === "origin" のときだけこのフックを使うコンポーネントを描画するため、
 * nodeId は常に渡される前提（無い場合のガードは持たない）。
 */
export const useOriginDiscovery = (nodeId) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchOriginDiscovery(nodeId, { signal: controller.signal });
        setSuggestions(result.suggestions);
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

  return { suggestions, isLoading, error };
};
