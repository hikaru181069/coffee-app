import { useEffect, useState } from "react";
import { fetchCoffeeRecord } from "../../coffee-records/api/coffeeRecordApi";
import { fetchNodeRecords } from "../api/graphApi";

/**
 * 選択中ノードの詳細を取得する。
 *
 * ノードの種類によって取得先を使い分ける
 * （docs/knowledge-graph.md の Interaction）:
 *
 *   record ノード     … Phase 3 の coffeeRecordApi から記録そのものを取得。
 *                        グラフAPIのrecordノードmetadataは recordId/
 *                        consumedAt/rating のみで、notesなどの全項目を
 *                        持たない（backend/core/graph/graphBuilder.js）。
 *                        既存APIと二重に持たせないため、ここで補う。
 *   属性ノード         … グラフAPIの関連記録一覧（fetchNodeRecords）。
 *
 * @param {object|null} selectedNode React Flowのノードオブジェクト
 *   （selectedNode.data が backend の node 形式: {id, type, label, metadata}）
 * @param {object} filters useGraph に渡しているのと同じ絞り込み条件。
 *   画面をカフェ記録だけに絞っているなら、関連記録もその範囲に揃えるため
 */
export const useNodeDetail = (selectedNode, filters) => {
  const [fetched, setFetched] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // filtersはオブジェクトなので、そのまま依存配列に入れると
  // 毎レンダリングで別物と判定され無限に再取得してしまう
  // （features/coffee-records/hooks/useCoffeeRecords.js と同じ理由）
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    // 選択が無いときは何も取得しない。この状態をstateへ書き込まず、
    // 返す直前に導出する（effect内での同期的なsetStateを避けるため。
    // features/coffee-records/hooks/useCoffeeRecord.js と同じ理由）
    if (!selectedNode) return undefined;

    const controller = new AbortController();
    const { type, metadata } = selectedNode.data;

    const load = async () => {
      setIsFetching(true);
      setFetchError(null);

      try {
        if (type === "record") {
          const record = await fetchCoffeeRecord(metadata.recordId, {
            signal: controller.signal,
          });
          setFetched({ kind: "record", record });
        } else {
          const relatedRecords = await fetchNodeRecords(selectedNode.id, JSON.parse(filtersKey), {
            signal: controller.signal,
          });
          setFetched({ kind: "attribute", relatedRecords });
        }
      } catch (caught) {
        if (caught.name === "AbortError") return;
        setFetchError(caught);
      } finally {
        if (!controller.signal.aborted) setIsFetching(false);
      }
    };

    load();

    return () => controller.abort();
  }, [selectedNode, filtersKey]);

  return {
    detail: selectedNode ? fetched : null,
    isLoading: selectedNode ? isFetching : false,
    error: selectedNode ? fetchError : null,
  };
};
