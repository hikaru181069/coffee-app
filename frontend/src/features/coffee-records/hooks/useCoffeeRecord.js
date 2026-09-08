import { useCallback, useEffect, useState } from "react";
import { deleteCoffeeRecord, fetchCoffeeRecord } from "../api/coffeeRecordApi";

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
 *
 * 削除（deleteRecord）はRecordDetailPage.jsxでしか使わないが、
 * CLAUDE.mdの「pageコンポーネントにAPI通信を置かない」に従い、
 * 記録の取得・書き込みを扱うこのhookへまとめている。
 */
export const useCoffeeRecord = (recordId) => {
  const [fetched, setFetched] = useState(null);
  const [isFetching, setIsFetching] = useState(Boolean(recordId));
  const [fetchError, setFetchError] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  /** 二重送信の防止。削除中にもう一度呼ばれると404が出てしまう */
  const deleteRecord = useCallback(async (targetId) => {
    if (isDeleting) return false;

    setIsDeleting(true);
    try {
      await deleteCoffeeRecord(targetId);
      return true;
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting]);

  return {
    record: recordId ? fetched : null,
    isLoading: recordId ? isFetching : false,
    error: recordId ? fetchError : null,
    reload,
    deleteRecord,
    isDeleting,
  };
};
