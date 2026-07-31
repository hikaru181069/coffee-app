import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { recordInteraction } from "../controllers/interactionController.js";

const router = express.Router();

router.post("/", protect, recordInteraction);

export default router;