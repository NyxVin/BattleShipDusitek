import { Boot } from "./scenes/Boot";
import { Preloader } from "./scenes/Preloader";
import { MainMenu } from "./scenes/MainMenu";
import { Placement } from "./scenes/Placement";
import { Game as MainGame } from "./scenes/Game";
import Phaser, { AUTO, Game } from "phaser";
import { Result } from "./scenes/Result";

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,

  width: 360,
  height: 640,

  parent: "game-container",
  backgroundColor: "#092360",

  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },

render: {
  antialias: true,
  roundPixels: true,
},

resolution: Math.min(window.devicePixelRatio, 2),

  scene: [
    Boot,
    Preloader,
    MainMenu,
    Placement,
    MainGame,
    Result,
  ],
};

const StartGame = (parent: string) => {
  return new Game({ ...config, parent });
};

export default StartGame;
