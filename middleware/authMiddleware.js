const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");

const protect = asyncHandler(async (req, res, next) => {   // ✅ FIX 1
  let token;

  if (
    req.headers.authorization &&                         // ✅ FIX 2
    req.headers.authorization.startsWith("Bearer")       // ✅ FIX 3
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");

      next();
      return;
    } catch (error) {
      res.status(401);                                   // ✅ FIX 4
      throw new Error("Not authorized, token failed");
    }
  }

  res.status(401);
  throw new Error("Not authorized, no token");
});

module.exports = { protect };
