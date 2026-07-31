/**
 * models/CoffeeRecord.js のスキーマ検証テスト。
 *
 * Mongooseの validate() はメモリ上のドキュメントを検証するだけなので、
 * MongoDBへ接続しなくても実行できる。CIにDBを用意せずに済む
 * （既存の tests/ もDB非依存の方針で書かれている）。
 *
 * 注意: 同期版の validateSync() は pre("validate") フックを実行しないため、
 * このプロジェクトでは await doc.validate() を使う。
 */

import mongoose from "mongoose";
import CoffeeRecord from "../models/CoffeeRecord.js";

const objectId = () => new mongoose.Types.ObjectId();

/** 検証を通る最小限の記録を作る。テストごとに必要な項目だけ上書きする */
const buildRecord = (overrides = {}) =>
  new CoffeeRecord({
    userId: objectId(),
    title: "Ethiopia Natural",
    consumedAt: new Date("2026-07-31T09:00:00.000Z"),
    recordType: "home",
    ...overrides,
  });

/** validate() が投げたエラーからフィールド名の一覧を取り出す */
const errorFields = async (doc) => {
  try {
    await doc.validate();
    return [];
  } catch (error) {
    return Object.keys(error.errors).sort();
  }
};

describe("必須項目", () => {
  test("何も指定しないと必須4項目がエラーになる", async () => {
    const fields = await errorFields(new CoffeeRecord({}));

    expect(fields).toEqual(["consumedAt", "recordType", "title", "userId"]);
  });

  test("必須項目がそろっていれば検証を通る", async () => {
    expect(await errorFields(buildRecord())).toEqual([]);
  });

  test("titleが空白のみなら必須エラーになる", async () => {
    // trim後に空文字になるため required に引っかかる
    expect(await errorFields(buildRecord({ title: "   " }))).toContain("title");
  });
});

describe("recordType", () => {
  test("home と cafe を受け入れる", async () => {
    expect(await errorFields(buildRecord({ recordType: "home" }))).toEqual([]);
    expect(await errorFields(buildRecord({ recordType: "cafe" }))).toEqual([]);
  });

  test("それ以外は拒否する", async () => {
    expect(await errorFields(buildRecord({ recordType: "office" }))).toContain(
      "recordType",
    );
  });
});

describe("rating", () => {
  test("既定値は null（未評価と星1を区別するため）", () => {
    expect(buildRecord().rating).toBeNull();
  });

  test("1〜5の整数を受け入れる", async () => {
    for (const rating of [1, 2, 3, 4, 5]) {
      expect(await errorFields(buildRecord({ rating }))).toEqual([]);
    }
  });

  test("範囲外は拒否する", async () => {
    expect(await errorFields(buildRecord({ rating: 0 }))).toContain("rating");
    expect(await errorFields(buildRecord({ rating: 6 }))).toContain("rating");
  });

  test("小数は拒否する", async () => {
    expect(await errorFields(buildRecord({ rating: 3.5 }))).toContain("rating");
  });
});

describe("文字列項目", () => {
  test("titleの前後の空白を取り除く", () => {
    expect(buildRecord({ title: "  Kenya AA  " }).title).toBe("Kenya AA");
  });

  test("titleの上限は120文字", async () => {
    expect(await errorFields(buildRecord({ title: "a".repeat(120) }))).toEqual([]);
    expect(await errorFields(buildRecord({ title: "a".repeat(121) }))).toContain(
      "title",
    );
  });

  test("notesの上限は2000文字", async () => {
    expect(await errorFields(buildRecord({ notes: "a".repeat(2001) }))).toContain(
      "notes",
    );
  });

  test("任意の文字列項目の既定値は空文字", () => {
    const record = buildRecord();

    expect(record.notes).toBe("");
    expect(record.cafeName).toBe("");
    expect(record.roasterName).toBe("");
    expect(record.farmName).toBe("");
  });
});

describe("マスターデータへの参照", () => {
  test("未選択（null）を許可する", async () => {
    const record = buildRecord();

    expect(record.originId).toBeNull();
    expect(record.processId).toBeNull();
    expect(record.roastLevelId).toBeNull();
    expect(await errorFields(record)).toEqual([]);
  });

  test("配列の既定値は空配列", () => {
    const record = buildRecord();

    expect(record.varietyIds).toEqual([]);
    expect(record.flavorIds).toEqual([]);
  });

  test("ObjectIdとして解釈できない値は拒否する", async () => {
    expect(await errorFields(buildRecord({ originId: "not-an-id" }))).toContain(
      "originId",
    );
  });
});

describe("配列の重複除去", () => {
  test("flavorIds の重複を取り除く（エッジが二重にならないように）", () => {
    const flavor = objectId();
    const duplicate = new mongoose.Types.ObjectId(flavor.toString());
    const other = objectId();

    const record = buildRecord({ flavorIds: [flavor, duplicate, other] });

    expect(record.flavorIds).toHaveLength(2);
  });

  test("varietyIds の重複を取り除く", () => {
    const variety = objectId();
    const record = buildRecord({
      varietyIds: [variety, new mongoose.Types.ObjectId(variety.toString())],
    });

    expect(record.varietyIds).toHaveLength(1);
  });

  test("重複していなければそのまま保つ", () => {
    const record = buildRecord({ flavorIds: [objectId(), objectId(), objectId()] });

    expect(record.flavorIds).toHaveLength(3);
  });
});

describe("インデックス", () => {
  test("docs/database.md の推奨インデックスが定義されている", () => {
    const defined = CoffeeRecord.schema
      .indexes()
      .map(([fields]) => JSON.stringify(fields));

    expect(defined).toContain(JSON.stringify({ userId: 1, consumedAt: -1 }));
    expect(defined).toContain(JSON.stringify({ userId: 1, originId: 1 }));
    expect(defined).toContain(JSON.stringify({ userId: 1, flavorIds: 1 }));
  });
});
