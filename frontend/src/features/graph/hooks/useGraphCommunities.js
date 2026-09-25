import { useEffect, useState } from "react";
import { fetchGraphCommunities } from "../api/graphApi";

/**
 * 知識グラフのコミュニティ検出結果を取得する。
 *
 * useGraph.jsと同じloading/error/dataの3状態構成だが、フィルターを
 * 引数に取らない（グラフ画面のフィルター状態とは独立に、自分の記録
 * 全体についての結果を1回だけ取得する）。
 *
 * DiscoverSuggestions等と同じ「静かな道具」の方針
 * （docs/features.md「Similar Records」参照）: エラー時も画面を壊す
 * ようなエラー表示はせず、呼び出し側が「候補が無い」のと同じ扱いで
 * 何も表示しなければよい。
 */
export const useGraphCommunities = () => {
  const [communities, setCommunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        const data = await fetchGraphCommunities({ signal: controller.signal });
        setCommunities(data.communities);
      } catch (caught) {
        if (caught.name === "AbortError") return;
        // FastAPI側で既に失敗を吸収して空配列を返す設計だが、
        // ネットワーク自体の失敗（backend応答不可等）はここでも起こりうる。
        // 静かな道具の方針として、エラー状態は持たず「無かった」ことにする。
        setCommunities([]);
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    };

    load();

    return () => controller.abort();
  }, []);

  return { communities, isLoading };
};
