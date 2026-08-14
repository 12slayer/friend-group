import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import pool from "../config/db.js";
import { protect } from "../middleware/auth.js";
import { isAdmin } from "../middleware/isadmin.js";
import { optionalAuth } from "../middleware/optionalAuth.js";
import { createNotification } from "../utils/createNotification.js";

const router = express.Router();

// ---------- multer setup for media (images + videos) ----------
const uploadDir = "uploads/media";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const allowedMimes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const fileFilter = (req, file, cb) => {
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image (jpeg, png, webp, gif) or video (mp4, webm, mov) files are allowed"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max (videos are bigger than images)
});

// GET all media — public, enriched with like/comment counts and whether
// the current visitor (if logged in) has liked each item.
router.get("/", optionalAuth, async (req, res) => {
  try {
    const viewerId = req.user?.id || null;

    const media = await pool.query(
      `SELECT
         m.*,
         COALESCE(l.like_count, 0)::int AS like_count,
         COALESCE(c.comment_count, 0)::int AS comment_count,
         (ul.user_id IS NOT NULL) AS liked_by_me
       FROM media m
       LEFT JOIN (
         SELECT media_id, COUNT(*) AS like_count FROM likes GROUP BY media_id
       ) l ON l.media_id = m.id
       LEFT JOIN (
         SELECT media_id, COUNT(*) AS comment_count FROM comments GROUP BY media_id
       ) c ON c.media_id = m.id
       LEFT JOIN likes ul ON ul.media_id = m.id AND ul.user_id = $1
       ORDER BY m.created_at DESC`,
      [viewerId]
    );

    return res.json(media.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// CREATE (upload) — admin only
router.post(
  "/",
  protect,
  isAdmin,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "A file is required" });
      }

      const { title } = req.body;
      const type = req.file.mimetype.startsWith("video") ? "video" : "image";
      const url = `/${uploadDir}/${req.file.filename}`;

      const newMedia = await pool.query(
        `INSERT INTO media (uploaded_by, type, url, title)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [req.user.id, type, url, title || null]
      );

      // shape it like the list endpoint so the frontend can prepend it directly
      return res.status(201).json({
        ...newMedia.rows[0],
        like_count: 0,
        comment_count: 0,
        liked_by_me: false,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// DELETE media — admin only
router.delete("/:id", protect, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await pool.query(
      "DELETE FROM media WHERE id = $1 RETURNING *",
      [id]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ message: "Media not found" });
    }

    const filePath = `.${deleted.rows[0].url}`;
    fs.unlink(filePath, (err) => {
      if (err) console.error("Failed to delete media file:", err.message);
    });

    return res.json({ message: "Media deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- LIKES ----------

// Toggle like/unlike for the logged-in user — requires login
router.post("/:id/like", protect, async (req, res) => {
  try {
    const mediaId = req.params.id;
    const userId = req.user.id;

    const existing = await pool.query(
      "SELECT * FROM likes WHERE media_id = $1 AND user_id = $2",
      [mediaId, userId]
    );

    let liked;
    if (existing.rows.length > 0) {
      await pool.query("DELETE FROM likes WHERE media_id = $1 AND user_id = $2", [
        mediaId,
        userId,
      ]);
      liked = false;
    } else {
      await pool.query(
        "INSERT INTO likes (media_id, user_id) VALUES ($1, $2)",
        [mediaId, userId]
      );
      liked = true;

      // notify the media owner (skip if they liked their own post)
      const mediaOwner = await pool.query(
        "SELECT uploaded_by FROM media WHERE id = $1",
        [mediaId]
      );
      if (mediaOwner.rows.length > 0) {
        await createNotification({
          userId: mediaOwner.rows[0].uploaded_by,
          actorId: userId,
          type: "like",
          mediaId,
          content: `${req.user.name} liked your post`,
        });
      }
    }

    const countResult = await pool.query(
      "SELECT COUNT(*)::int AS count FROM likes WHERE media_id = $1",
      [mediaId]
    );

    return res.json({ liked, count: countResult.rows[0].count });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// GET the list of people who liked a media item — public
router.get("/:id/likes", async (req, res) => {
  try {
    const mediaId = req.params.id;

    const likers = await pool.query(
      `SELECT u.id AS user_id, u.name, p.image
       FROM likes l
       JOIN users u ON u.id = l.user_id
       LEFT JOIN user_profiles p ON p.user_id = u.id
       WHERE l.media_id = $1
       ORDER BY l.created_at DESC`,
      [mediaId]
    );

    return res.json(likers.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// ---------- COMMENTS ----------

// GET all comments for a media item — public, includes commenter name + avatar
router.get("/:id/comments", async (req, res) => {
  try {
    const mediaId = req.params.id;

    const comments = await pool.query(
      `SELECT
         c.id, c.content, c.created_at, c.user_id,
         u.name AS user_name,
         p.image AS user_image
       FROM comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN user_profiles p ON p.user_id = c.user_id
       WHERE c.media_id = $1
       ORDER BY c.created_at ASC`,
      [mediaId]
    );

    return res.json(comments.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// POST a comment — requires login
router.post("/:id/comments", protect, async (req, res) => {
  try {
    const mediaId = req.params.id;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment cannot be empty" });
    }

    const newComment = await pool.query(
      `INSERT INTO comments (media_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, content, created_at, user_id`,
      [mediaId, req.user.id, content.trim()]
    );

    const mediaOwner = await pool.query(
      "SELECT uploaded_by FROM media WHERE id = $1",
      [mediaId]
    );
    if (mediaOwner.rows.length > 0) {
      await createNotification({
        userId: mediaOwner.rows[0].uploaded_by,
        actorId: req.user.id,
        type: "comment",
        mediaId,
        content: `${req.user.name} commented: ${content.trim().slice(0, 80)}`,
      });
    }

    return res.status(201).json({
      ...newComment.rows[0],
      user_name: req.user.name,
      user_image: null, // frontend can refetch the list if it needs the avatar too
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE a comment — the comment's own author, or an admin
router.delete("/:id/comments/:commentId", protect, async (req, res) => {
  try {
    const { commentId } = req.params;

    const existing = await pool.query("SELECT * FROM comments WHERE id = $1", [
      commentId,
    ]);

    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Comment not found" });
    }

    const isOwner = existing.rows[0].user_id === req.user.id;

    if (!isOwner) {
      const roleResult = await pool.query(
        "SELECT role FROM users WHERE id = $1",
        [req.user.id]
      );
      const isAdminUser = roleResult.rows[0]?.role === "admin";
      if (!isAdminUser) {
        return res.status(403).json({ message: "Not allowed to delete this comment" });
      }
    }

    await pool.query("DELETE FROM comments WHERE id = $1", [commentId]);

    return res.json({ message: "Comment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;