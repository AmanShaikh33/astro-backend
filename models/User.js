import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["TOPUP", "CHAT_DEBIT", "CHAT_CREDIT"],
      required: true,
    },
    amount: { type: Number, required: true },
    coins: { type: Number, required: true },
    razorpayPaymentId: { type: String },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatSession" },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["user", "astrologer", "admin"],
      default: "user",
    },

    coins: { type: Number, default: 0 },
    transactions: [transactionSchema],

     resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
