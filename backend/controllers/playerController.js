const Player = require("../models/Player");

const getPlayers = async (req, res) => {
  try {
    const players = await Player.find();
    res.json(players);
  } catch (error) {
    console.error("Fetch players error:", error.name, error.message);
    res.status(500).json({ message: "Failed to fetch players" });
  }
};

const createPlayer = async (req, res) => {
  try {
    const player = await Player.create(req.body);
    res.status(201).json(player);
  } catch (error) {
    console.error("Create player error:", error.message);
    res.status(400).json({
      message: "Failed to create player",
      error: error.message,
    });
  }
};

const searchPlayers = async (req, res) => {
  try {
    const searchText = req.query.q || "";

    const players = await Player.find({
      $or: [
        { name: { $regex: searchText, $options: "i" } },
        { team: { $regex: searchText, $options: "i" } },
        { position: { $regex: searchText, $options: "i" } },
      ],
    });

    res.json(players);
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ message: "Failed to search players" });
  }
};

const getPlayerById = async (req, res) => {
  try {
    const player = await Player.findById(req.params.id);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json(player);
  } catch (error) {
    console.error("Player detail error:", error.message);
    res.status(500).json({ message: "Failed to fetch player" });
  }
};

const updatePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json(player);
  } catch (error) {
    console.error("Update player error:", error.message);
    res.status(500).json({ message: "Failed to update player" });
  }
};

const deletePlayer = async (req, res) => {
  try {
    const player = await Player.findByIdAndDelete(req.params.id);

    if (!player) {
      return res.status(404).json({ message: "Player not found" });
    }

    res.json({ message: "Player deleted" });
  } catch (error) {
    console.error("Delete player error:", error.message);
    res.status(500).json({ message: "Failed to delete player" });
  }
};

module.exports = {
  getPlayers,
  createPlayer,
  searchPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
};
