import { Scene } from "phaser";
import { DEFAULT_CONFIG } from "../config/defaultConfig";
import { socket } from "../socket";
import axios from "axios";
export class Boot extends Scene {
  constructor() {
    super("Boot");
  }

  preload() {}

  create() {
    axios
      .get("/config.json")
      .then((res) => {
        const data = res.data;

        console.log("🔥 CONFIG CMS:", data);

        // ✅ 1. LANGSUNG PAKAI CMS (JANGAN NUNGGU SERVER)
        this.registry.set("gameConfig", data);

        // ✅ 2. KIRIM KE SERVER (BIAR SERVER IKUT)
        socket.emit("syncConfig", data.config);

        // ✅ 3. LISTEN SERVER (TAPI TIDAK BLOKING)
        socket.once("configSync", (config) => {
          console.log("🔥 CONFIG DARI SERVER:", config);

          const current = this.registry.get("gameConfig");

          this.registry.set("gameConfig", {
            ...current,
            config: {
              ...current.config,
              gameplay: {
                ...current.config.gameplay,
                turn_time: config.gameplay?.turn_time ?? current.config.gameplay.turn_time,
                placement_time: config.gameplay?.placement_time ?? current.config.gameplay.placement_time,
                ship_cooldowns: config.gameplay?.ship_cooldowns ?? current.config.gameplay.ship_cooldowns, // 🔥 INI KUNCI
              },
              score: {
                ...current.config.score,
                ...config.score,
              },
            },
          });
        });

        // 🔥 4. LANGSUNG MASUK GAME (INI KUNCI)
        this.scene.start("Preloader");
      })
      .catch((err) => {
        console.error("❌ GAGAL CMS:", err);

        // fallback default
        this.registry.set("gameConfig", DEFAULT_CONFIG);

        socket.emit("syncConfig", DEFAULT_CONFIG.config);

        this.scene.start("Preloader");
      });
  }
}
