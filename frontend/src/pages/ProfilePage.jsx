import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { changePassword, deleteAccount, updateProfile } from "../services/api/userApi";
import { clearAuthData, getAuthToken, saveAuthUserName } from "../utils/authStorage";
import { useProfile } from "../features/profile/hooks/useProfile";
import ProfileSkeleton from "../features/profile/components/ProfileSkeleton";
import LanguageSwitcher from "../components/LanguageSwitcher";
import FormField from "../features/coffee-records/components/FormField";
import ConfirmDialog from "../features/coffee-records/components/ConfirmDialog";
import { RecordsErrorState } from "../features/coffee-records/components/RecordListStates";
import { controlClass, dangerButtonClass, primaryButtonClass } from "../features/coffee-records/components/formStyles";
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
 * 2026-08、カードを積み重ねる構成から、RecordDetailPage/StatsPageと
 * 同じ「header → divide-yで区切ったsection群」の1本の縦の流れへ
 * 再設計した。取得ロジックは features/profile/hooks/useProfile.js へ
 * 切り出し、ローディング/エラー状態も他の詳細系ページと同じ
 * ProfileSkeleton / RecordsErrorState を使う形に揃えた。email欄は
 * 編集不可のため、FormField（必須/任意バッジ付き）ではなく
 * RecordDetailPageのProperty Gridと同じ dt/dd の読み取り専用表示にした。
 *
 * 技術スタックの表示とクレジット表記は、以前はログイン後の全ページ下部に
 * 常時出るフッターだった。docs/design.mdの「派手な実績表示で惹きつけない、
 * 道具としての静けさ」という方針と噛み合わないという指摘を受け、
 * 見たい人が能動的にたどり着く場所であるProfile画面の末尾へ移した。
 *
 * 言語切り替え（LanguageSwitcher）も、以前は常時表示のNavbarに置いていたが、
 * 同じ理由でProfile画面の先頭セクションへ移した。未ログイン状態（/login・
 * /register）では切り替えられなくなるが、ユーザーと相談の上、許容する
 * トレードオフとした（LandingPageには専用のLanguageSwitcherが別途あるため、
 * ログイン前の訪問者が最初に触れる画面では引き続き切り替えられる）。
 */
const TECH_STACK = ["MongoDB", "Express", "React", "Node.js", "FastAPI", "JWT"];

function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const token = getAuthToken();

  const { user, isLoading, error, reload, setUser } = useProfile();

  const [name, setName] = useState("");
  // useProfileが取得・reload・保存成功のたびに返す新しいuserを検知して
  // nameへ同期する（レンダー中にstateを更新する公式パターン。effectで
  // 同期すると1フレーム分よけいな再レンダリングが挟まるため使わない:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes）
  const [syncedUser, setSyncedUser] = useState(null);
  if (user && user !== syncedUser) {
    setSyncedUser(user);
    setName(user.name);
  }

  const [isSavingName, setIsSavingName] = useState(false);

  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (isLoading) {
    return (
      <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
        <ProfileSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
        <RecordsErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!user) return null;

  const handleSaveName = async (event) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (isSavingName || !trimmed) return;

    setIsSavingName(true);
    try {
      const updated = await updateProfile({ name: trimmed }, token);
      setUser(updated);
      saveAuthUserName(updated.name);
      addToast(t("profile.toastNameUpdated"), "success");
    } catch (caught) {
      addToast(getErrorMessage(caught, t), "error");
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
    } catch (caught) {
      addToast(getErrorMessage(caught, t), "error");
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
    } catch (caught) {
      addToast(getErrorMessage(caught, t), "error");
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-text">{t("profile.heading")}</h1>
        <p className="mt-1 text-sm text-text-tertiary">{t("profile.subtitle")}</p>
      </header>

      <div className="flex flex-col divide-y divide-surface-2">
        <section className="pb-6">
          <h2 className="text-sm font-semibold text-text">{t("profile.languageHeading")}</h2>
          <div className="mt-4">
            <LanguageSwitcher />
          </div>
        </section>

        <section className="py-6">
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

            <dl>
              <dt className="text-xs text-text-tertiary">{t("profile.email")}</dt>
              <dd className="mt-0.5 text-sm text-text">{user.email}</dd>
            </dl>

            <div>
              <button type="submit" disabled={isSavingName} className={primaryButtonClass}>
                {isSavingName ? t("common.saving") : t("profile.saveName")}
              </button>
            </div>
          </form>
        </section>

        <section className="py-6">
          <h2 className="text-sm font-semibold text-text">{t("profile.changePasswordHeading")}</h2>
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

        <section className="pt-6">
          <h2 className="text-sm font-semibold text-danger">{t("profile.deleteAccountHeading")}</h2>
          <p className="mt-1 text-xs text-text-tertiary">{t("profile.deleteAccountWarning")}</p>
          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            className={`${dangerButtonClass} mt-3`}
          >
            {t("profile.deleteAccountButton")}
          </button>
        </section>
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={t("profile.confirmDeleteTitle")}
        description={t("profile.confirmDeleteDescription")}
        isProcessing={isDeleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setIsConfirmOpen(false)}
      />

      <div className="mt-8 flex flex-col items-center gap-3 border-t border-surface-2 pt-6 pb-2">
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
