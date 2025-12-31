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

/** Track online astrologers */
const astrologerSockets = {};

/**
 * Billing memory structure:
 * billingStatus = {
 *   roomId123: {
 *     userJoined: true,
 *     astroJoined: false,
 *     interval: null,
 *     pricePerMinute: 20,
 *     userId: "...",
 *     astrologerId: "..."
 *   }
 * }
 */
let billingStatus = {};

io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id);

  // ⚡ Mark astrologer online
  socket.on("astrologerOnline", async ({ astrologerId }) => {
    console.log("🔍 ASTROLOGER ONLINE DEBUG:", {
      receivedId: astrologerId,
      socketId: socket.id
    });
    
    // If astrologerId is actually a userId, convert it to Astrologer._id
    let actualAstrologerId = astrologerId;
    
    try {
      const astrologer = await Astrologer.findOne({ userId: astrologerId });
      if (astrologer) {
        actualAstrologerId = astrologer._id.toString();
        console.log("🔄 Converted User._id to Astrologer._id:", astrologerId, "→", actualAstrologerId);
      }
    } catch (error) {
      console.error("Error finding astrologer:", error);
    }
    
    astrologerSockets[actualAstrologerId] = socket.id;
    socket.join(`astro_${actualAstrologerId}`);
    
    console.log("🔍 ASTROLOGER REGISTERED:", {
      astrologerId: actualAstrologerId,
      socketId: socket.id,
      roomName: `astro_${actualAstrologerId}`,
      allOnlineAstrologers: Object.keys(astrologerSockets)
    });
  });

  // ⚡ User requests chat → notify astrologer immediately
  socket.on("userRequestsChat", (data) => {
    console.log("🔍 USER REQUEST RECEIVED:", data);
    
    const { astrologerId } = data;
    const targetSocketId = astrologerSockets[astrologerId];
    
    console.log("🔍 USER REQUEST DEBUG:", {
      requestedAstrologerId: astrologerId,
      targetSocketId: targetSocketId,
      roomName: `astro_${astrologerId}`,
      allOnlineAstrologers: Object.keys(astrologerSockets),
      astrologerFound: !!targetSocketId
    });

    if (targetSocketId) {
      io.to(`astro_${astrologerId}`).emit("incomingChatRequest", data);
      console.log("📨 NOTIFICATION SENT to astrologer:", astrologerId);
    } else {
      console.log("⚠ ASTROLOGER NOT FOUND - offline or wrong ID:", astrologerId);
    }
  });

  // JOIN ROOM
  socket.on("joinRoom", ({ roomId }) => {
    socket.join(roomId);
    console.log(`Joined room: ${roomId}`);
  });

  /* ===============================
     PARTICIPANT JOINED (SYNC BOTH SIDES)
     =============================== */
  socket.on("participant-joined", ({ roomId, role, userId, astrologerId, pricePerMinute }) => {
    if (!billingStatus[roomId]) {
      billingStatus[roomId] = {
        userJoined: false,
        astroJoined: false,
        interval: null,
        pricePerMinute: pricePerMinute || 0,
        userId: userId || null,
        astrologerId: astrologerId || null,
      };
    }

    if (role === "user") {
      billingStatus[roomId].userJoined = true;
      billingStatus[roomId].userId = userId;
    }

    if (role === "astrologer") {
      billingStatus[roomId].astroJoined = true;
      billingStatus[roomId].astrologerId = astrologerId;
    }

    // Notify the OTHER participant
    socket.to(roomId).emit("participant-joined", { role });

    console.log(`✅ ${role} joined room ${roomId}`);

    checkStartBilling(roomId);
  });

  /* ===============================
     SEND MESSAGE
     =============================== */
  socket.on("sendMessage", async (data) => {
    try {
      const message = await Message.create({
        chatRoomId: data.chatRoomId,
        sender: data.senderId,
        receiver: data.receiverId,
        senderModel: "User",       // keep as-is (not breaking)
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
      console.log("❌ Message error:", err.message);
    }
  });

  /* ===============================
     DISCONNECT
     =============================== */
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});


/**
 * BILLING LOGIC
 */
async function checkStartBilling(roomId) {
  const room = billingStatus[roomId];
  if (!room.userJoined || !room.astroJoined) return;

  console.log("🚀 Both joined, starting billing for room:", roomId);

  if (room.interval) return;

  io.to(roomId).emit("startBilling");

  room.interval = setInterval(async () => {
    try {
      const user = await User.findById(room.userId);
      if (!user) return;

      if (user.coins < room.pricePerMinute) {
        clearInterval(room.interval);
        room.interval = null;

        io.to(roomId).emit("endChatDueToLowBalance");
        return;
      }

      // Deduct coins
      user.coins -= room.pricePerMinute;
      await user.save();

      io.to(roomId).emit("coinsUpdated", user.coins);
    } catch (err) {
      console.log("Billing error:", err.message);
    }
  }, 60000);
}

// Bind to 0.0.0.0 so other devices on the LAN can connect
const PORT = process.env.PORT || 5000;
server.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
