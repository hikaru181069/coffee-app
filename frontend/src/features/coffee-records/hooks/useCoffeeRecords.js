import { useCallback, useEffect, useState } from "react";
import { fetchCoffeeRecords } from "../api/coffeeRecordApi";

/**
 * 記録の一覧を取得する。
 *
 * 画面（RecordsPage）からAPI通信と状態遷移を切り離すためのhook。
 * pageに fetch と useState を直接書くと、読み込み中・空・エラーの
 * 分岐がJSXに混ざって読めなくなる。
 *
 * 状態は loading / error / data の3つだけに絞っている。
 * 「まだ一度も読んでいない」と「読み込み中」を区別する必要が
 * MVPの画面には無いため。
 */
export const useCoffeeRecords = (filters) => {
  const [records, setRecords] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 再取得を画面から呼べるようにする（エラー時の「再試行」、削除後の更新）
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  // filters はオブジェクトなので、依存配列にそのまま入れると
  // 毎レンダリングで別物と判定されて無限に再取得してしまう。
  // 中身を文字列化して比較する
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    // 画面を離れた後にsetStateしないようにする。
    // 連続でフィルターを変えたとき、古いリクエストの結果が
    // 後から届いて新しい結果を上書きするのも防げる
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchCoffeeRecords(JSON.parse(filtersKey), {
          signal: controller.signal,
        });

        setRecords(payload.data);
        setPagination(payload.pagination);
      } catch (caught) {
        if (caught.name === "AbortError") return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, [filtersKey, reloadKey]);

  return { records, pagination, isLoading, error, reload };
};
