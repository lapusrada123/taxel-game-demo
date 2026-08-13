// scenes/BootScene.js
// โหลด asset ขั้นต่ำที่ใช้ตอนหน้า Preload (เช่น โลโก้/พื้นหลัง progress bar)
// Phase 0 ยังไม่มี asset พิเศษ จึงข้ามไป Preload ได้เลย

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    this.scene.start('Preload');
  }
}
