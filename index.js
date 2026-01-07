import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "http";
import path from "path";
import { Server } from "socket.io";
import { connectDb } from "./database/db.js";
import bcrypt from "bcryptjs";

import { Message } from "./models/Message.js";
import User from "./models/User.js";
import Astrologer from "./models/Astrologer.js";
import adminRoutes from "./routes/adminRoutes.js";
import astrologerRoutes from "./routes/astrologerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import ChatSession from "./models/ChatSession.js";
import Transaction from "./models/Transaction.js";



dotenv.config();
const app = express();
connectDb();

// Create admin user if doesn't exist
const createAdminUser = async () => {
  try {
    const adminExists = await User.findOne({ email: "Admin@astrotalk.com" });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash("Admin@123", salt);
      
      await User.create({
        name: "Admin",
        email: "Admin@astrotalk.com",
        password: hashedPassword,
        role: "admin",
        coins: 0
      });
      console.log("✅ Admin user created: Admin@astrotalk.com / Admin@123");
    }
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
  }
};

// Create admin user on startup
setTimeout(createAdminUser, 2000);

app.use(cors());
app.use(express.json());

// Lightweight request logger to confirm incoming requests from devices
app.use((req, res, next) => {
  console.log("INCOMING", req.method, req.url, req.ip);
  next();
});

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

app.use("/api/auth", authRoutes);
app.use("/api/astrologers", astrologerRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/", (req, res) => {
  res.send("AstroTalk Backend Running");
});

const server = createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

/**
 * Billing memory structure
 */
let billingStatus = {};

/**
 * Track socket rooms for cleanup
 */
let socketRooms = new Map(); // socketId -> Set of roomIds

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  /* ===============================
     ASTROLOGER ONLINE → JOIN ROOM
     =============================== */
  socket.on("astrologerOnline", async ({ astrologerId }) => {
    try {
      // astrologerId MUST be Astrologer._id
      socket.join(`astro_${astrologerId}`);

      console.log("🔮 Astrologer joined room:", `astro_${astrologerId}`);
      console.log("🔮 Socket ID:", socket.id);
      console.log("🔮 All rooms for this socket:", Array.from(socket.rooms));
    } catch (err) {
      console.error("❌ astrologerOnline error:", err.message);
    }
  });

  /* ===============================
     USER REQUESTS CHAT
     =============================== */
  socket.on("userRequestsChat", (data) => {
    const { astrologerId, userId, roomId, userName } = data;

    console.log("🔥 USER REQUEST RECEIVED:", {
      astrologerId,
      userId,
      roomId,
      userName
    });

    console.log("📡 Sending to room:", `astro_${astrologerId}`);
    console.log("📡 Sockets in room:", io.sockets.adapter.rooms.get(`astro_${astrologerId}`));

    io.to(`astro_${astrologerId}`).emit("incomingChatRequest", {
      userId,
      userName,
      roomId,
    });

    console.log("📨 NOTIFICATION SENT to astrologer:", astrologerId);
  });

  /* ===============================
     JOIN CHAT ROOM
     =============================== */
  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
    
    // Track which rooms this socket is in
    if (!socketRooms.has(socket.id)) {
      socketRooms.set(socket.id, new Set());
    }
    socketRooms.get(socket.id).add(roomId);
    
    console.log("👥 Joined chat room:", roomId);
  });

  /* ===============================
     LEAVE CHAT ROOM
     =============================== */
  socket.on("leaveRoom", ({ roomId, role }) => {
  if (!roomId) {
    console.warn("⚠️ leaveRoom called without roomId");
    return;
  }

  socket.leave(roomId);

  if (socketRooms.has(socket.id)) {
    socketRooms.get(socket.id).delete(roomId);
  }

  socket.to(roomId).emit("participantLeft", { role });

  cleanupRoom(roomId);

  console.log(`🚪 ${role} left room:`, roomId);
});


  /* ===============================
     PARTICIPANT JOINED (SYNC)
     =============================== */
 socket.on(
  "participant-joined",
  async ({ roomId, role, userId, astrologerId, pricePerMinute }) => {
    if (!billingStatus[roomId]) {
      billingStatus[roomId] = {
        userJoined: false,
        astroJoined: false,
        interval: null,
        pricePerMinute: pricePerMinute || 10,
        userId: null,
        astrologerId: null,
      };
    }

    if (role === "user") {
      billingStatus[roomId].userJoined = true;
      billingStatus[roomId].userId = userId;
      console.log(`👤 User joined: ${userId}`);
    }

    if (role === "astrologer") {
      billingStatus[roomId].astroJoined = true;
      billingStatus[roomId].astrologerId = astrologerId;
      console.log(`🔮 Astrologer joined: ${astrologerId}`);
    }

    // ✅ ADD THIS BLOCK (START)
    if (
      billingStatus[roomId].userJoined &&
      billingStatus[roomId].astroJoined
    ) {
      await ChatSession.findOneAndUpdate(
        { roomId },
        {
          status: "active",
          startedAt: new Date(),
          lastBilledAt: new Date(),
          pricePerMinute: billingStatus[roomId].pricePerMinute,
        }
      );

      console.log("🟢 ChatSession activated in DB:", roomId);
    }
    // ✅ ADD THIS BLOCK (END)

    socket.to(roomId).emit("participant-joined", { role });

    console.log(`✅ ${role} joined room ${roomId}`);
    console.log(`💰 Current billing status:`, billingStatus[roomId]);

    checkStartBilling(roomId);
  }
);

  /* ===============================
     SEND MESSAGE
     =============================== */
  socket.on("sendMessage", async (data) => {
    try {
      const message = await Message.create({
        chatRoomId: data.chatRoomId,
        sender: data.senderId,
        receiver: data.receiverId,
        senderModel: "User",
        receiverModel: "Astrologer",
        content: data.content,
      });

      io.to(data.chatRoomId).emit("receiveMessage", {
        _id: message._id,
        chatRoomId: message.chatRoomId,
        senderId: message.sender.toString(),
        receiverId: message.receiver.toString(),
        content: message.content,
        createdAt: message.createdAt,
      });
    } catch (err) {
      console.error("❌ Message error:", err.message);
    }
  });

  /* ===============================
     DISCONNECT
     =============================== */
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
    
    // Clean up all rooms this socket was in
    if (socketRooms.has(socket.id)) {
      const rooms = socketRooms.get(socket.id);
      rooms.forEach(roomId => {
        // Notify other participants
        socket.to(roomId).emit("participantLeft", { role: "unknown" });
        // Clean up billing
        cleanupRoom(roomId);
      });
      socketRooms.delete(socket.id);
    }
  });
});

async function billingEngine() {
  try {
    const sessions = await ChatSession.find({ status: "active" });

    for (const session of sessions) {
      const now = new Date();
      const elapsedSeconds = Math.floor(
        (now - session.lastBilledAt) / 1000
      );

      if (elapsedSeconds < 60) continue;

      const billableMinutes = Math.floor(elapsedSeconds / 60);
      const coinsToDeduct = billableMinutes * session.pricePerMinute;

      const mongoSession = await mongoose.startSession();
      await mongoSession.withTransaction(async () => {
        const user = await User.findById(session.userId).session(mongoSession);

        if (!user || user.coins < coinsToDeduct) {
          await ChatSession.updateOne(
            { _id: session._id },
            { status: "low_balance", endedAt: now },
            { session: mongoSession }
          );

          io.to(session.roomId.toString()).emit("endChatDueToLowBalance");
          return;
        }

        await User.updateOne(
          { _id: session.userId },
          { $inc: { coins: -coinsToDeduct } },
          { session: mongoSession }
        );

        // 🔑 Fetch updated user balance inside the same transaction
const updatedUser = await User.findById(session.userId).session(mongoSession);

// 🧾 Record transaction ledger
await Transaction.create(
  [
    {
      userId: session.userId,
      type: "DEBIT",
      amount: coinsToDeduct, // coins (or paise if you unify later)
      balanceAfter: updatedUser.coins,
      reason: "chat-minute-charge",
      metadata: {
        chatSessionId: session._id,
        astrologerId: session.astrologerId,
        minutes: billableMinutes,
        roomId: session.roomId,
      },
    },
  ],
  { session: mongoSession }
);


        await Astrologer.updateOne(
          { _id: session.astrologerId },
          { $inc: { earnings: coinsToDeduct } },
          { session: mongoSession }
        );

        await ChatSession.updateOne(
          { _id: session._id },
          {
            $inc: {
              totalSeconds: billableMinutes * 60,
              totalCoinsDeducted: coinsToDeduct,
            },
            lastBilledAt: now,
          },
          { session: mongoSession }
        );
      });

      mongoSession.endSession();

      io.to(session.roomId.toString()).emit("coinsUpdated");
    }
  } catch (err) {
    console.error("❌ Billing engine error:", err);
  }
}


/**
 * BILLING LOGIC
 */
async function checkStartBilling(roomId) {
  const room = billingStatus[roomId];
  if (!room.userJoined || !room.astroJoined) return;

  console.log("🚀 Both joined, starting billing for room:", roomId);

  if (room.interval) return;

  // Initialize timer
  room.startTime = Date.now();
  room.elapsedSeconds = 0;

  io.to(roomId).emit("startBilling");

  // Send timer updates every second
  room.timerInterval = setInterval(() => {
    room.elapsedSeconds++;
    io.to(roomId).emit("timerUpdate", room.elapsedSeconds);
  }, 1000);

  // Billing every minute (change to 10 seconds for testing)
  // room.interval = setInterval(async () => {
  //   try {
  //     console.log(`💰 Processing billing for room ${roomId}...`);
  //     console.log(`💰 Looking for user ID: ${room.userId}`);
  //     console.log(`💰 Looking for astrologer ID: ${room.astrologerId}`);
      
  //     const user = await User.findById(room.userId);
  //     // Find astrologer by their document _id, not user ID
  //     const astrologer = await Astrologer.findById(room.astrologerId);
      
  //     console.log(`💰 User found:`, user ? `Yes (coins: ${user.coins})` : "No");
  //     console.log(`💰 Astrologer found:`, astrologer ? `Yes (earnings: ${astrologer.earnings || 0})` : "No");
      
  //     if (!user) {
  //       console.log("❌ User not found - stopping billing");
  //       clearInterval(room.interval);
  //       clearInterval(room.timerInterval);
  //       room.interval = null;
  //       room.timerInterval = null;
  //       return;
  //     }
      
  //     if (!astrologer) {
  //       console.log("❌ Astrologer not found - stopping billing");
  //       clearInterval(room.interval);
  //       clearInterval(room.timerInterval);
  //       room.interval = null;
  //       room.timerInterval = null;
  //       return;
  //     }

  //     console.log(`💰 Current user coins: ${user.coins}, Price: ${room.pricePerMinute}`);

  //     if (user.coins < room.pricePerMinute) {
  //       console.log(`❌ Insufficient coins: ${user.coins} < ${room.pricePerMinute}`);
  //       clearInterval(room.interval);
  //       clearInterval(room.timerInterval);
  //       room.interval = null;
  //       room.timerInterval = null;

  //       io.to(roomId).emit("endChatDueToLowBalance");
  //       cleanupRoom(roomId);
  //       return;
  //     }

  //     // Transfer coins from user to astrologer
  //     const oldUserCoins = user.coins;
  //     const oldAstrologerEarnings = astrologer.earnings || 0;
      
  //     user.coins -= room.pricePerMinute;
  //     astrologer.earnings = (astrologer.earnings || 0) + room.pricePerMinute;
      
  //     console.log(`💰 Before save - User coins: ${oldUserCoins} -> ${user.coins}`);
  //     console.log(`💰 Before save - Astrologer earnings: ${oldAstrologerEarnings} -> ${astrologer.earnings}`);
      
  //     await user.save();
  //     await astrologer.save();
      
  //     console.log(`💰 After save - User saved successfully`);
  //     console.log(`💰 After save - Astrologer saved successfully`);

  //     const updateData = {
  //       userCoins: user.coins,
  //       astrologerEarnings: astrologer.earnings
  //     };

  //     io.to(roomId).emit("coinsUpdated", updateData);
      
  //     console.log(`💰 Transferred ${room.pricePerMinute} coins. New balances:`, updateData);
  //     console.log(`💰 Emitted coinsUpdated to room: ${roomId}`);
  //   } catch (err) {
  //     console.log("Billing error:", err.message);
  //     console.error("Full billing error:", err);
  //   }
  // }, 60000); // 60 seconds = 1 minute for production billing
}

/**
 * ROOM CLEANUP
 */
async function cleanupRoom(roomId) {
  // 🛑 HARD GUARD — never trust sockets
  if (!roomId || !mongoose.Types.ObjectId.isValid(roomId)) {
    console.warn("⚠️ cleanupRoom skipped due to invalid roomId:", roomId);
    return;
  }

  if (billingStatus[roomId]) {
    if (billingStatus[roomId].interval) {
      clearInterval(billingStatus[roomId].interval);
    }
    if (billingStatus[roomId].timerInterval) {
      clearInterval(billingStatus[roomId].timerInterval);
    }
    delete billingStatus[roomId];
    console.log("🧹 Cleaned up room memory:", roomId);
  }

  // ✅ End chat session safely
  await ChatSession.findOneAndUpdate(
    { roomId, status: "active" },
    { status: "ended", endedAt: new Date() }
  );

  console.log("🛑 ChatSession ended in DB:", roomId);
}


setInterval(billingEngine, 10000);

// Bind to 0.0.0.0 so other devices on the LAN can connect
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));