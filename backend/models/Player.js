const mongoose = require("mongoose");

const playerSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  team: {
    type: String,
    required: true,
  },
  position: {
    type: String,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  externalId: {
    type: Number,
  },
  source: {
    type: String,
    default: "Manual",
  },

  playerType: {
    type: String,
    required: true,
    enum: ["hitter", "pitcher"],
    default: "hitter",
  },
  hitterStats: {
    battingAverage: {
      type: String,
      required: function () {
        return this.playerType === "hitter";
      },
    },
    homeRuns: {
      type: Number,
      required: function () {
        return this.playerType === "hitter";
      },
    },
    rbis: {
      type: Number,
      required: function () {
        return this.playerType === "hitter";
      },
    },
  },
  pitcherStats: {
    era: {
      type: String,
      required: function () {
        return this.playerType === "pitcher";
      },
    },
    strikeouts: {
      type: Number,
      required: function () {
        return this.playerType === "pitcher";
      },
    },
    inningsPitched: {
      type: String,
      required: function () {
        return this.playerType === "pitcher";
      },
    },
  },
});

module.exports = mongoose.model("Player", playerSchema);
