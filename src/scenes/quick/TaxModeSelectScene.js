// scenes/quick/TaxModeSelectScene.js
// เลือกแบบภาษีที่จะเล่น (ภ.ง.ด. 90 / 91) — ใช้ภาพจริงจาก ass/เลือกหมวดภาษี/IMG_4924.JPG เป็นพื้นหลัง
// แล้ววาง hit area + ข้อความทับตำแหน่งการ์ดในภาพ (พิกัดวัดจากภาพต้นฉบับ 1653x990 มาแปลงเป็นพิกัดจอ 960x540)
// ภ.ง.ด. 91 = เงินได้จากเงินเดือนอย่างเดียว (มาตรา 40(1)) ตรงกับเนื้อหา Runner ที่มีตอนนี้ -> เปิดให้เล่น
// ภ.ง.ด. 90 = มีเงินได้หลายประเภท (ธุรกิจ/ฟรีแลนซ์ ฯลฯ) -> เนื้อหายังไม่มี ปิดไว้ก่อนเหมือน Full Mode
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/gameConfig.js';
import { GameState } from '../../domain/GameState.js';
import { makeButton } from '../ui/makeButton.js';

export class TaxModeSelectScene extends Phaser.Scene {
  constructor() {
    super('TaxModeSelect');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    // พื้นหลัง = ภาพจริง ครอบเต็มจอคงสัดส่วน (เหมือน MenuScene)
    const bg = this.add.image(cx, GAME_HEIGHT / 2, 'bg_tax_mode_select');
    const scale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(scale);

    // ภ.ง.ด. 90 (การ์ดแดง ฝั่งซ้ายของภาพ) - ปิดไว้ก่อน
    this.setupCard({
      hit: { x: 254, y: 272, w: 374, h: 485 },
      cream: { x: 270, y: 411, w: 285, h: 160 },
      desc: 'สำหรับผู้มีเงินได้หลายประเภท\n(ธุรกิจ/ฟรีแลนซ์ ฯลฯ)\n\n(เร็วๆ นี้)',
      disabled: true,
    });

    // ภ.ง.ด. 91 (การ์ดน้ำเงิน ฝั่งขวาของภาพ) - เปิดเล่นได้
    this.setupCard({
      hit: { x: 675, y: 272, w: 397, h: 485 },
      cream: { x: 674, y: 411, w: 284, h: 160 },
      desc: 'สำหรับผู้มีเงินได้จาก\nเงินเดือนเท่านั้น',
      disabled: false,
      onSelect: () => {
        this.sound.play('sfx_select');
        GameState.taxForm = '91';
        this.scene.start('CharSelect');
      },
    });

    makeButton(this, 90, 40, '‹ กลับ', () => this.scene.start('Menu'),
      { width: 120, height: 48 });
  }

  setupCard({ hit, cream, desc, disabled, onSelect }) {
    this.add.text(cream.x, cream.y, desc, {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '15px', color: '#000000', align: 'center',
      wordWrap: { width: cream.w - 20 },
    }).setOrigin(0.5).setAlpha(disabled ? 0.6 : 1);

    if (disabled) return;

    const hitArea = this.add.rectangle(hit.x, hit.y, hit.w, hit.h, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    hitArea.on('pointerdown', onSelect);
  }
}
