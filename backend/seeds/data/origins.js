/**
 * 産地の初期候補。
 *
 * 世界中の産地を網羅するのが目的ではない（docs/product-principles.md
 * 「Personal Knowledge Over Global Completeness」）。
 * スペシャルティコーヒーで見かける頻度が高い国を最初の選択肢として用意し、
 * 足りないぶんは記録が増えるにつれて追加していく。
 *
 * countryCode は ISO 3166-1 alpha-2。将来の地図表示のために入れてある。
 */
export const origins = [
  { name: "Ethiopia", countryCode: "ET" },
  { name: "Kenya", countryCode: "KE" },
  { name: "Rwanda", countryCode: "RW" },
  { name: "Burundi", countryCode: "BI" },
  { name: "Tanzania", countryCode: "TZ" },
  { name: "Colombia", countryCode: "CO" },
  { name: "Brazil", countryCode: "BR" },
  { name: "Peru", countryCode: "PE" },
  { name: "Bolivia", countryCode: "BO" },
  { name: "Ecuador", countryCode: "EC" },
  { name: "Guatemala", countryCode: "GT" },
  { name: "Costa Rica", countryCode: "CR" },
  { name: "Panama", countryCode: "PA" },
  { name: "El Salvador", countryCode: "SV" },
  { name: "Honduras", countryCode: "HN" },
  { name: "Nicaragua", countryCode: "NI" },
  { name: "Mexico", countryCode: "MX" },
  { name: "Indonesia", countryCode: "ID" },
  { name: "Yemen", countryCode: "YE" },
  { name: "India", countryCode: "IN" },
];
