import mongoose from "mongoose";

const chatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    astrologer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Astrologer",
      required: true,
    },

    startTime: {
      type: Date,
      required: true,
    },

    endTime: {
      type: Date,
    },

    totalMinutes: {
      type: Number,
      default: 0,
    },

    coinsPerMinute: {
      type: Number,
      required: true,
    },

    totalCoinsDeducted: {
      type: Number,
      default: 0,
    },

    totalCoinsEarned: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["active", "ended"],
      default: "active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ChatSession", chatSessionSchema);
