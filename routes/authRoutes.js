import express from "express";
import { registerUser, loginUser, getMe,  forgotPassword, resetPassword} from "../controllers/authController.js";
import { protect, verifyRole } from "../middlewares/authMiddleware.js";
import User from "../models/User.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password/:token", resetPassword);

router.get("/reset-password/:token", (req, res) => {
  res.send("Reset token received. Please return to the mobile app to set a new password.");
});

router.get("/user/:id", protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});


router.get("/admin-data", protect, verifyRole(["admin"]), (req, res) => {
  res.json({ message: "Welcome Admin!" });
});

export default router;
