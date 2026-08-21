import { useTranslation } from "react-i18next";

/**
 * 日本語⇔英語の表示言語切り替え。
 *
 * react-i18next の i18n.changeLanguage() が localStorage への保存も
 * 行う（i18n/index.js の detection.caches 設定）ため、ここでは
 * 切り替えを呼ぶだけでよい。
 */
const LANGUAGES = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
];

function LanguageSwitcher({ className = "" }) {
  const { i18n } = useTranslation();

  return (
    <div
      role="group"
      aria-label="Language / 表示言語"
      className={`inline-flex overflow-hidden rounded-full border border-surface-3 text-xs font-semibold ${className}`}
    >
      {LANGUAGES.map(({ code, label }) => {
        const isActive = i18n.language === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => i18n.changeLanguage(code)}
            aria-pressed={isActive}
            className={`px-2.5 py-1.5 transition-colors duration-150 ${
              isActive
                ? "bg-inverse text-on-inverse"
                : "text-text-secondary hover:bg-surface-1/60 hover:text-text"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default LanguageSwitcher;
