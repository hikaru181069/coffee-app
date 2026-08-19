import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

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
import SearchBox from "../features/search/components/SearchBox";
import SearchResults from "../features/search/components/SearchResults";
import { useSearch } from "../features/search/hooks/useSearch";

/**
 * 記録の一覧画面。
 *
 * このページが持つのは「画面の構成」と「絞り込みの状態」だけ。
 * API通信は useCoffeeRecords、表示の部品は features/ 側にある
 * （CLAUDE.md: pageコンポーネントにAPI通信・フォーム状態・変換ロジック・
 * 巨大なJSXをすべて置かない）。
 *
 * 2026-08、横断検索（docs/search.md）を追加した。検索クエリが入力されて
 * いる間は、通常のフィルター・一覧・ページ送りを検索結果表示へ丸ごと
 * 差し替える。検索結果（属性の集計カード＋記録タイトルの一致）は
 * 通常の絞り込み結果と見た目・意味が異なるため、同じ一覧に混ぜて
 * 出すと状態がわかりにくくなると判断した。
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
  const { t } = useTranslation();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [searchQuery, setSearchQuery] = useState("");
  const isSearching = searchQuery.trim() !== "";

  const { records, pagination, isLoading, error, reload } = useCoffeeRecords(filters);
  const { masterData } = useMasterData();
  const search = useSearch(searchQuery);

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
        {records.map((record, index) => (
          <RecordCard key={record.id} record={record} index={index} />
        ))}
      </ul>
    );
  };

  return (
    <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">Records</h1>
          <p className="mt-1 text-sm text-text-tertiary">
            {pagination && pagination.total > 0
              ? t("records.countLabel", { count: pagination.total })
              : t("records.subtitleEmpty")}
          </p>
        </div>

        {/* 主要CTAは1画面に1つ（docs/design.md） */}
        <Link to="/records/new" className={`${primaryButtonClass} px-3 sm:px-4`}>
          <Plus size={16} aria-hidden="true" />
          {t("records.newRecordCta")}
        </Link>
      </header>

      {/* Search + Filterを1つのbarにまとめ、「検索フォーム」の羅列ではなく
          「Recordsをブラウズする道具」に見せる。検索中はfilter行を隠し、
          検索欄だけを残す（絞り込みと横断検索は同時に使わない既存の設計）。 */}
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-surface-2 bg-raised/60 p-3 sm:p-4">
        <SearchBox value={searchQuery} onChange={setSearchQuery} />

        {!isSearching && (
          <RecordFilters
            filters={filters}
            onChange={setFilters}
            onClear={clearFilters}
            masterData={masterData}
            hasActiveFilters={hasActiveFilters}
          />
        )}
      </div>

      {isSearching ? (
        <SearchResults
          query={searchQuery.trim()}
          entities={search.entities}
          records={search.records}
          isLoading={search.isLoading}
          error={search.error}
        />
      ) : (
        renderList()
      )}

      {/* ページ送り。1ページに収まるときは出さない。検索中はページ送り自体を持たない */}
      {!isSearching && pagination && pagination.totalPages > 1 && (
        <nav aria-label={t("records.paginationAriaLabel")} className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={pagination.page <= 1 || isLoading}
            className={secondaryButtonClass}
          >
            {t("common.prev")}
          </button>
          <span className="text-sm text-text-secondary">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages || isLoading}
            className={secondaryButtonClass}
          >
            {t("common.next")}
          </button>
        </nav>
      )}
    </div>
  );
}

export default RecordsPage;
