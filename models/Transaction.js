import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Transaction log
 * - userId: reference to User
 * - type: TOPUP | DEBIT | REFUND | ADJUSTMENT
 * - amount: positive integer in paise
 * - balanceAfter: integer (paise)
 * - reason: short string (razorpay-topup, chat-minute-charge, refund)
 * - metadata: extra details like paymentId, orderId, etc.
 */

const TransactionSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["TOPUP", "DEBIT", "REFUND", "ADJUSTMENT"],
      required: true,
    },

    amount: {
      type: Number,
      required: true, // always positive
    },

    balanceAfter: {
      type: Number,
      required: true,
    },

    reason: {
      type: String,
      maxlength: 200,
    },

    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast lookup
TransactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Transaction", TransactionSchema);
