/**
 * utils/objectId.js のユニットテスト。
 *
 * ObjectIdの判定がゆるいと不正な入力がMongooseまで届いて500になり、
 * 重複除去が効かないとグラフのエッジが二重になる。
 */

import mongoose from "mongoose";
import { isObjectIdString, isObjectIdLike, dedupeIds } from "../utils/objectId.js";

describe("isObjectIdString", () => {
  test("24桁の16進数を受け入れる", () => {
    expect(isObjectIdString("507f1f77bcf86cd799439011")).toBe(true);
    expect(isObjectIdString(new mongoose.Types.ObjectId().toString())).toBe(true);
  });

  test("24桁でも16進数でなければ拒否する", () => {
    expect(isObjectIdString("zzzzzzzzzzzzzzzzzzzzzzzz")).toBe(false);
  });

  test("桁数が違えば拒否する", () => {
    expect(isObjectIdString("507f1f77bcf86cd79943901")).toBe(false);
    expect(isObjectIdString("507f1f77bcf86cd7994390111")).toBe(false);
  });

  test("24桁の16進数でない文字列を拒否する", () => {
    // Mongooseの判定に頼らず「24桁の16進数」を条件として明示している。
    // 過去のMongooseは12文字の任意文字列も有効としており、
    // バージョン差で受け入れ範囲が変わらないようにするため。
    expect(isObjectIdString("abcdefghijkl")).toBe(false);
    expect(isObjectIdString("507f1f77bcf86cd79943901g")).toBe(false);
  });

  test("文字列以外は拒否する", () => {
    expect(isObjectIdString(null)).toBe(false);
    expect(isObjectIdString(undefined)).toBe(false);
    expect(isObjectIdString(123)).toBe(false);
  });
});

describe("isObjectIdLike", () => {
  test("ObjectIdインスタンスも受け入れる", () => {
    expect(isObjectIdLike(new mongoose.Types.ObjectId())).toBe(true);
  });

  test("不正な文字列は拒否する", () => {
    expect(isObjectIdLike("abc")).toBe(false);
  });
});

describe("dedupeIds", () => {
  test("同じIDを別インスタンスで渡しても1つにまとめる", () => {
    const id = new mongoose.Types.ObjectId();
    const same = new mongoose.Types.ObjectId(id.toString());
    const other = new mongoose.Types.ObjectId();

    const result = dedupeIds([id, same, other]);

    expect(result).toHaveLength(2);
  });

  test("元の並び順を保つ", () => {
    const a = new mongoose.Types.ObjectId();
    const b = new mongoose.Types.ObjectId();

    const result = dedupeIds([a, b, a]);

    expect(result.map(String)).toEqual([a.toString(), b.toString()]);
  });

  test("null と undefined を取り除く", () => {
    const id = new mongoose.Types.ObjectId();
    expect(dedupeIds([id, null, undefined])).toHaveLength(1);
  });

  test("空配列はそのまま返す", () => {
    expect(dedupeIds([])).toEqual([]);
  });

  test("配列以外はそのまま返す（Mongooseのキャストに任せる）", () => {
    expect(dedupeIds(undefined)).toBeUndefined();
  });
});
