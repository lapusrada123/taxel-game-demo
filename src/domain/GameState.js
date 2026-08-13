// domain/GameState.js
// สถานะเกมกลาง (pure JS ไม่พึ่ง Phaser) — ส่งต่อระหว่าง scene ได้
// Phase 0 ใช้เก็บแค่ตัวละครที่เลือก ภายหลังจะเก็บเงิน/ไอเทม/ลดหย่อน ฯลฯ

class GameStateClass {
  constructor() {
    this.reset();
  }

  reset() {
    /** @type {'boy'|'girl'} */
    this.character = 'boy';
    this.playerName = '';
    /** @type {'90'|'91'} แบบภาษีที่เลือก - ภ.ง.ด. 91 (เงินเดือนอย่างเดียว) ตรงกับเนื้อหาที่มีตอนนี้ */
    this.taxForm = '91';
    // เงินสดสะสมระหว่างเล่น (เหรียญ +, รายจ่าย -) + log ไอเทมที่เก็บ (ไว้โชว์สรุปตอนจบ)
    this.money = 0;
    this.itemLog = [];
    // มีลูกหรือไม่ -> คุมว่าหลอด stamina ขวดนมทำงานไหม
    // Quick Mode ยังไม่มีหน้าเลือกมีลูก เลย default false ไว้ก่อน
    this.hasChild = false;
    this.foodStamina = 100;
    this.milkStamina = 100;
    // สถานะที่ผู้เล่นลากไว้ในหน้าคำนวณภาษี/หน้าอัตราภาษี ต้องคงอยู่ตอนสลับหน้าไป-กลับ (ดู clearTaxWorksheets)
    this.taxCalcState = null;
    this.taxBracketState = null;
  }

  // เริ่มรอบเล่นใหม่ (คงตัวละครที่เลือกไว้ ล้างแค่ของที่เก็บสะสม)
  startNewRun() {
    this.money = 0;
    this.itemLog = [];
    this.foodStamina = 100;
    this.milkStamina = 100;
    this.clearTaxWorksheets();
  }

  // ล้างสถานะกระดาษทดคำนวณภาษี/ตารางอัตราภาษี - เรียกตอนเริ่มรอบใหม่ หรือกดออกจากมินิเกมกลางคัน
  clearTaxWorksheets() {
    this.taxCalcState = null;
    this.taxBracketState = null;
  }

  collectItem(type, amount) {
    this.money += amount;
    this.itemLog.push({ type, amount });
  }

  adjustFoodStamina(delta) {
    this.foodStamina = Math.min(100, Math.max(0, this.foodStamina + delta));
  }

  adjustMilkStamina(delta) {
    this.milkStamina = Math.min(100, Math.max(0, this.milkStamina + delta));
  }
}

// singleton ใช้ร่วมทั้งเกม
export const GameState = new GameStateClass();
