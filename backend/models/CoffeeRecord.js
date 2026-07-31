import mongoose from "mongoose";
import { dedupeIds } from "../utils/objectId.js";

/**
 * CoffeeRecord — ユーザーが1回のコーヒー体験を記録したもの。
 * このアプリの中心エンティティ（docs/domain-model.md）。
 *
 * 設計の要点:
 *
 * 1. 参照と埋め込みの使い分け（docs/database.md）
 *    origin / variety / process / roastLevel / flavor は別コレクションへの参照にする。
 *    表記揺れを防ぎ、知識グラフで同じ属性を1ノードに統合できるようにするため。
 *    一方 farmName は文字列として直接持つ。農園はデータ品質を担保しにくく、
 *    MVPでマスター化しても重複だらけになるため（同 docs/domain-model.md「Farm」）。
 *
 * 2. recordType による項目の出し分けはUI側の責務
 *    home / cafe で表示項目は変わるが、DB上は同じモデルで管理する。
 *    cafeName を cafe のとき必須にはしていない（任意項目のまま）。
 *    docs/mvp.md が cafeName を「カフェ記録のみ任意」としているため。
 *
 * 3. グラフ用のノード・エッジはここに保存しない
 *    CoffeeRecord とマスターデータから要求時に導出する（docs/database.md
 *    「Graph Persistence」）。二重管理と更新時の同期問題を避けるため。
 */
const coffeeRecordSchema = new mongoose.Schema(
  {
    // 所有者。リクエスト本文ではなく認証情報から設定する（CLAUDE.md）
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // ── 必須項目（記録を最短で完了させるための最小セット）──────────
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    consumedAt: {
      type: Date,
      required: true,
    },
    recordType: {
      type: String,
      required: true,
      enum: ["home", "cafe"],
    },

    // ── 任意項目 ─────────────────────────────────────────────
    // 未評価と「星1」を区別したいので、既定値は 0 ではなく null
    rating: {
      type: Number,
      default: null,
      min: 1,
      max: 5,
      validate: {
        validator: (value) => value === null || Number.isInteger(value),
        message: "rating must be an integer between 1 and 5",
      },
    },
    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: 2000,
    },
    cafeName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    roasterName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },

    // ── コーヒーの要素（知識グラフのノードになる）──────────────────
    originId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Origin",
      default: null,
    },
    // 農園だけはマスター化せず文字列で持つ（上のコメント参照）
    farmName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 120,
    },
    varietyIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Variety" }],
      default: [],
      // 同じ品種を2回選んでもグラフのエッジが二重にならないよう、保存前に重複を除く
      set: dedupeIds,
    },
    processId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Process",
      default: null,
    },
    roastLevelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoastLevel",
      default: null,
    },
    flavorIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Flavor" }],
      default: [],
      set: dedupeIds,
    },
  },
  { timestamps: true },
);

// 一覧は「自分の記録を新しい順に」取るのが基本形（docs/api.md の既定sort）
coffeeRecordSchema.index({ userId: 1, consumedAt: -1 });

// 産地での絞り込み・グラフの関連記録取得で使う
coffeeRecordSchema.index({ userId: 1, originId: 1 });

// flavorIds は配列なのでマルチキーインデックスになる。
// 「このフレーバーを含む自分の記録」を引くために必要
coffeeRecordSchema.index({ userId: 1, flavorIds: 1 });

export default mongoose.model("CoffeeRecord", coffeeRecordSchema);
