import { Scene } from "phaser";
import { socket } from "../socket";

export class MainMenu extends Scene {
  mainMenuContainer!: Phaser.GameObjects.Container;
  matchmakingContainer!: Phaser.GameObjects.Container;
  friendMenuContainer!: Phaser.GameObjects.Container;
  createRoomContainer!: Phaser.GameObjects.Container;
  joinRoomContainer!: Phaser.GameObjects.Container;
  private bgm!: Phaser.Sound.BaseSound;
  roomCode!: string;
  joinCode: string = "";
  joinCodeIndex: number = 0;

  constructor() {
    super("MainMenu");
  }

  create() {
    if (!document.fonts.check("12px 'Lilita One'")) {
      document.fonts.ready.then(() => {
        this.scene.restart();
      });
      return;
    }
    this.add.image(0, 0, "background").setOrigin(0, 0);
    this.bgm = this.sound.add("soundgame", {
      loop: true,
      volume: 0.5,
    });

    this.bgm.play();

    socket.off("startGame");

    socket.on("startGame", (data: any) => {
      console.log("🔥 START GAME:", data);
      const roomCode = this.roomCode || data.roomCode;

      if (!roomCode) {
        console.error("❌ ROOM CODE GAK ADA");
        return;
      }

      this.scene.start("Placement", {
        roomCode: roomCode,
      });
    });
    socket.off("goToPlacement");
    socket.on("goToPlacement", (data: any) => {
      const { roomCode, timeLeft } = data;

      this.roomCode = roomCode;

      this.time.delayedCall(300, () => {
        this.scene.start("Placement", {
          roomCode: roomCode,
          timeLeft: timeLeft,
        });
      });
    });

    const centerX = 180;
    const friendIcon = this.add
      .text(centerX, 200, "👥", {
        fontSize: "70px",
      })
      .setOrigin(0.5);

    const friendMainText = this.add
      .text(centerX, 300, "Mainkan Bersama\nTemanmu!", {
        fontFamily: "Lilita One",
        fontSize: "26px",
        align: "center",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const friendTitle = this.add
      .text(170, 60, "🤝 Mode Teman", {
        fontFamily: "Lilita One",
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const friendSub = this.add
      .text(centerX, 360, "Buat room baru atau masuk ke room temanmu", {
        fontFamily: "Poppins",
        fontSize: "10px",
        letterSpacing: 1.5,
        color: "#ffffff88",
      })
      .setOrigin(0.5);
    const createRoomButton = this.add.image(centerX, 420, "btn_create_room").setInteractive();
    const joinRoomButton = this.add.image(centerX, 500, "btn_join_room").setInteractive();
    const backButton = this.add.image(60, 60, "btn_back").setInteractive();
    this.friendMenuContainer = this.add.container(0, 0, [friendIcon, friendTitle, friendSub, friendMainText, createRoomButton, joinRoomButton, backButton]);

    this.friendMenuContainer.setVisible(false);
    this.tweens.add({
      targets: friendIcon,
      y: "+=10",
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });

    const titleBig = this.add.image(180, 130, "nama").setScale(0.7);
    const titleSmall = this.add.image(180, 230, "nama2").setScale(0.2);

    const randomButton = this.add.image(180, 420, "btn_random").setInteractive();
    const friendButton = this.add.image(180, 500, "btn_friend").setInteractive();
    let isSearching = false;
    this.mainMenuContainer = this.add.container(0, 0, [titleBig, titleSmall, randomButton, friendButton]);
    const createMatchmakingUI = () => {
      const centerX = 180;
      const radarY = 155;

      const radarBg = this.add.image(centerX, radarY, "mm_radar_bg");
      const ringOffsetY = -20;

      const ring1 = this.add.image(centerX, radarY, "mm_radar_ring").setOrigin(0.5, 0.52).setScale(0.25);

      const ring2 = this.add.image(centerX, radarY, "mm_radar_ring").setOrigin(0.5, 0.52).setScale(0.5);

      const ring3 = this.add.image(centerX, radarY, "mm_radar_ring").setOrigin(0.5, 0.52).setScale(0.75);

      const ring4 = this.add.image(centerX, radarY, "mm_radar_ring").setOrigin(0.5, 0.52);

      const sweep = this.add.image(centerX, radarY, "mm_radar_sweep");

      const center = this.add.image(centerX, radarY, "mm_radar_center");
      const blip1 = this.add.image(centerX + 40, radarY - 20, "mm_radar_blip");
      const blip2 = this.add.image(centerX - 30, radarY + 30, "mm_radar_blip");
      const blip3 = this.add.image(centerX - 21, radarY + 60, "mm_radar_blip");
      const title1 = this.add
        .text(centerX, 280, "MENCARI", {
          fontFamily: "Lilita One",
          fontSize: "24px",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      const title2 = this.add
        .text(centerX, 310, "LAWAN RANDOM...", {
          fontFamily: "Lilita One",
          fontSize: "24px",
          color: "#FFBE0B",
          stroke: "#0D3B8E",
          strokeThickness: 4,
        })
        .setOrigin(0.5);

      const scanningText = this.add
        .text(centerX - 65, 375, "🔍 Memindai server...", {
          fontFamily: "Lilita One",
          fontSize: "14px",
          color: "#B0B8C1",
        })
        .setOrigin(0.5);

      const info = this.add
        .text(centerX, 340, "Radar sedang memindai pemain di sekitarmu", {
          fontFamily: "Poppins",
          fontSize: "10px",
          color: "#ffffff88",
          letterSpacing: 1.5,
          align: "center",
        })
        .setOrigin(0.5);
      const card = this.add.image(centerX, 400, "mm_card_bar");

      const barBg = this.add.image(centerX, 400, "mm_bar_bg");

      const barFill = this.add.image(centerX - 130, 400, "mm_bar_fill").setOrigin(0, 0.5);
      barFill.setCrop(0, 0, 0, barFill.height);

      const percent = this.add
        .text(centerX, 430, "Pemain ditemukan: 0%", {
          fontFamily: "Lilita One",
          fontSize: "14px",
          color: "#0D3B8E",
        })
        .setOrigin(0.5);
      const leftCard = this.add.image(100, 510, "mm_card_player_active");
      const rightCard = this.add.image(260, 510, "mm_card_player_default");
      rightCard.setTint(0xf2f2f2);

      const leftIcon = this.add.image(100, 500, "player").setScale(0.4);
      const rightIcon = this.add.image(260, 500, "hourglass").setScale(0.4);

      const vs = this.add
        .text(centerX, 510, "VS", {
          fontFamily: "Lilita One",
          fontSize: "28px",
          color: "#FFBE0B",
          stroke: "#0D3B8E",
          strokeThickness: 6,
        })
        .setOrigin(0.5);

      const leftText = this.add
        .text(100, 535, "\nKamu\n• Online", {
          fontFamily: "Lilita One",
          fontSize: "12px",
          align: "center",
          color: "#0D3B8E",
        })
        .setOrigin(0.5);

      const rightText = this.add
        .text(260, 535, "\n???\n• Mencari...", {
          fontFamily: "Lilita One",
          fontSize: "13px",
          align: "center",
          color: "#B0B8C1", // 🔥 abu soft (INI KUNCI)
        })
        .setOrigin(0.5);
      rightText.setAlpha(0.9);
      const cancelButton = this.add.image(centerX, 600, "btn_cancel").setScale(0.6).setInteractive();
      const container = this.add.container(0, 0, [
        radarBg,
        ring1,
        ring2,
        ring3,
        ring4,
        sweep,
        center,
        blip1,
        blip2,
        blip3,
        title1,
        title2,
        info,
        card,
        barBg,
        barFill,
        percent,
        scanningText,
        leftCard,
        rightCard,
        leftIcon,
        rightIcon,
        vs,
        leftText,
        rightText,
        cancelButton,
      ]);
      const sweepTween = this.tweens.add({
        targets: sweep,
        angle: 360,
        duration: 2000,
        repeat: -1,
      });

      const blipTween = this.tweens.add({
        targets: [blip1, blip2, blip3],
        scale: 1.5,
        alpha: 0.3,
        yoyo: true,
        repeat: -1,
        duration: 800,
      });

      let fakeProgress = 0;
      let isMatchFound = false;

      const fakeInterval = this.time.addEvent({
        delay: 200,
        loop: true,
        callback: () => {
          if (!barFill || !percent || !scanningText || !barFill.scene) return;

          if (fakeProgress < 95 && !isMatchFound) {
            fakeProgress += 2;

            barFill.setCrop(0, 0, barFill.width * (fakeProgress / 100), barFill.height);
            percent.setText("Pemain ditemukan: " + fakeProgress + "%");
          }
        },
      });
      socket.off("matchFound");

      socket.on("matchFound", (code: string) => {
        console.log("🔥 MATCH FOUND:", code);

        this.roomCode = code;

        isMatchFound = true;
        this.tweens.addCounter({
          from: fakeProgress,
          to: 100,
          duration: 1500,

          onUpdate: (tween) => {
            const value = Math.floor(tween.getValue());

            barFill.setCrop(0, 0, barFill.width * (value / 100), barFill.height);
            percent.setText("Pemain ditemukan: " + value + "%");
          },

          onComplete: () => {
            console.log("🚀 PINDAH KE GAME");
          },
        });
      });

      return { container, cancelButton, fakeInterval };
    };

    const createBackButton = this.add.image(60, 60, "btn_back").setInteractive();
    const headerText = this.add
      .text(170, 60, "🏰 Buat Room", {
        fontFamily: "Lilita One",
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5);
    const roomLabel = this.add
      .text(centerX, 180, "Kode Room Anda", {
        fontFamily: "Poppins",
        fontSize: "16px",
        letterSpacing: 3,
        color: "#B0B8C1",
      })
      .setOrigin(0.5);
    const roomCodeText = this.add
      .text(centerX, 260, "--\n----", {
        fontFamily: "Lilita One",
        fontSize: "50px",
        color: "#1E5EFF",
        align: "center",
        lineSpacing: 1,
      })
      .setOrigin(0.5);
    const roomCard = this.add.image(180, 250, "ui_room_card").setScale(0.9);

    const copyButton = this.add.image(180, 390, "btn_salin").setInteractive().setScale(0.88);

    const bottomCard = this.add.image(180, 460, "btn_salin2").setScale(0.88);

    const bottomText = this.add
      .text(50, 450, "⏳ Menunggu teman...", {
        fontFamily: "Lilita One",
        fontSize: "14px",
        color: "#0D3B8E",
      })
      .setOrigin(0, 0.5);

    const shareText = this.add
      .text(55, 470, "Bagikan kode ke temanmu", {
        fontFamily: "Poppins",
        fontSize: "8px",
        color: "#B0B8C1",
        letterSpacing: 2,
      })
      .setOrigin(0, 0.5);

    const playerCard = this.add.image(110, 550, "mm_card_player_active").setScale(0.9);
    const leftIcon = this.add.image(110, 535, "player").setScale(0.3).setDepth(10);

    const rightIcon = this.add.image(250, 535, "hourglass").setScale(0.3).setDepth(10);

    const playerText = this.add
      .text(110, 575, "Kamu\n• Siap", {
        fontFamily: "Lilita One",
        fontSize: "12px",
        align: "center",
        color: "#0D3B8E",
      })
      .setOrigin(0.5);
    const enemyCard = this.add.image(250, 550, "mm_card_player_default").setScale(0.9);
    enemyCard.setTint(0xf2f2f2);

    const enemyText = this.add
      .text(250, 575, "Menunggu...\n• Belum join", {
        fontFamily: "Lilita One",
        fontSize: "12px",
        align: "center",
        color: "#B0B8C1",
      })
      .setOrigin(0.5);
    const bola1 = this.add.image(260, 460, "bolakuning").setScale(0.55);
    const bola2 = this.add.image(275, 460, "bolabiru").setScale(0.55);
    const bola3 = this.add.image(290, 460, "bolakuning2").setScale(0.55);

    this.tweens.add({
      targets: [bola1, bola2, bola3],
      y: "-=8",
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: (t: any, k: any, v: any, i: number) => i * 120,
    });

    this.createRoomContainer = this.add.container(0, 0, [
      createBackButton,
      headerText,

      roomCard,
      roomLabel,
      roomCodeText,

      copyButton,

      bottomCard,
      bottomText,
      shareText,
      bola1,
      bola2,
      bola3,

      playerCard,
      enemyCard,
      leftIcon,
      rightIcon,
      playerText,
      enemyText,
    ]);

    socket.off("roomCreated");

    socket.on("roomCreated", (code: string) => {
      console.log("🔥 ROOM DITERIMA:", code);

      this.roomCode = code;

      roomCodeText.setText(code);
      this.friendMenuContainer.setVisible(false);
      this.createRoomContainer.setVisible(true);

      // 🔥 FIX FONT (WAJIB)
      this.createRoomContainer.iterate((obj: any) => {
        if (obj instanceof Phaser.GameObjects.Text) {
          const t = obj.text;
          obj.setText("");
          obj.setText(t);
        }
      });
    });

    socket.on("roomJoined", (code: string) => {
      console.log("BERHASIL JOIN ROOM:", code);
      this.roomCode = code;
      rightIcon.setTexture("vilain");
      rightIcon.setScale(0.4);

      enemyCard.setTexture("mm_card_player_active");
      enemyCard.clearTint();

      enemyText.setText("\nLawan\n• Online");
      enemyText.setColor("#0D3B8E");
      enemyText.setAlpha(1);

      bottomText.setText("Lawan ditemukan!");
      shareText.setText("Siap untuk bermain");
    });
    socket.off("playerJoined");

    socket.on("playerJoined", (code: string) => {
      console.log("🔥 HOST LIHAT PLAYER JOIN:", code);

      this.roomCode = code;
      rightIcon.setTexture("vilain");
      rightIcon.setScale(0.3);

      enemyCard.setTexture("mm_card_player_active");
      enemyCard.clearTint();

      enemyText.setText("\nLawan\n• Online");
      enemyText.setColor("#0D3B8E");
      enemyText.setAlpha(1);

      bottomText.setText("Lawan ditemukan!");
      shareText.setText("Siap untuk bermain");
    });

    this.createRoomContainer.setVisible(false);

    const joinTitle = this.add
      .text(170, 60, "🔑 Join Room", {
        fontFamily: "Lilita One",
        fontSize: "22px",
        color: "#ffffff",
      })
      .setOrigin(0.5);

    const centerY = 320;
    const card = this.add.image(centerX, centerY, "card_join_room").setScale(1.02);
    const joinLabel = this.add
      .text(centerX, centerY - 45, "🎯 Masukkan Kode Room", {
        fontFamily: "Poppins",
        fontSize: "16px",
        color: "#9AA4B2",
      })
      .setOrigin(0.5);
    let inputBg = this.add
      .image(centerX, centerY + 10, "input_code")
      .setScale(1)
      .setInteractive();
    let codeText = this.add
      .text(centerX, centerY + 10, "WF-XXXX", {
        fontFamily: "Lilita One",
        fontSize: "32px",
        color: "#9AA4B2",
      })
      .setOrigin(0.5);

    inputBg.on("pointerdown", async () => {
      inputBg.setTexture("input_code_active");

      try {
        const text = await navigator.clipboard.readText();

        if (text) {
          const cleaned = text
            .replace(/[^A-Z0-9]/gi, "")
            .toUpperCase()
            .slice(0, 6);

          this.joinCode = cleaned;
          this.joinCodeIndex = cleaned.length;

          let formatted = cleaned;

          if (formatted.length > 2) {
            formatted = formatted.substring(0, 2) + "-" + formatted.substring(2);
          }

          codeText.setText(formatted);
          codeText.setColor("#1E5EFF");
        }
      } catch (err) {
        console.log("PASTE GAGAL (HTTP / PERMISSION)");
      }
    });

    this.input.on("pointerdown", (pointer: any, gameObjects: any[]) => {
      if (!gameObjects.includes(inputBg)) {
        inputBg.setTexture("input_code");
      }
    });

    const joinButton = this.add.image(180, 430, "btn_join_room").setScale(0.95).setInteractive();

    joinButton.on("pointerdown", () => {
      console.log("TOMBOL JOIN DIKLIK");

      if (this.joinCode.length < 6) {
        console.log("Kode belum lengkap");
        return;
      }

      const formattedCode = this.joinCode.substring(0, 2) + "-" + this.joinCode.substring(2);

      console.log("JOIN CODE:", formattedCode);

      socket.emit("joinRoom", formattedCode);
    });

    const joinBackButton = this.add.image(60, 60, "btn_back").setInteractive();

    this.joinRoomContainer = this.add.container(0, 0, [joinTitle, card, joinLabel, inputBg, codeText, joinButton, joinBackButton]);

    this.joinRoomContainer.setVisible(false);
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      if (!this.joinRoomContainer.visible) return;
      if (event.ctrlKey && event.key.toLowerCase() === "v") {
        navigator.clipboard
          .readText()
          .then((text) => {
            if (!text) return;

            const cleaned = text
              .replace(/[^A-Z0-9]/gi, "")
              .toUpperCase()
              .slice(0, 6);

            this.joinCode = cleaned;
            this.joinCodeIndex = cleaned.length;

            let formatted = cleaned;

            if (formatted.length > 2) {
              formatted = formatted.substring(0, 2) + "-" + formatted.substring(2);
            }

            codeText.setText(formatted || "WF-XXXX");
            codeText.setColor("#1E5EFF");
          })
          .catch(() => {
            console.log("CLIPBOARD BLOCKED ❌");
          });

        return;
      }
      if (event.key === "Backspace") {
        if (this.joinCode.length <= 0) return;

        this.joinCode = this.joinCode.slice(0, -1);
        this.joinCodeIndex = Math.max(0, this.joinCodeIndex - 1);

        let formatted = this.joinCode;

        if (formatted.length > 2) {
          formatted = formatted.substring(0, 2) + "-" + formatted.substring(2);
        }

        codeText.setText(formatted || "WF-XXXX");

        if (this.joinCode.length === 0) {
          codeText.setColor("#9AA4B2");
        }

        return;
      }
      if (this.joinCode.length >= 6) return;

      const key = event.key.toUpperCase();

      if (!/^[A-Z0-9]$/.test(key)) return;
      this.joinCode += key;
      this.joinCodeIndex++;

      let formatted = this.joinCode;

      if (formatted.length > 2) {
        formatted = formatted.substring(0, 2) + "-" + formatted.substring(2);
      }

      codeText.setText(formatted);
      codeText.setColor("#1E5EFF");
    });

    randomButton.on("pointerdown", () => {
      if (isSearching) return;
      console.log("KLIK RANDOM MATCH");

      this.mainMenuContainer.setVisible(false);

      const { container, cancelButton, fakeInterval } = createMatchmakingUI();

      socket.emit("findMatch");

      cancelButton.on("pointerdown", () => {
        isSearching = false; // 🔥 RESET BIAR BISA SEARCH LAGI

        fakeInterval.remove();

        socket.emit("cancelMatch");

        socket.off("matchFound");

        container.destroy();

        this.mainMenuContainer.setVisible(true);
      });
    });

    friendButton.on("pointerdown", () => {
      this.mainMenuContainer.setVisible(false);
      this.friendMenuContainer.setVisible(true);

      // 🔥 FIX FINAL: FORCE RE-RENDER TEXT
      this.friendMenuContainer.iterate((obj: any) => {
        if (obj instanceof Phaser.GameObjects.Text) {
          const currentText = obj.text;
          obj.setText(""); // kosongkan dulu
          obj.setText(currentText); // render ulang
        }
      });
    });

    backButton.on("pointerdown", () => {
      this.friendMenuContainer.setVisible(false);
      this.mainMenuContainer.setVisible(true);
    });

    createRoomButton.on("pointerdown", () => {
      console.log("🔥 CREATE ROOM CLICK");

      socket.emit("createRoom");
    });

    joinRoomButton.on("pointerdown", () => {
      this.friendMenuContainer.setVisible(false);
      this.joinRoomContainer.setVisible(true);

      // 🔥 FIX FONT (WAJIB)
      this.joinRoomContainer.iterate((obj: any) => {
        if (obj instanceof Phaser.GameObjects.Text) {
          const t = obj.text;
          obj.setText("");
          obj.setText(t);
        }
      });
    });

    joinBackButton.on("pointerdown", () => {
      this.joinRoomContainer.setVisible(false);
      this.friendMenuContainer.setVisible(true);
    });

    createBackButton.on("pointerdown", () => {
      this.createRoomContainer.setVisible(false);
      this.friendMenuContainer.setVisible(true);
    });

    copyButton.on("pointerdown", () => {
      if (!this.roomCode) {
        console.log("ROOM CODE BELUM ADA");
        return;
      }

      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.roomCode);
      } else {
        const temp = document.createElement("textarea");
        temp.value = this.roomCode;
        document.body.appendChild(temp);
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      }

      console.log("COPIED:", this.roomCode);
      this.tweens.add({
        targets: copyButton,
        scale: 0.8,
        duration: 100,
        yoyo: true,
      });
    });
  }
}
