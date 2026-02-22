import express from "express";
import { getPendingAstrologers, approveAstrologer, rejectAstrologer,getAstrologersWithFilter } from "../controllers/adminController.js";
import { protect, verifyRole } from "../middlewares/authMiddleware.js";

const router = express.Router();


router.get("/astrologers/pending", protect, verifyRole(["admin"]), getPendingAstrologers);
router.put("/astrologers/approve/:id", protect, verifyRole(["admin"]), approveAstrologer);
router.delete("/astrologers/reject/:id", protect, verifyRole(["admin"]), rejectAstrologer);
router.get("/astrologers", protect, verifyRole(["admin"]), getAstrologersWithFilter);


router.get("/settlement-summary/:astrologerId", async (req, res) => {
  try {
    const astrologer = await Astrologer.findById(req.params.astrologerId);

    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    const unpaidAmount = astrologer.earnings - astrologer.totalPaid;

    res.json({
      totalEarnings: astrologer.earnings,
      totalPaid: astrologer.totalPaid,
      unpaidAmount,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching summary" });
  }
});

router.post("/settle/:astrologerId", async (req, res) => {
  try {
    const { upiReference } = req.body;
    const astrologer = await Astrologer.findById(req.params.astrologerId);

    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    const unpaidAmount = astrologer.earnings - astrologer.totalPaid;

    if (unpaidAmount <= 0) {
      return res.status(400).json({ message: "No pending amount to settle" });
    }

    // Create settlement record
    await Settlement.create({
      astrologer: astrologer._id,
      amount: unpaidAmount,
      upiReference,
    });

    // Update totals
    astrologer.totalPaid += unpaidAmount;
    astrologer.coins = 0;  // reset weekly wallet
    astrologer.lastSettlementDate = new Date();

    await astrologer.save();

    res.json({
      message: "Settlement successful",
      paidAmount: unpaidAmount,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Settlement failed" });
  }
});

console.log("Admin routes loaded");

export default router;
