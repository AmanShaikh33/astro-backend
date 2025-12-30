import jwt from "jsonwebtoken";

export const protect = (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Not authorized, token missing" });

  try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  console.log("🔍 Decoded token:", decoded);
  if (!decoded?.id && !decoded?._id) {
    return res.status(401).json({ message: "Invalid token payload" });
  }
  req.user = decoded;
  next();
} catch (error) {
  console.error("JWT verification error:", error.message);
  res.status(401).json({ message: "Not authorized, token failed" });
}

};

export const verifyRole = (roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};
