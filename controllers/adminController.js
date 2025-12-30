import Astrologer from "../models/Astrologer.js";
// 1. Get all pending astrologers
export const getPendingAstrologers = async (req, res) => {
  try {
    const astrologers = await Astrologer.find({ isApproved: "pending" });
    res.status(200).json({ success: true, count: astrologers.length, astrologers });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};


// 2. Approve astrologer
export const approveAstrologer = async (req, res) => {
  try {
    const astrologer = await Astrologer.findById(req.params.id);

    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    astrologer.isApproved = "approved";
    await astrologer.save();

    res.status(200).json({ message: "Astrologer approved successfully", astrologer });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 3. Reject astrologer (delete profile)
export const rejectAstrologer = async (req, res) => {
  try {
    const astrologer = await Astrologer.findById(req.params.id);

    if (!astrologer) {
      return res.status(404).json({ message: "Astrologer not found" });
    }

    await Astrologer.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: "Astrologer rejected and profile deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get astrologers with optional status filter
export const getAstrologersWithFilter = async (req, res) => {
  try {
    const { status } = req.query;

    let filter = {};
    if (status === "pending") {
      filter.isApproved = "pending";
    } else if (status === "approved") {
      filter.isApproved = "approved";
    }

    const astrologers = await Astrologer.find(filter);

    res.status(200).json({
      success: true,
      count: astrologers.length,
      astrologers
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
