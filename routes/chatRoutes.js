import express from "express";
import { protect } from "../middlewares/authMiddleware.js";
import {
  createOrGetChatRoom,
  sendMessage,
  getMessages,
  getUserChats,
} from "../controllers/chatController.js";

const router = express.Router();

router.post("/create-room", protect, createOrGetChatRoom);
router.post("/send", protect, sendMessage);
router.get("/messages/:chatRoomId", protect, getMessages);
router.get("/my-chats", protect, getUserChats);

export default router;
