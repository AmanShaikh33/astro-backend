import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["TOPUP"], required: true },
    amount: { type: Number, required: true }, // rupees
    coins: { type: Number, required: true }, // coins credited
    razorpayPaymentId: { type: String },
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
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
