import { useEffect, useState } from "react";
import { fetchAllMasterData } from "../api/masterDataApi";

const EMPTY_MASTER_DATA = {
  origins: [],
  varieties: [],
  processes: [],
  roastLevels: [],
  flavors: [],
};

/**
 * フォームの選択肢（マスターデータ）を取得する。
 *
 * 失敗しても致命的ではない扱いにしている。
 * 選択肢が読めなくても、タイトル・日付・記録タイプ・評価・メモは
 * 入力できるので、記録そのものは残せる。
 * 「Record First」（docs/product-principles.md）の考え方に沿って、
 * まず記録を完了できることを優先する。
 */
export const useMasterData = () => {
  const [masterData, setMasterData] = useState(EMPTY_MASTER_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        setMasterData(await fetchAllMasterData({ signal: controller.signal }));
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

  return { masterData, isLoading, error };
};
