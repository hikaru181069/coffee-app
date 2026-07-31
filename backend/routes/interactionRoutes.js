const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const { recordInteraction } = require("../controllers/interactionController");

const router = express.Router();

router.post("/", protect, recordInteraction);

module.exports = router;
