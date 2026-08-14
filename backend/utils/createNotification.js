import pool from "../config/db.js";
import { emitToUser } from "../socket/index.js";

// type: 'like' | 'comment' | 'message'
export async function createNotification({
  userId,      // recipient
  actorId,     // who caused it
  type,
  mediaId = null,
  messageId = null,
  content = null,
}) {
  // never notify yourself (e.g. admin liking their own upload)
  if (userId === actorId) return null;

  const result = await pool.query(
    `INSERT INTO notifications (user_id, actor_id, type, media_id, message_id, content)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, actorId, type, mediaId, messageId, content]
  );

  const notification = result.rows[0];
  emitToUser(userId, "new_notification", notification);
  return notification;
}