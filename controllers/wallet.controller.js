import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import User from "../models/User.js";
import Payment from "../models/Payment.js";
import adjustBalance from "../utils/adjustBalance.js";

// -------------------------------------
// Create Razorpay Order
// -------------------------------------
export const createOrder = async (req, res) => {
  try {
    const { amount, userId } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ error: "Invalid amount" });

    const order = await razorpay.orders.create({
      amount: amount * 100, // rupees → paise
      currency: "INR",
      receipt: "order_" + Date.now(),
      notes: { userId },
    });

    // Save payment record
    await Payment.create({
      orderId: order.id,
      userId,
      amount: order.amount,
      status: "created",
    });

    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "order_creation_failed" });
  }
};

// -------------------------------------
// Razorpay Webhook
// -------------------------------------
export const razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];

  const expected = crypto
    .createHmac("sha256", secret)
    .update(req.body) // raw body, not JSON
    .digest("hex");

  if (signature !== expected) {
    return res.status(400).json({ status: "invalid_signature" });
  }

  const event = req.body.event;

  if (event === "payment.captured") {
    const payment = req.body.payload.payment.entity;

    const userId = payment.notes.userId;
    const amount = payment.amount;

    // Update payment record
    await Payment.findOneAndUpdate(
      { orderId: payment.order_id },
      {
        paymentId: payment.id,
        status: "paid",
      }
    );

    // Add money to wallet
    await adjustBalance(userId, amount, "TOPUP", {
      paymentId: payment.id,
      orderId: payment.order_id,
    });

    return res.json({ status: "wallet_credited" });
  }

  return res.json({ status: "ignored_event" });
};

// -------------------------------------
// Get Wallet Balance
// -------------------------------------
export const getBalance = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId).select("walletBalance");
    if (!user) return res.status(404).json({ error: "user_not_found" });

    return res.json({ success: true, balance: user.walletBalance });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server_error" });
  }
};
