const mongoose = require("mongoose");

const favoritePlayerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    mlbPlayerId: {
      type: Number,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    teamName: {
      type: String,
      default: "Unknown",
    },
    position: {
      type: String,
      default: "Unknown",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    playerType: {
      type: String,
      enum: ["hitter", "pitcher"],
      default: "hitter",
    },
    // お気に入り登録時点の成績スナップショット。
    // Favorites一覧・編集ページの軽量表示専用（選手ごとにライブAPIを叩かずに
    // 一覧を出すため）。最新の成績は選手詳細ページで別途ライブ取得している。
    hitterStats: {
      battingAverage: {
        type: String,
        default: "",
      },
      homeRuns: {
        type: Number,
        default: 0,
      },
      rbis: {
        type: Number,
        default: 0,
      },
    },
    baseballSavantUrl: {
      type: String,
      default: "",
    },
    pitcherStats: {
      era: {
        type: String,
        default: "",
      },
      strikeouts: {
        type: Number,
        default: 0,
      },
      inningsPitched: {
        type: String,
        default: "",
      },
    },
    note: {
      type: String,
      default: "",
    },
    favoriteReason: {
      type: String,
      default: "",
    },
    tags: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      default: "MLB Stats API",
    },
  },
  {
    timestamps: true,
  },
);

favoritePlayerSchema.index({ user: 1, mlbPlayerId: 1 }, { unique: true });

module.exports = mongoose.model("FavoritePlayer", favoritePlayerSchema);
