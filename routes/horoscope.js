// routes/horoscope.js
import express from "express";
import { getDailyHoroscope } from "../controllers/horoscopeController.js";

const router = express.Router();

router.post("/daily", getDailyHoroscope);

export default router;