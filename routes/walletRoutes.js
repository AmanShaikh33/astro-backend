import express from "express";
import {
  createOrder,
  razorpayWebhook,
  getBalance,
} from "../controllers/wallet.controller.js";

const router = express.Router();

// Create Razorpay order
router.post("/create-order", createOrder);

// Razorpay webhook (RAW BODY)
router.post("/webhook", razorpayWebhook);

// Get wallet balance
router.get("/balance/:userId", getBalance);

export default router;
