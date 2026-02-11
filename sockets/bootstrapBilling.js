import ChatSession from "../models/ChatSession.js";
import { startChatBilling } from "./billing.js";

export const resumeActiveBilling = async (io) => {
  const activeSessions = await ChatSession.find({ status: "active" });

  for (const session of activeSessions) {
    startChatBilling(session._id.toString(), io);
    console.log("🔁 Resumed billing for session:", session._id.toString());
  }
};
