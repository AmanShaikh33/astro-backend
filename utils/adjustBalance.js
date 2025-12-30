import mongoose from "mongoose";
import User from "../models/User.js";
import Transaction from "../models/Transaction.js";

const adjustBalance = async (userId, deltaAmount, reason = "", metadata = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const update = await User.findOneAndUpdate(
      {
        _id: userId,
        ...(deltaAmount < 0 ? { walletBalance: { $gte: Math.abs(deltaAmount) } } : {})
      },
      { $inc: { walletBalance: deltaAmount } },
      { new: true, session }
    );

    if (!update) {
      await session.abortTransaction();
      session.endSession();
      return { success: false, reason: "insufficient_balance_or_user_not_found" };
    }

    const tx = await Transaction.create(
      [{
        userId,
        type: deltaAmount > 0 ? "TOPUP" : "DEBIT",
        amount: Math.abs(deltaAmount),
        balanceAfter: update.walletBalance,
        reason,
        metadata
      }],
      { session }
    );

    await session.commitTransaction();
    session.endSession();
    return { success: true, transaction: tx[0], user: update };
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    throw err;
  }
};

export default adjustBalance;
