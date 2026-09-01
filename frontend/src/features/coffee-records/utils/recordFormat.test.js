import { describe, expect, test } from "vitest";
import {
  RECORD_TYPES,
  TASTE_AXES,
  recordTypeLabel,
  toDateTimeLocalValue,
  fromDateTimeLocalValue,
  formatConsumedAt,
  formatConsumedAtShort,
  formatMonthLabel,
  collectCoffeeDetails,
  hasCoffeeDetails,
} from "./recordFormat";

// 翻訳キーをそのまま返す最小限のスタブ。表示文言のテストはi18nロケール
// ファイル側の責務なので、ここでは「正しいキーが渡されたか」だけを見る
const t = (key) => key;

describe("recordTypeLabel", () => {
  test("既知のvalueなら対応する翻訳キーをtへ渡した結果を返す", () => {
    expect(recordTypeLabel("home", t)).toBe("recordForm.home");
    expect(recordTypeLabel("cafe", t)).toBe("recordForm.cafe");
  });

  test("未知のvalueはそのまま返す", () => {
    expect(recordTypeLabel("unknown", t)).toBe("unknown");
  });
});

describe("toDateTimeLocalValue / fromDateTimeLocalValue", () => {
  test("往復すると同じ時刻に戻る", () => {
    const iso = "2026-07-31T09:00:00.000Z";
    const localValue = toDateTimeLocalValue(iso);
    const backToIso = fromDateTimeLocalValue(localValue);

    expect(new Date(backToIso).getTime()).toBe(new Date(iso).getTime());
  });

  test("toDateTimeLocalValueは YYYY-MM-DDTHH:mm 形式を返す", () => {
    expect(toDateTimeLocalValue("2026-07-31T09:00:00.000Z")).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
  });

  test("空・不正な値は空文字を返す", () => {
    expect(toDateTimeLocalValue("")).toBe("");
    expect(toDateTimeLocalValue(null)).toBe("");
    expect(toDateTimeLocalValue("not-a-date")).toBe("");
    expect(fromDateTimeLocalValue("")).toBe("");
    expect(fromDateTimeLocalValue("not-a-date")).toBe("");
  });
});

describe("formatConsumedAt / formatConsumedAtShort / formatMonthLabel", () => {
  const iso = "2026-07-15T12:00:00.000Z";

  test("年を含む文字列を返す（言語でロケールが変わる）", () => {
    expect(formatConsumedAt(iso, "ja")).toContain("2026");
    expect(formatConsumedAt(iso, "en")).toContain("2026");
    expect(formatConsumedAtShort(iso, "ja")).toContain("2026");
  });

  test("空・不正な値は空文字を返す", () => {
    expect(formatConsumedAt("", "ja")).toBe("");
    expect(formatConsumedAt("not-a-date", "ja")).toBe("");
    expect(formatConsumedAtShort("", "ja")).toBe("");
    expect(formatMonthLabel("", "ja")).toBe("");
  });

  test("formatMonthLabelは年月文字列から短いラベルを作る", () => {
    expect(formatMonthLabel("2026-07", "ja")).toContain("26");
  });
});

describe("collectCoffeeDetails", () => {
  test("設定されている項目だけを{id,name}配列として返す", () => {
    const record = {
      origin: { id: "origin:1", name: "Ethiopia" },
      farmName: "",
      varieties: [],
      process: null,
      roastLevel: null,
      roasterName: "",
      flavors: [{ id: "flavor:1", name: "Berry" }],
    };

    const details = collectCoffeeDetails(record, t);

    expect(details.map((d) => d.key)).toEqual(["origin", "flavors"]);
    expect(details[0].items).toEqual([{ id: "origin:1", name: "Ethiopia" }]);
  });

  test("recordがnullなら空配列を返す", () => {
    expect(collectCoffeeDetails(null, t)).toEqual([]);
  });

  test("farmNameはidを持たない項目として返る（知識グラフのノードが無いため）", () => {
    const details = collectCoffeeDetails({ farmName: "Konga Washing Station" }, t);
    expect(details).toEqual([
      {
        key: "farmName",
        label: "recordForm.farmName",
        items: [{ id: null, name: "Konga Washing Station" }],
      },
    ]);
  });

  test("何も設定されていなければ空配列を返す", () => {
    expect(collectCoffeeDetails({}, t)).toEqual([]);
  });
});

describe("hasCoffeeDetails", () => {
  test("いずれかの項目があればtrue", () => {
    expect(hasCoffeeDetails({ origin: { name: "Ethiopia" } })).toBe(true);
    expect(hasCoffeeDetails({ flavors: [{ name: "Berry" }] })).toBe(true);
  });

  test("何も無ければfalse", () => {
    expect(hasCoffeeDetails({})).toBe(false);
    expect(hasCoffeeDetails(null)).toBe(false);
  });
});

describe("定数", () => {
  test("RECORD_TYPESはhome/cafeの2種類", () => {
    expect(RECORD_TYPES.map((type) => type.value)).toEqual(["home", "cafe"]);
  });

  test("TASTE_AXESは6軸", () => {
    expect(TASTE_AXES).toHaveLength(6);
  });
});
