import express from "express";
import { protect } from "../middlewares/authMiddleware.js";

import {
  createOrGetChatRoom,
  sendMessage,
  getMessages,
  getUserChats,
  acceptChatRequest,
  endChatSession,
} from "../controllers/chatController.js";

const router = express.Router();

/* ===============================
   CHAT REQUEST / SESSION LIFECYCLE
================================ */

// astrologer accepts chat
router.post("/accept", protect, acceptChatRequest);

// user / astrologer ends chat
router.post("/end", protect, endChatSession);

/* ===============================
   CHAT ROOMS & MESSAGES
================================ */

router.post("/create-room", protect, createOrGetChatRoom);
router.post("/send", protect, sendMessage);
router.get("/messages/:chatRoomId", protect, getMessages);
router.get("/my-chats", protect, getUserChats);

export default router;
