import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

// Manually parse the "token" cookie out of the raw cookie header.
// Socket.IO's handshake doesn't run through Express's cookie-parser,
// so we do it ourselves rather than pulling in an extra dependency.
function getTokenFromCookieHeader(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith("token="));
  if (!match) return null;
  return decodeURIComponent(match.split("=")[1]);
}

export function initSocket(httpServer, allowedOrigins = ["https://mellow-axolotl-982ea0.netlify.app/"]) {
  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // allow requests with no origin (mobile apps, curl, server-to-server, etc.)
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          console.log("Socket.IO blocked by CORS:", origin);
          callback(new Error("Not allowed by CORS"));
        }
      },
      credentials: true,
    },
  });

  // Auth middleware: every socket connection must present a valid token cookie.
  io.use((socket, next) => {
    try {
      const token = getTokenFromCookieHeader(socket.handshake.headers.cookie);
      if (!token) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Every user gets their own room, keyed by their id — this way we can
    // push events to "user:5" without tracking raw socket ids ourselves,
    // and it naturally supports a user having multiple tabs open.
    const room = `user:${socket.userId}`;
    socket.join(room);

    socket.on("disconnect", () => {
      // no manual cleanup needed — Socket.IO removes the socket from all rooms automatically
    });
  });

  return io;
}

// Used by REST routes (media, messages) to push live events without
// importing the whole socket setup again.
export function getIO() {
  if (!io) {
    throw new Error("Socket.IO not initialized yet — call initSocket() in server.js first");
  }
  return io;
}

// Convenience helper: emit an event to one specific user's room.
export function emitToUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
