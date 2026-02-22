import mongoose from "mongoose";

const settlementSchema = new mongoose.Schema({
  astrologer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Astrologer",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  upiReference: {
    type: String,
    required: true,
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

export default mongoose.model("Settlement", settlementSchema);