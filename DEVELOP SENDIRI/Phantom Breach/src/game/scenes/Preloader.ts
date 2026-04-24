import { Scene } from "phaser";

export class Preloader extends Scene {
  constructor() {
    super("Preloader");
  }

  init() {}

  preload() {
    this.load.image("background", "assets/background.png");

    this.load.image("tile_water", "assets/tile_water.png");


    this.load.spritesheet("hit", "assets/hit.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.spritesheet("miss", "assets/miss.png", {
      frameWidth: 32,
      frameHeight: 32,
    });

    this.load.spritesheet("peluru", "assets/peluru.png", {
      frameWidth: 32,
      frameHeight: 32,
    });
    this.load.image("nama", "assets/namagame.png");
    this.load.image("nama2", "assets/namagame2.png");
    this.load.image("btn_random", "assets/btn_random.png");
    this.load.image("btn_friend", "assets/btn_playfriend.png");
    this.load.image("mm_radar_bg", "assets/mm_radar_bg.png");
    this.load.image("mm_radar_ring", "assets/mm_radar_ring.png");
    this.load.image("mm_radar_sweep", "assets/mm_radar_sweep.png");
    this.load.image("mm_radar_blip", "assets/mm_radar_blip.png");
    this.load.image("mm_radar_center", "assets/mm_radar_center.png");

    this.load.image("mm_card_bar", "assets/mm_card_bar.png");
    this.load.image("mm_bar_bg", "assets/mm_bar_bg.png");
    this.load.image("mm_bar_fill", "assets/mm_bar_fill.png");

    this.load.image("mm_card_player_default", "assets/mm_card_player_default.png");
    this.load.image("mm_card_player_active", "assets/mm_card_player_active.png");

    this.load.image("hourglass", "assets/hourglass.png");
    this.load.image("player", "assets/player.png");
    this.load.image("vilain", "assets/vilain.png");
    this.load.image("btn_salin2", "assets/btn_salin2.png");
    this.load.image("btn_salin", "assets/btn_salin.png");
    this.load.image("bolabiru", "assets/bolabiru.png");
    this.load.image("bolakuning", "assets/bolakuning.png");
    this.load.image("bolakuning2", "assets/bolakuning2.png");
    this.load.image("ui_room_card", "assets/ui_room_card.png");
    this.load.image("btn_create_room", "assets/btn_create_room.png");
    this.load.image("btn_join_room", "assets/btn_join_room.png");
    this.load.image("btn_back", "assets/btn_back.png");
    this.load.image("card_join_room", "assets/card_join_room.png");
    this.load.image("input_code", "assets/input_code.png");
    this.load.image("input_code_active", "assets/input_code_active.png");
    this.load.image("btn_cancel", "assets/btn_cancel.png");
    this.load.image("btn_ready", "assets/btn_ready.png");
    this.load.image("btn_reset", "assets/btn_reset.png");
    this.load.image("btn_rotate", "assets/btn_rotate.png");
    this.load.image("timer_bg", "assets/timer_bg.png");
    this.load.image("hero_card", "assets/hero_card.png");
    this.load.image("hero_card_selected", "assets/hero_card_selected.png");

    this.load.image("spaceship1", "assets/spaceship1.png");
    this.load.image("spaceship2", "assets/spaceship2.png");
    this.load.image("spaceship3", "assets/spaceship3.png");
    this.load.image("spaceship4", "assets/spaceship4.png");
    this.load.image("panel_top", "/assets/panel_top.png");
    this.load.image("bg_timer", "/assets/bg_timer.png");
    this.load.image("tab_lawan_active", "/assets/tab_lawan_active.png");
    this.load.image("tab_lawan_inactive", "/assets/tab_lawan_inactive.png");
    this.load.image("tab_saya_active", "/assets/tab_saya_active.png");
    this.load.image("tab_saya_inactive", "/assets/tab_saya_inactive.png");
    this.load.image("btn_serang", "/assets/btn_serang.png");
    this.load.image("icon_hit", "/assets/hit.png");
    this.load.image("icon_miss", "/assets/miss.png");
    this.load.image("card_unit", "assets/card_unit.png");

    this.load.image("trophy", "assets/trophy.png");
    this.load.image("card_menang", "assets/card_menang.png");
    this.load.image("card_kalah", "assets/card_kalah.png");
    this.load.image("btn_menu", "assets/btn_menu.png");
    this.load.image("kalah", "assets/kalah.png");
    this.load.image("grid_range1", "assets/grid_range1.png");
    this.load.image("grid_range2", "assets/grid_range2.png");
    this.load.image("grid_range3", "assets/grid_range3.png");
    this.load.image("grid_range4", "assets/grid_range4.png");
    this.load.image("target", "assets/target.png");

    this.load.audio("winner","assets/sound/winner.mp3");
    this.load.audio("lose","assets/sound/lose.mp3");
    this.load.audio("soundgame","assets/sound/soundgame.mp3");
    this.load.audio("explosion","assets/sound/explosion.mp3");
    this.load.audio("misil","assets/sound/misil.mp3");
    this.load.audio("waterboom","assets/sound/waterboom.mp3");
  }

  create() {
    this.scene.start("MainMenu");
  }
}
