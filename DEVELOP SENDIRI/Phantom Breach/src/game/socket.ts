import { io } from "socket.io-client";
import { SessionManager } from "../session/sessionManager";

// File ini mengatur koneksi socket client ke server game.
const SERVER_URL = import.meta.env.VITE_SERVER_URL;
export let isAuthenticated = false;

// Mengambil alamat server dari environment.
export const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,

  autoConnect: false,
});
console.log("SERVER URL:", SERVER_URL);

// Membuat koneksi Socket.IO, tapi belum langsung connect.
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

// Saat socket berhasil connect, client langsung mengirim data auth ke server.
socket.on("authSuccess", () => {

  console.log("✅ AUTH SUCCESS");

  isAuthenticated = true;
});

// Server memberi tanda bahwa auth berhasil.
socket.on("reconnect", () => {
  console.log("✅ SOCKET RECONNECT BERHASIL");
});

// Dipanggil saat socket berhasil reconnect.
socket.on("disconnect", (reason) => {
  console.log("❌ SOCKET DISCONNECT:", reason);
});

// Dipanggil saat koneksi socket terputus.
socket.on("matchExpired", (data) => {
  console.log("⚠️ MATCH EXPIRED:", data);

  window.dispatchEvent(
    new CustomEvent("matchExpired", {
      detail: data,
    })
  );
});

// Event saat match invalid karena dua player disconnect terlalu lama.
// Event saat player yang kalah karena disconnect masuk lagi ke game.
socket.on("lateGameResult", (data) => {
  console.log("🏁 LATE GAME RESULT:", data);

  window.dispatchEvent(
    new CustomEvent("lateGameResult", {
      detail: data,
    })
  );
});