import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.js";
import notesRoutes from "./routes/notes.js";
import profileRoutes from "./routes/profiles.js";
import mediaRoutes from "./routes/media.js";
import http from "http";
import { initSocket } from "./socket/index.js";
import messageRoutes from "./routes/Messages.routes.js";
import notificationRoutes from "./routes/Notifications.routes.js";

dotenv.config();

const app = express();

// // --- CORS CONFIG ---
// const allowedOrigins = [
//   "http://localhost:5173",
//   "https://mellow-axolotl-982ea0.netlify.app",
//   process.env.CLIENT_URL,
// ].filter(Boolean);

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      process.env.CLIENT_URL || "https://your-site-name.netlify.app",
    ],
    credentials: true,
  })
);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/profiles", profileRoutes);
app.use("/api/media", mediaRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);

app.get("/", (req, res) => {
  res.json({
    message: "Friend Group API is running",
  });
});

const PORT = process.env.PORT || 5000;

console.log({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  passwordLength: process.env.DB_PASSWORD?.length,
});

const httpServer = http.createServer(app);
initSocket(httpServer, allowedOrigins);

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
