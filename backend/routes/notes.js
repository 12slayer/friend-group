import express from "express";
import pool from "../config/db.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// All routes below require a valid token (protect middleware runs first)

// CREATE a note
router.post("/", protect, async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = req.user.id; // comes from decoded token, set by protect middleware

    if (!title) {
      return res.status(400).json({ message: "Title is required" });
    }

    const newNote = await pool.query(
      "INSERT INTO notes (user_id, title, content) VALUES ($1, $2, $3) RETURNING *",
      [userId, title, content]
    );

    return res.status(201).json(newNote.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// READ all notes belonging to the logged-in user
router.get("/", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log("user_i",userId)
    const notes = await pool.query(
      "SELECT * FROM notes WHERE user_id = $1 ORDER BY updated_at DESC",
      [userId]
    );

    return res.json(notes.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// READ a single note by id (only if it belongs to the user)
router.get("/:id", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const note = await pool.query(
      "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (note.rows.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    return res.json(note.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// UPDATE a note (only if it belongs to the user)
router.put("/:id", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { title, content } = req.body;

    // check ownership first
    const existing = await pool.query(
      "SELECT * FROM notes WHERE id = $1 AND user_id = $2",
      [id, userId]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    const updatedNote = await pool.query(
      `UPDATE notes
       SET title = $1, content = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [
        title ?? existing.rows[0].title,
        content ?? existing.rows[0].content,
        id,
        userId,
      ]
    );

    return res.json(updatedNote.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE a note (only if it belongs to the user)
router.delete("/:id", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const deleted = await pool.query(
      "DELETE FROM notes WHERE id = $1 AND user_id = $2 RETURNING *",
      [id, userId]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ message: "Note not found" });
    }

    return res.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;