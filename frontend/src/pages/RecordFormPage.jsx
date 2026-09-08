import { useCallback, useEffect, useMemo, useRef } from "react";
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { useCoffeeRecord } from "../features/coffee-records/hooks/useCoffeeRecord";
import { useMasterData } from "../features/coffee-records/hooks/useMasterData";
import { useRecordForm } from "../features/coffee-records/hooks/useRecordForm";
import RecordForm from "../features/coffee-records/components/RecordForm";
import RecordFormSkeleton from "../features/coffee-records/components/RecordFormSkeleton";
import ConfirmDialog from "../features/coffee-records/components/ConfirmDialog";
import { RecordsErrorState } from "../features/coffee-records/components/RecordListStates";
import { secondaryButtonClass } from "../features/coffee-records/components/formStyles";
import { contentContainerClass } from "../styles/pageContainer";
import { useToast } from "../contexts/ToastContext";
import BackLink from "../components/BackLink";

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
 *
 * 2026-08、「保存を押し忘れて離脱してもなにも警告されない」という
 * 指摘を受け、未保存の変更がある状態でこのページから離れようとしたら
 * 確認するようにした（useRecordForm.jsのisDirty + useBlocker）。
 * ヘッダーの「戻る」リンク・RecordForm.jsxのキャンセルボタンだけでなく、
 * ナビバーの他リンクやブラウザの戻る/進むボタンも含め、アプリ内の
 * ナビゲーションはすべてuseBlockerが一様に検知する（useBlockerは
 * データルーターでしか動かないため、main.jsx/router.jsxを
 * createBrowserRouterへ移行した）。タブを閉じる・リロードはアプリ内
 * ナビゲーションではないため別途beforeunloadで対処する。
 */
function RecordFormPage() {
  const { t } = useTranslation();
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const isEditing = Boolean(recordId);

  const { record, isLoading: isRecordLoading, error: recordError, reload } =
    useCoffeeRecord(recordId);
  const {
    masterData,
    isLoading: isMasterDataLoading,
    error: masterDataError,
  } = useMasterData();

  // Discoverの「この産地を記録してみる」（SuggestionCard.jsx）から
  // ?originName=Panama のように遷移してきた場合、masterDataと突き合わせて
  // originIdへ解決する。CQI参照データはOriginマスターのIDを持たないため
  // 名前で渡ってくる（suggestedOriginにはlabelしかない）。一致しなければ
  // 通常の空のフォームのまま（未対応の産地名でもエラーにはしない）
  const originNameParam = searchParams.get("originName");
  const prefillOriginId = useMemo(
    () => masterData.origins.find((origin) => origin.name === originNameParam)?.id ?? null,
    [masterData.origins, originNameParam],
  );

  // 保存直後の遷移まで確認ダイアログで止めないためのフラグ。
  // handleFormSubmit内でnavigate()を呼んだ直後にuseBlockerが判定を
  // 行うため、state更新では間に合わない（再レンダリングを待たないrefで持つ）
  const justSavedRef = useRef(false);

  const form = useRecordForm(record, prefillOriginId);

  /**
   * RecordFormから呼ばれる送信処理。
   *
   * API呼び出し自体はuseRecordForm.submit()が行う（作成/更新の分岐も
   * useRecordForm側でrecordの有無から判断する）。ここでは
   * 「成功したときに何をするか」という画面固有の反応だけを書く。
   * form.submit()はバリデーション/送信エラー時にnullを返す
   * （エラー表示自体はuseRecordFormが行うので、ここでは何もしない）。
   */
  const handleFormSubmit = useCallback(async () => {
    const saved = await form.submit();
    if (!saved) return;

    addToast(isEditing ? t("records.toastUpdated") : t("records.toastCreated"), "success");

    // 保存後は詳細画面へ。一覧へ戻すと「保存されたか」を確認しづらい。
    // navigate()より先にフラグを立て、直後のuseBlockerの判定に確実に間に合わせる
    justSavedRef.current = true;
    navigate(`/records/${saved.id}`, { replace: true });
  }, [form, isEditing, addToast, navigate, t]);

  const shouldBlockNavigation = useCallback(
    ({ currentLocation, nextLocation }) =>
      form.isDirty && !justSavedRef.current && currentLocation.pathname !== nextLocation.pathname,
    [form.isDirty],
  );
  const blocker = useBlocker(shouldBlockNavigation);

  // タブを閉じる・リロード・URL直接入力はアプリ内ナビゲーションではないため
  // useBlockerでは検知できない。ブラウザ標準の確認ダイアログで対処する
  // （文言はブラウザ依存でカスタマイズ不可）
  useEffect(() => {
    if (!form.isDirty || justSavedRef.current) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [form.isDirty]);

  // ── 編集対象の読み込みに関わる状態 ──────────────────
  if (isEditing && isRecordLoading) {
    return (
      <div className={contentContainerClass}>
        <RecordFormSkeleton />
      </div>
    );
  }

  if (isEditing && recordError) {
    // 存在しない記録の編集は、通信エラーと分けて案内する
    const isNotFound = recordError.isNotFound;

    return (
      <div className={contentContainerClass}>
        {isNotFound ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line/60 px-6 py-12 text-center">
            <p className="text-sm font-medium text-text">{t("records.notFoundTitle")}</p>
            <p className="text-sm text-text-tertiary">
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
    <div className={contentContainerClass}>
      <header className="mb-5">
        {/* 2026-08、EntityDetail/Diagnosis/WorldMap/RecordDetailと同じ
            BackLink（navigate(-1)）へ統一した。編集中に離脱しようとした
            場合はuseBlockerが引き続きこのクリックも検知して確認する
            （BackLinkの実体もnavigate()を呼ぶだけなので、Cancelボタンと
            同じ経路で確認ダイアログが機能する）。fallbackは、URL直接
            アクセス等で戻れる履歴が無い場合の行き先（編集元の詳細/一覧） */}
        <BackLink fallback={isEditing ? `/records/${recordId}` : "/records"} />
        <h1 className="mt-2 text-xl font-bold text-text">
          {isEditing ? t("records.editTitle") : t("records.newTitle")}
        </h1>
        {!isEditing && (
          <p className="mt-1 text-sm text-text-tertiary">
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
        onSubmit={handleFormSubmit}
        onCancel={() => navigate(isEditing ? `/records/${recordId}` : "/records")}
        masterData={masterData}
        isMasterDataLoading={isMasterDataLoading}
        masterDataError={masterDataError}
        submitLabel={isEditing ? t("records.submitEdit") : t("records.submitCreate")}
        prefillOriginId={prefillOriginId}
      />

      <ConfirmDialog
        isOpen={blocker.state === "blocked"}
        title={t("records.confirmDiscardTitle")}
        description={t("records.confirmDiscardDescription")}
        confirmLabel={t("records.confirmDiscardConfirm")}
        cancelLabel={t("records.confirmDiscardCancel")}
        onConfirm={() => blocker.proceed?.()}
        onCancel={() => blocker.reset?.()}
      />
    </div>
  );
}

export default RecordFormPage;
