import { useCallback, useEffect, useState } from "react";
import { changePassword, deleteAccount, getCurrentUser, updateProfile } from "../api/userApi";
import { saveAuthUserName } from "../../../utils/authStorage";

/**
 * ログイン中ユーザーのプロフィールの取得・更新をまとめて扱う。
 *
 * 2026-08、userApi.js が共通クライアント（services/api/httpClient.js）
 * 経由になり AbortSignal を受け取れるようになったため、
 * 他のfeature hook（useCoffeeRecord等）と同じAbortControllerパターンへ
 * 揃えた（以前はcancelledフラグ方式だった）。401（トークン無効）の
 * ハンドリングもapiRequest側で共通化されたため、ここでは行わない。
 *
 * 2026-09、名前変更・パスワード変更・退会のAPI呼び出しもこのhookへ
 * 移した。features/coffee-records/hooks/useCoffeeRecord.js の
 * deleteRecord と同じ形（呼び出し中フラグ+API呼び出し+finally）。
 * ページ側は成功/失敗に応じたトースト表示・フォームリセット・navigateだけを行う。
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

  // 各書き込み系関数の「呼び出し中なら早期return」は、useCoffeeRecord.js の
  // deleteRecord と同じ二重送信防止（保存/削除ボタンのdisabledだけに頼ると、
  // Enterキーでの送信や連打で通り抜けることがある）
  const [isSavingName, setIsSavingName] = useState(false);
  const updateName = useCallback(async (name) => {
    if (isSavingName) return null;

    setIsSavingName(true);
    try {
      const updated = await updateProfile({ name });
      setUser(updated);
      // Navbar.jsxのユーザー名表示はlocalStorageから読むため、こちらも更新する
      saveAuthUserName(updated.name);
      return updated;
    } finally {
      setIsSavingName(false);
    }
  }, [isSavingName]);

  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const changeUserPassword = useCallback(async (passwordForm) => {
    if (isChangingPassword) return;

    setIsChangingPassword(true);
    try {
      await changePassword(passwordForm);
    } finally {
      setIsChangingPassword(false);
    }
  }, [isChangingPassword]);

  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const deleteUserAccount = useCallback(async () => {
    if (isDeletingAccount) return;

    setIsDeletingAccount(true);
    try {
      await deleteAccount();
    } finally {
      setIsDeletingAccount(false);
    }
  }, [isDeletingAccount]);

  return {
    user,
    isLoading,
    error,
    reload,
    updateName,
    isSavingName,
    changePassword: changeUserPassword,
    isChangingPassword,
    deleteAccount: deleteUserAccount,
    isDeletingAccount,
  };
};
