import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Coffee, MoreHorizontal, Pencil, Share2, Star, Store, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { useCoffeeRecord } from "../features/coffee-records/hooks/useCoffeeRecord";
import { deleteCoffeeRecord } from "../features/coffee-records/api/coffeeRecordApi";
import ConfirmDialog from "../features/coffee-records/components/ConfirmDialog";
import { RecordsErrorState } from "../features/coffee-records/components/RecordListStates";
import { primaryButtonClass, secondaryButtonClass } from "../features/coffee-records/components/formStyles";
import {
  collectCoffeeDetails,
  formatConsumedAt,
  recordTypeLabel,
} from "../features/coffee-records/utils/recordFormat";
import RecordConnectionsDiagram from "../features/graph/components/RecordConnectionsDiagram";
import { useToast } from "../contexts/ToastContext";
import { getErrorMessage } from "../utils/errorMessage";

/**
 * 記録の詳細画面。
 *
 * docs/design.md の「Record Detail」に対応する:
 *   基本情報 / Coffee Details / Notes / Edit / Delete
 *
 * 2026-08、カードを積み重ねる構成から、Breadcrumb→Header→（Property Grid
 * →Tasting Note→Connections、Dividerで区切る）→Actionsという1本の
 * 縦の流れへ再設計した。Connectionsセクションは、この記録を中心に、
 * 直接つながる知識グラフのノード（origin/process/roastLevel/flavor）を
 * 1-hopのハブ&スポーク図で見せる（`features/graph/components/
 * RecordConnectionsDiagram.jsx`）。「Graphで見る」はボタンから
 * テキストリンクへ変え、Connectionsセクションへ移した
 * （遷移先・?focus=の仕組みは変更していない）。
 *
 * docs/design.md にある「関連ノード」（詳細画面に直接、関連する記録の
 * 一覧を埋め込む案）は今回も実装していない。Graph画面・エンティティ詳細
 * ページへ遷移すれば同じ情報を見られるため、重複した一覧をここにも
 * 持たせる優先度は低いと判断した。
 */
function RecordDetailPage() {
  const { t, i18n } = useTranslation();
  const { recordId } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const { record, isLoading, error, reload } = useCoffeeRecord(recordId);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    // 二重送信の防止。削除中にもう一度押されると404が出てしまう
    if (isDeleting) return;

    setIsDeleting(true);
    try {
      await deleteCoffeeRecord(recordId);
      addToast(t("records.toastDeleted"), "success");
      navigate("/records", { replace: true });
    } catch (caught) {
      addToast(getErrorMessage(caught, t), "error");
      setIsDeleting(false);
      setIsConfirmOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="skeleton-block h-4 w-32 rounded" />
        <div className="skeleton-block mt-4 h-8 w-2/3 rounded" />
        <div className="skeleton-block mt-6 h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        {error.isNotFound ? (
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
          <RecordsErrorState error={error} onRetry={reload} />
        )}
      </div>
    );
  }

  if (!record) return null;

  const details = collectCoffeeDetails(record, t, i18n.language);
  const flavors = record.flavors ?? [];
  const hasCoffeeInfo = details.length > 0 || flavors.length > 0;
  // Connectionsは知識グラフのノードに対応する4種別のみ（Property Gridとは違い
  // farmName/variety/roasterNameはグラフのノードではないため含めない）
  const hasConnections = Boolean(record.origin || record.process || record.roastLevel || flavors.length > 0);

  return (
    <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      {/* ── Breadcrumb ───────────────────────────── */}
      <nav aria-label={t("records.breadcrumbAriaLabel")} className="flex items-center gap-1.5 text-sm">
        <Link
          to="/records"
          className="text-ctp-subtext0 transition-colors duration-150 hover:text-ctp-text"
        >
          Records
        </Link>
        <ChevronRight size={14} aria-hidden="true" className="flex-shrink-0 text-ctp-overlay0" />
        <span className="truncate text-ctp-subtext1">{record.title}</span>
      </nav>

      {/* ── Header ───────────────────────────────── */}
      <header className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-ctp-text">{record.title}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ctp-subtext0">
            <span className="font-mono">{formatConsumedAt(record.consumedAt, i18n.language)}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              {record.recordType === "cafe" ? (
                <Store size={13} aria-hidden="true" />
              ) : (
                <Coffee size={13} aria-hidden="true" />
              )}
              {recordTypeLabel(record.recordType, t)}
            </span>
            {record.cafeName && (
              <>
                <span aria-hidden="true">·</span>
                <span>{record.cafeName}</span>
              </>
            )}
          </p>
        </div>

        {record.rating !== null && (
          <div className="flex items-center gap-1.5 rounded-full bg-ctp-surface0 px-3 py-1.5">
            {[1, 2, 3, 4, 5].map((score) => (
              <Star
                key={score}
                size={14}
                aria-hidden="true"
                className={score <= record.rating ? "text-ctp-yellow" : "text-ctp-overlay0"}
                fill={score <= record.rating ? "currentColor" : "none"}
                strokeWidth={1.5}
              />
            ))}
            <span className="ml-1 font-mono text-sm font-semibold text-ctp-text">
              {record.rating}
              <span className="sr-only"> / 5</span>
            </span>
          </div>
        )}
      </header>

      {hasCoffeeInfo || record.notes || hasConnections ? (
        <div className="mt-6 divide-y divide-ctp-surface1">
          {/* ── Coffee Information（Property Grid） ─── */}
          {hasCoffeeInfo && (
            <section className="py-6 first:pt-0">
              <h2 className="text-sm font-semibold text-ctp-text">{t("records.detailsHeading")}</h2>
              <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {details.map((detail) => (
                  <div key={detail.key}>
                    <dt className="text-xs text-ctp-subtext0">{detail.label}</dt>
                    <dd className="mt-0.5 text-sm text-ctp-text">{detail.value}</dd>
                  </div>
                ))}
                {flavors.length > 0 && (
                  <div>
                    <dt className="text-xs text-ctp-subtext0">{t("records.flavorsHeading")}</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {flavors.map((flavor) => (
                        <span
                          key={flavor.id}
                          className="rounded-full bg-ctp-surface0 px-2.5 py-1 text-xs text-ctp-subtext1"
                        >
                          {flavor.name}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {/* ── Tasting Note ─────────────────────────── */}
          {record.notes && (
            <section className="py-6 first:pt-0">
              <h2 className="text-sm font-semibold text-ctp-text">{t("records.notesHeading")}</h2>
              {/* whitespace-pre-wrap: 入力時の改行を表示にも反映する */}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ctp-subtext1">
                {record.notes}
              </p>
            </section>
          )}

          {/* ── Connections ───────────────────────────── */}
          {hasConnections && (
            <section className="py-6 first:pt-0">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ctp-text">{t("records.connectionsHeading")}</h2>
                <Link
                  to={`/graph?focus=record:${record.id}`}
                  className="inline-flex items-center gap-1 text-xs text-ctp-subtext0 transition-colors duration-150 hover:text-ctp-text"
                >
                  <Share2 size={12} aria-hidden="true" />
                  <span className="underline underline-offset-2">{t("common.viewOnGraph")}</span>
                </Link>
              </div>

              <div className="mt-4">
                <RecordConnectionsDiagram record={record} />
              </div>
            </section>
          )}
        </div>
      ) : (
        // 詳細が何も無いときは、次に何ができるかを示す
        <p className="mt-6 rounded-xl border border-dashed border-ctp-overlay0/60 px-4 py-6 text-center text-sm text-ctp-subtext0">
          {t("records.detailEmptyHint")}
        </p>
      )}

      {/* ── Actions ──────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link to={`/records/${record.id}/edit`} className={primaryButtonClass}>
          <Pencil size={15} aria-hidden="true" />
          {t("common.edit")}
        </Link>
        <MoreMenu onDelete={() => setIsConfirmOpen(true)} />
      </div>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        title={t("records.confirmDeleteTitle")}
        description={t("records.confirmDeleteDescription", { title: record.title })}
        isProcessing={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </div>
  );
}

/**
 * 「・・・」メニュー。今はDeleteのみを持つ。
 *
 * 外部ライブラリのdropdown/popoverは使わず、ConfirmDialog.jsxと同じ
 * 「必要な分だけ自前で作る」方針に沿って実装した
 * （開いている間だけ outside click / Escape を監視する）。
 */
function MoreMenu({ onDelete }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={t("records.moreActionsLabel")}
        className={`${secondaryButtonClass} px-2.5`}
      >
        <MoreHorizontal size={16} aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-2 w-40 rounded-lg border border-ctp-surface1 bg-ctp-mantle p-1 shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-ctp-red transition-colors duration-150 hover:bg-ctp-red/10"
          >
            <Trash2 size={14} aria-hidden="true" />
            {t("common.delete")}
          </button>
        </div>
      )}
    </div>
  );
}

export default RecordDetailPage;
