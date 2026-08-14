import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import pool from "../config/db.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// ---------- multer setup for profile image uploads ----------
const uploadDir = "uploads/profiles";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${req.user.id}_${Date.now()}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (jpeg, png, webp, gif)"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// All routes below require a valid token (protect middleware runs first)

// CREATE the logged-in user's profile
router.post("/", protect, upload.single("image"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { full_name, bio, phone, address } = req.body;
    const image = req.file ? `/${uploadDir}/${req.file.filename}` : null;

    // prevent duplicate profiles for the same user
    const existing = await pool.query(
      "SELECT * FROM user_profiles WHERE user_id = $1",
      [userId]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Profile already exists for this user" });
    }

    const newProfile = await pool.query(
      `INSERT INTO user_profiles (user_id, full_name, bio, image, phone, address)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, full_name, bio, image, phone, address]
    );

    return res.status(201).json(newProfile.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// READ the logged-in user's profile
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const profile = await pool.query(
      "SELECT * FROM user_profiles WHERE user_id = $1",
      [userId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json(profile.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// READ a profile by user_id — PUBLIC, no login required.
// Used for the "hover an avatar to preview their profile" feature.
// Only exposes safe fields (no email, no password) since anyone can hit this.
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!/^\d+$/.test(userId)) {
      return res.status(400).json({ message: "Invalid user id" });
    }

    const profile = await pool.query(
      `SELECT p.full_name, p.bio, p.image, p.phone, p.address, u.name
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id = $1`,
      [userId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(profile.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// READ a profile by id (only if it belongs to the user)
router.get("/:id", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const profile = await pool.query(
      "SELECT * FROM user_profiles WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (profile.rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    return res.json(profile.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE the logged-in user's profile (only if it belongs to the user)
router.put("/:id", protect, upload.single("image"), async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { full_name, bio, phone, address } = req.body;

    // check ownership first
    const existing = await pool.query(
      "SELECT * FROM user_profiles WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    const current = existing.rows[0];

    // if a new image was uploaded, delete the old file and use the new path
    let image = current.image;
    if (req.file) {
      if (current.image) {
        const oldPath = `.${current.image}`;
        fs.unlink(oldPath, (err) => {
          if (err) console.error("Failed to delete old image:", err.message);
        });
      }
      image = `/${uploadDir}/${req.file.filename}`;
    }

    const updatedProfile = await pool.query(
      `UPDATE user_profiles
       SET full_name = $1, bio = $2, image = $3, phone = $4, address = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6 AND user_id = $7
       RETURNING *`,
      [
        full_name ?? current.full_name,
        bio ?? current.bio,
        image,
        phone ?? current.phone,
        address ?? current.address,
        id,
        userId,
      ]
    );

    return res.json(updatedProfile.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE the logged-in user's profile (only if it belongs to the user)
router.delete("/:id", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await pool.query(
      "DELETE FROM user_profiles WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }

    // clean up the image file from disk
    if (deleted.rows[0].image) {
      const filePath = `.${deleted.rows[0].image}`;
      fs.unlink(filePath, (err) => {
        if (err) console.error("Failed to delete image:", err.message);
      });
    }

    return res.json({ message: "Profile deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;