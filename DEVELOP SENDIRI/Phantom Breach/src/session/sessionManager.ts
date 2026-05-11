export const SessionManager = {
  sessionId: "",
  sessionToken: "",
  apiBaseUrl: "",
  expiresAt: "",
  userId: "",
  username: "",
  eventId: "",
  gameId: "",

  init(data: any) {
    this.sessionId = data.session_id || "";
    this.sessionToken = data.session_token || "";
    this.apiBaseUrl = typeof data.api_base_url === "string" ? data.api_base_url.replace(/\/$/, "") : "";
    this.expiresAt = data.expires_at || "";
    this.userId = data.user_id || "";
    this.username = data.username || "";
    this.eventId = data.event_id || "";
    this.gameId = data.game_id || "";

    console.log("🔥 SESSION INIT:", {
      sessionId: this.sessionId,
      apiBaseUrl: this.apiBaseUrl,
    });
  },

  isExpired() {
    if (!this.expiresAt) return false;

    return Date.now() > new Date(this.expiresAt).getTime();
  },
};
