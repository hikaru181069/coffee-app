const express = require("express");
const { getNews, getTeamNews } = require("../controllers/newsController");

const router = express.Router();

router.get("/",             getNews);      // GET /api/news
router.get("/team/:teamId", getTeamNews);  // GET /api/news/team/:teamId

module.exports = router;
