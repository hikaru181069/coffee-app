import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { changePassword, deleteAccount, getMe, updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.use(authenticate);

router.get("/me", getMe);
router.patch("/me", updateProfile);
router.patch("/me/password", changePassword);
router.delete("/me", deleteAccount);

export default router;
