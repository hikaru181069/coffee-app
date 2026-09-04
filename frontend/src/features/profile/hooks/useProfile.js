import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "../../../services/api/userApi";

/**
 * ログイン中ユーザーのプロフィールを取得する。
 *
 * 2026-08、userApi.js が共通クライアント（services/api/httpClient.js）
 * 経由になり AbortSignal を受け取れるようになったため、
 * 他のfeature hook（useCoffeeRecord等）と同じAbortControllerパターンへ
 * 揃えた（以前はcancelledフラグ方式だった）。401（トークン無効）の
 * ハンドリングもapiRequest側で共通化されたため、ここでは行わない。
 *
 * 更新（名前変更・パスワード変更・退会）はここに含めない。取得は
 * このhookの責務、更新後の反映（setUserの呼び出しやトースト表示）は
 * ProfilePage側の責務とする（useCoffeeRecordとRecordDetailPage/
 * RecordFormPageの関係と同じ非対称な設計）。
 */
export const useProfile = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getCurrentUser({ signal: controller.signal });
        setUser(data);
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

  return { user, isLoading, error, reload, setUser };
};
