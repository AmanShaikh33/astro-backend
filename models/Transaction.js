import mongoose from "mongoose";

const { Schema } = mongoose;

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

TransactionSchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model("Transaction", TransactionSchema);
