import { io } from "socket.io-client";
import { SessionManager } from "../session/sessionManager";

const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export let isAuthenticated = false;
export const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,

  autoConnect: false,
});
console.log("SERVER URL:", SERVER_URL);

socket.on("connect", () => {

  console.log("🔥 SOCKET CONNECT:", socket.id);

  socket.emit("auth", {
    sessionToken: SessionManager.sessionToken,
    sessionId: SessionManager.sessionId,
    userId: SessionManager.userId,
    username: SessionManager.username,
    eventId: SessionManager.eventId,
    gameId: SessionManager.gameId,
  });
});

socket.on("authSuccess", () => {

  console.log("✅ AUTH SUCCESS");

  isAuthenticated = true;
});

// 🔥 RECONNECT
socket.on("reconnect", () => {
  console.log("✅ SOCKET RECONNECT BERHASIL");
});

// 🔥 DISCONNECT
socket.on("disconnect", (reason) => {
  console.log("❌ SOCKET DISCONNECT:", reason);
});