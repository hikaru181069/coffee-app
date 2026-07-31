import {
  getFutureStarsForUser,
  getRecommendationsForUser,
  getGroupedRecommendationsForUser,
} from "../services/recommendations/index.js";

import {
  fetchQuizHitters,
  fetchQuizPitchers,
} from "../services/mlb/quizRecommendationService.js";

import { getProspectsForUser } from "../services/recommendations/prospectRecommendationService.js";

const getRecommendations = async (req, res) => {
  try {
    const recommendations = await getRecommendationsForUser(req.user._id);

    res.json(recommendations);
  } catch (error) {
    console.error("Recommendation error:", error.message);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
};

const getFutureStars = async (req, res) => {
  try {
    const futureStars = await getFutureStarsForUser(req.user._id);

    res.json({ futureStars });
  } catch (error) {
    console.error("Future stars recommendation error:", error.message);
    res.status(500).json({
      message: "Failed to fetch future stars recommendations",
    });
  }
};

// GET /api/recommendations/quiz?type=hitter&style=power&age=young&league=AL
const getQuizRecommendations = async (req, res) => {
  const { type, style, age = "any", league = "both", position = "both" } = req.query;

  try {
    const players = type === "pitcher"
      ? await fetchQuizPitchers({ style, position, age })
      : await fetchQuizHitters({ style, age, league });

    res.json({ type, style, age, league, position, players });
  } catch (error) {
    console.error("Quiz recommendation error:", error.message);
    res.status(500).json({ message: "Failed to fetch quiz recommendations" });
  }
};

const getProspectRecommendations = async (req, res) => {
  try {
    const prospects = await getProspectsForUser(req.user._id);
    res.json(prospects);
  } catch (error) {
    console.error("Prospect recommendation error:", error.message);
    res.status(500).json({ message: "Failed to fetch prospect recommendations" });
  }
};

const getForYouRecommendations = async (req, res) => {
  try {
    const data = await getGroupedRecommendationsForUser(req.user._id);
    res.json(data);
  } catch (error) {
    console.error("For You recommendation error:", error.message);
    res.status(500).json({ message: "Failed to fetch For You recommendations" });
  }
};

export {
  getFutureStars,
  getRecommendations,
  getQuizRecommendations,
  getProspectRecommendations,
  getForYouRecommendations,
};
