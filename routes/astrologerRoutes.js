import express from "express";
import { createProfile, getMyProfile, updateProfile, deleteProfile, getAllAstrologers,updateAvailability,getApprovedAstrologers, getAstrologerEarnings } from "../controllers/astrologerController.js";
import { protect, verifyRole } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import Astrologer from "../models/Astrologer.js";
import Settlement from "../models/Settlement.js";

const router = express.Router();


router.post("/profile", protect, verifyRole(["astrologer"]), upload.single("profilePic"), createProfile);
router.get("/my-profile", protect, verifyRole(["astrologer"]), getMyProfile);
router.put("/profile", protect, verifyRole(["astrologer"]), upload.single("profilePic"), updateProfile);
router.delete("/profile", protect, verifyRole(["astrologer"]), deleteProfile);
router.put("/status", protect, verifyRole(["astrologer"]), updateAvailability);
router.get("/earnings", protect, verifyRole(["astrologer"]), getAstrologerEarnings);
router.get("/approved", getApprovedAstrologers);


router.get("/", protect, getAllAstrologers);


router.get("/:id", protect, async (req, res) => {
  try {
    const astrologer = await Astrologer.findById(req.params.id);
    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }
    res.status(200).json(astrologer);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.delete("/admin/:id", protect, verifyRole(["admin"]), async (req, res) => {
  try {
    const astrologer = await Astrologer.findById(req.params.id);
    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    
    await astrologer.deleteOne();

    res.status(200).json({ message: "Astrologer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.get(
  "/settlement-history",
  protect,
  verifyRole(["astrologer"]),
  async (req, res) => {
    try {
      const astrologer = await Astrologer.findOne({ userId: req.user.id });

      const settlements = await Settlement.find({
        astrologer: astrologer._id,
      }).sort({ paidAt: -1 });

      res.json(settlements);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch history" });
    }
  }
);


export default router;
