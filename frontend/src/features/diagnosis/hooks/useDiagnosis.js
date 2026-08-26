import { useCallback, useEffect, useState } from "react";
import { fetchDiagnosis } from "../api/diagnosisApi";

/**
 * コーヒー診断を取得する。
 *
 * features/stats/hooks/useStats.js と同じ構成（マウント時と`reload()`
 * 呼び出し時に取得、dataの初期値はnull）。フィルターは持たない。
 */
export const useDiagnosis = () => {
  const [diagnosis, setDiagnosis] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        setDiagnosis(await fetchDiagnosis({ signal: controller.signal }));
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

  return { diagnosis, isLoading, error, reload };
};
