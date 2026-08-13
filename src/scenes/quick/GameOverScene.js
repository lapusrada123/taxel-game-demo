// scenes/quick/GameOverScene.js
// จบเกมกลางทาง เพราะหลอดอาหารหรือหลอดนมหมด — แยกจากหน้า Summary ที่ถึงเส้นชัยปกติ
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/gameConfig.js';
import { GameState } from '../../domain/GameState.js';
import { makeButton } from '../ui/makeButton.js';

const REASON_LABEL = {
  food: 'หลอดอาหารหมด',
  milk: 'หลอดนมหมด',
};

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data) {
    const cx = GAME_WIDTH / 2;
    const reason = REASON_LABEL[data?.reason] || 'พลังงานหมด';

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x2e1a1a);
    this.add.text(cx, 180, 'GAME OVER', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '44px', color: '#f87171', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(cx, 240, reason, {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);

    const sign = GameState.money >= 0 ? '+' : '';
    this.add.text(cx, 300, `เงินที่เก็บได้ก่อนหมดแรง: ${sign}${GameState.money.toLocaleString()} บาท`, {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color: '#ffcc33',
    }).setOrigin(0.5);

    makeButton(this, cx - 150, 420, 'ลองใหม่ ▶', () => {
      this.scene.start('CharSelect');
    }, { width: 240, height: 60 });

    makeButton(this, cx + 150, 420, '‹ กลับเมนู', () => {
      this.scene.start('Menu');
    }, { width: 240, height: 60 });
  }
}
