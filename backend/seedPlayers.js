const dotenv = require("dotenv");
const connectDB = require("./config/db");
const Player = require("./models/Player");
const players = require("./data/players");

dotenv.config();

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
