import ChatSession from "../models/ChatSession.js";
import User from "../models/User.js";
import Astrologer from "../models/Astrologer.js";

const activeBillingLoops = new Map();
const timerIntervals = new Map();

export const startChatBilling = (sessionId, io) => {
  if (activeBillingLoops.has(sessionId)) return;

  let elapsedSeconds = 0;

  // Timer every second
  const timerInterval = setInterval(() => {
    elapsedSeconds++;
    io.to(sessionId).emit("timer-tick", { elapsedSeconds });
  }, 1000);

  timerIntervals.set(sessionId, timerInterval);

  // Billing every minute
  const interval = setInterval(async () => {
    const session = await ChatSession.findById(sessionId);
    if (!session || session.status !== "active") {
      clearInterval(interval);
      clearInterval(timerIntervals.get(sessionId));
      activeBillingLoops.delete(sessionId);
      timerIntervals.delete(sessionId);
      return;
    }

    const user = await User.findById(session.user);
    if (user.coins < session.coinsPerMinute) {
      io.to(sessionId).emit("force-end-chat", {
        reason: "INSUFFICIENT_COINS",
      });
      session.status = "ended";
      session.endTime = new Date();
      await session.save();
      clearInterval(interval);
      clearInterval(timerIntervals.get(sessionId));
      activeBillingLoops.delete(sessionId);
      timerIntervals.delete(sessionId);
      return;
    }

    user.coins -= session.coinsPerMinute;
    user.transactions.push({
      type: "CHAT_DEBIT",
      amount: 0,
      coins: -session.coinsPerMinute,
      sessionId: session._id,
    });
    await user.save();

    const astrologer = await Astrologer.findById(session.astrologer);
    astrologer.coins += session.coinsPerMinute;
    astrologer.earnings += session.coinsPerMinute;
    await astrologer.save();

    session.totalMinutes += 1;
    session.totalCoinsDeducted += session.coinsPerMinute;
    session.totalCoinsEarned += session.coinsPerMinute;
    await session.save();

    io.to(sessionId).emit("minute-billed", {
      minutes: session.totalMinutes,
      coinsLeft: user.coins,
      astrologerEarnings: astrologer.coins,
    });

    console.log(`💰 Billed: ${session.coinsPerMinute} coins | User: ${user.coins} left | Astrologer earned: ${astrologer.coins}`);
  }, 60_000);

  activeBillingLoops.set(sessionId, interval);
  console.log("✅ Billing started for session:", sessionId);
};


export const stopChatBilling = (sessionId) => {
  if (activeBillingLoops.has(sessionId)) {
    clearInterval(activeBillingLoops.get(sessionId));
    activeBillingLoops.delete(sessionId);
    console.log("🛑 Billing stopped:", sessionId);
  }
  if (timerIntervals.has(sessionId)) {
    clearInterval(timerIntervals.get(sessionId));
    timerIntervals.delete(sessionId);
  }
};
