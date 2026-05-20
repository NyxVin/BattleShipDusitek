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
    socket.emit("syncConfig", finalConfig);

    // 🔥 SESSION DATA DARI PORTAL
    const params = new URLSearchParams(window.location.search);

    SessionManager.init({
      session_id: params.get("session_id"),
      session_token: params.get("session_token"),
      api_base_url: params.get("api_base_url"),
      expires_at: params.get("expires_at"),
    });

socket.off("reconnectSuccess");

socket.on("reconnectSuccess", (data: any) => {
  console.log("✅ RECONNECT SUCCESS CLIENT:", data);

  // Jangan langsung buka MainGame dari Boot.
  // Simpan dulu, nanti Preloader yang buka setelah asset selesai diload.
  this.registry.set("pendingReconnect", data);
});

if (!this.registry.get("matchExpiredListenerReady")) {
  this.registry.set("matchExpiredListenerReady", true);

  window.addEventListener("matchExpired", (event: any) => {
    console.log("⚠️ MATCH EXPIRED UI:", event.detail);

    this.registry.set("matchExpiredNotice", {
      title: "MATCH EXPIRED",
      message: "Kedua pemain terputus terlalu lama.\nMatch ini dianggap tidak valid.",
      subMessage: "Skor tidak dikirim.",
      reason: event.detail?.reason || "BOTH_PLAYERS_DISCONNECTED",
    });

    this.registry.remove("pendingReconnect");
    this.registry.remove("pendingLateGameResult");
    this.registry.remove("roomCode");

    this.game.scene.stop("MainGame");
    this.game.scene.stop("Placement");
    this.game.scene.stop("Result");

    this.game.scene.start("MainMenu");
  });
}

if (!this.registry.get("matchEndedListenerReady")) {
  this.registry.set("matchEndedListenerReady", true);

  window.addEventListener("matchEnded", (event: any) => {
    console.log("🏁 MATCH ENDED UI:", event.detail);

    this.registry.set("matchExpiredNotice", {
      title: event.detail?.title || "SESI GAME BERAKHIR",
      message:
        event.detail?.message ||
        "Sesi game telah berakhir.",
      subMessage:
        event.detail?.subMessage ||
        "Silakan kembali ke menu utama.",
      reason: event.detail?.reason || "MATCH_ENDED",
    });

    this.registry.remove("pendingReconnect");
    this.registry.remove("pendingLateGameResult");
    this.registry.remove("roomCode");

    this.game.scene.stop("MainGame");
    this.game.scene.stop("Placement");
    this.game.scene.stop("Result");

    this.game.scene.start("MainMenu");
  });
}

if (!this.registry.get("lateGameResultListenerReady")) {
  this.registry.set("lateGameResultListenerReady", true);

  window.addEventListener("lateGameResult", (event: any) => {
    console.log("🏁 LATE GAME RESULT UI:", event.detail);

    const resultData = event.detail;

    this.registry.remove("pendingReconnect");
    this.registry.remove("matchExpiredNotice");

    if (resultData.roomCode) {
      this.registry.set("roomCode", resultData.roomCode);
    }

    this.game.scene.stop("MainGame");
    this.game.scene.stop("Placement");
    this.game.scene.stop("MainMenu");
    this.game.scene.stop("Result");

    // Jangan langsung Result dari Boot.
    // Lewat Preloader dulu supaya asset Result aman.
    this.registry.set("pendingLateGameResult", resultData);
    this.game.scene.start("Preloader");
  });
}

    socket.connect();


    if (!SessionManager.sessionId || !SessionManager.sessionToken) {
      console.warn("⚠️ SESSION MODE NONAKTIF");
    }
    // 🔥 6. LANJUT GAME
    this.scene.start("Preloader");
  }
}
