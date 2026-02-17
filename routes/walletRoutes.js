import express from "express";
import {
  createOrder,
  razorpayWebhook,
  getBalance,
} from "../controllers/wallet.controller.js";

const router = express.Router();


router.post("/create-order", createOrder);


router.post("/webhook", razorpayWebhook);


router.get("/balance/:userId", getBalance);

export default router;
