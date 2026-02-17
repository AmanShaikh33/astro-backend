import ChatSession from "../models/ChatSession.js";
import { startChatBilling } from "./billing.js";

export const resumeActiveBilling = async (io) => {
 
  const activeSessions = await ChatSession.find({ status: "active" });

  for (const session of activeSessions) {
    
    session.status = "ended";
    session.endTime = new Date();
    await session.save();
    console.log("🗑️ Ended stale session on restart:", session._id.toString());
  }
  
  console.log("✅ Cleaned up", activeSessions.length, "stale sessions");
};
