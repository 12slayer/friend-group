import pool from "../config/db.js";

// Runs AFTER protect(), so req.user.id is already available.
// Looks the role up fresh from the DB rather than trusting the token,
// so a role change takes effect immediately without needing to re-login.
export async function isAdmin(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await pool.query("SELECT role FROM users WHERE id = $1", [
      userId,
    ]);

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "User not found" });
    }

    if (result.rows[0].role !== "admin") {
      return res.status(403).json({ message: "Admin access required" });
    }

    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
}