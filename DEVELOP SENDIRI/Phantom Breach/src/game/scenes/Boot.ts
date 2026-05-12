import { Scene } from "phaser";
import { DEFAULT_CONFIG } from "../config/defaultConfig";
import { socket } from "../socket";
import { mergeConfig } from "../config/mergeConfig";
import { loadConfig } from "../config/loadConfig";
import { SessionManager } from "../../session/sessionManager";

export class Boot extends Scene {
  constructor() {
    super("Boot");
  }

  preload() {}

  async create() {
    // 🔥 1. LOAD (dari CMS / config.json)
    const cmsData = await loadConfig();

    let finalConfig;

    if (cmsData) {
      console.log("🔥 CONFIG CMS:", cmsData);

      // 🔥 2. MERGE
      finalConfig = mergeConfig(DEFAULT_CONFIG, cmsData);
    } else {
      console.log("⚠️ PAKAI DEFAULT");

      // 🔥 3. FALLBACK
      finalConfig = DEFAULT_CONFIG;
    }

    console.log("🔥 FINAL CONFIG:", finalConfig);

    // 🔥 4. SIMPAN
    this.registry.set("gameConfig", finalConfig);

    // 🔥 5. KIRIM KE SERVER
    socket.emit("syncConfig", finalConfig.schema);

    // 🔥 SESSION DATA DARI PORTAL
    const params = new URLSearchParams(window.location.search);

    SessionManager.init({
      session_id: params.get("session_id"),
      session_token: params.get("session_token"),
      api_base_url: params.get("api_base_url"),
      expires_at: params.get("expires_at"),
      user_id: params.get("user_id"),
      username: params.get("username"),
      event_id: params.get("event_id"),
      game_id: params.get("game_id"),
    });

    socket.connect();


    if (!SessionManager.sessionId || !SessionManager.sessionToken) {
      console.warn("⚠️ SESSION MODE NONAKTIF");
    }
    // 🔥 6. LANJUT GAME
    this.scene.start("Preloader");
  }
}
