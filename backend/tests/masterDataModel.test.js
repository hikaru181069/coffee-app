/**
 * マスターデータ5モデルのスキーマ検証テスト。
 *
 * 一番の関心事は「同じ概念が重複登録されないか」。
 * name の表記が違っても normalizedName が一致すれば、
 * unique index が2件目の挿入を防ぐ（docs/product-principles.md
 * 「One Source of Truth」）。
 */

import Origin from "../models/Origin.js";
import Variety from "../models/Variety.js";
import Process from "../models/Process.js";
import Flavor from "../models/Flavor.js";
import RoastLevel from "../models/RoastLevel.js";

const NAME_BASED_MODELS = [
  ["Origin", Origin],
  ["Variety", Variety],
  ["Process", Process],
  ["Flavor", Flavor],
];

describe.each(NAME_BASED_MODELS)("%s（名前を一意キーにするマスター）", (_name, Model) => {
  test("name から normalizedName を導出する", async () => {
    const doc = new Model({ name: "  Washed Process  " });
    await doc.validate();

    expect(doc.name).toBe("Washed Process");
    expect(doc.normalizedName).toBe("washed process");
  });

  test("表記が違っても同じ normalizedName になる", async () => {
    const a = new Model({ name: "Natural" });
    const b = new Model({ name: "  NATURAL " });
    await a.validate();
    await b.validate();

    expect(a.normalizedName).toBe(b.normalizedName);
  });

  test("name を後から変更しても normalizedName が追随する", async () => {
    const doc = new Model({ name: "Natural" });
    await doc.validate();
    doc.name = "Washed";
    await doc.validate();

    expect(doc.normalizedName).toBe("washed");
  });

  test("name が無ければ検証に失敗する", async () => {
    await expect(new Model({}).validate()).rejects.toThrow();
  });

  test("normalizedName に unique index が張られている", () => {
    const uniqueIndexes = Model.schema
      .indexes()
      .filter(([, options]) => options.unique)
      .map(([fields]) => Object.keys(fields));

    // unique: true はパスの定義側にも書けるので、両方の書き方を許容して確認する
    const hasUnique =
      uniqueIndexes.some((fields) => fields.includes("normalizedName")) ||
      Model.schema.path("normalizedName").options.unique === true;

    expect(hasUnique).toBe(true);
  });
});

describe("Origin 固有", () => {
  test("countryCode を大文字にそろえる", async () => {
    const doc = new Origin({ name: "Ethiopia", countryCode: "et" });
    await doc.validate();

    expect(doc.countryCode).toBe("ET");
  });

  test("countryCode は任意（既定は null）", async () => {
    const doc = new Origin({ name: "Ethiopia" });
    await doc.validate();

    expect(doc.countryCode).toBeNull();
  });

  test("countryCode は2文字まで", async () => {
    await expect(
      new Origin({ name: "Ethiopia", countryCode: "ETH" }).validate(),
    ).rejects.toThrow();
  });
});

describe("Flavor 固有", () => {
  test("category は任意（既定は null）", async () => {
    const doc = new Flavor({ name: "Citrus" });
    await doc.validate();

    expect(doc.category).toBeNull();
  });
});

describe("RoastLevel", () => {
  test("name / key / order がそろえば検証を通る", async () => {
    const doc = new RoastLevel({ name: "Medium Light", key: "medium-light", order: 2 });
    await doc.validate();

    expect(doc.key).toBe("medium-light");
    expect(doc.order).toBe(2);
  });

  test("key を小文字にそろえる", async () => {
    const doc = new RoastLevel({ name: "Dark", key: "DARK", order: 5 });
    await doc.validate();

    expect(doc.key).toBe("dark");
  });

  test("key と order は必須", async () => {
    try {
      await new RoastLevel({ name: "Dark" }).validate();
      throw new Error("検証が通ってしまった");
    } catch (error) {
      expect(Object.keys(error.errors).sort()).toEqual(["key", "order"]);
    }
  });

  test("normalizedName は持たない（固定値で順序を持つため）", () => {
    expect(RoastLevel.schema.path("normalizedName")).toBeUndefined();
  });
});
