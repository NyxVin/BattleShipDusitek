import { Scene } from "phaser";
import { socket } from "../socket";

type PlayerScore = {
  totalAttack: number;
  hitCount: number;
  missCount: number;
  accuracy: number;
  score: number;
};

export class Game extends Scene {
  private COLS = 8;
  private ROWS = 6;
  private cellSize!: number;
  private startX!: number;
  private enemyStartY!: number;
  private turnPopup!: Phaser.GameObjects.Text;
  private turnPopupText!: Phaser.GameObjects.Text;
  private sfx: any;

  enemyGrid: any[][] = [];
  selfGrid: any[][] = [];

  selectedCell: { x: number; y: number } | null = null;

  turnTime: number = 0;
  timerText!: Phaser.GameObjects.Text;
  turnText!: Phaser.GameObjects.Text;
  hitMarks: Phaser.GameObjects.Image[] = [];
  missMarks: Phaser.GameObjects.Image[] = [];
  isMyTurn: boolean = false;
  isAnimating: boolean = false;
  pendingGameOver: { winner: string; scores: any } | null = null;
  roomCode: string = "";
  shipRects: Phaser.GameObjects.Rectangle[] = [];
  previewRects: Phaser.GameObjects.Rectangle[] = [];
  targetMarks: Phaser.GameObjects.Image[] = [];
  gameData: any;
  selectedShipIndex: number = -1;
  lastUsedShipIndex: number = -1;
  isVerticalAttack: boolean = false;

  shipsUI = [
    { key: "spaceship1", width: 1, height: 1, cooldown: 0, cooldownLeft: 0, cooldownActive: false, color: "#F59E0B", rangeKey: "grid_range1" },
    { key: "spaceship2", width: 2, height: 2, cooldown: 3, cooldownLeft: 0, cooldownActive: false, color: "#3B82F6", rangeKey: "grid_range2" },
    { key: "spaceship3", width: 2, height: 1, cooldown: 0, cooldownLeft: 0, cooldownActive: false, color: "#64748B", rangeKey: "grid_range3" },
    { key: "spaceship4", width: 1, height: 3, cooldown: 2, cooldownLeft: 0, cooldownActive: false, color: "#8B5CF6", rangeKey: "grid_range4" },
  ];

  constructor() {
    super("MainGame");
  }

  init(data: any) {
    this.roomCode = data.roomCode;
    this.gameData = data; // simpan dulu
  }

  create() {
    const cfg = this.registry.get("gameConfig");
    this.turnTime = cfg.config.gameplay.turn_time;
    this.shipsUI.forEach((ship) => {
      ship.cooldown = cfg.config.gameplay.ship_cooldowns[ship.key] ?? 0;
    });
    console.log("DPR:", window.devicePixelRatio);
    this.sfx = {
      misil: this.sound.add("misil"),
      explosion: this.sound.add("explosion"),
      waterboom: this.sound.add("waterboom"),
    };
    const bgm = this.sound.get("soundgame");
    if (bgm && bgm.isPlaying) {
      bgm.stop();
    }
    const width = this.scale.width;
    const height = this.scale.height;
    const centerX = width / 2;

    if (!this.anims.exists("anim_hit")) {
      this.anims.create({
        key: "anim_hit",
        frames: this.anims.generateFrameNumbers("hit", { start: 0, end: 7 }),
        frameRate: 12,
        repeat: -1, // 🔥 loop terus
      });
    }

    if (!this.anims.exists("anim_miss")) {
      this.anims.create({
        key: "anim_miss",
        frames: this.anims.generateFrameNumbers("miss", { start: 0, end: 5 }),
        frameRate: 6,
        repeat: 0, // 🔥 sekali
      });
    }

    if (!this.anims.exists("anim_peluru")) {
      this.anims.create({
        key: "anim_peluru",
        frames: this.anims.generateFrameNumbers("peluru", { start: 0, end: 2 }),
        frameRate: 15,
        repeat: -1,
      });
    }
    this.add.image(centerX, height / 2, "background").setDisplaySize(width, height);
    const header = this.add.container(centerX, 45);
    const panel = this.add.image(0, 0, "panel_top").setScale(0.5);
    const dot = this.add.circle(-130, 0, 5, 0xfacc15);
    this.turnText = this.add.text(-117, -18, cfg.config.ui.header.title, {
      fontSize: "18px",
      fontFamily: "Lilita One",
      color: "#1E3A8A",
    });
    const subtitle = this.add.text(-115, 3, cfg.config.ui.header.subtitle, {
      fontSize: "12px",
      fontFamily: "Lilita One",
      color: "#6B7280",
    });
    const timerBG = this.add.image(120, 0, "bg_timer").setScale(0.4);
    this.timerText = this.add
      .text(120, 0, this.turnTime + "s", {
        fontSize: "20px",
        fontFamily: "Lilita One",
        color: "#D84315",
      })
      .setOrigin(0.5);
    header.add([panel, dot, this.turnText, subtitle, timerBG, this.timerText]);

    header.setDepth(1);
    this.add
      .text(centerX, 145, "Tap cell untuk menyerang lawan!", {
        fontSize: "13px",
        fontFamily: "poppins",
        color: "#FFD93D",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    const gridWidth = width * 0.75;

    const cellSize = Math.floor(gridWidth / this.COLS);
    this.cellSize = cellSize;
    const gridHeight = cellSize * this.ROWS;

    this.startX = centerX - gridWidth / 2;
    this.enemyStartY = 80;
    const selfStartY = this.enemyStartY + gridHeight + 20;

    this.enemyGrid = this.createGrid(this.startX, this.enemyStartY, cellSize, true);
    this.selfGrid = this.createGrid(this.startX, selfStartY, cellSize, false);
    this.input.on("pointermove", (pointer: any) => {
      if (!this.isMyTurn) return;
      if (this.isAnimating) return;
      if (this.selectedCell !== null || this.targetMarks.length > 0) return;
      if (this.selectedShipIndex === -1) return;

      const mouseX = pointer.worldX;
      const mouseY = pointer.worldY;

      const boardWidth = this.COLS * this.cellSize;
      const boardHeight = this.ROWS * this.cellSize;

      const enemyStartX = this.startX;
      const enemyStartY = this.enemyStartY;

      const enemyEndX = enemyStartX + boardWidth;
      const enemyEndY = enemyStartY + boardHeight;
      const isInsideEnemyBoard = mouseX >= enemyStartX && mouseX <= enemyEndX && mouseY >= enemyStartY && mouseY <= enemyEndY;
      if (!isInsideEnemyBoard) {
        this.previewRects.forEach((r) => r.destroy());
        this.previewRects = [];
        return;
      }

      const col = Math.floor((mouseX - enemyStartX) / this.cellSize);
      const row = Math.floor((mouseY - enemyStartY) / this.cellSize);

      this.showPreview(col, row);
    });

    const midY = this.enemyStartY + this.cellSize * this.ROWS + 10;
    const bgGraphics = this.add.graphics();

    bgGraphics.fillStyle(0x0f172a, 0.7);
    bgGraphics.lineStyle(2, 0x38bdf8);

    bgGraphics.fillRoundedRect(-90, -25, 180, 50, 12);
    bgGraphics.strokeRoundedRect(-90, -25, 180, 50, 12);
    this.turnPopupText = this.add
      .text(0, 0, "", {
        fontSize: "20px",
        fontFamily: "Lilita One",
        color: "#ffffff",
      })
      .setOrigin(0.5)
      .setStroke("#ffffff", 4);
    this.turnPopup = this.add
      .container(this.scale.width / 2, midY, [bgGraphics, this.turnPopupText])
      .setDepth(50)
      .setScale(0.3)
      .setAlpha(0);

    if (this.gameData && this.gameData.ships) {
      const myId = socket.id;
      const myShips = this.gameData.ships[myId];
      console.log("MY ID:", myId);
      console.log("ALL SHIPS:", this.gameData.ships);
      console.log("RENDER DI CREATE:", myShips);

      this.time.delayedCall(100, () => {
        if (!this.scene.isActive()) return;

        const myId = socket.id;
        const myShips = this.gameData?.ships?.[myId];

        if (myShips) {
          this.renderShips(myShips);
        } else {
          console.error("❌ SHIPS TIDAK ADA");
        }
      });
    }

    const cardSize = 60;
    const gap = 15;

    const totalWidth = this.shipsUI.length * cardSize + (this.shipsUI.length - 1) * gap;
    const startXCard = (width - totalWidth) / 2;

    const cardY = this.scale.height - 90;

    this.shipsUI.forEach((ship, i) => {
      const x = startXCard + i * (cardSize + gap) + cardSize / 2;
      const container = this.add.container(x, cardY);
      const bg = this.add.image(0, -10, "card_unit").setDisplaySize(cardSize, 65); // Tinggikan sedikit agar muat 3 tumpuk
      const shipIcon = this.add.image(0, -22, ship.key).setDisplaySize(35, 20);

      const cdText = this.add
        .text(0, 38, "", {
          fontSize: "9px",
          fontFamily: "Lilita One",
          color: "#ff0000",
        })
        .setOrigin(0.5);

      const cdBig = this.add
        .text(0, 0, "", {
          fontSize: "18px",
          fontFamily: "Lilita One",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      this.time.addEvent({
        delay: 200,
        loop: true,
        callback: () => {
          if (!cdText || !cdText.active) return;
          if (!cdBig || !cdBig.active) return;

          if (ship.cooldownActive && ship.cooldownLeft > 0) {
            cdBig.setText(ship.cooldownLeft.toString());
            if (this.selectedShipIndex !== i) {
              bg.setTint(0x444444);
              shipIcon.setTint(0x666666);
              rangeIcon.setTint(0x666666);
            }
          } else {
            cdBig.setText("");
            if (this.selectedShipIndex !== i) {
              bg.clearTint();
              shipIcon.clearTint();
              rangeIcon.clearTint();
            }
          }
        },
      });
      const rangeIcon = this.add.image(0, 10, ship.rangeKey).setScale(0.4);
      container.add([bg, shipIcon, cdText, rangeIcon, cdBig]);

      container.setSize(cardSize, 85);
      container.setInteractive();

      container.on("pointerdown", () => {
        if (ship.cooldownActive && ship.cooldownLeft > 0) {
          this.showTurnPopup(cfg.config.ui.text.cooldown, cfg.config.ui.colors.enemy);
          return;
        }
        this.selectedShipIndex = i;
        this.isVerticalAttack = false;
        console.log("SHIP DIPILIH:", this.shipsUI[this.selectedShipIndex]);

        this.shipsUI.forEach((_, index) => {
          const containers = this.children.list.filter((obj: any) => obj instanceof Phaser.GameObjects.Container);
          const targetContainer = containers[index];

          if (targetContainer) {
            const targetBg = targetContainer.list[0] as Phaser.GameObjects.Image;
            if (index !== i) {
              targetBg.clearTint();
            }
          }
        });

        const selectedBg = container.list[0] as Phaser.GameObjects.Image;
        selectedBg.setTint(0xffff00);
      });
    });

    const btnY = this.scale.height - 35;
    const rotateBtn = this.add
      .image(centerX - 105, btnY, "btn_rotate")
      .setScale(0.47)
      .setInteractive();

    rotateBtn.on("pointerdown", () => {
      this.isVerticalAttack = !this.isVerticalAttack;

      console.log("ROTATE:", this.isVerticalAttack ? "VERTICAL" : "HORIZONTAL");
      if (this.selectedCell) {
        const { x, y } = this.selectedCell;

        const ship = this.shipsUI[this.selectedShipIndex];

        if (ship.cooldownActive && ship.cooldownLeft > 0) {
          this.showTurnPopup(cfg.config.ui.text.cooldown, cfg.config.ui.colors.enemy);
          return;
        }

        const w = this.isVerticalAttack ? ship.height : ship.width;
        const h = this.isVerticalAttack ? ship.width : ship.height;

        this.selectedCell = { x, y };
        this.previewRects.forEach((r) => r.destroy());
        this.previewRects = [];
        this.targetMarks.forEach((t) => t.destroy());
        this.targetMarks = [];

        for (let dx = 0; dx < w; dx++) {
          for (let dy = 0; dy < h; dy++) {
            const tx = x + dx;
            const ty = y + dy;

            if (tx < 0 || tx >= this.COLS || ty < 0 || ty >= this.ROWS) continue;

            const px = this.startX + tx * this.cellSize + this.cellSize / 2;
            const py = this.enemyStartY + ty * this.cellSize + this.cellSize / 2;

            const target = this.add
              .image(px, py, "target")
              .setDisplaySize(this.cellSize * 0.8, this.cellSize * 0.8)
              .setDepth(1000);

            this.tweens.add({
              targets: target,
              alpha: 0.3,
              duration: 700,
              yoyo: true,
              repeat: -1,
              ease: "Sine.easeInOut",
            });

            this.targetMarks.push(target);
          }
        }
      }
    });

    const btn = this.add
      .image(centerX + 40, btnY, "btn_serang")
      .setInteractive()
      .setScale(0.47);
    btn.on("pointerdown", () => {
      if (!this.isMyTurn) return;
      if (this.isAnimating) return;

      this.attack(); // 🔥 PINDAH KE SINI
    });
    socket.off("game_tick");
    socket.off("attackResult");
    socket.off("gameOver");
    socket.off("updateScore");

    let lastTurn = "";

    socket.on("game_tick", (data) => {
      if (!this.timerText || !this.timerText.active) return;

      this.timerText.setText(data.timeLeft + "s");

      const prevTurn = lastTurn;
      lastTurn = data.currentTurn;

      this.isMyTurn = data.currentTurn === socket.id;
      this.turnTime = data.timeLeft;

      if (prevTurn !== data.currentTurn) {
        // 🔥 TAMBAHAN: TURUNKAN COOLDOWN DI SINI
        this.shipsUI.forEach((ship) => {
          if (ship.cooldownActive && ship.cooldownLeft > 0) {
            ship.cooldownLeft--;

            if (ship.cooldownLeft <= 0) {
              ship.cooldownLeft = 0;
              ship.cooldownActive = false;
            }
          }
        });

        // popup tetap
        if (this.isMyTurn) {
          this.showTurnPopup(cfg.config.ui.text.turn, cfg.config.ui.colors.turn);
        } else {
          this.showTurnPopup(cfg.config.ui.text.enemy, cfg.config.ui.colors.enemy);
        }
      }
    });

    socket.on("attackResult", ({ cells, target, attackerId }) => {
      if (!cells || cells.length === 0) {
        console.warn("⚠️ CELLS KOSONG");
        this.isAnimating = false;
        return;
      }
      this.sfx.misil.play({ volume: attackerId === socket.id ? 0.5 : 0.4 });
      this.isAnimating = true;
      this.time.delayedCall(5000, () => {
        if (this.isAnimating) {
          console.warn("⚠️ FORCE STOP ANIMATION");
          this.isAnimating = false;
        }
      });
      this.targetMarks.forEach((t) => t.destroy());
      this.targetMarks = [];

      this.previewRects.forEach((r) => r.destroy());
      this.previewRects = [];
      let soundPlayed = false;
      let pending = cells.length;
      let isAnyHit = false;
      cells.forEach(({ x, y, hit }: any) => {
        const isEnemy = target === "enemy";

        const startY = isEnemy ? this.enemyStartY : this.enemyStartY + this.cellSize * this.ROWS + 20;

        const px = this.startX + x * this.cellSize + this.cellSize / 2;
        const py = startY + y * this.cellSize + this.cellSize / 2 - 5;

        const bullet = this.add
          .sprite(px, -50, "peluru") // 🔥 DARI ATAS

          .setScale(1.8) // 🔥 BESARIN
          .setDepth(3000);

        bullet.play("anim_peluru");

        this.tweens.add({
          targets: bullet,
          y: py,
          duration: 2000,
          ease: "Linear", // 🔥 WAJIB GANTI
          onUpdate: () => {
            if (bullet.y >= py) {
              bullet.y = py; // 🔥 STOP DI GRID
            }
          },

          onComplete: () => {
            bullet.destroy();

            if (hit) {
              isAnyHit = true;

              this.cameras.main.shake(400, 0.05);
              const hitMark = this.add
                .sprite(px, py, "hit")
                .setDisplaySize(this.cellSize * 0.8, this.cellSize * 0.8)
                .setDepth(2000);

              hitMark.play("anim_hit");

              this.tweens.add({
                targets: hitMark,
                scale: 1,
                duration: 300,
                ease: "Back.Out",
              });

              this.hitMarks.push(hitMark);
            } else {
              const missMark = this.add
                .sprite(px, py, "miss")
                .setDisplaySize(this.cellSize * 0.7, this.cellSize * 0.7)
                .setDepth(2000);

              missMark.play("anim_miss");

              this.tweens.add({
                targets: missMark,
                alpha: 1,
                duration: 500,
              });

              this.tweens.add({
                targets: missMark,
                alpha: 0,
                delay: 800,
                duration: 600,
                onComplete: () => missMark.destroy(),
              });

              this.missMarks.push(missMark);
            }
            pending--;

            if (pending === 0 && !soundPlayed) {
              if (attackerId === socket.id) {
                if (attackerId === socket.id) {
                  const ship = this.shipsUI[this.lastUsedShipIndex];

                  if (ship && ship.cooldown > 0) {
                    ship.cooldownActive = true;
                    ship.cooldownLeft = ship.cooldown;
                  }

                  this.lastUsedShipIndex = -1;
                }
              }
              soundPlayed = true;
              if (isAnyHit) {
                this.sfx.explosion.play({ volume: attackerId === socket.id ? 0.6 : 0.4 });
              } else {
                this.sfx.waterboom.play({ volume: attackerId === socket.id ? 0.9 : 0.5 });
              }
              this.isAnimating = false;

              if (this.pendingGameOver) {
                const data = this.pendingGameOver;
                this.pendingGameOver = null;

                console.log("🔥 JALANKAN GAME OVER SETELAH ANIMASI");

                this.runGameOver(data);
              }
            }
          },
        });
      });
    });

    socket.on("attackInvalid", (data) => {
      console.warn("❌ INVALID:", data.reason);

      this.isAnimating = false;
      this.selectedCell = null;

      this.targetMarks.forEach((t) => t.destroy());
      this.targetMarks = [];
      this.previewRects.forEach((r) => r.destroy());
      this.previewRects = [];
      this.lastUsedShipIndex = -1;
      this.showTurnPopup(cfg.config.ui.text.invalid, cfg.config.ui.colors.invalid);
    });

    socket.on("gameOver", (data) => {
      console.log("🔥 GAME OVER MASUK CLIENT:", data);
      if (this.isAnimating) {
        this.pendingGameOver = data;
        return;
      }
      this.runGameOver(data);
    });
    socket.on("updateScore", (scores) => {
      console.log("Real-time Score Update:", scores);
    });
  }

  createGrid(startX: number, startY: number, cellSize: number, isEnemy: boolean) {
    const grid: any[][] = [];

    for (let r = 0; r < this.ROWS; r++) {
      grid[r] = [];

      for (let c = 0; c < this.COLS; c++) {
        const posX = startX + c * cellSize + cellSize / 2;
        const posY = startY + r * cellSize + cellSize / 2;

        const tile = this.add.image(posX, posY, "tile_water").setDisplaySize(cellSize, cellSize).setDepth(2).setAlpha(0.95).setTint(0x38bdf8); // 🔥 SAMA SEPERTI PLACEMENT

        if (isEnemy) {
          tile.setInteractive();

          tile.setData("x", c);
          tile.setData("y", r);

          tile.on("pointerdown", () => {
            if (!this.isMyTurn) return;

            if (this.selectedShipIndex === -1) {
              console.log("❌ PILIH KAPAL DULU");
              return;
            }

            const x = tile.getData("x");
            const y = tile.getData("y");

            this.selectedCell = { x, y };
            this.targetMarks.forEach((t) => t.destroy());
            this.targetMarks = [];
            this.previewRects.forEach((r) => r.destroy());
            this.previewRects = [];

            const ship = this.shipsUI[this.selectedShipIndex];
            if (ship.cooldownActive && ship.cooldownLeft > 0) {
              console.log("❌ GRID KE BLOCK CD");
              return;
            }
            const w = this.isVerticalAttack ? ship.height : ship.width;
            const h = this.isVerticalAttack ? ship.width : ship.height;

            for (let dx = 0; dx < w; dx++) {
              for (let dy = 0; dy < h; dy++) {
                const tx = x + dx;
                const ty = y + dy;

                if (tx < 0 || tx >= this.COLS || ty < 0 || ty >= this.ROWS) continue;

                const px = this.startX + tx * this.cellSize + this.cellSize / 2;
                const py = this.enemyStartY + ty * this.cellSize + this.cellSize / 2;

                const target = this.add
                  .image(px, py, "target")
                  .setDisplaySize(this.cellSize * 0.8, this.cellSize * 0.8)
                  .setDepth(1000);
                this.tweens.add({
                  targets: target,
                  alpha: 0.3,
                  duration: 700,
                  yoyo: true,
                  repeat: -1,
                  ease: "Sine.easeInOut",
                });

                this.targetMarks.push(target);
              }
            }
          });
        }

        grid[r][c] = {
          rect: tile,
          baseColor: 0x38bdf8,
          hit: false,
          attacked: false,
        };
      }
    }
    return grid;
  }

  selectCell(x: number, y: number) {
    this.selectedCell = { x, y };
  }

  attack() {
    if (!this.isMyTurn) return;

    if (!this.selectedCell) {
      console.log("❌ PILIH TARGET DULU");
      return;
    }

    if (this.selectedShipIndex === -1) {
      console.log("❌ PILIH KAPAL DULU");
      return;
    }

    const { x, y } = this.selectedCell;

    const ship = this.shipsUI[this.selectedShipIndex];
    if (ship.cooldownActive && ship.cooldownLeft > 0) {
      console.log("❌ MASIH COOLDOWN (ATTACK)");
      this.showTurnPopup(cfg.config.ui.text.cooldown, cfg.config.ui.colors.enemy);
      return;
    }
    const w = this.isVerticalAttack ? ship.height : ship.width;
    const h = this.isVerticalAttack ? ship.width : ship.height;
    let valid = false;
    let allOut = true; // 🔥 TAMBAHAN

    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const tx = x + dx;
        const ty = y + dy;

        if (tx < 0 || tx >= this.COLS || ty < 0 || ty >= this.ROWS) continue;

        allOut = false; // 🔥 ADA YANG MASUK GRID

        const cell = this.enemyGrid[ty][tx];

        if (!cell.attacked) {
          valid = true;
        }
      }
    }
    if (allOut) {
      console.log("❌ OUT OF GRID");

      this.isAnimating = false;

      this.targetMarks.forEach((t) => t.destroy());
      this.targetMarks = [];
      this.previewRects.forEach((r) => r.destroy());
      this.previewRects = [];

      this.showTurnPopup(cfg.config.ui.text.invalid, cfg.config.ui.colors.invalid);
      return;
    }
    if (!valid) {
      console.log("❌ AREA SUDAH DISERANG SEMUA");

      this.isAnimating = false;

      this.targetMarks.forEach((t) => t.destroy());
      this.targetMarks = [];
      this.previewRects.forEach((r) => r.destroy());
      this.previewRects = [];

      this.showTurnPopup(cfg.config.ui.text.invalid, cfg.config.ui.colors.invalid);
      return;
    }
    console.log("🔥 ATTACK DIKIRIM:", { x, y, w, h });
    this.pendingGameOver = null;
    this.isAnimating = true;
    this.targetMarks.forEach((t) => t.destroy());
    this.targetMarks = [];

    this.previewRects.forEach((r) => r.destroy());
    this.previewRects = [];
    this.lastUsedShipIndex = this.selectedShipIndex;
    this.selectedShipIndex = -1;
    socket.emit("attack", {
      roomCode: this.roomCode,
      x,
      y,
      width: w,
      height: h,
    });
    this.selectedCell = null;
  }

  markHit(x: number, y: number) {
    const cell = this.enemyGrid[y][x];
    cell.rect.setTint(0xff0000);

    cell.hit = true;
    cell.attacked = true; // 🔥 WAJIB
  }

  markMiss(x: number, y: number) {
    const cell = this.enemyGrid[y][x];
    cell.rect.setTint(0xffffff);

    cell.hit = false;
    cell.attacked = true; // 🔥 WAJIB
  }

  renderShips(ships: any[]) {
    ships.forEach((ship) => {
      const w = ship.vertical ? ship.height : ship.width;
      const h = ship.vertical ? ship.width : ship.height;

      for (let dx = 0; dx < w; dx++) {
        for (let dy = 0; dy < h; dy++) {
          const x = ship.x + dx;
          const y = ship.y + dy;

          if (x < 0 || x >= this.COLS || y < 0 || y >= this.ROWS) continue;

          const cell = this.selfGrid[y][x];
          if (!cell.attacked) {
            cell.rect.setTint(0x22c55e);
          }
        }
      }
    }); // 🔥 TUTUP forEach
  } // 🔥 TUTUP renderShips

  showPreview(x: number, y: number) {
    if (this.selectedCell !== null || this.targetMarks.length > 0) return;

    if (x < 0 || y < 0 || x >= this.COLS || y >= this.ROWS) return;
    this.previewRects.forEach((r) => r.destroy());
    this.previewRects = [];

    if (this.selectedShipIndex === -1) return;

    const ship = this.shipsUI[this.selectedShipIndex];
    this.lastUsedShipIndex = this.selectedShipIndex;
    const w = this.isVerticalAttack ? ship.height : ship.width;
    const h = this.isVerticalAttack ? ship.width : ship.height;

    let isInvalid = false;

    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const tx = x + dx;
        const ty = y + dy;

        if (tx < 0 || tx >= this.COLS || ty < 0 || ty >= this.ROWS) {
          isInvalid = true;
        }
      }
    }

    for (let dx = 0; dx < w; dx++) {
      for (let dy = 0; dy < h; dy++) {
        const tx = x + dx;
        const ty = y + dy;

        const px = this.startX + tx * this.cellSize + this.cellSize / 2;
        const py = this.enemyStartY + ty * this.cellSize + this.cellSize / 2;

        const inside = tx >= 0 && tx < this.COLS && ty >= 0 && ty < this.ROWS;

        if (inside) {
          const preview = this.add
            .image(px, py, "target")
            .setDisplaySize(this.cellSize * 0.7, this.cellSize * 0.7)
            .setAlpha(0.85)
            .setDepth(500);

          if (isInvalid) {
            preview.setTint(0xff0000);
          }

          this.previewRects.push(preview);
        } else {
          const preview = this.add
            .image(px, py, "target") // 🔥 WAJIB
            .setDisplaySize(this.cellSize * 0.7, this.cellSize * 0.7)
            .setDepth(500);

          preview.setTint(0xff0000); // 🔥 MERAH
          preview.setAlpha(0.5);

          this.previewRects.push(preview);
        }
      }
    }
  }

  showTurnPopup(text: string, color: string) {
    this.turnPopupText.setText(text);
    this.turnPopupText.setColor(color);
    this.turnPopup.setAlpha(1);
    this.turnPopup.setScale(0.5);

    this.tweens.killTweensOf(this.turnPopup);
    this.tweens.add({
      targets: this.turnPopup,
      scale: 1,
      duration: 250,
      ease: "Back.Out",
    });
    this.tweens.add({
      targets: this.turnPopup,
      alpha: 0,
      delay: 900,
      duration: 400,
      ease: "Power2",
    });
  }

  runGameOver(data: any) {
    const { winner, scores } = data;

    this.time.removeAllEvents();

    const myScore = scores[socket.id] || {
      totalAttack: 0,
      hitCount: 0,
      missCount: 0,
      accuracy: 0,
      score: 0,
    };

    const resultData = {
      winner: winner,
      myId: socket.id,
      total: myScore.totalAttack,
      hit: myScore.hitCount,
      miss: myScore.missCount,
      accuracy: myScore.accuracy,
      score: myScore.score,
    };

    console.log("➡️ PINDAH RESULT");

    this.scene.start("Result", resultData);
  }
}
