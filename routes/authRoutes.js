import express from "express";
import { registerUser, loginUser, getMe } from "../controllers/authController.js";
import { protect, verifyRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.get("/me", protect, getMe);

// Example: Admin-only route
router.get("/admin-data", protect, verifyRole(["admin"]), (req, res) => {
  res.json({ message: "Welcome Admin!" });
});

export default router;
