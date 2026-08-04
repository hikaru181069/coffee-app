import { useEffect, useState } from "react";
import { fetchStats } from "../api/statsApi";

/**
 * 統計を取得する。
 *
 * features/insights/hooks/useInsights.js と同じloading/error/dataの3状態
 * 構成。フィルターを持たないため、マウント時に1回だけ取得する。
 */
export const useStats = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        setStats(await fetchStats({ signal: controller.signal }));
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

  return { stats, isLoading, error };
};
