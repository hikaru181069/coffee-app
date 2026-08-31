import { useTranslation } from "react-i18next";

import RecordCard from "../../coffee-records/components/RecordCard";
import { RecordListSkeleton } from "../../coffee-records/components/RecordListStates";
import { getErrorMessage } from "../../../utils/errorMessage";
import EntityResultCard from "./EntityResultCard";

/**
 * 横断検索の結果表示。
 *
 * docs/search.md参照。属性ノードの一致（entities）と記録タイトルの一致
 * （records）を別セクションとして表示する。属性は「知識ベース」寄りの
 * 集計情報、記録は個別の記録カード（既存のRecordCard.jsxを再利用）と
 * 見た目の性質が異なるため。
 */
function SearchResults({ query, entities, entitiesTruncated = false, records, isLoading, error }) {
  const { t } = useTranslation();

  if (isLoading) return <RecordListSkeleton count={3} />;
  if (error) return <p className="text-sm text-danger">{getErrorMessage(error, t)}</p>;

  if (entities.length === 0 && records.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-line/60 px-4 py-6 text-center text-sm text-text-tertiary">
        {t("search.noResults", { query })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {entities.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text">{t("search.entitiesHeading")}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {entities.map((entity, index) => (
              <li key={entity.id}>
                <EntityResultCard entity={entity} index={index} />
              </li>
            ))}
          </ul>
          {/* 2026-08、「多数の属性がヒットしたときの上限が無い」という
              指摘を受け、backend（searchBuilder.js）が上限（20件）を
              超えた場合にentitiesTruncated: trueを返すようにした。
              一覧自体は切り詰め済みのものが届くため、ここでは案内文だけ出す */}
          {entitiesTruncated && (
            <p className="mt-3 text-xs text-text-tertiary">{t("search.entitiesTruncatedNote")}</p>
          )}
        </section>
      )}

      {records.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-text">{t("search.recordsHeading")}</h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {records.map((record, index) => (
              <RecordCard key={record.id} record={record} index={index} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

export default SearchResults;
