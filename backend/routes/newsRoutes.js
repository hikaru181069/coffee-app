import express from "express";
import { getNews, getTeamNews } from "../controllers/newsController.js";

const router = express.Router();

router.get("/",             getNews);      // GET /api/news
router.get("/team/:teamId", getTeamNews);  // GET /api/news/team/:teamId

export default router;