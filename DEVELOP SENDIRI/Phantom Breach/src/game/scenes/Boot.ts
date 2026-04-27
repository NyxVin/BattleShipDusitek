import { Scene } from "phaser";
import { DEFAULT_CONFIG } from "../config/defaultConfig";
import { socket } from "../socket";
import { mergeConfig } from "../config/mergeConfig";
import { loadConfig } from "../config/loadConfig";

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
    socket.emit("syncConfig", finalConfig.config);

    // 🔥 6. LANJUT GAME
    this.scene.start("Preloader");
  }
}