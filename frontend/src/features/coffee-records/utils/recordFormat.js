/**
 * 表示・入力のための変換関数。
 *
 * DBは Date、APIはISO文字列、HTMLの input は独自形式、と
 * 3つの表現が混ざるので、変換を1か所へ集める。
 *
 * ラベル文字列は多言語化のため、テキストではなく翻訳キー（labelKey）を
 * 持たせている。呼び出し側が t(type.labelKey) の形で翻訳する。
 * DOM・APIに依存しない純粋関数のままにするため、ここではreact-i18nextの
 * t関数をimportせず、呼び出し側から受け取る形にしている。
 */

export const RECORD_TYPES = [
  { value: "home", labelKey: "recordForm.home" },
  { value: "cafe", labelKey: "recordForm.cafe" },
];

/**
 * 味覚グラフ（6軸レーダーチャート）の軸一覧。フォームの状態管理・
 * バリデーション・TasteRadarChartの3箇所で共有する単一の情報源。
 * 各軸は backend/models/CoffeeRecord.js の同名フィールド（1〜5、任意）
 * に対応する。backend/data/tasteKeywords.json のcategoryと呼び名を
 * 揃えているが、notesからは独立した手動入力（docs/domain-model.md参照）。
 */
export const TASTE_AXES = [
  { field: "tasteSweetness", labelKey: "recordForm.tasteSweetness" },
  { field: "tasteBitterness", labelKey: "recordForm.tasteBitterness" },
  { field: "tasteAcidity", labelKey: "recordForm.tasteAcidity" },
  { field: "tasteBody", labelKey: "recordForm.tasteBody" },
  { field: "tasteAroma", labelKey: "recordForm.tasteAroma" },
  { field: "tasteAftertaste", labelKey: "recordForm.tasteAftertaste" },
];

export const recordTypeLabel = (value, t) => {
  const labelKey = RECORD_TYPES.find((type) => type.value === value)?.labelKey;
  return labelKey ? t(labelKey) : value;
};

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

/** i18nextの言語コード（"ja"/"en"）をIntlのロケールへ変換する */
const toIntlLocale = (language) => (language === "en" ? "en-US" : "ja-JP");

/** 一覧・詳細に出す日付表記。languageは現在の表示言語（"ja"/"en"） */
export const formatConsumedAt = (isoString, language) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(toIntlLocale(language), {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/** 一覧のカードなど、狭い場所に出す短い日付。languageは現在の表示言語（"ja"/"en"） */
export const formatConsumedAtShort = (isoString, language) => {
  if (!isoString) return "";

  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(toIntlLocale(language), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
};

/**
 * "2026-01" のような年月文字列を、Stats画面の月別推移グラフに出す
 * 短いラベルへ変換する。languageは現在の表示言語（"ja"/"en"）
 */
export const formatMonthLabel = (monthString, language) => {
  if (!monthString) return "";

  const [year, month] = monthString.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(toIntlLocale(language), { year: "2-digit", month: "short" }).format(date);
};

/**
 * 記録が参照しているコーヒーの要素を、表示用の一覧にまとめる。
 *
 * 詳細画面で「設定されている項目だけ」をpillタグとして出したいので、
 * 空の項目を落とす処理と、各項目を{id, name}の配列（itemsが1件なら
 * 単一値、複数件なら複数値の項目）へそろえる処理をここに置く。
 * idが取れる項目（産地・農園・品種・精製方法・焙煎度・フレーバー）は
 * 呼び出し側（RecordDetailPage.jsx）でエンティティ詳細ページへの
 * Linkにする。ロースター名だけは知識グラフのノードが無いためidが
 * 常にnullになり、Linkにはしない。
 *
 * 2026-09、ブレンドコーヒー対応で産地・農園・品種・精製方法は
 * 「コーヒーの詳細」1グループ（component）の配列になった。
 * どの産地がどの精製方法と組み合わさっているかという対応関係は、
 * componentsごとに独立した行の集まり（`components`）として返すことで
 * 保つ。焙煎度・ロースター名・フレーバーは記録全体で1つの
 * 「カップとしての結果」のため、従来どおりフラットな一覧（`shared`）
 * のまま返す（docs/domain-model.md参照）。
 *
 * @param {object} record
 * @param {Function} t react-i18nextのt関数
 * @returns {{ components: Array<Array<{key, label, items}>>, shared: Array<{key, label, items}> }}
 */
export const collectCoffeeDetails = (record, t) => {
  if (!record) return { components: [], shared: [] };

  const toItems = (refs) => (refs ?? []).filter(Boolean).map((ref) => ({ id: ref.id, name: ref.name }));

  const components = (record.components ?? [])
    .map((component) =>
      [
        { key: "origin", label: t("recordForm.origin"), items: toItems(component.origin ? [component.origin] : []) },
        {
          key: "farmName",
          label: t("recordForm.farmName"),
          items: component.farmName ? [{ id: component.farmNodeId ?? null, name: component.farmName }] : [],
        },
        { key: "varieties", label: t("recordForm.variety"), items: toItems(component.varieties) },
        {
          key: "process",
          label: t("recordForm.process"),
          items: toItems(component.process ? [component.process] : []),
        },
      ].filter((row) => row.items.length > 0),
    )
    .filter((rows) => rows.length > 0);

  const shared = [
    {
      key: "roastLevel",
      label: t("recordForm.roastLevel"),
      items: toItems(record.roastLevel ? [record.roastLevel] : []),
    },
    {
      key: "roasterName",
      label: t("recordForm.roasterName"),
      items: record.roasterName ? [{ id: null, name: record.roasterName }] : [],
    },
    { key: "flavors", label: t("records.flavorsHeading"), items: toItems(record.flavors) },
  ].filter((detail) => detail.items.length > 0);

  return { components, shared };
};

/**
 * 記録に何かしらのコーヒー要素が設定されているか。
 *
 * collectCoffeeDetailsはラベル文言のためにt関数を必須にしているが、
 * ここでは値の有無だけを見たいのでtに依存せず直接判定する
 * （tを渡さずcollectCoffeeDetailsを呼ぶと`t is not a function`になる）。
 */
export const hasCoffeeDetails = (record) =>
  Boolean(
    record &&
      ((record.components ?? []).some(
        (component) =>
          component.origin || component.farmName || (component.varieties?.length ?? 0) > 0 || component.process,
      ) ||
        record.roastLevel?.name ||
        record.roasterName ||
        (record.flavors?.length ?? 0) > 0),
  );
