import { useCallback, useEffect, useState } from "react";
import { getCurrentUser } from "../../../services/api/userApi";
import { getAuthToken, clearAuthData } from "../../../utils/authStorage";
import { isUnauthorizedError } from "../../../services/api/apiError";

/**
 * ログイン中ユーザーのプロフィールを取得する。
 *
 * userApi.js は AbortSignal を受け取れない生 fetch のため、他の
 * feature hook（useCoffeeRecord 等）のような AbortController ではなく
 * cancelled フラグでアンマウント後の setState を防いでいる。
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
    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getCurrentUser(getAuthToken());
        if (!cancelled) setUser(data);
      } catch (caught) {
        if (cancelled) return;
        if (isUnauthorizedError(caught)) clearAuthData();
        setError(caught);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return { user, isLoading, error, reload, setUser };
};
