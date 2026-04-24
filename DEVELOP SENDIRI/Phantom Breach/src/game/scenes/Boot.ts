import { Scene } from "phaser";
import { DEFAULT_CONFIG } from "../config/defaultConfig";
import { socket } from "../socket";
export class Boot extends Scene {
  constructor() {
    super("Boot");
  }

  preload() {}

  create() {
    socket.on("configSync", (config) => {
      const current = this.registry.get("gameConfig");

      this.registry.set("gameConfig", {
        ...current,
        config: {
          ...current.config,
          gameplay: {
            ...current.config.gameplay,
            turn_time: config.turn_time,
            placement_time: config.placement_time,
          },
          score: config.score,
        },
      });
    });

    const slug = "battleship";

    fetch(`https://cms-api-test.test/api/events/${slug}/game-config`)
      .then((res) => res.json())
      .then((data) => {
        console.log("🔥 CONFIG DARI CMS:", data);

        const cmsConfig = {
          version: data.version,
          config: data.config,
        };

        this.registry.set("gameConfig", cmsConfig);

        socket.emit("syncConfig", cmsConfig.config);

        this.scene.start("Preloader");
      })
      .catch((err) => {
        console.error("❌ GAGAL CMS:", err);

        this.registry.set("gameConfig", DEFAULT_CONFIG);
        socket.emit("syncConfig", DEFAULT_CONFIG.config);

        this.scene.start("Preloader");
      });

    this.add.text(-1000, -1000, "font", {
      fontFamily: "LilitaOne",
    });
  }
}
