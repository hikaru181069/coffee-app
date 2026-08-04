import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 横断検索の入力欄。
 *
 * コーヒー名だけでなく産地・品種・フレーバー・カフェ・精製方法も
 * 横断して検索できることをplaceholderで伝える（docs/search.md）。
 */
function SearchBox({ value, onChange }) {
  const { t } = useTranslation();

  return (
    <div className="relative">
      <Search
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ctp-subtext0"
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={t("search.placeholder")}
        aria-label={t("search.ariaLabel")}
        className="w-full rounded-lg border border-ctp-overlay0/60 bg-ctp-surface0 py-2 pl-9 pr-3 text-sm text-ctp-text placeholder:text-ctp-subtext0/60 transition-colors duration-150 hover:border-ctp-overlay0 focus:outline-none focus:ring-2 focus:ring-ctp-blue/50"
      />
    </div>
  );
}

export default SearchBox;
