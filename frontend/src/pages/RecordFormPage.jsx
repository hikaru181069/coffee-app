import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useBlocker, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { useCoffeeRecord } from "../features/coffee-records/hooks/useCoffeeRecord";
import { useMasterData } from "../features/coffee-records/hooks/useMasterData";
import { useRecordForm } from "../features/coffee-records/hooks/useRecordForm";
import RecordForm from "../features/coffee-records/components/RecordForm";
import SaveDiscoveryReveal from "../features/coffee-records/components/SaveDiscoveryReveal";
import CoffeeLoader from "../components/CoffeeLoader";
import ConfirmDialog from "../features/coffee-records/components/ConfirmDialog";
import { RecordsErrorState } from "../features/coffee-records/components/RecordListStates";
import { secondaryButtonClass } from "../features/coffee-records/components/formStyles";
import { wideContainerClass } from "../styles/pageContainer";
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

  // 保存ボタンのスピナー→チェックマーク演出用。遷移を一瞬遅らせている間だけtrue
  // （2026-09、記録体験のUI/UX再設計）
  const [isJustSaved, setIsJustSaved] = useState(false);

  // 保存直後の「発見」インタースティシャル用。nullなら非表示、
  // { record, discoveries } なら表示する（2026-09、記録体験の再設計）。
  // discoveriesが1件以上あるときだけセットする（0件・編集時は従来どおり
  // isJustSavedのチェックマーク演出のみで詳細ページへ遷移する）
  const [revealDiscoveries, setRevealDiscoveries] = useState(null);

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

    const { record: savedRecord, discoveries } = saved;

    addToast(isEditing ? t("records.toastUpdated") : t("records.toastCreated"), "success");

    // 保存後は詳細画面へ。一覧へ戻すと「保存されたか」を確認しづらい。
    // navigate()より先にフラグを立て、直後のuseBlockerの判定に確実に間に合わせる
    justSavedRef.current = true;

    // 発見（discoveries）がある場合は、詳細ページへ行く前にインタース
    // ティシャルを挟む（2026-09、記録体験の再設計）。編集時は常に
    // discoveries: []（発見演出は作成時のみ、coffeeRecordApi.js参照）
    if (discoveries && discoveries.length > 0) {
      setRevealDiscoveries({ record: savedRecord, discoveries });
      return;
    }

    // 発見が無い場合は従来どおり、保存ボタンのスピナー→チェックマーク演出
    // （docs/design.mdの「静かな道具」を踏襲し、控えめな達成の合図のみ）。
    // prefers-reduced-motionでは演出せず即座に遷移する
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      navigate(`/records/${savedRecord.id}`, { replace: true });
      return;
    }

    setIsJustSaved(true);
    setTimeout(() => {
      navigate(`/records/${savedRecord.id}`, { replace: true });
    }, 450);
  }, [form, isEditing, addToast, navigate, t]);

  const handleRevealContinue = useCallback(() => {
    if (!revealDiscoveries) return;
    navigate(`/records/${revealDiscoveries.record.id}`, { replace: true });
  }, [navigate, revealDiscoveries]);

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
  // 2026-09、BackLink・見出し（isEditingだけで決まり、recordを必要
  // としない）をローディング判定より前に出し、読み込み中も「今どの
  // ページにいるか」がわかるようにした
  const staticHeader = (
    <header className="mb-5">
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
  );

  if (isEditing && isRecordLoading) {
    return (
      <div className={wideContainerClass}>
        {staticHeader}
        <CoffeeLoader size="lg" />
      </div>
    );
  }

  if (isEditing && recordError) {
    // 存在しない記録の編集は、通信エラーと分けて案内する
    const isNotFound = recordError.isNotFound;

    return (
      <div className={wideContainerClass}>
        {staticHeader}
        {isNotFound ? (
          <div className="flex flex-col items-center gap-3 rounded-none border border-dashed border-line/60 px-6 py-12 text-center">
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

  // 保存直後の「発見」インタースティシャル。ヘッダー（戻るリンク・
  // ページタイトル）ごと差し替え、専用の画面として見せる
  // （2026-09、記録体験の再設計）
  if (revealDiscoveries) {
    return (
      <div className={wideContainerClass}>
        <SaveDiscoveryReveal
          record={revealDiscoveries.record}
          discoveries={revealDiscoveries.discoveries}
          onContinue={handleRevealContinue}
        />
      </div>
    );
  }

  return (
    <div className={wideContainerClass}>
      {/* 2026-08、EntityDetail/Diagnosis/WorldMap/RecordDetailと同じ
          BackLink（navigate(-1)）へ統一した。編集中に離脱しようとした
          場合はuseBlockerが引き続きこのクリックも検知して確認する
          （BackLinkの実体もnavigate()を呼ぶだけなので、Cancelボタンと
          同じ経路で確認ダイアログが機能する）。fallbackは、URL直接
          アクセス等で戻れる履歴が無い場合の行き先（編集元の詳細/一覧） */}
      {staticHeader}

      <RecordForm
        values={form.values}
        errors={form.errors}
        submitError={form.submitError}
        isSubmitting={form.isSubmitting}
        setValue={form.setValue}
        validateField={form.validateField}
        toggleValue={form.toggleValue}
        addComponent={form.addComponent}
        removeComponent={form.removeComponent}
        setComponentValue={form.setComponentValue}
        toggleComponentValue={form.toggleComponentValue}
        setPrimaryComponentValue={form.setPrimaryComponentValue}
        togglePrimaryComponentVariety={form.togglePrimaryComponentVariety}
        onSubmit={handleFormSubmit}
        onCancel={() => navigate(isEditing ? `/records/${recordId}` : "/records")}
        masterData={masterData}
        isMasterDataLoading={isMasterDataLoading}
        masterDataError={masterDataError}
        submitLabel={isEditing ? t("records.submitEdit") : t("records.submitCreate")}
        isJustSaved={isJustSaved}
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
