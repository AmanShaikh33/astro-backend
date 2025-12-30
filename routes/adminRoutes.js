import express from "express";
import { getPendingAstrologers, approveAstrologer, rejectAstrologer,getAstrologersWithFilter } from "../controllers/adminController.js";
import { protect, verifyRole } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Only admin can access these routes
router.get("/astrologers/pending", protect, verifyRole(["admin"]), getPendingAstrologers);
router.put("/astrologers/approve/:id", protect, verifyRole(["admin"]), approveAstrologer);
router.delete("/astrologers/reject/:id", protect, verifyRole(["admin"]), rejectAstrologer);
router.get("/astrologers", protect, verifyRole(["admin"]), getAstrologersWithFilter);


console.log("Admin routes loaded");

export default router;
