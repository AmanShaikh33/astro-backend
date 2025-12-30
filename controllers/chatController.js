import { ChatRoom } from "../models/ChatRoom.js";
import { Message } from "../models/Message.js";
import Astrologer from "../models/Astrologer.js"; // add this line

// ✅ Create or get a chat room
export const createOrGetChatRoom = async (req, res) => {
  try {
    const { astrologerId, userId } = req.body;
    const requesterId = req.user.id;
    const role = req.user.role;

    console.log("🧩 createOrGetChatRoom input:", { astrologerId, userId, requesterId, role });

    let finalUserId, finalAstroId;

    if (role === "user") {
      // 🧍 User is chatting → user sends astrologerId
      if (!astrologerId) return res.status(400).json({ message: "Missing astrologerId" });
      finalUserId = requesterId;
      finalAstroId = astrologerId;
    } else if (role === "astrologer") {
      // 🔮 Astrologer is chatting → astrologer sends userId
      if (!userId) return res.status(400).json({ message: "Missing userId" });

      // Find astrologer’s _id from their base user account
      const astrologer = await Astrologer.findOne({ userId: requesterId });
      if (!astrologer) {
        console.log("❌ No astrologer found for user:", requesterId);
        return res.status(404).json({ message: "Astrologer not found" });
      }

      finalUserId = userId;
      finalAstroId = astrologer._id;
    } else {
      return res.status(400).json({ message: "Invalid role" });
    }

    // ✅ Find or create chat room
    let chatRoom = await ChatRoom.findOne({
      user: finalUserId,
      astrologer: finalAstroId,
    });

    if (!chatRoom) {
      chatRoom = await ChatRoom.create({
        user: finalUserId,
        astrologer: finalAstroId,
      });
      console.log("✨ New ChatRoom created:", chatRoom._id);
    } else {
      console.log("✅ Existing ChatRoom found:", chatRoom._id);
    }

    res.status(200).json(chatRoom);
  } catch (error) {
    console.error("❌ createOrGetChatRoom error:", error);
    res.status(500).json({
      message: "Failed to create/get chat room",
      error: error.message,
    });
  }
};

// ✅ Send message
export const sendMessage = async (req, res) => {
  try {
    const { chatRoomId, receiverId, content } = req.body;
    const senderId = req.user.id;

    if (!chatRoomId || !receiverId || !content) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const senderModel = req.user.role === "user" ? "User" : "Astrologer";
    const receiverModel = req.user.role === "user" ? "Astrologer" : "User";

    const newMessage = await Message.create({
      chatRoomId,
      sender: senderId,
      receiver: receiverId,
      senderModel,
      receiverModel,
      content,
    });

    await ChatRoom.findByIdAndUpdate(chatRoomId, { lastMessage: content });

    console.log("✅ Message saved successfully:", newMessage);
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("❌ sendMessage error:", error);
    res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

// ✅ Get all messages
// ✅ Get all messages
export const getMessages = async (req, res) => {
  try {
    const { chatRoomId } = req.params;
    const messages = await Message.find({ chatRoomId })
      .sort({ createdAt: 1 })
      .lean(); // <-- makes plain JS objects, not Mongoose docs

    // ✅ Normalize sender/receiver IDs to plain strings
    const formatted = messages.map(msg => ({
      ...msg,
      senderId: msg.sender.toString(),
      receiverId: msg.receiver.toString(),
    }));

    res.status(200).json(formatted);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
};

// ✅ Get user or astrologer chats
export const getUserChats = async (req, res) => {
  try {
    let userId = req.user._id || req.user.id;
    const role = req.user.role;

    console.log("🧠 getUserChats called with:", { userId, role });

    let chats;

    if (role === "astrologer") {
      const astro = await Astrologer.findOne({ userId });
      if (!astro) {
        return res.status(404).json({ message: "Astrologer not found" });
      }

      console.log("🔮 Using astrologer _id:", astro._id);

      chats = await ChatRoom.find({ astrologer: astro._id })
        .populate("user astrologer", "name email")
        .sort({ updatedAt: -1 });
    } else {
      console.log("🔍 Searching ChatRooms where user =", userId);
      chats = await ChatRoom.find({ user: userId })
        .populate("user astrologer", "name email")
        .sort({ updatedAt: -1 });
    }

    console.log("📦 Found chats:", chats.length);
    res.status(200).json(chats);
  } catch (error) {
    console.error("❌ getUserChats error:", error);
    res.status(500).json({ message: "Failed to get chats", error: error.message });
  }
};
