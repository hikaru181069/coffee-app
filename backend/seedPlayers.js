// app.js と同じ理由で、dotenv は他のimportより先に評価させる。
import "dotenv/config";

import connectDB from "./config/db.js";
import Player from "./models/Player.js";
import players from "./data/players.js";

const seedPlayers = async () => {
  try {
    await connectDB();

    await Player.deleteMany();
    await Player.insertMany(players);

    console.log("Players seeded");
    process.exit();
  } catch (error) {
    console.error("Seed error:", error.message);
    process.exit(1);
  }
};

seedPlayers();
