import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

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
import { getErrorMessage } from "../utils/errorMessage";

/**
 * プロフィール画面。
 *
 * MVPでは「名前の変更」「パスワード変更」「退会」だけを持つ、最小限の
 * アカウント設定画面にしている。docs/mvp.md にプロフィール編集は
 * 明記されていないが、既存の認証構成（mlb-appから再利用）が持つ
 * これらのAPIはコーヒードメインに固有の要素を含まず、そのまま使える
 * ため、書き直さず再利用している。
 *
 * 技術スタックの表示とクレジット表記は、以前はログイン後の全ページ下部に
 * 常時出るフッターだった。docs/design.mdの「派手な実績表示で惹きつけない、
 * 道具としての静けさ」という方針と噛み合わないという指摘を受け、
 * 見たい人が能動的にたどり着く場所であるProfile画面の末尾へ移した。
 */
const TECH_STACK = ["MongoDB", "Express", "React", "Node.js", "FastAPI", "JWT"];

function ProfilePage() {
  const { t } = useTranslation();
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
      .catch((error) => addToast(getErrorMessage(error, t), "error"));
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
      addToast(t("profile.toastNameUpdated"), "success");
    } catch (error) {
      addToast(getErrorMessage(error, t), "error");
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
      addToast(t("profile.toastPasswordChanged"), "success");
    } catch (error) {
      addToast(getErrorMessage(error, t), "error");
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
      addToast(getErrorMessage(error, t), "error");
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
          <FormField id="profile-name" label={t("profile.name")} required>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={isSavingName}
              className={controlClass(false)}
            />
          </FormField>

          <FormField id="profile-email" label={t("profile.email")}>
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
              {isSavingName ? t("common.saving") : t("profile.saveName")}
            </button>
          </div>
        </form>
      </section>

      <section className={`${cardClass} mt-4`}>
        <h2 className="text-sm font-semibold text-ctp-text">{t("profile.changePasswordHeading")}</h2>
        <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-4">
          <FormField id="current-password" label={t("profile.currentPassword")} required>
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

          <FormField id="new-password" label={t("profile.newPassword")} required hint={t("profile.newPasswordHint")}>
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
              {isChangingPassword ? t("profile.changingPassword") : t("profile.changePasswordButton")}
            </button>
          </div>
        </form>
      </section>

      <section className={`${cardClass} mt-4 border-ctp-red/30`}>
        <h2 className="text-sm font-semibold text-ctp-red">{t("profile.deleteAccountHeading")}</h2>
        <p className="mt-1 text-xs text-ctp-subtext0">
          {t("profile.deleteAccountWarning")}
        </p>
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          className={`${dangerButtonClass} mt-3`}
        >
          {t("profile.deleteAccountButton")}
        </button>
      </section>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={t("profile.confirmDeleteTitle")}
        description={t("profile.confirmDeleteDescription")}
        isProcessing={isDeleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <div className="mt-8 flex flex-col items-center gap-3 border-t border-ctp-surface1 pt-6 pb-2">
        <div className="footer-stack">
          {TECH_STACK.map((tech) => (
            <span key={tech} className="footer-badge">{tech}</span>
          ))}
        </div>
        <p className="footer-credit">Built by Hikaru · MERN Portfolio</p>
      </div>
    </div>
  );
}

export default ProfilePage;
