import { io } from "socket.io-client";

// A single shared socket connection for the whole app, reused by both the
// chat component and the notification bell. withCredentials sends the
// "token" cookie so the backend's socket auth middleware can identify you.
export const socket = io("http://localhost:5000", {
  withCredentials: true,
  autoConnect: false, // we connect manually once we know the user is logged in
});