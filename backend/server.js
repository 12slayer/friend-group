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

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/notes",notesRoutes);
app.use("/api/profiles",profileRoutes);
app.use("/api/media",mediaRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/notifications", notificationRoutes);


const PORT = process.env.PORT || 5000;

console.log({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  passwordLength: process.env.DB_PASSWORD?.length,
});


const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
