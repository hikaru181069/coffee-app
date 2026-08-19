import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";

import { primaryButtonClass } from "../features/coffee-records/components/formStyles";
import { contentContainerClass } from "../styles/pageContainer";

/**
 * 存在しないURLへアクセスしたときの画面。
 *
 * 以前はcatch-allルートが無く、Navbar以外が完全に空白のまま
 * 何の案内も無かった（docs/design.mdの「空状態には次の行動を示す」
 * 原則に反する）。RecordsEmptyState等と同じ見た目（破線枠+アイコン+
 * 見出し+説明文+CTA）にそろえる。
 */
function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <div className={contentContainerClass}>
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line/60 px-6 py-16 text-center">
        <Compass size={32} aria-hidden="true" className="text-text-tertiary" strokeWidth={1.5} />
        <div>
          <p className="text-sm font-medium text-text">{t("notFound.title")}</p>
          <p className="mt-1 text-sm italic text-text-tertiary">{t("notFound.desc")}</p>
        </div>
        <Link to="/" className={`${primaryButtonClass} mt-1`}>
          {t("notFound.cta")}
        </Link>
      </div>
    </div>
  );
}

export default NotFoundPage;
