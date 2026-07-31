import mongoose from "mongoose";

const interactionSchema = new mongoose.Schema(
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
    playerType: {
      type: String,
      enum: ["hitter", "pitcher"],
      default: "hitter",
    },
    action: {
      type: String,
      enum: ["view", "favorite", "dislike"],
      required: true,
    },
    source: {
      type: String,
      default: "detail",
    },
  },
  { timestamps: true },
);

// 「直近の行動を新しい順に取得する」クエリ(getUserPreferenceProfile)専用
interactionSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model("Interaction", interactionSchema);