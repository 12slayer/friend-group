import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import pool from "../config/db.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "Strict",
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
};

const generateToken = (id, name, email) => {
  return jwt.sign(
    { id, name, email },
    process.env.JWT_SECRET,
    {
      expiresIn: "30d",
    }
  );
};

// ==========================================
// REGISTER
// POST /api/auth/register
// ==========================================
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    // Check if user already exists
    const userExists = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({
        message: "User already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email, hashedPassword]
    );

    // Get the actual inserted user
    const user = newUser.rows[0];

    // Generate JWT
    const token = generateToken(
      user.id,
      user.name,
      user.email
    );

    // Store token in cookie
    res.cookie("token", token, cookieOptions);

    // Send response
    return res.status(201).json({
      user,
    });
  } catch (error) {
    console.error("REGISTER ERROR:", error);

    return res.status(500).json({
      message: "Registration failed",
      error: error.message,
    });
  }
});

// ==========================================
// LOGIN
// POST /api/auth/login
// ==========================================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Please provide all required fields",
      });
    }

    // Find user
    const user = await pool.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (user.rows.length === 0) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    const userData = user.rows[0];

    console.log("User data:", userData);

    // Compare password
    const isMatch = await bcrypt.compare(
      password,
      userData.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // Generate JWT
    const token = generateToken(
      userData.id,
      userData.name,
      userData.email
    );

    // Store token in cookie
    res.cookie("token", token, cookieOptions);

    // Send response
    return res.json({
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        token: token,
      },
    });
  } catch (error) {
    console.error("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
});

// ==========================================
// GET CURRENT USER
// GET /api/auth/me
// ==========================================
router.get("/me", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    console.error("ME ERROR:", error);

    return res.status(500).json({
      message: "Failed to get user",
      error: error.message,
    });
  }
});

// ==========================================
// LOGOUT
// POST /api/auth/logout
// ==========================================
router.post("/logout", (req, res) => {
  res.cookie("token", "", {
    ...cookieOptions,
    maxAge: 1,
  });

  return res.json({
    message: "Logged out successfully",
  });
});

export default router;
