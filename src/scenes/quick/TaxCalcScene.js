// scenes/quick/TaxCalcScene.js
// กระดาษทดคำนวณภาษี: ผู้เล่นลากกล่องข้อความ (ยอดไอเทมจริงที่เก็บได้ระหว่างเล่น) มาใส่ในสูตรให้ถูกต้อง
// ลากผิดช่อง -> เด้งกลับที่เดิม / ลากถูกช่อง -> ล็อกเข้าที่แล้วคำนวณต่อเนื่องอัตโนมัติ
// ไอเทมที่ไม่เกี่ยวข้องกับภาษีเงินได้บุคคลธรรมดา (มรดก/กองทุน RMF/ลอตเตอรี่) ต้องลากไปทิ้งในช่อง "ไม่เกี่ยวข้อง" ต่างหาก
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/gameConfig.js';
import { GameState } from '../../domain/GameState.js';

const EXPENSE_RATE = 0.5; // ค่าใช้จ่ายเหมา 50% ของรายได้ต่อปี
const EXPENSE_CAP = 100000;
const PERSONAL_DEDUCTION = 60000;
// ค่าลดหย่อนบุตร: เกมยังไม่มีระบบเลือกมีลูกใน Quick Mode เลยตัดออกจากการคำนวณ/การแสดงผลไปก่อน
const INSURANCE_CAP = 25000;
const RMF_RATE = 0.3; // แก้จาก 50% เป็น 30% ของรายได้ต่อปีล้วนๆ ไม่อ้างอิงยอดกองทุนที่เก็บได้จริง
const RMF_CAP = 500000;

// ไอเทมแต่ละชนิดต้องลากไปลงช่องไหนถึงจะถูก ('discard' = ไม่เกี่ยวข้องกับภาษีเงินได้ ต้องทิ้ง)
const CORRECT_ZONE = {
  coin: 'bonus',
  salary: 'salary',
  insurance: 'insurance',
  fund: 'discard',
  inheritance: 'discard',
  lottery: 'discard',
};

const ITEM_BOX_LABEL = {
  coin: 'โบนัส (เหรียญ)/ปี',
  salary: 'เงินเดือน/ปี',
  insurance: 'เบี้ยประกันสุขภาพ/ปี',
  fund: 'กองทุน RMF/ปี',
  inheritance: 'เงินมรดก',
  lottery: 'ลอตเตอรี่',
};

const FONT = "'SOVBokThang', sans-serif";
const TEXT = { fontFamily: FONT, fontSize: '13px', color: '#000000' };
const TEXT_BOLD = { fontFamily: FONT, fontSize: '13px', color: '#000000', fontStyle: 'bold' };
const TEXT_UNDERLINE_HINT = { fontFamily: FONT, fontSize: '13px', color: '#1864ab' };
const TEXT_AUTO = { fontFamily: FONT, fontSize: '13px', fontStyle: 'bold' };
const TEXT_NOTE = { fontFamily: FONT, fontSize: '12px', color: '#e03131' };
// หมายเหตุ/ข้อความช่วยเหลือสีเทา: ขยายขนาดขึ้นชัดเจนกว่าที่อื่นตามที่ขอ (เดิม 10px)
const TEXT_GRAY = { fontFamily: FONT, fontSize: '13px', color: '#555555' };

// ช่องคำนวณอัตโนมัติ: ยังไม่รู้คำตอบ -> ติดชื่อตัวแปรสั้นๆ สีนี้ / รู้คำตอบแล้ว -> ตัวเลขจริงสีนี้ (กันไม่ให้ช่องดูเหมือนติด 0 ทั้งที่ยังไม่ได้คำนวณ)
// ใช้สีเดียวกับหน้าอัตราภาษี (ตามที่กำหนดไว้แต่แรก) ให้ทั้งสองหน้าสื่อความหมายตรงกัน
const COLOR_HINT = '#373e4a';
const COLOR_KNOWN = '#6583AB';

const fmt = (n) => Math.round(n).toLocaleString();

export class TaxCalcScene extends Phaser.Scene {
  constructor() {
    super('TaxCalc');
  }

  create() {
    const cx = GAME_WIDTH / 2;
    // พื้นหลังหน้ากระดาษทดคำนวณภาษี (แทนสีพื้นเรียบเดิม) ครอบเต็มจอคงสัดส่วนเหมือนพื้นหลังหน้าอื่นๆ
    const bg = this.add.image(cx, GAME_HEIGHT / 2, 'bg_tax_calc');
    bg.setScale(Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height));

    this.add.text(cx, 4, 'กระดาษทดคำนวณภาษี', {
      fontFamily: FONT, fontSize: '23px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5, 0);
    this.add.text(cx, 46, 'ลากกล่องตัวเลขทางขวา มาใส่ในช่องว่างของสูตรให้ถูกต้อง', {
      fontFamily: FONT, fontSize: '13px', color: '#000000',
    }).setOrigin(0.5, 0);

    this.amounts = this.collectAmounts();
    this.dropZones = {};
    this.texts = {};
    // สถานะที่ผู้เล่นลากไว้แล้วจากรอบก่อน (สลับหน้าไป-กลับไม่ให้ข้อมูลหาย ล้างเฉพาะตอนเริ่มรอบใหม่/ออกจากมินิเกม)
    // เขียนกลับเข้า GameState ทันที ให้ persistZoneFill/persistDiscard เขียนทับ object เดียวกันได้เลยไม่ต้องเช็ค null ซ้ำ
    if (!GameState.taxCalcState) GameState.taxCalcState = { filledZones: {}, discardedTypes: [] };
    this.savedState = GameState.taxCalcState;

    this.buildWorksheet();
    this.buildDiscardBin(); // ต้องสร้างก่อน buildItemBoxes() เพราะตอนคืนสถานะไอเทมที่ถูกทิ้งแล้วต้องมีช่องทิ้งให้อ้างอิงตำแหน่ง
    this.buildItemBoxes();
    this.buildNextButton();

    // ลาก/ปล่อย ใช้ handler กลางจุดเดียว ครอบคลุมทุกกล่อง
    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
      gameObject.setDepth(50);
    });
    this.input.on('dragend', (pointer, gameObject) => this.handleDragEnd(gameObject));

    this.recomputeWorksheet();
  }

  // รวมยอดจริงจากไอเทมที่เก็บได้ระหว่างเล่น (GameState.itemLog) ต่อชนิด
  collectAmounts() {
    const sums = {};
    for (const entry of GameState.itemLog) {
      sums[entry.type] = (sums[entry.type] || 0) + entry.amount;
    }
    return {
      coin: sums.coin || 0,
      salary: sums.salary || 0,
      insurance: Math.abs(sums.insurance || 0),
      fund: Math.abs(sums.fund || 0),
      inheritance: sums.inheritance || 0,
      lottery: sums.lottery || 0,
    };
  }

  // ---------- WORKSHEET (ฝั่งซ้าย) ----------
  buildWorksheet() {
    const x0 = 40; // ขยับเข้าหากึ่งกลางจอมากขึ้นอีกนิด (เท่ากันทั้ง 2 ฝั่งกับคอลัมน์กล่องไอเทมฝั่งขวา ดู buildItemBoxes)
    const contentWidth = 530; // กว้างของคอลัมน์ซ้ายทั้งหมด (x0 ถึงประมาณเส้นแบ่งกับกล่องไอเทม) ใช้จัดกึ่งกลางข้อความสีเทา
    let y = 66;
    const lineGap = 25;
    const sectionHeadingStyle = { fontFamily: FONT, fontSize: '14px', color: '#000000', fontStyle: 'bold' };

    // แถวสูตร: array ของ segment { text } หรือ { blank: key, w } เรียงต่อกันซ้ายไปขวาบนบรรทัดเดียว
    const line = (segments, style = TEXT) => {
      let x = x0;
      for (const seg of segments) {
        if (seg.text !== undefined) {
          const t = this.add.text(x, y, seg.text, seg.style || style);
          x += t.width + 3;
        } else if (seg.blank) {
          this.makeDropZone(seg.blank, x + (seg.w || 66) / 2, y + 9, seg.w || 66, 22);
          x += (seg.w || 66) + 5;
        } else if (seg.auto) {
          const t = this.add.text(x, y, '', TEXT_AUTO);
          this.texts[seg.auto] = t;
          x += (seg.w || 66) + 3;
        }
      }
      y += lineGap;
    };

    // ข้อความสีเทาช่วยเหลือ/หมายเหตุ จัดกึ่งกลางคอลัมน์ซ้ายเสมอ (ไม่ชิดขอบซ้าย)
    const noteLine = (text) => {
      const t = this.add.text(x0 + contentWidth / 2, y, text, { ...TEXT_GRAY, align: 'center', wordWrap: { width: contentWidth } }).setOrigin(0.5, 0);
      y += t.height + 6;
      return t;
    };

    this.add.text(x0, y, 'รายได้ต่อปี', sectionHeadingStyle);
    y += lineGap;
    line([
      { text: '=' }, { blank: 'bonus', w: 76 }, { text: '(โบนัส) +' }, { blank: 'salary', w: 76 },
      { text: '(เงินเดือน) =' }, { auto: 'annualIncome', w: 110 }, { text: 'บาท' },
    ]);
    noteLine('(หมายเหตุ: เงินรางวัลลอตเตอรี่ และเงินมรดก ไม่นำมารวมคำนวณภาษีเงินได้)');

    this.add.text(x0, y, 'ค่าใช้จ่าย (เหมา หัก 50% ของรายได้ต่อปี หักได้สูงสุด 100,000 บาท)', TEXT_BOLD);
    y += lineGap;
    line([
      { text: '50/100 ×' }, { auto: 'annualIncome2', w: 110 }, { text: '=' }, { auto: 'expenseLine', w: 100 }, { text: 'บาท' },
    ]);
    this.texts.expenseCapNote = this.add.text(x0, y, '', TEXT_NOTE).setVisible(false);
    y += 20;

    this.add.text(x0, y, 'ค่าลดหย่อน', sectionHeadingStyle);
    y += lineGap;
    line([{ text: `ค่าลดหย่อนส่วนตัว = ${PERSONAL_DEDUCTION.toLocaleString()} บาท` }]);

    this.add.text(x0, y, 'ค่าลดหย่อนเบี้ยประกันสุขภาพ (ลดหย่อนเท่าที่จ่ายจริง ไม่เกิน 25,000 บาท)', TEXT);
    y += lineGap;
    line([{ blank: 'insurance', w: 86 }, { text: '(เบี้ยประกัน) บาท' }]);
    this.texts.insuranceCapNote = this.add.text(x0, y, '→ ลดหย่อนได้สูงสุดแค่ 25,000 บาท', TEXT_NOTE).setVisible(false);
    y += 20;

    this.add.text(x0, y, `ค่าลดหย่อนกองทุน RMF (หัก ${RMF_RATE * 100}% ของรายได้ต่อปี ไม่เกิน 500,000 บาท)`, TEXT);
    y += lineGap;
    line([
      { text: `${RMF_RATE * 100}/100 ×` }, { auto: 'annualIncome3', w: 110 }, { text: '=' }, { auto: 'rmfLine', w: 100 }, { text: 'บาท' },
    ]);
    this.texts.rmfCapNote = this.add.text(x0, y, '', TEXT_NOTE).setVisible(false);
    y += 20;

    line([
      { text: 'ค่าลดหย่อนรวม =' }, { auto: 'personal', w: 70 }, { text: '+' },
      { auto: 'insuranceDeduction', w: 100 }, { text: '+' }, { auto: 'rmfDeduction', w: 100 }, { text: '=' }, { auto: 'totalDeduction', w: 120 }, { text: 'บาท' },
    ], TEXT_BOLD);
    y += 6;

    this.add.text(x0, y, 'เงินได้สุทธิ', sectionHeadingStyle);
    y += lineGap;
    line([
      { auto: 'annualIncome4', w: 110 }, { text: '-' }, { auto: 'expense', w: 100 }, { text: '-' }, { auto: 'totalDeduction2', w: 120 },
      { text: '=' }, { auto: 'netIncome', w: 130 }, { text: 'บาท' },
    ], TEXT_BOLD);
  }

  // กล่องว่างในสูตร (drop zone) - พื้นขาว เส้นประ มีเครื่องหมาย ? รอจนกว่าจะมีกล่องไอเทมมาลงถูกช่อง
  makeDropZone(key, cx, cy, w, h) {
    const rect = this.add.rectangle(cx, cy, w, h, 0xffffff, 0.6).setStrokeStyle(2, 0x1864ab, 0.6);
    const hint = this.add.text(cx, cy, '?', TEXT_UNDERLINE_HINT).setOrigin(0.5);
    this.dropZones[key] = { x: cx, y: cy, w, h, filled: null, rect, hint };
  }

  // ---------- กล่องไอเทมที่ลากได้ (ฝั่งขวา) ----------
  buildItemBoxes() {
    const x0 = 590; // ขยับเข้าหากึ่งกลางจอเท่ากับฝั่งซ้าย (ดู buildWorksheet)
    const colWidth = GAME_WIDTH - 40 - x0; // ความกว้างคอลัมน์ขวาทั้งหมด ใช้จัดกึ่งกลางข้อความสีเทา (ขอบขวาขยับเข้ามาเท่ากับฝั่งซ้ายด้วย)
    let y = 70;
    this.add.text(x0, y, 'ไอเทมที่เก็บได้ในเกม', { fontFamily: FONT, fontSize: '15px', color: '#000000', fontStyle: 'bold' });
    y += 24;
    this.add.text(x0 + colWidth / 2, y, '(ลากกล่องตัวเลขไปใส่ในสูตรทางซ้าย)', { ...TEXT_GRAY, align: 'center', wordWrap: { width: colWidth } }).setOrigin(0.5, 0);
    y += 24;

    this.itemBoxes = [];
    const boxesByType = {};
    // เรียงตามลำดับที่ระบุ: โบนัส, เงินเดือน, มรดก, เบี้ยประกัน, กองทุน RMF, ลอตเตอรี่ (ถ้ามี)
    const order = ['coin', 'salary', 'inheritance', 'insurance', 'fund', 'lottery'];
    const iconKey = { coin: 'item_coin', insurance: 'item_insurance', fund: 'item_fund', inheritance: 'item_inheritance' };
    for (const type of order) {
      const amount = this.amounts[type];
      if (!amount) continue; // ไม่เคยเก็บไอเทมนี้เลยรอบนี้ -> ไม่ต้องโชว์กล่อง
      const rowY = y + 6;
      const label = this.add.text(x0, rowY, ITEM_BOX_LABEL[type], { ...TEXT, wordWrap: { width: 150 } });

      // รูปไอเทมจริงต่อท้ายข้อความ ให้ผู้เล่นเห็นหน้าตาไอเทม (เงินเดือน/ลอตเตอรี่ไม่มีรูปในเกม เลยข้าม)
      if (iconKey[type]) {
        const icon = this.add.image(x0 + 160, rowY + label.height / 2, iconKey[type]);
        icon.setScale(24 / Math.max(icon.width, icon.height));
      }

      // กองทุน/ประกัน ไม่ต้องมีเครื่องหมาย +/- นำหน้า (ไอเทมอื่นมีตามปกติ)
      const sign = (type === 'fund' || type === 'insurance') ? '' : (amount >= 0 ? '+' : '');
      const box = this.makeDraggableBox(x0 + 260, rowY + 8, 88, 24, `${sign}${fmt(amount)}`, type);
      this.itemBoxes.push(box);
      boxesByType[type] = box;
      y += 38;
    }

    // คืนสถานะที่ผู้เล่นลากไว้แล้วจากรอบก่อน (ดู create()/savedState) วางกล่องเข้าที่ทันทีแบบไม่มีอนิเมชัน
    for (const [zoneKey, type] of Object.entries(this.savedState.filledZones)) {
      const box = boxesByType[type];
      if (box) this.snapBoxToZone(box, zoneKey, true);
    }
    for (const type of this.savedState.discardedTypes) {
      const box = boxesByType[type];
      if (box) this.snapBoxToZone(box, 'discard', true);
    }
  }

  makeDraggableBox(x, y, w, h, label, itemType) {
    const box = this.add.container(x, y);
    const bg = this.add.rectangle(0, 0, w, h, 0xfff3bf, 1).setStrokeStyle(2, 0x8a6d00);
    const txt = this.add.text(0, 0, label, { fontFamily: FONT, fontSize: '12px', color: '#5c3d00', fontStyle: 'bold' }).setOrigin(0.5);
    box.add([bg, txt]);
    box.setSize(w, h);
    box.homeX = x;
    box.homeY = y;
    box.itemType = itemType;
    box.setDepth(10);
    box.setInteractive({ useHandCursor: true, draggable: true });
    return box;
  }

  // ---------- ช่องทิ้งไอเทมที่ไม่เกี่ยวข้องกับภาษีเงินได้ ----------
  buildDiscardBin() {
    const x = 590 + 340 / 2; // ขยับเข้าหากึ่งกลางจอเท่ากับฝั่งซ้าย (ดู buildWorksheet)
    const y = 470;
    const w = 340;
    const h = 60;
    this.add.rectangle(x, y, w, h, 0xffffff, 0.5).setStrokeStyle(2, 0x868e96, 0.8);
    this.add.text(x, y - h / 2 - 40, 'ไม่เกี่ยวข้องกับภาษีเงินได้บุคคลธรรมดา (ทิ้งตรงนี้)', {
      fontFamily: FONT, fontSize: '13px', color: '#495057', align: 'center', wordWrap: { width: w },
    }).setOrigin(0.5, 0);
    this.dropZones.discard = { x, y, w, h, filledCount: 0 };
  }

  buildNextButton() {
    // ย้ายมาไว้กึ่งกลางล่างแทนมุมขวาล่าง (มุมนั้นแคบเกินไป ติดกล่อง "ทิ้งไอเทม" ขยับขึ้นแล้วจะไปทับกัน)
    // กึ่งกลางจอไม่ชนกล่องทิ้งไอเทม (อยู่แค่ฝั่งขวา x 590-930) เลยขยับขึ้นจากขอบล่างได้สบายๆ
    const nextBtn = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 32, 'btn_next').setInteractive({ useHandCursor: true });
    const btnSize = 52;
    nextBtn.setScale(btnSize / Math.max(nextBtn.width, nextBtn.height));
    // ส่งเงินได้สุทธิที่คำนวณล่าสุดไปให้หน้าอัตราภาษีต่อ (ใช้เป็นจุดตั้งต้นของตารางขั้นบันได)
    nextBtn.on('pointerdown', () => this.scene.start('TaxBracket', { netIncome: this.computedNetIncome || 0 }));
  }

  // ---------- DRAG LOGIC ----------
  handleDragEnd(box) {
    if (!this.itemBoxes.includes(box)) return; // กันชนกับ object draggable อื่นในอนาคต (ตอนนี้มีแค่กล่องไอเทม)
    const zoneKey = this.findZoneForPoint(box.x, box.y);
    if (zoneKey && CORRECT_ZONE[box.itemType] === zoneKey) {
      this.snapBoxToZone(box, zoneKey);
    } else {
      this.bounceBack(box);
    }
  }

  findZoneForPoint(x, y) {
    for (const [key, zone] of Object.entries(this.dropZones)) {
      if (key !== 'discard' && zone.filled) continue; // ช่องเดี่ยวเต็มแล้วข้าม (discard รับได้หลายชิ้น)
      if (x >= zone.x - zone.w / 2 && x <= zone.x + zone.w / 2 && y >= zone.y - zone.h / 2 && y <= zone.y + zone.h / 2) {
        return key;
      }
    }
    return null;
  }

  // instant=true ใช้ตอนคืนสถานะจากรอบก่อน (สลับหน้าไป-กลับ) วางเข้าที่ทันทีไม่มีอนิเมชัน + ไม่บันทึกซ้ำ
  snapBoxToZone(box, zoneKey, instant = false) {
    const zone = this.dropZones[zoneKey];
    box.disableInteractive();

    if (zoneKey === 'discard') {
      // เรียงกล่องที่ทิ้งถูกในถังเป็นแถวจากซ้ายไปขวา ไม่ให้ซ้อนทับกัน (กล่องกว้าง 100px เว้นช่องพอสำหรับ 3 ชิ้น)
      const offsetX = (zone.filledCount - 1) * 105;
      zone.filledCount += 1;
      const targetX = zone.x - 105 + offsetX;
      if (instant) { box.x = targetX; box.y = zone.y; }
      else this.tweens.add({ targets: box, x: targetX, y: zone.y, duration: 200, ease: 'Back.Out' });
      if (!instant) this.persistDiscard(box.itemType);
    } else {
      zone.filled = box.itemType;
      zone.hint.setVisible(false);
      if (instant) { box.x = zone.x; box.y = zone.y; }
      else this.tweens.add({ targets: box, x: zone.x, y: zone.y, duration: 200, ease: 'Back.Out' });
      if (!instant) this.persistZoneFill(zoneKey, box.itemType);
      this.recomputeWorksheet();
    }
  }

  // บันทึกลง GameState ทันทีที่ลากถูก ให้สลับไปหน้าอัตราภาษีแล้วย้อนกลับมา (หรือสลับหน้าเกมไปมา) ข้อมูลไม่หาย
  persistZoneFill(zoneKey, itemType) {
    GameState.taxCalcState.filledZones[zoneKey] = itemType;
  }

  persistDiscard(itemType) {
    if (!GameState.taxCalcState.discardedTypes.includes(itemType)) {
      GameState.taxCalcState.discardedTypes.push(itemType);
    }
  }

  bounceBack(box) {
    box.setDepth(10);
    this.tweens.add({ targets: box, x: box.homeX, y: box.homeY, duration: 250, ease: 'Back.Out' });
  }

  // ช่องคำนวณอัตโนมัติ: known=false -> ติดชื่อตัวแปรสั้นๆ สี hint (ยังไม่รู้คำตอบ) / known=true -> ตัวเลขจริงสี known
  // กันไม่ให้ช่องดูเหมือนติด 0 หรือ ? ค้างเฉยๆ ทั้งที่จริงยังไม่ได้คำนวณ (ต้องรู้ว่ากำลังรอข้อมูลอะไรอยู่)
  setAutoField(key, label, value, known) {
    const t = this.texts[key];
    if (!t) return;
    if (known) {
      t.setText(fmt(value));
      t.setColor(COLOR_KNOWN);
    } else {
      t.setText(`[${label}]`);
      t.setColor(COLOR_HINT);
    }
  }

  // ---------- คำนวณอัตโนมัติทุกจุดที่ขึ้น [ชื่อตัวแปร] ----------
  recomputeWorksheet() {
    const hasBonus = !!this.dropZones.bonus.filled;
    const hasSalary = !!this.dropZones.salary.filled;
    const hasInsurance = !!this.dropZones.insurance.filled;
    const bothIncome = hasBonus && hasSalary;

    const annualIncome = (hasBonus ? this.amounts.coin : 0) + (hasSalary ? this.amounts.salary : 0);
    this.setAutoField('annualIncome', 'รายได้ต่อปี', annualIncome, bothIncome);
    this.setAutoField('annualIncome2', 'รายได้ต่อปี', annualIncome, bothIncome);
    this.setAutoField('annualIncome3', 'รายได้ต่อปี', annualIncome, bothIncome);
    this.setAutoField('annualIncome4', 'รายได้ต่อปี', annualIncome, bothIncome);

    // ค่าใช้จ่าย: ถ้าคำนวณได้เกิน cap ตัวเลขที่โชว์ในสูตรต้องเป็นค่าที่ถูกตัดแล้ว (ไม่ใช่ค่าดิบ) พร้อมโน้ตบอกว่าคำนวณดิบได้เท่าไหร่
    const rawExpense = annualIncome * EXPENSE_RATE;
    const expense = Math.min(rawExpense, EXPENSE_CAP);
    const expenseCapped = bothIncome && rawExpense > EXPENSE_CAP;
    this.setAutoField('expenseLine', 'ค่าใช้จ่าย', expense, bothIncome);
    this.setAutoField('expense', 'ค่าใช้จ่าย', expense, bothIncome);
    if (expenseCapped) this.texts.expenseCapNote.setText(`→ คำนวณได้ ${fmt(rawExpense)} บาท แต่หักได้สูงสุดแค่ ${fmt(EXPENSE_CAP)} บาท`);
    this.texts.expenseCapNote.setVisible(expenseCapped);

    // ค่าลดหย่อนประกัน: ไม่ขึ้นกับรายได้เลย รู้ได้ทันทีที่ลากช่องประกัน (หรือรู้ทันทีว่าเป็น 0 ถ้าไม่ได้ลาก) เลย known เสมอ
    const insuranceDeduction = hasInsurance ? Math.min(this.amounts.insurance, INSURANCE_CAP) : 0;
    this.setAutoField('insuranceDeduction', 'ประกัน', insuranceDeduction, true);
    this.texts.insuranceCapNote.setVisible(hasInsurance && this.amounts.insurance > INSURANCE_CAP);

    // กองทุน RMF: ถ้าผู้เล่นไม่เคยเก็บไอเทมกองทุนเลยในรอบนี้ ไม่ต้องคำนวณให้ ติด 0 ไปเลย (ไม่ใช่คำนวณจากรายได้เฉยๆ)
    const hasFund = !!this.amounts.fund;
    const rmfRaw = hasFund ? annualIncome * RMF_RATE : 0;
    const rmfDeduction = hasFund ? Math.min(rmfRaw, RMF_CAP) : 0;
    const rmfCapped = hasFund && bothIncome && rmfRaw > RMF_CAP;
    const rmfKnown = !hasFund || bothIncome; // ไม่มีกองทุน = รู้ทันทีว่า 0 / มีกองทุน = ต้องรอรายได้ครบก่อนถึงจะรู้
    this.setAutoField('rmfLine', 'กองทุน', rmfDeduction, rmfKnown);
    this.setAutoField('rmfDeduction', 'กองทุน', rmfDeduction, true); // ช่องที่เอาไปรวมในค่าลดหย่อนรวม โชว์ 0 ไปก่อนได้ (ไม่ทำให้สูตรรวมค้างเป็นตัวแปร)
    if (rmfCapped) this.texts.rmfCapNote.setText(`→ คำนวณได้ ${fmt(rmfRaw)} บาท แต่หักได้สูงสุดแค่ ${fmt(RMF_CAP)} บาท`);
    this.texts.rmfCapNote.setVisible(rmfCapped);

    this.setAutoField('personal', 'ลดหย่อนส่วนตัว', PERSONAL_DEDUCTION, true);

    const totalDeduction = PERSONAL_DEDUCTION + insuranceDeduction + rmfDeduction;
    this.setAutoField('totalDeduction', 'ค่าลดหย่อน', totalDeduction, bothIncome);
    this.setAutoField('totalDeduction2', 'ค่าลดหย่อน', totalDeduction, bothIncome);

    const netIncome = annualIncome - expense - totalDeduction;
    this.setAutoField('netIncome', 'เงินได้สุทธิ', netIncome, bothIncome);
    // เก็บไว้ใช้ตอนกด "ถัดไป" ไปหน้าอัตราภาษี (ต้องมีทั้งโบนัส+เงินเดือนครบก่อนถึงจะถือว่าคำนวณได้จริง)
    this.computedNetIncome = bothIncome ? netIncome : 0;
  }
}
