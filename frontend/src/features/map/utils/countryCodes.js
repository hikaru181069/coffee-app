/**
 * ISO 3166-1 alpha-2（Originマスターのcountry Code、backend/models/Origin.js）
 * から、world-atlasのtopojson（WorldMap.jsx参照）が国を識別するのに使う
 * ISO 3166-1 numeric（3桁文字列）への対応表。ISO数値IDは解像度
 * （50m/110m等）に関わらず同じなので、この対応表もどちらでも使える。
 *
 * world-atlasを実際に読み込み、backend/seeds/data/origins.jsに登録済みの
 * 全20か国それぞれをproperties.name（英語の国名）で検索し、一致した
 * topojson側のidをここへ転記して作った（2026-08、世界地図機能）。
 * 手打ちの推測ではなく実データと照合済み。
 *
 * 新しい産地をorigins.jsへ追加した場合は、この表にもISO数値コードを
 * 追加する必要がある（追加し忘れても地図の描画自体はエラーにならず、
 * その産地が地図上でハイライトされないだけになる。utils/visitedOrigins.js
 * 参照）。
 */
export const ALPHA2_TO_NUMERIC = {
  ET: "231", // Ethiopia
  KE: "404", // Kenya
  RW: "646", // Rwanda
  BI: "108", // Burundi
  TZ: "834", // Tanzania
  CO: "170", // Colombia
  BR: "076", // Brazil
  PE: "604", // Peru
  BO: "068", // Bolivia
  EC: "218", // Ecuador
  GT: "320", // Guatemala
  CR: "188", // Costa Rica
  PA: "591", // Panama
  SV: "222", // El Salvador
  HN: "340", // Honduras
  NI: "558", // Nicaragua
  MX: "484", // Mexico
  ID: "360", // Indonesia
  YE: "887", // Yemen
  IN: "356", // India
};
