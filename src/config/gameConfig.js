// config/gameConfig.js
// ค่ากลางของเกม: ขนาดฐาน, การ scale, physics
// resolution ฐาน 960x540 (16:9) แล้วให้ Phaser ย่อ/ขยายพอดีจอ

export const GAME_WIDTH = 960;
export const GAME_HEIGHT = 540;

// ระดับพื้นดินในฉาก runner (วัดจากขอบบน) ตัวละครยืนบนเส้นนี้
export const GROUND_Y = 470;

export function createGameConfig(scenes) {
  /** @type {Phaser.Types.Core.GameConfig} */
  const config = {
    type: Phaser.AUTO,            // เลือก WebGL ก่อน, ไม่ได้ค่อย fallback Canvas
    parent: 'game',
    backgroundColor: '#1a1a2e',
    pixelArt: true,              // ปิด anti-alias ให้ pixel คม
    roundPixels: true,
    scale: {
      mode: Phaser.Scale.FIT,    // ขยายพอดีจอ คงอัตราส่วน (มีขอบดำได้)
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 1400 },
        debug: false,            // เปิดเป็น true ตอน debug กล่องชน
      },
    },
    scene: scenes,
  };
  return config;
}
