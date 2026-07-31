import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../features/coffee-records/coffee-records.css";
import { changePassword, deleteAccount, getCurrentUser, updateProfile } from "../services/api/userApi";
import { clearAuthData, getAuthToken, saveAuthUserName } from "../utils/authStorage";
import FormField from "../features/coffee-records/components/FormField";
import ConfirmDialog from "../features/coffee-records/components/ConfirmDialog";
import {
  cardClass,
  controlClass,
  dangerButtonClass,
  primaryButtonClass,
} from "../features/coffee-records/components/formStyles";
import { useToast } from "../contexts/ToastContext";

/**
 * プロフィール画面。
 *
 * MVPでは「名前の変更」「パスワード変更」「退会」だけを持つ、最小限の
 * アカウント設定画面にしている。docs/mvp.md にプロフィール編集は
 * 明記されていないが、既存の認証構成（mlb-appから再利用）が持つ
 * これらのAPIはコーヒードメインに固有の要素を含まず、そのまま使える
 * ため、書き直さず再利用している。
 */
function ProfilePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const token = getAuthToken();

  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    getCurrentUser(token)
      .then((data) => {
        setUser(data);
        setName(data.name);
      })
      .catch((error) => addToast(error.message, "error"));
    // 初回読み込みのみ。addToastは毎レンダリングで新しい参照になり得るため依存に含めない
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleSaveName = async (event) => {
    event.preventDefault();
    if (isSavingName || !name.trim()) return;

    setIsSavingName(true);
    try {
      const updated = await updateProfile({ name: name.trim() }, token);
      setUser(updated);
      saveAuthUserName(updated.name);
      addToast("名前を更新しました", "success");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    if (isChangingPassword) return;

    setIsChangingPassword(true);
    try {
      await changePassword(passwordForm, token);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      addToast("パスワードを変更しました", "success");
    } catch (error) {
      addToast(error.message, "error");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteAccount(token);
      clearAuthData();
      navigate("/login", { replace: true });
    } catch (error) {
      addToast(error.message, "error");
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };

  if (!user) return null;

  return (
    <div className="coffee-page mx-auto w-full max-w-xl px-4 py-6 sm:px-6">
      <h1 className="text-xl font-bold text-ctp-text">Profile</h1>

      <section className={`${cardClass} mt-5`}>
        <form onSubmit={handleSaveName} className="flex flex-col gap-4">
          <FormField id="profile-name" label="名前" required>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSavingName}
              className={controlClass(false)}
            />
          </FormField>

          <FormField id="profile-email" label="メールアドレス">
            <input
              id="profile-email"
              type="email"
              value={user.email}
              disabled
              className={controlClass(false)}
            />
          </FormField>

          <div>
            <button type="submit" disabled={isSavingName} className={primaryButtonClass}>
              {isSavingName ? "保存中..." : "名前を保存"}
            </button>
          </div>
        </form>
      </section>

      <section className={`${cardClass} mt-4`}>
        <h2 className="text-sm font-semibold text-ctp-text">パスワードを変更</h2>
        <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-4">
          <FormField id="current-password" label="現在のパスワード" required>
            <input
              id="current-password"
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
              }
              disabled={isChangingPassword}
              className={controlClass(false)}
            />
          </FormField>

          <FormField id="new-password" label="新しいパスワード" required hint="6文字以上">
            <input
              id="new-password"
              type="password"
              value={passwordForm.newPassword}
              onChange={(event) =>
                setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
              }
              disabled={isChangingPassword}
              className={controlClass(false)}
            />
          </FormField>

          <div>
            <button type="submit" disabled={isChangingPassword} className={primaryButtonClass}>
              {isChangingPassword ? "変更中..." : "パスワードを変更"}
            </button>
          </div>
        </form>
      </section>

      <section className={`${cardClass} mt-4 border-ctp-red/30`}>
        <h2 className="text-sm font-semibold text-ctp-red">アカウントを削除</h2>
        <p className="mt-1 text-xs text-ctp-subtext0">
          自分の記録もすべて削除されます。この操作は取り消せません。
        </p>
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          className={`${dangerButtonClass} mt-3`}
        >
          アカウントを削除する
        </button>
      </section>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title="アカウントを削除しますか？"
        description="すべてのコーヒー記録とアカウント情報が完全に削除されます。この操作は取り消せません。"
        isProcessing={isDeleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

export default ProfilePage;
