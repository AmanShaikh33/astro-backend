import express from "express";
import { createProfile, getMyProfile, updateProfile, deleteProfile, getAllAstrologers,updateAvailability,getApprovedAstrologers } from "../controllers/astrologerController.js";
import { protect, verifyRole } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";
import Astrologer from "../models/Astrologer.js";

const router = express.Router();

// Only astrologers can create/update/delete their profile
router.post("/profile", protect, verifyRole(["astrologer"]), upload.single("profilePic"), createProfile);
router.get("/my-profile", protect, verifyRole(["astrologer"]), getMyProfile);
router.put("/profile", protect, verifyRole(["astrologer"]), upload.single("profilePic"), updateProfile);
router.delete("/profile", protect, verifyRole(["astrologer"]), deleteProfile);
router.put("/status", protect, verifyRole(["astrologer"]), updateAvailability);
router.get("/approved", getApprovedAstrologers);

// For users: get all astrologers
router.get("/", protect, getAllAstrologers);

// Admin can delete any astrologer by ID

// Admin can delete any astrologer by ID
router.delete("/admin/:id", protect, verifyRole(["admin"]), async (req, res) => {
  try {
    const astrologer = await Astrologer.findById(req.params.id);
    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    // Use deleteOne instead of remove
    await astrologer.deleteOne();

    res.status(200).json({ message: "Astrologer deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});



export default router;
