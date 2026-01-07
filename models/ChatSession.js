// models/ChatSession.js
import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: "ChatRoom", required: true },

    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    astrologerId: { type: mongoose.Schema.Types.ObjectId, ref: "Astrologer", required: true },

    pricePerMinute: { type: Number, required: true },

    startedAt: { type: Date },
    endedAt: { type: Date },

    lastBilledAt: { type: Date }, // 🔑 IMPORTANT
    totalSeconds: { type: Number, default: 0 },
    totalCoinsDeducted: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["waiting", "active", "ended", "low_balance"],
      default: "waiting"
    }
  },
  { timestamps: true }
);

export default mongoose.model("ChatSession", chatSessionSchema);
