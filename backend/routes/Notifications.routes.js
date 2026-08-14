import express from "express";
import pool from "../config/db.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// GET current user's notifications, most recent first, with actor's name + avatar
router.get("/", protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         n.id, n.type, n.media_id, n.message_id, n.content, n.is_read, n.created_at,
         a.id AS actor_id, a.name AS actor_name, p.image AS actor_image
       FROM notifications n
       JOIN users a ON a.id = n.actor_id
       LEFT JOIN user_profiles p ON p.user_id = a.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET unread count only — cheap poll target for a badge
router.get("/unread-count", protect, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT COUNT(*)::int AS count FROM notifications WHERE user_id = $1 AND is_read = FALSE",
      [req.user.id]
    );
    return res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark one notification as read
router.post("/:id/read", protect, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    return res.json({ message: "Marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// Mark all as read
router.post("/read-all", protect, async (req, res) => {
  try {
    await pool.query(
      "UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE",
      [req.user.id]
    );
    return res.json({ message: "All marked as read" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;