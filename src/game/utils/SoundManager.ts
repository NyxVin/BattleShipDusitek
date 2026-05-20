import Phaser from "phaser";

const SOUND_MUTED_KEY = "battleship_sound_muted";

export function getSavedMuteState() {
  return localStorage.getItem(SOUND_MUTED_KEY) === "true";
}

export function applySoundState(scene: Phaser.Scene) {
  const muted = getSavedMuteState();

  scene.sound.mute = muted;
  scene.registry.set("soundMuted", muted);

  return muted;
}

export function toggleSound(scene: Phaser.Scene) {
  const muted = !scene.sound.mute;

  scene.sound.mute = muted;
  scene.registry.set("soundMuted", muted);
  localStorage.setItem(SOUND_MUTED_KEY, String(muted));

  return muted;
}

export function createSoundButton(
  scene: Phaser.Scene,
  x = scene.scale.width - 35,
  y = 35
) {
  let muted = applySoundState(scene);

  const button = scene.add
    .text(x, y, muted ? "🔇" : "🔊", {
      fontSize: "24px",
    })
    .setOrigin(0.5)
    .setDepth(9999)
    .setScrollFactor(0)
    .setInteractive({ useHandCursor: true });

  button.on("pointerdown", () => {
    muted = toggleSound(scene);
    button.setText(muted ? "🔇" : "🔊");

    scene.tweens.add({
      targets: button,
      scale: 0.85,
      duration: 80,
      yoyo: true,
    });
  });

  return button;
}