import { SessionManager } from "./sessionManager";

// File ini memberi tahu server bahwa session player sudah selesai.
export function endSession() {

  if (!SessionManager.apiBaseUrl) return;

  const blob = new Blob(
    [
      JSON.stringify({
        session_id: SessionManager.sessionId,
        session_token: SessionManager.sessionToken,
      }),
    ],
    {
      type: "application/json",
    }
  );

  // Dipanggil saat player keluar atau menutup game.
  // sendBeacon tetap bisa mengirim data walaupun halaman sedang ditutup.
  navigator.sendBeacon(
    `${SessionManager.apiBaseUrl}/game-sessions/end`,
    blob
  );
}