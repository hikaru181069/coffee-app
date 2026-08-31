import { useEffect, useState } from "react";
import { fetchAllOriginQuality } from "../api/originQualityApi";

/**
 * CQIデータに含まれる全産地の品質スコアを取得する（World Mapの色分け用）。
 *
 * useOriginQuality.jsと同じ構成（loading/error/dataの3状態、マウント時に
 * 1回だけ取得）。ログインユーザーの記録には依存しないデータだが、
 * WorldMapPage.jsxが色分けモード切り替えのたびに取得し直す必要は無いため、
 * マウント時の1回取得のみでよい。
 */
export const useAllOriginQuality = () => {
  const [origins, setOrigins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchAllOriginQuality({ signal: controller.signal });
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
  }, []);

  return { origins, isLoading, error };
};
