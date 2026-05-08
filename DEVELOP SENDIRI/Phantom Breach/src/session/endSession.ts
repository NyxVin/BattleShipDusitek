import { SessionManager } from "./sessionManager";

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

  navigator.sendBeacon(
    `${SessionManager.apiBaseUrl}/game-sessions/end`,
    blob
  );
}