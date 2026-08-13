// scenes/quick/CharSelectScene.js
// เลือกตัวละคร (boy / girl) แล้วเข้าฉาก Runner
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/gameConfig.js';
import { GameState } from '../../domain/GameState.js';
import { makeButton } from '../ui/makeButton.js';

export class CharSelectScene extends Phaser.Scene {
  constructor() {
    super('CharSelect');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);
    this.add.text(cx, 60, 'เลือกตัวละคร', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '34px', color: '#ffcc33', fontStyle: 'bold',
    }).setOrigin(0.5);

    /** @type {'boy'|'girl'} */
    this.selected = GameState.character || 'boy';

    // การ์ดตัวละคร 2 ตัว
    this.boyCard = this.makeCard(cx - 200, 280, 'boy', 'ผู้ชาย');
    this.girlCard = this.makeCard(cx + 200, 280, 'girl', 'ผู้หญิง');

    this.refreshHighlight();

    makeButton(this, cx, 470, 'เริ่มเล่น ▶', () => {
      this.sound.play('sfx_select');
      GameState.character = this.selected;
      GameState.startNewRun();
      this.scene.start('Runner');
    });

    // ปุ่มย้อนกลับ
    makeButton(this, 90, 40, '‹ กลับ', () => this.scene.start('Menu'),
      { width: 120, height: 48 });
  }

  makeCard(x, y, key, label) {
    const frame = this.add.rectangle(x, y, 220, 260, 0x24243e)
      .setStrokeStyle(4, 0x444466);

    const sprite = this.add.sprite(x, y - 10, key, 0); // เฟรม 0 = ท่ายืน
    // ตัวละคร 320x340 -> ย่อให้พอดีการ์ด
    sprite.setScale(200 / sprite.height);

    this.add.text(x, y + 110, label, {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    frame.setInteractive({ useHandCursor: true });
    frame.on('pointerdown', () => {
      this.selected = key;
      this.refreshHighlight();
    });

    return { frame, sprite };
  }

  refreshHighlight() {
    const on = 0xffcc33, off = 0x444466;
    this.boyCard.frame.setStrokeStyle(4, this.selected === 'boy' ? on : off);
    this.girlCard.frame.setStrokeStyle(4, this.selected === 'girl' ? on : off);
  }
}
