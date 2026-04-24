import Phaser from "phaser";

type ResultData = {
  winner: string;
  myId: string;
  total: number;
  hit: number;
  miss: number;
  accuracy: number;
  score: number;
};

export class Result extends Phaser.Scene {
  private resultData!: ResultData;

  constructor() {
    super("Result");
  }

  init(data: ResultData) {
    console.log("🔥 INIT RESULT:", data);
    this.resultData = data;
  }

  create() {
    const cfg = this.registry.get("gameConfig");
    this.sound.stopAll();
    const { width, height } = this.scale;

    if (!this.resultData || !this.resultData.winner) {
      console.error("❌ RESULT DATA INVALID");
      this.scene.start("MainMenu");
      return;
    }

    const data = this.resultData;
    console.log("🔥 RESULT DATA:", data);

    const isWin = data.winner === data.myId;
    if (this.sound.get("winner")) this.sound.stopByKey("winner");
    if (this.sound.get("lose")) this.sound.stopByKey("lose");

    if (isWin) {
      this.sound.play("winner", { volume: 0.7 });
    } else {
      this.sound.play("lose", { volume: 0.7 });
    }
    this.cameras.main.fadeFrom(300, 0, 0, 0);
    this.add.rectangle(width / 2, height / 2, width, height, 0x1e5aa5);

    if (isWin) {
      this.add.image(width / 2, 110, "trophy").setScale(0.7);
    } else {
      this.add.image(width / 2, 110, "kalah").setScale(0.7);
    }

    this.add
      .text(width / 2, 180, isWin ? cfg.config.result.win_text : cfg.config.result.lose_text, {
        fontFamily: "Lilita One",
        fontSize: "44px",
        color: isWin ? "#FFC700" : "#FFFFFF",
        stroke: "#000",
        strokeThickness: 2,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 220, isWin ? cfg.config.result.win_desc : cfg.config.result.lose_desc, {
        fontFamily: "poppins",
        fontStyle: "bold",
        fontSize: "12px",
        color: "#D6E6FF",
      })
      .setOrigin(0.5);

    const card = this.add.image(width / 2, 380, isWin ? "card_menang" : "card_kalah").setScale(1.1);

    const cardWidth = card.displayWidth;
    const padding = 35;

    const leftX = card.x - cardWidth / 2 + padding;
    const rightX = card.x + cardWidth / 2 - padding;

    const gap = 40;

    const rows = [
      ["🎯 Total Serangan", data.total ?? 0],
      ["💥 Hit Akurat", data.hit ?? 0],
      ["💧 Miss", data.miss ?? 0],
      ["⭐ Akurasi", Math.min(100, Math.round(data.accuracy ?? 0)) + "%"],
      ["🏆 Score", data.score ?? 0],
    ];

    const startY = card.y - ((rows.length - 1) * gap) / 2;

    rows.forEach((row, i) => {
      const y = startY + i * gap;

      this.add
        .text(leftX, y, row[0] as string, {
          fontFamily: "Lilita One",
          fontSize: "20px",
          color: "#555",
        })
        .setOrigin(0, 0.5);

      this.add
        .text(rightX, y, String(row[1]), {
          fontFamily: "Lilita One",
          fontSize: "22px",
          color: i === rows.length - 1 ? "#FF9900" : "#333",
        })
        .setOrigin(1, 0.5);
    });

    const btn = this.add
      .image(width / 2, height - 80, "btn_menu")
      .setScale(0.8)
      .setInteractive();

    btn.on("pointerdown", () => {
      this.time.delayedCall(200, () => {
        this.scene.start("MainMenu");
      });
    });

    this.cameras.main.fadeIn(400);
  }
}
