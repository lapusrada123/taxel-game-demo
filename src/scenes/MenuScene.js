// scenes/MenuScene.js
// หน้าเมนูหลัก: เลือก Quick Mode / Full Mode
// Phase 0 โฟกัส Quick Mode (Full Mode ยังปิดไว้)
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';
import { makeButton } from './ui/makeButton.js';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // พื้นหลัง (ครอบเต็มจอ คงสัดส่วน)
    const bg = this.add.image(cx, GAME_HEIGHT / 2, 'bg_menu');
    const scale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(scale);

    // แผ่นทึบจางๆ ให้อ่านปุ่มง่ายขึ้น
    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.15);

    // ปุ่มเลือกโหมด: ใช้กราฟิกปุ่มจริง (ตัดพื้นหลังออกแล้ว) แทนปุ่มข้อความเดิม
    // ขยับลงมา + ลดขนาดลงจากเดิม (เดิม y 250/400 กว้าง 280)
    const quickBtn = this.add.image(cx, 290, 'btn_quick_mode').setInteractive({ useHandCursor: true });
    quickBtn.setScale(230 / quickBtn.width);
    quickBtn.on('pointerdown', () => {
      this.sound.play('sfx_select');
      this.scene.start('TaxModeSelect');
    });

    // Full Mode ยังไม่เปิดให้เล่น (เนื้อหายังไม่มี) เลยปิด interactive ไว้ + จางลง + มีคำอธิบายกำกับเหมือนปุ่มเดิม
    const fullBtn = this.add.image(cx, 430, 'btn_full_mode').setAlpha(0.5);
    fullBtn.setScale(230 / fullBtn.width);
    this.add.text(cx, 430 + fullBtn.displayHeight / 2 + 10, '(เร็วๆ นี้)', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '14px', color: '#ffffff',
    }).setOrigin(0.5);

    // --- ปุ่มข้อความเดิม (ก่อนเปลี่ยนมาใช้กราฟิก) เก็บโค้ดไว้เผื่อต้องเรียกกลับมาใช้ใหม่ ---
    // makeButton(this, cx, 300, 'Quick Mode\nโหมดเล่นเร็ว', () => {
    //   this.sound.play('sfx_select');
    //   this.scene.start('TaxModeSelect');
    // });
    // makeButton(this, cx, 400, 'Full Mode\n(เร็วๆ นี้)', null, { disabled: true });
  }
}
