/**
 * 表示・入力のための変換関数。
 *
 * DBは Date、APIはISO文字列、HTMLの input は独自形式、と
 * 3つの表現が混ざるので、変換を1か所へ集める。
 */

export const RECORD_TYPES = [
  { value: "home", label: "家で" },
  { value: "cafe", label: "カフェで" },
];

export const recordTypeLabel = (value) =>
  RECORD_TYPES.find((type) => type.value === value)?.label ?? value;

/**
 * ISO文字列を <input type="datetime-local"> が受け付ける形へ変換する。
 *
 * input が要求するのは "YYYY-MM-DDTHH:mm" というローカル時刻の文字列。
 * ISO文字列（UTC）をそのまま渡すと、時差のぶんだけずれて表示される。
 * getTimezoneOffset を引いてローカル時刻に直してから切り出す。
 */
export const toDateTimeLocalValue = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  const localMs = date.getTime() - date.getTimezoneOffset() * 60 * 1000;
  return new Date(localMs).toISOString().slice(0, 16);
};

/**
 * datetime-local の値をISO文字列へ戻す。
 *
 * new Date("2026-07-31T09:00") はローカル時刻として解釈されるので、
 * toISOString() すれば正しくUTCへ変換される。
 */
export const fromDateTimeLocalValue = (value) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString();
};

/** 一覧・詳細に出す日付表記 */
export const formatConsumedAt = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/** 一覧のカードなど、狭い場所に出す短い日付 */
export const formatConsumedAtShort = (isoString) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

/**
 * 記録が参照しているコーヒーの要素を、表示用の一覧にまとめる。
 *
 * 詳細画面とカードの両方で「設定されている項目だけ」を出したいので、
 * 空の項目を落とす処理をここに置く。
 */
export const collectCoffeeDetails = (record) => {
  if (!record) return [];

  const details = [
    { key: "origin", label: "産地", value: record.origin?.name },
    { key: "farmName", label: "農園", value: record.farmName },
    {
      key: "varieties",
      label: "品種",
      value: record.varieties?.map((variety) => variety.name).join("、"),
    },
    { key: "process", label: "精製方法", value: record.process?.name },
    { key: "roastLevel", label: "焙煎度", value: record.roastLevel?.name },
    { key: "roasterName", label: "焙煎者", value: record.roasterName },
  ];

  return details.filter((detail) => detail.value);
};

/** 記録に何かしらのコーヒー要素が設定されているか */
export const hasCoffeeDetails = (record) =>
  collectCoffeeDetails(record).length > 0 || (record?.flavors?.length ?? 0) > 0;
