import { Scene } from "phaser";
import { socket } from "../socket";

export class Placement extends Scene {
  private roomCode!: string;

  constructor() {
    super("Placement");
  }

  create(data: any) {
    const width = this.scale.width;
    const height = this.scale.height;
    this.add
      .image(width / 2, height / 2, "background")
      .setDisplaySize(width, height)
      .setDepth(0);

    this.roomCode = data?.roomCode;

    console.log("📦 ROOM CODE MASUK:", this.roomCode);

    if (!this.roomCode) {
      console.error("❌ ROOM CODE KOSONG!");
    }

    const centerX = width / 2;

    const COLS = 8;
    const ROWS = 6;

    const gridWidth = width * 0.75;
    const cellSize = Math.floor(gridWidth / COLS);
    const gridHeight = cellSize * ROWS;
    const enemyStartY = 80;
    const selfStartY = enemyStartY + gridHeight + 20;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const posX = centerX - gridWidth / 2 + c * cellSize + cellSize / 2;
        const posY = enemyStartY + r * cellSize + cellSize / 2;

        this.add.image(posX, posY, "tile_water").setDisplaySize(cellSize, cellSize).setTint(0x38bdf8).setAlpha(0.95).setDepth(2);
      }
    }
    let isReady = false;
    let isClickingUI = false;
    let selectedShipIndex: number | null = null;
    let shipGraphics: Phaser.GameObjects.Image[] = [];
    let shipObjects: any[] = [];
    let previewGraphics: Phaser.GameObjects.Rectangle[] = [];
    let isDragging = false;
    const ships = [
      { key: "spaceship1", width: 1, height: 1, color: "#F59E0B", rangeKey: "grid_range1" },
      { key: "spaceship2", width: 2, height: 2, color: "#3B82F6", rangeKey: "grid_range2" },
      { key: "spaceship3", width: 2, height: 1, color: "#64748B", rangeKey: "grid_range3" },
      { key: "spaceship4", width: 1, height: 3, color: "#8B5CF6", rangeKey: "grid_range4" },
    ];
    const header = this.add.container(centerX, 45).setDepth(10);
    const panel = this.add.image(0, 0, "panel_top").setScale(0.5);
    const titleText = this.add.text(-135, -18, "FASE STRATEGI", {
      fontSize: "18px",
      fontFamily: "Lilita One",
      color: "#1E3A8A",
    });
    const subtitleText = this.add.text(-135, 3, "LETAKKAN UNITMU", {
      fontSize: "12px",
      fontFamily: "Lilita One",
      color: "#6B7280",
    });
    const timerBG = this.add.image(120, 0, "bg_timer").setScale(0.4);
    const headerTimerText = this.add
      .text(120, 0, "30", {
        fontSize: "20px",
        fontFamily: "Lilita One",
        color: "#D84315",
      })
      .setOrigin(0.5);
    header.add([panel, titleText, subtitleText, timerBG, headerTimerText]);

    header.setDepth(10);

    const getCleanShips = () => {
      return shipObjects.map((s) => ({
        x: Math.floor(s.x),
        y: Math.floor(s.y),
        width: s.width,
        height: s.height,
        vertical: s.vertical,
      }));
    };
    let currentTime = data?.timeLeft || 30;
    headerTimerText.setText(currentTime.toString());
    socket.off("placementTick");
    socket.on("placementTick", (data: any) => {
      if (!headerTimerText || !headerTimerText.active) return;
      if (!this.scene || !this.scene.isActive()) return;
      if (!data || data.timeLeft == null) return;

      headerTimerText.setText(data.timeLeft + "s");
      if (data.timeLeft === 1 && !isReady) {
        console.log("🔥 AUTO KIRIM SHIPS (TIMER HABIS)");

        socket.emit("playerReady", {
          roomCode: this.roomCode,
          ships: getCleanShips(),
        });

        isReady = true; // biar gak kirim 2x
      }
    });

    const startX = (width - gridWidth) / 2;
    const startY = selfStartY;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const posX = centerX - gridWidth / 2 + c * cellSize + cellSize / 2;
        const posY = selfStartY + r * cellSize + cellSize / 2;

        const tile = this.add.image(posX, posY, "tile_water").setDisplaySize(cellSize, cellSize).setTint(0x38bdf8).setAlpha(0.95).setDepth(2);
      }
    }
    const isOutOfBounds = (ship: any) => {
      const w = ship.vertical ? ship.height : ship.width;
      const h = ship.vertical ? ship.width : ship.height;

      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          const x = ship.x + i;
          const y = ship.y + j;

          if (x < 0 || x >= COLS || y < 0 || y >= ROWS) {
            return true;
          }
        }
      }
      return false;
    };
    const isOverlap = (newShip: any) => {
      const nw = newShip.vertical ? newShip.height : newShip.width;
      const nh = newShip.vertical ? newShip.width : newShip.height;

      for (let index = 0; index < shipObjects.length; index++) {
        if (index === selectedShipIndex) continue;
        const ship = shipObjects[index];
        const sw = ship.vertical ? ship.height : ship.width;
        const sh = ship.vertical ? ship.width : ship.height;
        for (let i = 0; i < nw; i++) {
          for (let j = 0; j < nh; j++) {
            const nx = newShip.x + i;
            const ny = newShip.y + j;
            for (let k = 0; k < sw; k++) {
              for (let l = 0; l < sh; l++) {
                const sx = ship.x + k;
                const sy = ship.y + l;
                if (nx === sx && ny === sy) return true;
              }
            }
          }
        }
      }
      return false;
    };
    const drawAllShips = () => {
      shipGraphics.forEach((g) => g.destroy());
      shipGraphics = [];

      shipObjects.forEach((data, index) => {
        const w = data.vertical ? data.height : data.width;
        const h = data.vertical ? data.width : data.height;

        for (let i = 0; i < w; i++) {
          for (let j = 0; j < h; j++) {
            const tile = this.add
              .image(startX + (data.x + i) * cellSize + cellSize / 2, startY + (data.y + j) * cellSize + cellSize / 2, "tile_water")
              .setDisplaySize(cellSize, cellSize)
              .setTint(index === selectedShipIndex ? 0xf59e0b : 0xfacc15)
              .setDepth(2)
              .setInteractive(); // 🔥 WAJIB

            tile.on("pointerdown", () => {
              previewGraphics.forEach((g) => g.destroy());
              previewGraphics = [];
              isDragging = true;
              if (isReady) return;

              selectedShipIndex = index;

              const allCards = this.children.list.filter((obj) => obj instanceof Phaser.GameObjects.Container);
              allCards.forEach((container: any, cIndex) => {
                const bg = container.list[0] as Phaser.GameObjects.Image;

                if (cIndex === selectedShipIndex) {
                  bg.setTint(0xffff00);
                } else {
                  bg.clearTint();
                }
              });

              drawAllShips();
            });

            shipGraphics.push(tile); // 🔥 GANTI rect → tile
          }
        }
      });
    };

    const drawPreview = (ship: any) => {
      if (!this.scene.isActive()) return;
      previewGraphics.forEach((g) => g.destroy());
      previewGraphics = [];

      const invalid = isOutOfBounds(ship) || isOverlap(ship);
      const color = invalid ? 0xff0000 : 0x00ffff;

      const w = ship.vertical ? ship.height : ship.width;
      const h = ship.vertical ? ship.width : ship.height;

      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) {
          const x = ship.x + i;
          const y = ship.y + j;

          if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;

          const rect = this.add.rectangle(startX + x * cellSize + cellSize / 2, startY + y * cellSize + cellSize / 2, cellSize, cellSize, color, 0.4).setDepth(3);

          previewGraphics.push(rect);
        }
      }
    };

    shipObjects = [];

    ships.forEach((shipData) => {
      let valid = false;
      let finalObj: any;

      while (!valid) {
        const isVertical = Math.random() > 0.5;
        const w = isVertical ? shipData.height : shipData.width;
        const h = isVertical ? shipData.width : shipData.height;
        const x = Phaser.Math.Between(0, COLS - w);
        const y = Phaser.Math.Between(0, ROWS - h);

        finalObj = {
          ...shipData,
          x: x,
          y: y,
          vertical: isVertical,
        };
        valid = !isOverlap(finalObj);
      }
      shipObjects.push(finalObj);
    });
    const initialShips = JSON.parse(JSON.stringify(shipObjects));
    drawAllShips();
    const cardSize = 60;
    const gap = 15;
    const totalWidth = ships.length * cardSize + (ships.length - 1) * gap;
    const startHeroX = (width - totalWidth) / 2;
    const heroY = height - 90;

    ships.forEach((ship, i) => {
      const x = startHeroX + i * (cardSize + gap) + cardSize / 2;
      const container = this.add.container(x, heroY).setDepth(10); // Pastikan depth tinggi
      const bg = this.add.image(0, -10, "card_unit").setDisplaySize(cardSize, 65);
      const shipIcon = this.add.image(0, -20, ship.key).setDisplaySize(45, 25);
      const rangeIcon = this.add.image(0, 10, ship.rangeKey).setScale(0.35);

      container.add([bg, shipIcon, rangeIcon]);

      container.setSize(cardSize, 85);
      container.setInteractive();
      container.on("pointerdown", () => {
        if (isReady) return;
        isClickingUI = true;
        selectedShipIndex = i;
        const allContainers = this.children.list.filter((obj) => obj instanceof Phaser.GameObjects.Container);
        allContainers.forEach((c: any) => (c.list[0] as Phaser.GameObjects.Image).clearTint());

        bg.setTint(0xffff00);

        drawAllShips();
      });
    });

    this.input.on("pointermove", (pointer: any) => {
      if (isReady || isClickingUI || !isDragging) return;
      if (selectedShipIndex === null) return;

      const col = Phaser.Math.Clamp(Math.floor((pointer.worldX - startX) / cellSize), 0, COLS - 1);

      const row = Phaser.Math.Clamp(Math.floor((pointer.worldY - startY) / cellSize), 0, ROWS - 1);

      drawPreview({
        ...shipObjects[selectedShipIndex],
        x: col,
        y: row,
      });
    });
    this.input.on("pointerup", (pointer: any) => {
      previewGraphics.forEach((g) => g.destroy());
      previewGraphics = [];
      isDragging = false;
      if (isClickingUI) {
        isClickingUI = false;
        return;
      }

      if (isReady) return;
      if (selectedShipIndex === null) return;

      const col = Math.floor((pointer.worldX - startX) / cellSize);
      const row = Math.floor((pointer.worldY - startY) / cellSize);

      const newShip = { ...shipObjects[selectedShipIndex], x: col, y: row };

      if (!isOverlap(newShip) && !isOutOfBounds(newShip)) {
        shipObjects[selectedShipIndex].x = col;
        shipObjects[selectedShipIndex].y = row;
        drawAllShips();
      }
    });
    const btnY = height - 35;
    const spacing = 110;

    this.add
      .image(centerX - spacing, btnY, "btn_rotate")
      .setScale(0.4)
      .setInteractive()
      .on("pointerdown", () => {
        if (isReady) return;

        isClickingUI = true;

        const ship = shipObjects[selectedShipIndex!];
        const newShip = { ...ship, vertical: !ship.vertical };

        if (!isOverlap(newShip) && !isOutOfBounds(newShip)) {
          ship.vertical = !ship.vertical;
          drawAllShips();
        }
      });

    this.add
      .image(centerX - 38, btnY, "btn_reset")
      .setScale(0.4)
      .setInteractive()
      .on("pointerdown", () => {
        if (isReady) return;

        isClickingUI = true;

        shipObjects = JSON.parse(JSON.stringify(initialShips));
        selectedShipIndex = null;
        drawAllShips();
      });

    const readyBtn = this.add
      .image(centerX + 75, btnY, "btn_ready")
      .setScale(0.4)
      .setInteractive()
      .on("pointerdown", () => {
        if (isReady) return;

        console.log("🔥 KIRIM READY");

        isReady = true;

        socket.emit("playerReady", {
          roomCode: this.roomCode,
          ships: getCleanShips(),
        });
        readyBtn.setAlpha(0.5);
        readyBtn.disableInteractive();
      });
    socket.off("startGame");

    socket.on("startGame", (data: any) => {
      console.log("🔥 START GAME DITERIMA:", data);
      if (!data || !data.roomCode || !data.ships) {
        console.error("❌ DATA START GAME TIDAK VALID");
        return;
      }

      this.time.delayedCall(300, () => {
        const bgm = this.sound.get("soundgame");

        if (bgm) {
          bgm.stop();
        }

        this.scene.start("MainGame", {
          roomCode: data.roomCode,
          ships: data.ships,
        });
      });
    });
  }
}
