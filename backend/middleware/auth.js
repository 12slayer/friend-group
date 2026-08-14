import jwt, { decode } from "jsonwebtoken";
import pool from "../config/db.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token;
    console.log('token from cookies',req.cookies)
    if (!token) {
      return res.status(401).json({ message: "Not authorized, no token" });
    }

///today 
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log(decoded);
    const user = await pool.query(
      "SELECT id, name, email FROM users WHERE id = $1",
      [decoded.id]
    );

    if (user.rows.length === 0) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }

    req.user = user.rows[0];
    next();
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Not authorized, token failed" });
  }
};

