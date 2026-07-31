const FavoritePlayer = require("../models/FavoritePlayer");
const { logInteraction } = require("../services/interactionService");

const LIMITS = { hitter: 15, pitcher: 10 };

const checkLimit = async (userId, playerType) => {
  const type  = playerType === "pitcher" ? "pitcher" : "hitter";
  const count = await FavoritePlayer.countDocuments({ user: userId, playerType: type });
  return { type, count, limit: LIMITS[type], exceeded: count >= LIMITS[type] };
};

const getFavorites = async (req, res) => {
  try {
    const favorites = await FavoritePlayer.find({ user: req.user._id }).sort({
      createdAt: -1,
    });

    res.json(favorites);
  } catch (error) {
    console.error("Fetch favorites error:", error.message);
    res.status(500).json({ message: "Failed to fetch favorites" });
  }
};

const createFavorite = async (req, res) => {
  try {
    const { type, count, limit, exceeded } = await checkLimit(req.user._id, req.body.playerType);

    if (exceeded) {
      return res.status(400).json({
        message: `You can have up to ${limit} favorite ${type}s.`,
        limitReached: true,
        playerType: type,
        current: count,
        limit,
      });
    }

    const favorite = await FavoritePlayer.create({
      ...req.body,
      user: req.user._id,
    });

    logInteraction({
      userId: req.user._id,
      mlbPlayerId: favorite.mlbPlayerId,
      playerType: favorite.playerType,
      action: "favorite",
      source: "favorites",
    });

    res.status(201).json(favorite);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This player is already in your favorites",
      });
    }

    console.error("Create favorite error:", error.message);
    res.status(400).json({
      message: "Failed to create favorite",
      error: error.message,
    });
  }
};

const createManyFavorites = async (req, res) => {
  try {
    const { players } = req.body;

    if (!Array.isArray(players) || players.length === 0) {
      return res.status(400).json({ message: "Players are required" });
    }

    // 既存のお気に入りとタイプ別件数を取得
    const existing    = await FavoritePlayer.find({ user: req.user._id }).select("mlbPlayerId playerType");
    const existingIds = new Set(existing.map((f) => Number(f.mlbPlayerId)));
    const counts      = { hitter: 0, pitcher: 0 };
    for (const f of existing) counts[f.playerType || "hitter"]++;

    const remaining = {
      hitter:  Math.max(0, LIMITS.hitter  - counts.hitter),
      pitcher: Math.max(0, LIMITS.pitcher - counts.pitcher),
    };
    const addedNew = { hitter: 0, pitcher: 0 };

    const favorites = [];
    let skipped = 0;

    for (const player of players) {
      const type  = player.playerType === "pitcher" ? "pitcher" : "hitter";
      const isNew = !existingIds.has(Number(player.mlbPlayerId));

      if (isNew && addedNew[type] >= remaining[type]) {
        skipped++;
        continue;
      }

      if (isNew) addedNew[type]++;

      const favorite = await FavoritePlayer.findOneAndUpdate(
        { user: req.user._id, mlbPlayerId: player.mlbPlayerId },
        { ...player, user: req.user._id },
        { new: true, runValidators: true, setDefaultsOnInsert: true, upsert: true },
      );

      if (isNew) {
        logInteraction({
          userId: req.user._id,
          mlbPlayerId: favorite.mlbPlayerId,
          playerType: favorite.playerType,
          action: "favorite",
          source: "onboarding",
        });
      }

      favorites.push(favorite);
    }

    res.status(201).json({ favorites, skipped });
  } catch (error) {
    console.error("Create many favorites error:", error.message);
    res.status(400).json({
      message: "Failed to create favorites",
      error: error.message,
    });
  }
};

const updateFavorite = async (req, res) => {
  try {
    const favorite = await FavoritePlayer.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user._id,
      },
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );

    if (!favorite) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    res.json(favorite);
  } catch (error) {
    console.error("Update favorite error:", error.message);
    res.status(400).json({
      message: "Failed to update favorite",
      error: error.message,
    });
  }
};

const deleteFavorite = async (req, res) => {
  try {
    const favorite = await FavoritePlayer.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!favorite) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    res.json({ message: "Favorite deleted" });
  } catch (error) {
    console.error("Delete favorite error:", error.message);
    res.status(500).json({ message: "Failed to delete favorite" });
  }
};

module.exports = {
  createManyFavorites,
  getFavorites,
  createFavorite,
  updateFavorite,
  deleteFavorite,
};
