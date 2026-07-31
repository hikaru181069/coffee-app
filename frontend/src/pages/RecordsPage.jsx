import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import "../features/coffee-records/coffee-records.css";
import { useCoffeeRecords } from "../features/coffee-records/hooks/useCoffeeRecords";
import { useMasterData } from "../features/coffee-records/hooks/useMasterData";
import RecordCard from "../features/coffee-records/components/RecordCard";
import RecordFilters from "../features/coffee-records/components/RecordFilters";
import {
  RecordListSkeleton,
  RecordsEmptyState,
  RecordsErrorState,
  RecordsNoMatchState,
} from "../features/coffee-records/components/RecordListStates";
import {
  primaryButtonClass,
  secondaryButtonClass,
} from "../features/coffee-records/components/formStyles";

/**
 * 記録の一覧画面。
 *
 * このページが持つのは「画面の構成」と「絞り込みの状態」だけ。
 * API通信は useCoffeeRecords、表示の部品は features/ 側にある
 * （CLAUDE.md: pageコンポーネントにAPI通信・フォーム状態・変換ロジック・
 * 巨大なJSXをすべて置かない）。
 */

const DEFAULT_FILTERS = {
  page: 1,
  limit: 20,
  recordType: "",
  originId: "",
  flavorId: "",
  ratingMin: "",
};

function RecordsPage() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const { records, pagination, isLoading, error, reload } = useCoffeeRecords(filters);
  const { masterData } = useMasterData();

  const hasActiveFilters = useMemo(
    () =>
      filters.recordType !== "" ||
      filters.originId !== "" ||
      filters.flavorId !== "" ||
      filters.ratingMin !== "",
    [filters],
  );

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const goToPage = (page) => setFilters((prev) => ({ ...prev, page }));

  /**
   * 一覧の中身を状態ごとに出し分ける。
   * JSXの中に三項演算子を重ねると読めなくなるので関数へ切り出す。
   */
  const renderList = () => {
    if (isLoading) return <RecordListSkeleton />;
    if (error) return <RecordsErrorState error={error} onRetry={reload} />;

    if (records.length === 0) {
      // 「まだ記録が無い」と「絞り込んだ結果が0件」は別物として扱う。
      // 前者は最初の記録を促し、後者は絞り込みの解除を促す
      return hasActiveFilters ? (
        <RecordsNoMatchState onClearFilters={clearFilters} />
      ) : (
        <RecordsEmptyState />
      );
    }

    return (
      <ul className="flex flex-col gap-3">
        {records.map((record) => (
          <RecordCard key={record.id} record={record} />
        ))}
      </ul>
    );
  };

  return (
    <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ctp-text">Records</h1>
          <p className="mt-1 text-sm text-ctp-subtext0">
            {pagination && pagination.total > 0
              ? `${pagination.total} 件の記録`
              : "飲んだコーヒーを記録しましょう"}
          </p>
        </div>

        {/* 主要CTAは1画面に1つ（docs/design.md） */}
        <Link to="/records/new" className={primaryButtonClass}>
          <Plus size={16} aria-hidden="true" />
          記録する
        </Link>
      </header>

      <div className="mb-5">
        <RecordFilters
          filters={filters}
          onChange={setFilters}
          onClear={clearFilters}
          masterData={masterData}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {renderList()}

      {/* ページ送り。1ページに収まるときは出さない */}
      {pagination && pagination.totalPages > 1 && (
        <nav aria-label="ページ送り" className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            className={secondaryButtonClass}
          >
            前へ
          </button>
          <span className="text-sm text-ctp-subtext1">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            className={secondaryButtonClass}
          >
            次へ
          </button>
        </nav>
      )}
    </div>
  );
}

export default RecordsPage;
