// scenes/quick/TaxBracketScene.js
// ตารางภาษีเงินได้บุคคลธรรมดาแบบขั้นบันได เป็นแบบฝึกหัดลากตัวเลข (บล็อกข้อมูล) ไปใส่ในช่องว่างของสูตรแต่ละแถว
// ตัวเลขทุกก้อนคำนวณจาก "เงินได้สุทธิ" (ส่งมาจากหน้าคำนวณภาษี) ไว้ล่วงหน้าทั้งหมดแล้วก่อนแสดงผล
// การลากเป็นแค่แบบฝึกจับคู่ตัวเลขให้ถูกช่อง ไม่ใช่การคำนวณเอง (ผู้เล่นไม่ต้องคิดเลขเอง)
import { GAME_WIDTH, GAME_HEIGHT } from '../../config/gameConfig.js';
import { TAX_BRACKETS } from '../../domain/tax/TaxEngine.js';
import { makeButton } from '../ui/makeButton.js';
import { GameState } from '../../domain/GameState.js';

const FONT = "'SOVBokThang', sans-serif";
const COLOR_HINT = '#373e4a'; // ยังไม่รู้คำตอบ (รอผู้เล่นลากให้ครบก่อน)
const COLOR_KNOWN = '#6583AB'; // รู้คำตอบแล้ว (ลากถูกครบตามเงื่อนไขแล้ว)
const CHIP_BG = 0xfff3bf;
const CHIP_BORDER = 0x8a6d00;
const CHIP_TEXT = '#5c3d00';

// สีบล็อก "เงินเหลือ" (ลากลงช่อง carry-in ของแถวถัดไป) และบล็อก "เงินในช่วง" (ลากลงช่องคำนวณภาษีฝั่งขวา) ตามที่กำหนด
const REMAINDER_BG = 0x99dfff;
const REMAINDER_BORDER = 0x4837f5;
const AMOUNT_BG = 0xfdc581;
const AMOUNT_BORDER = 0xffb84b;

const fmt = (n) => Math.round(n).toLocaleString();

// พิกัด x คงที่ของแต่ละ "คอลัมน์" ในแถว ให้ทุกแถวเรียงตรงกัน (ขยายขึ้นจากเดิมให้พอดีกับฟอนต์ที่ใหญ่ขึ้น)
const COL = {
  range: 12,
  carryBox: 150,
  minus: 226,
  amount: 238,
  equals: 308,
  remainder: 320,
  amountBox: 412,
  times: 486,
  rate: 500,
  eq2: 536,
  tax: 550,
};
const ROW_H = 43;
const TABLE_TOP = 110;

export class TaxBracketScene extends Phaser.Scene {
  constructor() {
    super('TaxBracket');
  }

  create(data) {
    const cx = GAME_WIDTH / 2;
    this.netIncome = data?.netIncome || 0;
    this.dropZones = {};
    this.chips = [];
    this.autoTexts = {};
    // สถานะที่ผู้เล่นลากไว้แล้วจากรอบก่อน (สลับหน้าไป-กลับไม่ให้ข้อมูลหาย ล้างเฉพาะตอนเริ่มรอบใหม่/ออกจากมินิเกม)
    if (!GameState.taxBracketState) GameState.taxBracketState = { filledZoneKeys: [] };
    this.savedState = GameState.taxBracketState;

    this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffebcd);

    this.add.text(cx, 2, 'อัตราภาษีเงินได้บุคคลธรรมดา', {
      fontFamily: FONT, fontSize: '22px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5, 0);
    this.add.text(cx, 38, 'ลากตัวเลขไปใส่ในช่องว่างของแต่ละแถวให้ถูกต้อง', {
      fontFamily: FONT, fontSize: '13px', color: '#000000',
    }).setOrigin(0.5, 0);

    this.rows = this.computeRows(this.netIncome);

    this.buildTopIncomeChip();
    this.buildTableHeader();
    this.rows.forEach((row, i) => this.buildRow(row, i));
    this.buildTotalLine();
    this.buildBackButton();

    this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
      gameObject.setDepth(50);
    });
    this.input.on('dragend', (pointer, gameObject) => this.handleDragEnd(gameObject));

    this.restoreSavedState();
    this.recompute();
  }

  // คำนวณเงินในแต่ละขั้น/เงินคงเหลือ/ภาษีแต่ละขั้นไว้ล่วงหน้าทั้งหมด อิงจาก "เงินได้สุทธิ" อย่างเดียว
  computeRows(netIncome) {
    let carryIn = Math.max(0, netIncome);
    const rows = [];
    TAX_BRACKETS.forEach((bracket, i) => {
      const width = bracket.max === Infinity ? carryIn : (bracket.max - bracket.min);
      const amountInBracket = Math.max(0, Math.min(carryIn, width));
      const remainderAfter = carryIn - amountInBracket;
      const tax = amountInBracket * bracket.rate;
      rows.push({ index: i, bracket, carryIn, amountInBracket, remainderAfter, tax });
      carryIn = remainderAfter;
    });
    return rows;
  }

  rangeLabel(bracket, i) {
    const rangeStart = i === 0 ? bracket.min : bracket.min + 1;
    return bracket.max === Infinity
      ? `${fmt(rangeStart)} ขึ้นไป`
      : `${fmt(rangeStart)}-${fmt(bracket.max)}`;
  }

  buildTopIncomeChip() {
    const label = this.add.text(COL.range, 62, 'เงินได้สุทธิ =', {
      fontFamily: FONT, fontSize: '15px', color: '#000000', fontStyle: 'bold',
    });
    // ถ้าเงินได้สุทธิเป็น 0 แถวแรกจะไม่ active เลย (ไม่มีช่อง carry0 ให้ลากลง) เลยไม่ต้องสร้างบล็อกนี้ขึ้นมาลอยๆ
    if (this.netIncome <= 0) return;
    // เงินได้สุทธิทำหน้าที่เหมือนบล็อก "เงินเหลือ" ตัวแรก (ลากลงช่อง carry-in ของแถวแรก) ใช้สีชุดเดียวกัน
    this.incomeChip = this.makeChip(label.x + label.width + 8, 56, this.netIncome, 'carry0', REMAINDER_BG, REMAINDER_BORDER);
  }

  buildTableHeader() {
    const y = TABLE_TOP - 22;
    const style = { fontFamily: FONT, fontSize: '12px', color: '#000000', fontStyle: 'bold' };
    this.add.text(COL.range, y, 'ช่วงเงินได้สุทธิ (บาท)', style);
    this.add.text(COL.amount, y, 'เงินที่อยู่ในช่วง → เงินคงเหลือ', style);
    this.add.text(COL.amountBox, y, 'ภาษีของขั้นนี้', style);
    this.add.rectangle(GAME_WIDTH / 2, TABLE_TOP - 6, GAME_WIDTH - 20, 2, 0x000000);
  }

  buildRow(row, i) {
    const y = TABLE_TOP + i * ROW_H;
    const textStyle = { fontFamily: FONT, fontSize: '13px', color: '#000000' };

    this.add.text(COL.range, y, this.rangeLabel(row.bracket, i), { ...textStyle, fontSize: '12px', fontStyle: 'bold' });

    // แถวที่เงินได้สุทธิไปไม่ถึงขั้นนี้เลย (carryIn หมดตั้งแต่ขั้นก่อนแล้ว) ไม่มีข้อมูลอะไรให้แสดง โชว์แค่ช่วงเงินได้เฉยๆ
    const rowActive = row.carryIn > 0;
    if (!rowActive) return;

    const carryHint = i === 0 ? 'เงินได้สุทธิ' : `เงินเหลือ${i}`;
    this.makeDropZone(`carry${i}`, COL.carryBox + 32, y + 8, 64, 24, carryHint);

    this.add.text(COL.minus, y, '-', textStyle);

    if (i === 0) {
      // ขั้นแรกไม่มีปลายทางให้ลาก (ยกเว้นภาษีอยู่แล้ว) เลยแสดงเป็นตัวเลขนิ่งเหมือนเดิม ไม่ต้องเป็นบล็อก
      this.makeStaticChip(COL.amount, y, row.amountInBracket);
    } else {
      // เงินในช่วงN (ฝั่งซ้าย): กลายเป็นบล็อกลากได้ ลากไปลงกล่อง "เงินในช่วงN" ฝั่งขวาเพื่อคำนวณภาษีของขั้นนี้
      this.makeChip(COL.amount, y, row.amountInBracket, `amountBox${i}`, AMOUNT_BG, AMOUNT_BORDER);
    }

    this.add.text(COL.equals, y, '=', textStyle);

    // มีแถวถัดไปให้ลากลงจริงๆ ก็ต่อเมื่อยังมีเงินเหลือจะไหลต่อ (remainderAfter=0 แปลว่าแถวถัดไปจะไม่มีข้อมูล ไม่ถูกสร้างช่อง carry-in ไว้เลย)
    const hasNextRow = i < this.rows.length - 1 && row.remainderAfter > 0;
    if (hasNextRow) {
      // เงินเหลือของแถวนี้: กลายเป็นบล็อกลากได้ ลากลงเป็นช่อง carry-in ของแถวถัดไป
      this.makeChip(COL.remainder, y, row.remainderAfter, `carry${i + 1}`, REMAINDER_BG, REMAINDER_BORDER);
    } else {
      // ขั้นบนสุด เงินเหลือเป็น 0 เสมอ (ไม่มีเพดาน ไม่เหลือให้ไหลต่อ) ไม่มีแถวถัดไปให้ลาก แสดงเป็นตัวเลขนิ่งไปเลย
      this.makeStaticChip(COL.remainder, y, row.remainderAfter);
    }

    if (i === 0) {
      // ขั้นแรกยกเว้นภาษี ไม่มีสูตรให้ลาก ภาษีเป็น 0 เสมอ
      this.add.text(COL.amountBox, y, 'ยกเว้น', { ...textStyle, color: '#2f9e44', fontStyle: 'bold' });
      this.add.text(COL.tax, y, '0', { ...textStyle, fontStyle: 'bold' });
    } else {
      this.makeDropZone(`amountBox${i}`, COL.amountBox + 32, y + 8, 64, 24, `เงินในช่วง${i}`);
      this.add.text(COL.times, y, 'x', textStyle);
      this.add.text(COL.rate, y, `${(row.bracket.rate * 100).toFixed(0)}%`, { ...textStyle, fontStyle: 'bold' });
      this.add.text(COL.eq2, y, '=', textStyle);
      const taxText = this.add.text(COL.tax, y, '[คำนวณอัตโนมัติ]', {
        fontFamily: FONT, fontSize: '13px', color: COLOR_HINT, fontStyle: 'bold',
      });
      this.autoTexts[`tax${i}`] = { text: taxText, value: row.tax };
    }
  }

  buildTotalLine() {
    const y = TABLE_TOP + this.rows.length * ROW_H + 8;
    this.add.text(COL.eq2 - 70, y, 'ภาษีรวม', {
      fontFamily: FONT, fontSize: '15px', color: '#000000', fontStyle: 'bold',
    });
    this.totalText = this.add.text(COL.tax, y, '[คำนวณอัตโนมัติ]', {
      fontFamily: FONT, fontSize: '15px', color: COLOR_HINT, fontStyle: 'bold',
    });
  }

  buildBackButton() {
    makeButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 20, '‹ กลับ', () => this.scene.start('TaxCalc'), {
      width: 120, height: 34,
    });
  }

  // ---------- กล่องเปล่า (drop zone) ----------
  makeDropZone(key, cx, cy, w, h, hint) {
    const rect = this.add.rectangle(cx, cy, w, h, 0xffffff, 0.9).setStrokeStyle(2, 0x1864ab, 0.6);
    const hintText = this.add.text(cx, cy, hint, {
      fontFamily: FONT, fontSize: '10px', color: '#868e96', align: 'center', wordWrap: { width: w - 4 },
    }).setOrigin(0.5);
    this.dropZones[key] = { x: cx, y: cy, w, h, filled: false, rect, hint: hintText };
  }

  // ---------- บล็อกข้อมูลนิ่ง (แสดงค่าที่รู้อยู่แล้ว ลากไม่ได้ ใช้คู่กับ chip ที่ลากได้ในตำแหน่งอื่น) ----------
  makeStaticChip(x, y, value) {
    const w = 58;
    const h = 20;
    const cx = x + w / 2;
    const cy = y + 8;
    this.add.rectangle(cx, cy, w, h, CHIP_BG, 1).setStrokeStyle(1, CHIP_BORDER, 0.6);
    this.add.text(cx, cy, fmt(value), {
      fontFamily: FONT, fontSize: '11px', color: CHIP_TEXT, fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  // ---------- บล็อกข้อมูลที่ลากได้ ----------
  makeChip(x, y, value, targetZoneKey, bgColor = CHIP_BG, borderColor = CHIP_BORDER) {
    const w = 62;
    const h = 22;
    const cx = x + w / 2;
    const cy = y + 8;
    const container = this.add.container(cx, cy);
    const bg = this.add.rectangle(0, 0, w, h, bgColor, 1).setStrokeStyle(2, borderColor);
    const txt = this.add.text(0, 0, fmt(value), {
      fontFamily: FONT, fontSize: '11px', color: CHIP_TEXT, fontStyle: 'bold',
    }).setOrigin(0.5);
    container.add([bg, txt]);
    container.setSize(w, h);
    container.homeX = cx;
    container.homeY = cy;
    container.targetZoneKey = targetZoneKey;
    container.setDepth(10);
    container.setInteractive({ useHandCursor: true, draggable: true });
    this.chips.push(container);
    return container;
  }

  // ---------- DRAG LOGIC ----------
  handleDragEnd(chip) {
    if (!this.chips.includes(chip)) return;
    const zoneKey = this.findZoneForPoint(chip.x, chip.y);
    if (zoneKey && chip.targetZoneKey === zoneKey) {
      this.snapChipToZone(chip, zoneKey);
    } else {
      this.bounceBack(chip);
    }
  }

  findZoneForPoint(x, y) {
    for (const [key, zone] of Object.entries(this.dropZones)) {
      if (zone.filled) continue;
      if (x >= zone.x - zone.w / 2 && x <= zone.x + zone.w / 2 && y >= zone.y - zone.h / 2 && y <= zone.y + zone.h / 2) {
        return key;
      }
    }
    return null;
  }

  // instant=true ใช้ตอนคืนสถานะจากรอบก่อน (สลับหน้าไป-กลับ) วางเข้าที่ทันทีไม่มีอนิเมชัน + ไม่บันทึกซ้ำ
  snapChipToZone(chip, zoneKey, instant = false) {
    const zone = this.dropZones[zoneKey];
    chip.disableInteractive();
    zone.filled = true;
    zone.hint.setVisible(false);
    if (instant) { chip.x = zone.x; chip.y = zone.y; }
    else this.tweens.add({ targets: chip, x: zone.x, y: zone.y, duration: 200, ease: 'Back.Out' });
    if (!instant) this.persistZoneFill(zoneKey);
    this.recompute();
  }

  // บันทึกลง GameState ทันทีที่ลากถูก ให้สลับไปหน้าคำนวณภาษีแล้วย้อนกลับมา (หรือสลับหน้าเกมไปมา) ข้อมูลไม่หาย
  persistZoneFill(zoneKey) {
    if (!this.savedState.filledZoneKeys.includes(zoneKey)) {
      this.savedState.filledZoneKeys.push(zoneKey);
    }
  }

  // คืนสถานะที่ผู้เล่นลากไว้แล้วจากรอบก่อน วางชิปเข้าที่ทันทีแบบไม่มีอนิเมชัน (incomeChip ก็อยู่ใน this.chips อยู่แล้วเพราะสร้างผ่าน makeChip เหมือนกัน)
  // ป้องกันกรณีเงินได้สุทธิเปลี่ยนไปจากรอบก่อน (เช่นย้อนกลับไปแก้ค่าลดหย่อนที่หน้าคำนวณภาษี) แล้วขั้นที่เคยลากไว้ไม่มีอยู่แล้วในตารางรอบนี้
  restoreSavedState() {
    for (const zoneKey of this.savedState.filledZoneKeys) {
      const zone = this.dropZones[zoneKey];
      const chip = this.chips.find((c) => c.targetZoneKey === zoneKey);
      if (zone && chip) this.snapChipToZone(chip, zoneKey, true);
    }
  }

  bounceBack(chip) {
    chip.setDepth(10);
    this.tweens.add({ targets: chip, x: chip.homeX, y: chip.homeY, duration: 250, ease: 'Back.Out' });
  }

  // ---------- เปิดเผยภาษีแต่ละขั้น + ภาษีรวม เมื่อช่อง "เงินในช่วงN" ของขั้นนั้นถูกลากครบ ----------
  recompute() {
    let total = 0;
    let allFilled = true;
    for (let i = 1; i < this.rows.length; i++) {
      const zone = this.dropZones[`amountBox${i}`];
      const auto = this.autoTexts[`tax${i}`];
      if (!zone || !auto) continue; // เงินได้สุทธิไปไม่ถึงขั้นนี้ ไม่มีช่องให้ลาก ข้ามไปเลย ไม่นับเป็นภาษีที่ต้องรอ
      if (zone.filled) {
        auto.text.setText(fmt(auto.value)).setColor(COLOR_KNOWN);
        total += auto.value;
      } else {
        auto.text.setText('[คำนวณอัตโนมัติ]').setColor(COLOR_HINT);
        allFilled = false;
      }
    }
    if (allFilled) {
      this.totalText.setText(fmt(total)).setColor(COLOR_KNOWN);
    } else {
      this.totalText.setText('[คำนวณอัตโนมัติ]').setColor(COLOR_HINT);
    }
  }
}
