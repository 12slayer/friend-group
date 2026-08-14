import express from "express";
import pool from "../config/db.js";
import { protect } from "../middleware/auth.js";
import { emitToUser } from "../socket/index.js";
import { createNotification } from "../utils/createNotification.js";

const router = express.Router();

// GET list of everyone you've messaged, with last message + unread count.
// Sorted by most recent activity first.
router.get("/conversations", protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT
         other.id AS user_id,
         other.name,
         p.image,
         last_msg.content AS last_message,
         last_msg.created_at AS last_message_at,
         COALESCE(unread.count, 0)::int AS unread_count
       FROM (
         SELECT DISTINCT
           CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS other_user_id
         FROM messages
         WHERE sender_id = $1 OR receiver_id = $1
       ) partners
       JOIN users other ON other.id = partners.other_user_id
       LEFT JOIN user_profiles p ON p.user_id = other.id
       LEFT JOIN LATERAL (
         SELECT content, created_at
         FROM messages
         WHERE (sender_id = $1 AND receiver_id = other.id)
            OR (sender_id = other.id AND receiver_id = $1)
         ORDER BY created_at DESC
         LIMIT 1
       ) last_msg ON true
       LEFT JOIN (
         SELECT sender_id, COUNT(*) AS count
         FROM messages
         WHERE receiver_id = $1 AND is_read = FALSE
         GROUP BY sender_id
       ) unread ON unread.sender_id = other.id
       ORDER BY last_msg.created_at DESC`,
      [userId]
    );

    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET the list of all users, for starting a new conversation (no "add friend" step)
router.get("/users", protect, async (req, res) => {
  try {
    const myRoleResult = await pool.query("SELECT role FROM users WHERE id = $1", [
      req.user.id,
    ]);
    const iAmAdmin = myRoleResult.rows[0]?.role === "admin";

    const result = await pool.query(
      `SELECT u.id, u.name, p.image
       FROM users u
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE u.id != $1 ${iAmAdmin ? "" : "AND u.role != 'admin'"}
       ORDER BY u.name ASC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET message history with a specific user, and mark their messages to you as read
router.get("/:userId", protect, async (req, res) => {
  try {
    const myId = req.user.id;
    const otherId = req.params.userId;

    const history = await pool.query(
      `SELECT id, sender_id, receiver_id, content, is_read, created_at
       FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)
       ORDER BY created_at ASC`,
      [myId, otherId]
    );

    await pool.query(
      `UPDATE messages SET is_read = TRUE
       WHERE sender_id = $1 AND receiver_id = $2 AND is_read = FALSE`,
      [otherId, myId]
    );

    return res.json(history.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST a new message to a specific user
router.post("/:userId", protect, async (req, res) => {
  try {
    const senderId = req.user.id;
    const receiverId = req.params.userId;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Message cannot be empty" });
    }
    if (String(receiverId) === String(senderId)) {
      return res.status(400).json({ message: "You can't message yourself" });
    }

    // regular users can't message admin accounts (admin can still message anyone)
    const roles = await pool.query(
      `SELECT id, role FROM users WHERE id = ANY($1::int[])`,
      [[senderId, receiverId]]
    );
    const senderRole = roles.rows.find((r) => r.id === senderId)?.role;
    const receiverRole = roles.rows.find((r) => String(r.id) === String(receiverId))?.role;

    if (receiverRole === "admin" && senderRole !== "admin") {
      return res.status(403).json({ message: "You can't message this user" });
    }

    const newMessage = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, sender_id, receiver_id, content, is_read, created_at`,
      [senderId, receiverId, content.trim()]
    );

    const message = newMessage.rows[0];

    // push it live to the receiver (and back to the sender, for multi-tab sync)
    emitToUser(receiverId, "receive_message", message);
    emitToUser(senderId, "receive_message", message);

    await createNotification({
      userId: receiverId,
      actorId: senderId,
      type: "message",
      messageId: message.id,
      content: `${req.user.name}: ${content.trim().slice(0, 80)}`,
    });

    return res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;