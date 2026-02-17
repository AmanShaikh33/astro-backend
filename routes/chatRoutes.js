import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import ChatSession from "../models/ChatSession.js";
import Astrologer from "../models/Astrologer.js";

import {
  createOrGetChatRoom,
  sendMessage,
  getMessages,
  getUserChats,
  acceptChatRequest,
  endChatSession,
} from "../controllers/chatController.js";

const router = express.Router();

router.post("/accept", protect, acceptChatRequest);

router.post("/end", protect, endChatSession);



router.post("/create-room", protect, createOrGetChatRoom);
router.post("/send", protect, sendMessage);
router.get("/messages/:chatRoomId", protect, getMessages);
router.get("/my-chats", protect, getUserChats);
router.get("/history", protect, async (req, res) => {
  try {
    console.log("📜 User history request from:", req.user);
    const userId = req.user.id || req.user._id;
    console.log("🔍 Looking for sessions with userId:", userId);
    
    const sessions = await ChatSession.find({ user: userId, status: "ended" })
      .populate("astrologer", "name")
      .sort({ startTime: -1 });
    
    console.log("✅ Found sessions:", sessions.length);
    res.json(sessions.map(s => ({ ...s.toObject(), astrologerName: s.astrologer?.name })));
  } catch (error) {
    console.error("❌ History error:", error);
    res.status(500).json({ message: error.message });
  }
});
router.get("/astrologer-history", protect, async (req, res) => {
  try {
    console.log("📜 Astrologer history request from:", req.user);
    const userId = req.user.id || req.user._id;
    console.log("🔍 Looking for astrologer with userId:", userId);
    
    const astrologer = await Astrologer.findOne({ userId });
    if (!astrologer) {
      console.log("⚠️ No astrologer profile found for userId:", userId);
      return res.json([]);
    }
    
    console.log("✅ Found astrologer:", astrologer._id);
  
    const sessions = await ChatSession.find({ astrologer: astrologer._id, status: "ended" })
      .populate("user", "name")
      .sort({ startTime: -1 });
    
    console.log("✅ Found sessions:", sessions.length);
    res.json(sessions.map(s => ({ ...s.toObject(), userName: s.user?.name })));
  } catch (error) {
    console.error("❌ Astrologer history error:", error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
