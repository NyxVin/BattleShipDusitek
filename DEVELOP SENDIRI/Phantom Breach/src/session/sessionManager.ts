export const SessionManager = {
  sessionId: "",
  sessionToken: "",
  apiBaseUrl: "",
  expiresAt: "",

  // File ini menyimpan data session player dari CMS/SISFO.
  init(data: any) {
    this.sessionId = data.session_id || "";
    this.sessionToken = data.session_token || "";
    this.apiBaseUrl = typeof data.api_base_url === "string" ? data.api_base_url.replace(/\/$/, "") : "";
    this.expiresAt = data.expires_at || "";

    console.log("🔥 SESSION INIT:", {
      sessionId: this.sessionId,
      apiBaseUrl: this.apiBaseUrl,
    });
  },

  // Mengisi data session dari parameter URL.
  // Mengecek apakah session player sudah expired.
  isExpired() {
    if (!this.expiresAt) return false;

    return Date.now() > new Date(this.expiresAt).getTime();
  },
};
