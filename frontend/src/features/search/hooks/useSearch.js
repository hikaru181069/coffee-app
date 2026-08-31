import { useEffect, useState } from "react";
import { fetchSearchResults } from "../api/searchApi";

const DEBOUNCE_MS = 300;

/**
 * 横断検索を行う。
 *
 * features/graph/hooks/useGraph.js と同じloading/error/dataの3状態構成に、
 * 入力のたびにAPIを叩かないようデバウンスを足したもの。
 *
 * setStateはすべて`load`（effect内で定義しsetTimeout経由でのみ呼ぶ関数）の
 * 中で行う。effect本体で直接setStateすると
 * react-hooks/set-state-in-effect に引っかかるため
 * （useGraph.js / useInsights.js と同じ、effect内でasync関数を定義して
 * 呼ぶパターンに揃えている）。
 *
 * 2026-08、検索ボックスとフィルターの併用に対応した。filters
 * （RecordsPage.jsxのアクティブなフィルター）が変わったときも、
 * クエリが変わったときと同様に再取得する。filtersはオブジェクトなので、
 * useCoffeeRecords.jsと同じくJSON.stringifyしたものを依存値にする
 * （毎レンダリングで別オブジェクト扱いされ無限に再取得するのを防ぐ）。
 */
export const useSearch = (query, filters = {}) => {
  const [entities, setEntities] = useState([]);
  const [entitiesTruncated, setEntitiesTruncated] = useState(false);
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    const trimmed = query.trim();
    const controller = new AbortController();

    const load = async () => {
      if (!trimmed) {
        setEntities([]);
        setEntitiesTruncated(false);
        setRecords([]);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchSearchResults(trimmed, JSON.parse(filtersKey), {
          signal: controller.signal,
        });
        setEntities(result.entities);
        setEntitiesTruncated(result.entitiesTruncated);
        setRecords(result.records);
      } catch (caught) {
        if (caught.name === "AbortError") return;
        setError(caught);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    const timer = setTimeout(load, trimmed ? DEBOUNCE_MS : 0);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, filtersKey]);

  return { entities, entitiesTruncated, records, isLoading, error };
};
