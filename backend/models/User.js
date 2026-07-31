import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    favoriteTeam: {
      id: {
        type: Number,
      },
      name: {
        type: String,
        default: "",
      },
      abbreviation: {
        type: String,
        default: "",
      },
    },
    hasCompletedOnboarding: {
      type: Boolean,
      default: false,
    },
    avatarUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model("User", userSchema);