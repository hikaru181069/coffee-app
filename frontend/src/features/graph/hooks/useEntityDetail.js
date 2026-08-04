import { useEffect, useState } from "react";
import { fetchNodeDetail } from "../api/graphApi";

/**
 * エンティティ詳細ページ用のデータ取得。
 *
 * useNodeDetail.js（Graph画面のサイドパネル用。関連記録一覧だけを持つ）とは
 * 別の、より詳しい情報（統計・全種別の関連属性ランキング・関連記録）を返す
 * 新しいエンドポイント（GET /graph/nodes/:nodeId）を使う。
 *
 * features/graph/hooks/useGraph.js と同じloading/error/dataの3状態構成。
 */
export const useEntityDetail = (nodeId) => {
  const [detail, setDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        setDetail(await fetchNodeDetail(nodeId, { signal: controller.signal }));
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

  return { detail, isLoading, error };
};
