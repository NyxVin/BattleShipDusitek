import axios from "axios";
import { SessionManager } from "./sessionManager";

// File ini mengirim score player ke endpoint submit score.
let alreadySubmitted = false;

// Mencegah score dikirim berkali-kali dari client yang sama.
export async function submitScore(data: any) {
      if (alreadySubmitted) {
    console.log("⚠️ SCORE SUDAH DIKIRIM");
    return;
  }

  alreadySubmitted = true;
  // Mengirim hasil game seperti score, win/lose, dan room_code.
  if (!SessionManager.apiBaseUrl) {
    console.log("❌ API BASE URL TIDAK ADA");
    return;
  }

  // Jika URL API tidak ada, score tidak bisa dikirim.
  // Jika session expired, score tidak dikirim.
  if (SessionManager.isExpired()) {
    console.log("❌ SESSION EXPIRED");
    return;
  }

  try {

    const res = await axios.post(
      `${SessionManager.apiBaseUrl}/game-sessions/submit-score`,
      {
        session_id: SessionManager.sessionId,
        session_token: SessionManager.sessionToken,
        score: data.score,
        result: data.result,
        room_code: data.roomCode,
      }
    );

    console.log("🔥 SUBMIT BERHASIL:", res.data);

  } catch (err) {

    console.error("❌ GAGAL SUBMIT:", err);

  }
}