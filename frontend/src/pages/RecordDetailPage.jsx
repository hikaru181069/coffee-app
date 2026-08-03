import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Coffee, Pencil, Share2, Star, Store, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { useCoffeeRecord } from "../features/coffee-records/hooks/useCoffeeRecord";
import { deleteCoffeeRecord } from "../features/coffee-records/api/coffeeRecordApi";
import ConfirmDialog from "../features/coffee-records/components/ConfirmDialog";
import { RecordsErrorState } from "../features/coffee-records/components/RecordListStates";
import {
  cardClass,
  dangerButtonClass,
  secondaryButtonClass,
} from "../features/coffee-records/components/formStyles";
import {
  collectCoffeeDetails,
  formatConsumedAt,
  recordTypeLabel,
} from "../features/coffee-records/utils/recordFormat";
import { useToast } from "../contexts/ToastContext";
import { getErrorMessage } from "../utils/errorMessage";

/**
 * 記録の詳細画面。
 *
 * docs/design.md の「Record Detail」に対応する:
 *   基本情報 / Coffee Details / Notes / Edit / Delete
 *
 * 「Graphで見る」は Phase 5（知識グラフUI）でグラフ画面ができたため追加した。
 * ?focus=record:xxx でグラフ側にその記録ノードを自動選択させる。
 *
 * docs/design.md にある「関連ノード」（詳細画面に直接、関連する記録の
 * 一覧を埋め込む案）は今回実装していない。Graph画面へ遷移すれば同じ
 * 情報（属性ノードを選ぶと関連記録一覧が出る）を見られるため、
 * 重複した一覧をここにも持たせる優先度は低いと判断した。
 * 必要であれば改めて追加する。
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
        <div className="skeleton-block h-6 w-24 rounded" />
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

  return (
    <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <Link
        to="/records"
        className="text-sm text-ctp-subtext0 underline underline-offset-2 hover:text-ctp-text"
      >
        ← {t("common.backToList")}
      </Link>

      {/* ── 基本情報 ─────────────────────────────── */}
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

      {/* ── Coffee Details ───────────────────────── */}
      {(details.length > 0 || flavors.length > 0) && (
        <section className={`${cardClass} mt-5`}>
          <h2 className="text-sm font-semibold text-ctp-text">{t("records.detailsHeading")}</h2>

          {details.length > 0 && (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              {details.map((detail) => (
                <div key={detail.key}>
                  <dt className="text-xs text-ctp-subtext0">{detail.label}</dt>
                  <dd className="mt-0.5 text-sm text-ctp-text">{detail.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {flavors.length > 0 && (
            <div className="mt-4">
              <h3 className="text-xs text-ctp-subtext0">{t("records.flavorsHeading")}</h3>
              <ul className="mt-1.5 flex flex-wrap gap-1.5">
                {flavors.map((flavor) => (
                  <li
                    key={flavor.id}
                    className="rounded-full bg-ctp-surface0 px-2.5 py-1 text-xs text-ctp-subtext1"
                  >
                    {flavor.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── Notes ────────────────────────────────── */}
      {record.notes && (
        <section className={`${cardClass} mt-4`}>
          <h2 className="text-sm font-semibold text-ctp-text">{t("records.notesHeading")}</h2>
          {/* whitespace-pre-wrap: 入力時の改行を表示にも反映する */}
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ctp-subtext1">
            {record.notes}
          </p>
        </section>
      )}

      {/* 詳細が何も無いときは、次に何ができるかを示す */}
      {details.length === 0 && flavors.length === 0 && !record.notes && (
        <p className="mt-5 rounded-xl border border-dashed border-ctp-overlay0/60 px-4 py-6 text-center text-sm text-ctp-subtext0">
          {t("records.detailEmptyHint")}
        </p>
      )}

      {/* ── 操作 ─────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Link to={`/records/${record.id}/edit`} className={secondaryButtonClass}>
          <Pencil size={15} aria-hidden="true" />
          {t("common.edit")}
        </Link>
        {/* Phase 5で知識グラフ画面ができたので実装する。
            ?focus=record:xxx でグラフ側にそのノードを自動選択させる
            （features/graph/hooks GraphPage の handleGraphReady を参照） */}
        <Link to={`/graph?focus=record:${record.id}`} className={secondaryButtonClass}>
          <Share2 size={15} aria-hidden="true" />
          {t("common.viewOnGraph")}
        </Link>
        <button
          type="button"
          onClick={() => setIsConfirmOpen(true)}
          className={dangerButtonClass}
        >
          <Trash2 size={15} aria-hidden="true" />
          {t("common.delete")}
        </button>
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

export default RecordDetailPage;
