const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { JWT_SECRET } = require("../middleware/auth");
const router = express.Router();

const sanitizeUser = (userDoc) => {
  const user = typeof userDoc.toObject === "function" ? userDoc.toObject() : { ...userDoc };
  delete user.passwordHash;
  delete user.authToken;
  return user;
};

const signToken = (user) =>
  jwt.sign(
    {
      sub: String(user._id),
      email: user.email || "",
      name: user.name || "Focused Student"
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );

router.post("/register", [
  body("email").isEmail().withMessage("Invalid neural ID format").normalizeEmail(),
  body("password").isLength({ min: 8 }).withMessage("Protocol key must be at least 8 characters"),
  body("name").trim().notEmpty().withMessage("Identity name required")
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;
    
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const user = await User.create({
      email: email.toLowerCase(),
      passwordHash: password, // Will be hashed by pre-save hook
      name: name || "Focused Student"
    });

    const token = signToken(user);
    res.status(201).json({ user: sanitizeUser(user), token });
  } catch (err) {
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(401).json({ message: "Invalid credentials" });

    const token = signToken(user);
    res.json({ user: sanitizeUser(user), token });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
