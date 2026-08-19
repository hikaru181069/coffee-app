// react-i18next の初期化。
//
// 対応言語はja/enの2つのみで、複雑な複数形・地域変種は不要なため、
// 検出はブラウザの言語設定とlocalStorageのみに絞る
// （i18next-browser-languagedetectorのフル機能は使わない）。
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ja from "./locales/ja.json";
import en from "./locales/en.json";

export const LANGUAGE_STORAGE_KEY = "coffee-app-language";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ja: { translation: ja },
      en: { translation: en },
    },
    fallbackLng: "ja",
    supportedLngs: ["ja", "en"],
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false, // Reactが既にXSS対策をしているため不要
    },
  });

// <html lang>を実際の表示言語と同期させる。frontend/index.htmlには
// 静的に lang="en" と書かれているため、これを更新しないと言語を
// 切り替えてもスクリーンリーダー等が英語のまま読み上げてしまう。
const syncHtmlLang = (language) => {
  document.documentElement.lang = language;
};
syncHtmlLang(i18n.resolvedLanguage ?? i18n.language);
i18n.on("languageChanged", syncHtmlLang);

export default i18n;
