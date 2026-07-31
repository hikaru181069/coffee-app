import express from "express";
import { getScoutingReport } from "../controllers/scoutController.js";

const router = express.Router();

router.get("/:playerId", getScoutingReport);

export default router;