import { getQualityScoresForOrigin, getQualityScoresForAllOrigins } from "../core/originQuality/originQualityBuilder.js";

const CQI_DATASET = {
  entries: [
    { originName: "Ethiopia", processName: "Natural", avgQualityScore: 86.4, sampleSize: 210 },
    { originName: "Ethiopia", processName: "Washed", avgQualityScore: 85.1, sampleSize: 260 },
    { originName: "Panama", processName: "Washed", avgQualityScore: 87.0, sampleSize: 90 },
  ],
};

describe("getQualityScoresForOrigin", () => {
  test("指定した産地のエントリだけを、スコアの高い順で返す", () => {
    const result = getQualityScoresForOrigin(CQI_DATASET, "Ethiopia");

    expect(result).toEqual([
      { processLabel: "Natural", avgQualityScore: 86.4, sampleSize: 210 },
      { processLabel: "Washed", avgQualityScore: 85.1, sampleSize: 260 },
    ]);
  });

  test("CQIデータに無い産地なら空配列を返す", () => {
    expect(getQualityScoresForOrigin(CQI_DATASET, "Vietnam")).toEqual([]);
  });
});

describe("getQualityScoresForAllOrigins", () => {
  test("産地ごとに精製方法をまたいだ平均スコアを1件にまとめ、スコアの高い順で返す", () => {
    const result = getQualityScoresForAllOrigins(CQI_DATASET);

    expect(result).toEqual([
      { originName: "Panama", avgQualityScore: 87.0 },
      { originName: "Ethiopia", avgQualityScore: (86.4 + 85.1) / 2 },
    ]);
  });

  test("entriesが空なら空配列を返す", () => {
    expect(getQualityScoresForAllOrigins({ entries: [] })).toEqual([]);
  });
});
