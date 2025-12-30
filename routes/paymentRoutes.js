import express from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/User.js";

const router = express.Router();

router.get("/test", (req, res) => {
  res.send("payment route working");
});


// Create Razorpay Order
router.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body; // rupees

    const instance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    const order = await instance.orders.create({
      amount: amount * 100, // convert to paise
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    res.json(order);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Order creation failed" });
  }
});

// Verify Payment + Add Coins
router.post("/verify", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      userId,
      amount,
    } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: "Payment verification failed" });
    }

    // Payment Verified → Add Coins
    const user = await User.findById(userId);

    user.coins += amount; // 1 rupee = 1 coin

    user.transactions.push({
      type: "TOPUP",
      amount,
      coins: amount,
      razorpayPaymentId: razorpay_payment_id,
    });

    await user.save();

    res.json({ success: true, message: "Coins added", coins: user.coins });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Verification failed" });
  }
});


// ⭐ Get wallet balance
router.get("/balance/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);

    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, balance: user.coins });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false, message: "Error fetching balance" });
  }
});


export default router;
