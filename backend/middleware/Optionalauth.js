import jwt from "jsonwebtoken";

// Unlike protect(), this NEVER returns a 401. It just tries to figure out
// who's asking (if anyone) so public routes (like the media feed) can
// still say "liked_by_me: true/false" without requiring login.
export function optionalAuth(req, res, next) {
  const token = req.cookies?.token;

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, name, email }
  } catch (err) {
    req.user = null; // expired/invalid token — treat as logged out, don't error
  }

  next();
}