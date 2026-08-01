import { useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { useCoffeeRecord } from "../features/coffee-records/hooks/useCoffeeRecord";
import { useMasterData } from "../features/coffee-records/hooks/useMasterData";
import { useRecordForm } from "../features/coffee-records/hooks/useRecordForm";
import {
  createCoffeeRecord,
  updateCoffeeRecord,
} from "../features/coffee-records/api/coffeeRecordApi";
import RecordForm from "../features/coffee-records/components/RecordForm";
import { RecordsErrorState } from "../features/coffee-records/components/RecordListStates";
import { secondaryButtonClass } from "../features/coffee-records/components/formStyles";
import { useToast } from "../contexts/ToastContext";

/**
 * 記録の作成・編集画面。
 *
 * 作成と編集で同じページを使う。項目もバリデーションも同じで、
 * 違うのは「初期値があるか」と「どのAPIを呼ぶか」だけなので、
 * 別ファイルにすると同じJSXを二重に持つことになる。
 *
 * ルートで区別する:
 *   /records/new              → recordId が undefined → 作成
 *   /records/:recordId/edit   → recordId あり         → 編集
 */
function RecordFormPage() {
  const { t } = useTranslation();
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const isEditing = Boolean(recordId);

  const { record, isLoading: isRecordLoading, error: recordError, reload } =
    useCoffeeRecord(recordId);
  const {
    masterData,
    isLoading: isMasterDataLoading,
    error: masterDataError,
  } = useMasterData();

  /**
   * フォームから呼ばれる送信処理。
   *
   * useRecordForm が例外をそのまま投げ返してくるので、
   * ここでは「成功したときに何をするか」だけを書けばよい。
   */
  const handleSubmit = useCallback(
    async (payload) => {
      const saved = isEditing
        ? await updateCoffeeRecord(recordId, payload)
        : await createCoffeeRecord(payload);

      addToast(isEditing ? t("records.toastUpdated") : t("records.toastCreated"), "success");

      // 保存後は詳細画面へ。一覧へ戻すと「保存されたか」を確認しづらい
      navigate(`/records/${saved.id}`, { replace: true });

      return saved;
    },
    [isEditing, recordId, addToast, navigate, t],
  );

  const form = useRecordForm(record, handleSubmit);

  // ── 編集対象の読み込みに関わる状態 ──────────────────
  if (isEditing && isRecordLoading) {
    return (
      <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="skeleton-block h-6 w-40 rounded" />
        <div className="skeleton-block mt-6 h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isEditing && recordError) {
    // 存在しない記録の編集は、通信エラーと分けて案内する
    const isNotFound = recordError.isNotFound;

    return (
      <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        {isNotFound ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ctp-overlay0/60 px-6 py-12 text-center">
            <p className="text-sm font-medium text-ctp-text">{t("records.notFoundTitle")}</p>
            <p className="text-sm text-ctp-subtext0">
              {t("records.notFoundDesc")}
            </p>
            <Link to="/records" className={secondaryButtonClass}>
              {t("common.backToList")}
            </Link>
          </div>
        ) : (
          <RecordsErrorState error={recordError} onRetry={reload} />
        )}
      </div>
    );
  }

  return (
    <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-5">
        <Link
          to={isEditing ? `/records/${recordId}` : "/records"}
          className="text-sm text-ctp-subtext0 underline underline-offset-2 hover:text-ctp-text"
        >
          ← {isEditing ? t("records.backToDetail") : t("common.backToList")}
        </Link>
        <h1 className="mt-2 text-xl font-bold text-ctp-text">
          {isEditing ? t("records.editTitle") : t("records.newTitle")}
        </h1>
        {!isEditing && (
          <p className="mt-1 text-sm text-ctp-subtext0">
            {t("records.newSubtitle")}
          </p>
        )}
      </header>

      <RecordForm
        values={form.values}
        errors={form.errors}
        submitError={form.submitError}
        isSubmitting={form.isSubmitting}
        setValue={form.setValue}
        toggleValue={form.toggleValue}
        onSubmit={form.submit}
        onCancel={() => navigate(isEditing ? `/records/${recordId}` : "/records")}
        masterData={masterData}
        isMasterDataLoading={isMasterDataLoading}
        masterDataError={masterDataError}
        submitLabel={isEditing ? t("records.submitEdit") : t("records.submitCreate")}
      />
    </div>
  );
}

export default RecordFormPage;
