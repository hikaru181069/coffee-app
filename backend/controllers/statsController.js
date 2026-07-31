import {
  fetchHittingLeaders,
  fetchPitchingLeaders,
} from "../services/mlb/leaderboardService.js";

import {
  fetchHotHitters,
  fetchHotPitchers,
} from "../services/mlb/hotPlayersService.js";

import { fetchRisingStars } from "../services/mlb/risingStarsService.js";

const getLeaders = async (req, res) => {
  const type = req.query.type === "pitching" ? "pitching" : "hitting";
  const limit = Math.min(Number(req.query.limit) || 10, 20);
  const league = ["al", "nl"].includes(req.query.league) ? req.query.league : "all";

  try {
    const data =
      type === "pitching"
        ? await fetchPitchingLeaders(limit, league)
        : await fetchHittingLeaders(limit, league);

    res.json({ type, league, season: new Date().getFullYear(), categories: data });
  } catch (error) {
    console.error("Stats leaders error:", error.message);
    res.status(500).json({ message: "Failed to fetch stats leaders" });
  }
};

// GET /api/stats/hot?days=14
const getHotPlayers = async (req, res) => {
  const days = Math.min(Number(req.query.days) || 14, 30);

  try {
    const [hitters, pitchers] = await Promise.all([
      fetchHotHitters({ days }),
      fetchHotPitchers({ days }),
    ]);

    res.json({ days, hitters, pitchers });
  } catch (error) {
    console.error("Hot players error:", error.message);
    res.status(500).json({ message: "Failed to fetch hot players" });
  }
};

// GET /api/stats/rising-stars
const getRisingStars = async (req, res) => {
  try {
    const data = await fetchRisingStars({ limit: 6 });
    res.json(data);
  } catch (error) {
    console.error("Rising stars error:", error.message);
    res.status(500).json({ message: "Failed to fetch rising stars" });
  }
};

export { getLeaders, getHotPlayers, getRisingStars };
