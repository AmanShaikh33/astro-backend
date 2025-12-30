import mongoose from "mongoose";

const astrologerSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: {  // <-- added name field
    type: String,
    required: true
  },
  bio: {
    type: String,
    required: true
  },
  skills: {
    type: [String],
    default: []
  },
  languages: {
    type: [String],
    default: []
  },
  pricePerMinute: {
    type: Number,
    required: true
  },
  experience: {
    type: String,
    required: true
  },
  profilePic: {
    type: String
  },
  availability: {
    type: String,
    enum: ["online", "offline"],
    default: "offline"
  },
  isApproved: {
    type: String,
    enum: ["pending", "approved", "rejected"],
    default: "pending"
  }
}, { timestamps: true });

export default mongoose.model("Astrologer", astrologerSchema);
