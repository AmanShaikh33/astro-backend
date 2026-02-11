import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import bcrypt from "bcryptjs";

import { connectDb } from "./database/db.js";
import { Message } from "./models/Message.js";
import User from "./models/User.js";
import ChatSession from "./models/ChatSession.js";
import Astrologer from "./models/Astrologer.js";
import { startChatBilling, stopChatBilling } from "./sockets/billing.js";
import { resumeActiveBilling } from "./sockets/bootstrapBilling.js";

import adminRoutes from "./routes/adminRoutes.js";
import astrologerRoutes from "./routes/astrologerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import ChatRequest from "./models/ChatRequest.js";

dotenv.config();
const app = express();
connectDb();

/* ===============================
   ADMIN AUTO CREATE
================================ */
const createAdminUser = async () => {
  const exists = await User.findOne({ email: "Admin@astrotalk.com" });
  if (!exists) {
    const hashed = await bcrypt.hash("Admin@123", 10);
    await User.create({
      name: "Admin",
      email: "Admin@astrotalk.com",
      password: hashed,
      role: "admin",
      coins: 0,
    });
    console.log("✅ Admin created");
  }
};
setTimeout(createAdminUser, 2000);

/* ===============================
   EXPRESS SETUP
================================ */
app.use(cors());
app.use(express.json());

app.use((req, _, next) => {
  console.log("INCOMING", req.method, req.url);
  next();
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/* ===============================
   SOCKET.IO SETUP
================================ */
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

/* Resume billing for active sessions on server restart */
setTimeout(() => resumeActiveBilling(io), 3000);

/* 🔑 make io available in controllers */
app.use((req, res, next) => {
  req.io = io;
  next();
});

/* ===============================
   ROUTES
================================ */
app.use("/api/auth", authRoutes);
app.use("/api/astrologers", astrologerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/", (_, res) => res.send("AstroTalk Backend Running"));

/* ===============================
   SOCKET EVENTS (DUMB SOCKETS)
================================ */
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  /* astrologer presence */
  socket.on("astrologerOnline", ({ astrologerId }) => {
    socket.join(`astro_${astrologerId}`);
  });

  /* user presence */
  socket.on("userOnline", ({ userId }) => {
    socket.join(`user_${userId}`);
    console.log("👤 User joined room:", `user_${userId}`);
  });

  /* join chat session */
  socket.on("joinSession", ({ sessionId }) => {
    socket.join(sessionId);
    console.log("👥 Joined session:", sessionId);
  });

  socket.on("userRequestsChat", async ({ astrologerId, userId, userName }) => {
  try {
    console.log("📨 Chat request from user:", userId, "to astrologer:", astrologerId);

    // Check if user has enough coins
    const user = await User.findById(userId);
    const astrologer = await Astrologer.findById(astrologerId);
    
    if (!user || !astrologer) {
      socket.emit("chat-request-error", {
        message: "User or Astrologer not found"
      });
      return;
    }

    if (user.coins < astrologer.pricePerMinute) {
      socket.emit("insufficient-coins", {
        message: "Insufficient coins. Please add coins to your wallet.",
        required: astrologer.pricePerMinute,
        current: user.coins
      });
      console.log("❌ User has insufficient coins:", user.coins, "Required:", astrologer.pricePerMinute);
      return;
    }

    // Create chat request in DB
    const chatRequest = await ChatRequest.create({
      user: userId,
      astrologer: astrologerId,
      status: "pending",
    });

    // Emit alert ONLY to that astrologer
    io.to(`astro_${astrologerId}`).emit("incomingChatRequest", {
      requestId: chatRequest._id,
      userId,
      userName,
    });

    console.log("📣 Alert sent to:", `astro_${astrologerId}`);
  } catch (err) {
    console.error("❌ userRequestsChat error:", err);
  }
});

  socket.on("astrologerAcceptsChat", async ({ requestId, userId }) => {
    try {
      console.log("✅ Astrologer accepted chat, requestId:", requestId);
      
      const chatRequest = await ChatRequest.findById(requestId).populate('astrologer');
      if (!chatRequest) {
        console.error("❌ Chat request not found:", requestId);
        return;
      }

      await ChatRequest.findByIdAndUpdate(requestId, { status: "accepted" });
      
      const astrologer = await Astrologer.findById(chatRequest.astrologer);
      if (!astrologer) {
        console.error("❌ Astrologer not found:", chatRequest.astrologer);
        return;
      }

      const chatSession = await ChatSession.create({
        user: userId,
        astrologer: chatRequest.astrologer,
        startTime: new Date(),
        coinsPerMinute: astrologer.pricePerMinute,
        status: "active",
      });

      console.log("💰 Chat session created:", chatSession._id);
      
      startChatBilling(chatSession._id.toString(), io);
      console.log("💸 Billing started for session:", chatSession._id);
      
      io.to(`user_${userId}`).emit("chat-accepted", {
        sessionId: chatSession._id.toString(),
      });
      
      // Emit to the socket that accepted (astrologer's current socket)
      socket.emit("session-created", {
        sessionId: chatSession._id.toString(),
      });
      
      console.log("📤 Sent chat-accepted to user:", userId, "and session-created to astrologer socket:", socket.id);
    } catch (err) {
      console.error("❌ astrologerAcceptsChat error:", err);
    }
  });


  /* messaging */
  socket.on("sendMessage", async (data) => {
    try {
      const { sessionId, senderId, receiverId, content } = data;

      const senderUser = await User.findById(senderId);
      const senderModel = senderUser ? "User" : "Astrologer";
      const receiverModel = senderModel === "User" ? "Astrologer" : "User";

      const message = await Message.create({
        chatRoomId: sessionId,
        sender: senderId,
        receiver: receiverId,
        senderModel,
        receiverModel,
        content,
      });

      io.to(sessionId).emit("receiveMessage", {
        _id: message._id,
        senderId,
        receiverId,
        content,
        createdAt: message.createdAt,
      });
    } catch (err) {
      console.error("❌ Message error:", err);
    }
  });

  /* end chat */
  socket.on("endChat", async ({ roomId, endedBy }) => {
    try {
      console.log("🔚 End chat requested:", roomId, "by:", endedBy);
      
      const session = await ChatSession.findById(roomId);
      if (!session) {
        console.error("❌ Session not found:", roomId);
        return;
      }

      // Stop billing
      stopChatBilling(roomId);
      
      // Update session
      session.status = "ended";
      session.endTime = new Date();
      await session.save();

      // Notify both parties
      io.to(roomId).emit("chatEnded", {
        endedBy,
        sessionEarnings: session.totalCoinsEarned,
        totalCoins: session.totalCoinsDeducted,
      });

      console.log("✅ Chat ended successfully:", roomId);
    } catch (err) {
      console.error("❌ endChat error:", err);
    }
  });

  /* force end chat due to insufficient coins */
  socket.on("force-end-chat", async ({ sessionId }) => {
    try {
      const session = await ChatSession.findById(sessionId);
      if (session) {
        stopChatBilling(sessionId);
        session.status = "ended";
        session.endTime = new Date();
        await session.save();
      }
    } catch (err) {
      console.error("❌ force-end-chat error:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});


/* ===============================
   SERVER START
================================ */
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () =>
  console.log(`🚀 Server running on ${PORT}`)
);
