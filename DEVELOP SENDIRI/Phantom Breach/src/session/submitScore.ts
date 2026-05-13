import axios from "axios";
import { SessionManager } from "./sessionManager";
let alreadySubmitted = false;
export async function submitScore(data: any) {
      if (alreadySubmitted) {
    console.log("⚠️ SCORE SUDAH DIKIRIM");
    return;
  }

  alreadySubmitted = true;

  if (!SessionManager.apiBaseUrl) {
    console.log("❌ API BASE URL TIDAK ADA");
    return;
  }

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