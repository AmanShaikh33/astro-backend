import express from "express";
import { matchKundliHandler } from "../controllers/Matchkundlicontroller.js";

const router = express.Router();
router.post("/match", matchKundliHandler);

export default router;