// domain/items/ItemTypes.js
// นิยามไอเทมที่เก็บได้ในฉาก Runner — ใช้ร่วมกันทั้งตอน spawn (RunnerScene) และตอนสรุปผล (SummaryScene)
// amount บวก = เพิ่มเงินในเกม, ลบ = หักเงินในเกม
// intervalSec = ความถี่ในการ spawn ไอเทมชนิดนี้ (วินาที)
// staminaType/staminaRefill = หลอด stamina ที่ไอเทมนี้เติมให้เมื่อเก็บ (ถ้ามี)
// เวอร์ชันเดโม: intervalSec ทุกตัวคูณด้วย 0.25 (= 15 วิ/60 วิ) ให้ความหนาแน่นของไอเทมต่อสัดส่วนเวลาเท่าเกมต้นฉบับ ถึงรอบจะสั้นลง
export const ITEM_TYPES = {
  // ออกเป็นขบวน 3-5 เหรียญต่อครั้งแทนออกทีละเหรียญ (ดู RunnerScene.spawnCoinTrail)
  // เดโม: ย่อ interval ต้นฉบับ 1.3 วิ x0.25 = 0.325 วิ ให้ความถี่สัมพัทธ์เท่าเดิม
  coin: {
    textureKey: 'item_coin',
    amount: 50,
    kind: 'income',
    label: 'รายได้ (เหรียญ)',
    intervalSec: 0.325,
  },
  // เดโม: ย่อ interval ต้นฉบับ 3 วิ x0.25 = 0.75 วิ
  food: {
    textureKey: 'item_food',
    amount: -120,
    kind: 'expense',
    label: 'ค่าอาหาร',
    intervalSec: 0.75,
    staminaType: 'food',
    staminaRefill: 5,
  },
  // เดโม: ย่อ interval ต้นฉบับ 8 วิ x0.25 = 2 วิ
  milk: {
    textureKey: 'item_milk',
    amount: -600,
    kind: 'expense',
    label: 'ค่าเลี้ยงดูลูก (ขวดนม)',
    intervalSec: 2,
    staminaType: 'milk',
    staminaRefill: 12,
  },
  // ยังไม่มีรูปจริงที่ยืนยันได้ (ไฟล์ที่ได้รับมาเปิดไม่ขึ้นเป็นภาพที่ถูกต้อง) -> ไม่ตั้ง textureKey ไว้
  // spawnItemAt จะ fallback เป็นวงกลม placeholder แทนถ้าไม่มี textureKey
  lottery: {
    kind: 'lottery',
    label: 'ลอตเตอรี่',
    rewardOptions: [-100, 300, 500, 1000, 1500], // สุ่มเลือก 1 ค่าตอนเก็บ
    spawnOnce: true, // ต่างจากไอเทมอื่น: มินิเกมละ 1 ชิ้นเท่านั้น ไม่ spawn ซ้ำ
  },
  // ไม่ใช่ไอเทมที่เก็บในฉาก แค่ใช้ label ตอน log ตอนหลอดเวลาเพิ่มขึ้น 1 เดือน (RunnerScene) จะได้โชว์ในหน้าสรุป/คำนวณภาษีสม่ำเสมอกับไอเทมอื่น
  salary: {
    amount: 20000,
    kind: 'income',
    label: 'เงินเดือน (ครบเดือน)',
  },
  // ยาปรับความเร็ว: ไม่มีผลต่อเงิน/ภาษี เลย "kind: speed" แยกต่างหาก - onCollectItem จะไม่บันทึกลง GameState.itemLog
  // สปอว์นเป็นคู่สลับกันจากตัวจับเวลาเดียว (ดู RunnerScene.buildSpeedPotionSpawner) ไม่ได้ใช้ intervalSec ตรงนี้
  speedBoost: {
    textureKey: 'item_speed_boost',
    kind: 'speed',
    label: 'ยาสปีด (เขียว) วิ่งเร็วขึ้น x2 ชั่วคราว',
    speedMultiplier: 2,
    effectDurationSec: 4,
  },
  speedSlow: {
    textureKey: 'item_speed_slow',
    kind: 'speed',
    label: 'ยาหน่วง (แดง) วิ่งช้าลงครึ่งหนึ่งชั่วคราว',
    speedMultiplier: 0.5,
    effectDurationSec: 4,
  },
  // กองทุน: เก็บได้แค่ครั้งเดียวต่อรอบวิ่ง (เก็บแล้วหยุดสุ่มออกเลย ดู RunnerScene.singleCollectFlags) หักเงินทันทีครั้งเดียวตอนเก็บ
  // (เดิมหักซ้ำ 12000/เดือน ตลอดรอบที่เหลือ = 12 เดือน x 12000 = 144000 พอดี เปลี่ยนเป็นหักก้อนเดียวตอนเก็บแทนให้ง่ายขึ้น)
  // ไอคอนจะค้างแสดงข้างเงินรวมมุมขวาบนตลอดตั้งแต่เก็บได้จนจบเกม (ดู RunnerScene.persistentBadges)
  fund: {
    textureKey: 'item_fund',
    amount: -144000,
    kind: 'expense',
    label: 'กองทุนสำรองเลี้ยงชีพ (RMF)',
    // intervalSec ถูกเซ็ตด้านล่างไฟล์ (= SPEED_POTION_INTERVAL_SEC) เพราะ const นั้นยังไม่ถูกประกาศตรงนี้
    stopAfterCollect: true,
    persistIcon: true,
  },
  // ประกันสุขภาพ: หลักการเดียวกับกองทุนทุกอย่าง (เก็บได้ครั้งเดียว/ค้างไอคอน/หักเงินทันทีตอนเก็บ) ต่างแค่จำนวนเงิน
  insurance: {
    textureKey: 'item_insurance',
    amount: -25000,
    kind: 'expense',
    label: 'ประกันสุขภาพ',
    stopAfterCollect: true,
    persistIcon: true,
  },
  // มรดก: สุ่มออกเรื่อยๆ ถี่กว่า x2 นิดหน่อยแต่น้อยกว่าอาหาร (ดู INHERITANCE_INTERVAL_SEC) เก็บได้ครั้งเดียวแล้วหยุดสุ่มออกเหมือนกองทุน/ประกัน
  // แต่ไม่มีไอคอนค้าง (ไม่ตั้ง persistIcon) เพราะเก็บครั้งเดียวจบ ไม่มีผลต่อเนื่องแบบกองทุน/ประกัน
  inheritance: {
    textureKey: 'item_inheritance',
    amount: 1000000,
    kind: 'income',
    label: 'มรดก',
    stopAfterCollect: true,
  },
};

// ไอเทมคู่ยาปรับความเร็ว: สุ่มถ่วงน้ำหนักเท่ากันทั้งสองสี (เดิมให้แดงออกมากกว่า แต่ทำให้เขียวแทบไม่ออกเลย เลยปรับกลับเป็นเท่ากัน)
export const SPEED_POTION_WEIGHTS = { speedSlow: 1, speedBoost: 1 };
export const SPEED_POTION_INTERVAL_SEC = 3.5; // เดโม: ย่อจากต้นฉบับ 14 วิ x0.25
export const INHERITANCE_INTERVAL_SEC = 3; // เดโม: ย่อจากต้นฉบับ 12 วิ x0.25

// กองทุน/ประกัน/มรดก เก็บได้ครั้งเดียวแล้วหยุดสุ่มออก และกันไม่ให้ 2 ใน 3 ชนิดนี้ออกพร้อมกันในหลอดเวลาช่องเดียวกัน (ดู RunnerScene.trySpawnSpecialItem)
export const SPECIAL_ITEM_TYPES = ['fund', 'insurance', 'inheritance'];

// กองทุน/ประกัน ใช้ความถี่ spawn เท่ากับไอเทม x2 ตามที่กำหนด (คนละตัวจับเวลากันเอง ไม่ได้ใช้ pool เดียวกับ x2)
ITEM_TYPES.fund.intervalSec = SPEED_POTION_INTERVAL_SEC;
ITEM_TYPES.insurance.intervalSec = SPEED_POTION_INTERVAL_SEC;
ITEM_TYPES.inheritance.intervalSec = INHERITANCE_INTERVAL_SEC;

// อัตราหลอด stamina ไหลลงต่อวินาที (% ต่อวิ)
export const STAMINA_DRAIN_RATE = {
  food: 2.0,
  milk: 1.0,
};
