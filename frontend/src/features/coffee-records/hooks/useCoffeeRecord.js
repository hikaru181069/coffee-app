import { useCallback, useEffect, useState } from "react";
import { fetchCoffeeRecord } from "../api/coffeeRecordApi";

/**
 * 記録を1件取得する。詳細画面と編集画面で使う。
 *
 * recordId が undefined のときは何も取得しない。
 * 編集画面と新規作成画面でフォームを共用しており、
 * 新規作成のときは取得すべき記録が無いため。
 *
 * その「取得すべきものが無い」状態を state に書き込まず、
 * 返す直前に導出している。effect の中で同期的に setState すると
 * 余分な再レンダリングが連鎖するため（React の推奨に反する）。
 */
export const useCoffeeRecord = (recordId) => {
  const [fetched, setFetched] = useState(null);
  const [isFetching, setIsFetching] = useState(Boolean(recordId));
  const [fetchError, setFetchError] = useState(null);

  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    if (!recordId) return undefined;

    // 画面を離れた後に setState しないようにする
    const controller = new AbortController();

    const load = async () => {
      setIsFetching(true);
      setFetchError(null);

      try {
        setFetched(await fetchCoffeeRecord(recordId, { signal: controller.signal }));
      } catch (caught) {
        if (caught.name === "AbortError") return;
        setFetchError(caught);
      } finally {
        if (!controller.signal.aborted) setIsFetching(false);
      }
    };

    load();

    return () => controller.abort();
  }, [recordId, reloadKey]);

  return {
    record: recordId ? fetched : null,
    isLoading: recordId ? isFetching : false,
    error: recordId ? fetchError : null,
    reload,
  };
};
