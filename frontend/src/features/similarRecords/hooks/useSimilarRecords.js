import { useEffect, useState } from "react";
import { fetchSimilarRecords } from "../api/similarRecordsApi";

/**
 * 指定した記録に似た記録の一覧を取得する。
 *
 * features/discover/hooks/useOriginDiscovery.js と同じ構成（loading/error/
 * dataの3状態、マウント時に1回だけ取得）。
 */
export const useSimilarRecords = (recordId) => {
  const [similarRecords, setSimilarRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchSimilarRecords(recordId, { signal: controller.signal });
        setSimilarRecords(result.similarRecords);
      } catch (caught) {
        if (caught.name === "AbortError") return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [recordId]);

  return { similarRecords, isLoading, error };
};
