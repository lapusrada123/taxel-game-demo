// scenes/quick/SummaryScene.js
// หน้าสรุปหลังจบรอบ Runner — เงินคงเหลือ + รายการไอเทมที่เก็บ (รายได้/รายจ่าย)
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/gameConfig.js';
import { GameState } from '../../domain/GameState.js';
import { ITEM_TYPES } from '../../domain/items/ItemTypes.js';
import { makeButton } from '../ui/makeButton.js';

export class SummaryScene extends Phaser.Scene {
  constructor() {
    super('Summary');
  }

  create() {
    const cx = GAME_WIDTH / 2;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);
    this.add.text(cx, 50, 'สรุปผลการเก็บไอเทม', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '32px', color: '#ffcc33', fontStyle: 'bold',
    }).setOrigin(0.5);

    const moneyColor = GameState.money >= 0 ? '#4ade80' : '#f87171';
    const moneySign = GameState.money >= 0 ? '+' : '';
    this.add.text(cx, 95, `เงินคงเหลือ: ${moneySign}${GameState.money.toLocaleString()} บาท`, {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '22px', color: moneyColor, fontStyle: 'bold',
    }).setOrigin(0.5);

    const grouped = this.groupItems(GameState.itemLog);
    this.renderItemList(cx, 150, grouped);

    // ปุ่ม next ไปหน้าคำนวณภาษี (อยู่ล่างสุดของข้อความสรุป) ขยับขึ้นให้พ้นแถวปุ่ม "เล่นใหม่/กลับเมนู" ด้านล่าง (เดิมทับกัน)
    const nextBtnY = 375;
    const nextBtn = this.add.image(cx, nextBtnY, 'btn_next').setInteractive({ useHandCursor: true });
    const btnSize = 80;
    nextBtn.setScale(btnSize / Math.max(nextBtn.width, nextBtn.height));
    nextBtn.on('pointerdown', () => this.scene.start('TaxCalc'));
    this.add.text(cx, nextBtnY + btnSize / 2 + 10, 'ไปคำนวณภาษี', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color: '#ffcc33', fontStyle: 'bold',
    }).setOrigin(0.5);

    makeButton(this, cx - 150, 480, 'เล่นใหม่ ▶', () => {
      this.scene.start('CharSelect');
    }, { width: 240, height: 60 });

    makeButton(this, cx + 150, 480, '‹ กลับเมนู', () => {
      GameState.clearTaxWorksheets(); // ออกจากมินิเกมแล้ว ล้างข้อมูลกระดาษทดคำนวณภาษี/ตารางอัตราภาษีที่ค้างไว้
      this.scene.start('Menu');
    }, { width: 240, height: 60 });
  }

  groupItems(itemLog) {
    const grouped = {};
    for (const item of itemLog) {
      if (!grouped[item.type]) grouped[item.type] = { count: 0, total: 0 };
      grouped[item.type].count += 1;
      grouped[item.type].total += item.amount;
    }
    return grouped;
  }

  renderItemList(cx, startY, grouped) {
    const types = Object.keys(grouped);
    if (types.length === 0) {
      this.add.text(cx, startY + 20, '(ยังไม่ได้เก็บไอเทมเลยรอบนี้)', {
        fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color: '#aaaaaa',
      }).setOrigin(0.5);
      return;
    }

    types.forEach((type, i) => {
      const def = ITEM_TYPES[type];
      const { count, total } = grouped[type];
      const label = def ? def.label : type;
      const sign = total >= 0 ? '+' : '';
      const color = total >= 0 ? '#4ade80' : '#f87171';
      this.add.text(cx, startY + i * 34,
        `${label}  ×${count}   =   ${sign}${total.toLocaleString()} บาท`, {
          fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color,
        }).setOrigin(0.5);
    });
  }
}
