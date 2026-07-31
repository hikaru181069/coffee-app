import express from "express";
import { getCompareAnalysis } from "../controllers/compareController.js";

const router = express.Router();

// GET /api/compare/analyze?p1=660271&p2=592450
router.get("/analyze", getCompareAnalysis);

export default router;