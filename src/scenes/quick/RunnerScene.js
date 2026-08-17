// scenes/quick/RunnerScene.js
// วิ่งอัตโนมัติแบบ Cookie Run — ตัวละครวิ่งเองตลอด ผู้เล่นคุมแค่ "กระโดด" (รองรับดับเบิ้ลจั้มเพื่อเลือกเก็บ/หลบไอเทม)
// เวอร์ชันเดโมพรีเซนต์: ย่อรอบให้สั้นลงเหลือ 3 เดือน (เดือนละ 5 วิ = 15 วิรวม) จากต้นฉบับ 12 เดือน (60 วิ)
// จบรอบด้วยหลอดเวลา ไม่ใช่เส้นชัยตามระยะทางอีกต่อไป
// หลอดอาหารเป็นระบบ stamina เดิม (ไหลลง + เก็บไอเทมอาหารเติม + จบเกมถ้าหมด) ไม่เกี่ยวกับหลอดเวลา
import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y } from '../../config/gameConfig.js';
import { GameState } from '../../domain/GameState.js';
import { ITEM_TYPES, STAMINA_DRAIN_RATE, SPEED_POTION_WEIGHTS, SPEED_POTION_INTERVAL_SEC, SPECIAL_ITEM_TYPES } from '../../domain/items/ItemTypes.js';
import { makeButton } from '../ui/makeButton.js';
import { HandGestureController } from '../../systems/HandGestureController.js';

// ไอเทมที่ต้องถามผู้เล่นก่อนว่า "ซื้อ" หรือ "ไม่ซื้อ" ตอนเก็บได้ (ดู showPurchaseDecisionPopup) - มรดกไม่ต้องถาม เป็นรายได้ล้วนๆ
const PURCHASE_DECISION_TYPES = ['fund', 'insurance'];

// เนื้อหาป๊อปอัพถามซื้อของแต่ละไอเทม: แต่ละบรรทัดคือ array ของ span {text, color} เรียงต่อกันซ้ายไปขวา
// ไม่ใส่ color = ดำ/ตัวปกติ, ใส่ color = เน้นสี/ตัวหนา (ดู showPurchaseDecisionPopup)
const PURCHASE_POPUP_CONFIG = {
  insurance: {
    bgColor: 0xa1e3e6,
    heading: 'ซื้อประกันสุขภาพตนเอง',
    lines: [
      [{ text: 'ทำไมต้องซื้อ?' }],
      [{ text: '1) ได้รับสวัสดิการคุ้มครองความเจ็บป่วย รองรับค่ารักษาพยาบาล' }],
      [{ text: '2) ค่าเบี้ยประกันสุขภาพรายปี ' }, { text: '-25,000 บาท', color: '#e03131' }],
      [{ text: 'ลดหย่อนภาษีได้สูงสุดถึง ' }, { text: '25,000 บาท !!', color: '#2f9e44' }],
    ],
  },
  fund: {
    bgColor: 0xe6e5a1,
    heading: 'ซื้อกองทุนรวมเพื่อการเลี้ยงชีพ RMF',
    lines: [
      [{ text: 'หากคุณกำลังวางแผนการเงินระยะยาวสำหรับใช้ในวัยเกษียณ' }],
      [{ text: 'และรับสิทธิประโยชน์ทางภาษี.. ' }, { text: 'กองทุน RMF คือคำตอบ !', color: '#2f9e44' }],
      [
        { text: 'โดยคุณจะได้รับการลดหย่อนภาษี ' },
        { text: 'เป็น 30% ของรายได้ต่อปี', color: '#1864ab' },
        { text: ' ' },
        { text: '(ลดหย่อนสูงสุด 500,000 บาท)', color: '#e03131' },
      ],
      [{ text: 'ลงทุนเลย! แนะนำ ' }, { text: '14,400 บาทต่อปี !!', color: '#e03131' }],
    ],
  },
};

const RUN_START_X = 160;
const AUTO_SPEED = 350; // px/วิ คงที่ (เดิมคำนวณจากระยะทาง/เวลา ตอนนี้จบด้วยเวลาล้วนๆ เลยตรึงค่าคงที่ไว้)
const TIME_SEGMENT_SEC = 5; // หลอดเวลาเพิ่ม 1 ส่วนทุกๆ 5 วิ
const TOTAL_MONTHS = 3; // เดโม: ย่อจาก 12 เดือนเหลือ 3 เดือน สำหรับพรีเซนต์ที่ต้องรันเวลา
const SALARY_AMOUNT = 40000; // เงินเดือนที่ได้ทุกครั้งที่หลอดเวลาเพิ่มขึ้น 1 ส่วน (1 เดือน) (เดิม 20000)
const RUN_DURATION_SEC = TIME_SEGMENT_SEC * TOTAL_MONTHS; // 15 วิ (เดโม)
const FINAL_STRETCH_SEC = 4; // ช่วงวิ่งผ่านฉากกรมสรรพากร (ฉากสุดท้าย) หลังหลอดเวลาครบ ก่อนจบเกมจริง (เดโม: ย่อจาก 6 วิ)
const TOTAL_RUN_SEC = RUN_DURATION_SEC + FINAL_STRETCH_SEC;
// เผื่อระยะทางเป็น 2 เท่าของระยะทางปกติ กันกรณีผู้เล่นโดนไอเทม "ยาสปีด x2" ต่อเนื่องยาวๆ จนวิ่งเร็วกว่าที่คำนวณไว้ (ความเร็วสูงสุดที่เป็นไปได้คือ x2)
const WORLD_WIDTH = Math.ceil(RUN_START_X + AUTO_SPEED * TOTAL_RUN_SEC * 2) + 300;
const JUMP_SPEED = 620;
const MAX_JUMPS = 2; // เดี่ยว + ดับเบิ้ลจั้ม
const PLAYER_DISPLAY_H = 140; // ความสูงตัวละครบนจอ (px)

// ตัวละครอยู่ค่อนไปทางซ้ายของจอ (ไม่ใช่กึ่งกลาง) ให้เห็นไอเทมที่กำลังไหลเข้ามาได้ไกลขึ้น
const CAMERA_OFFSET_X = -220;

// ระดับความสูงที่ไอเทมสุ่มปรากฏ: พื้น (วิ่งชนเอง) / กลาง (กระโดดครั้งเดียวถึง) / สูง (ต้องดับเบิ้ลจั้มเท่านั้น)
const ITEM_HEIGHTS = [GROUND_Y - 60, GROUND_Y - 180, GROUND_Y - 360];

const MONTH_LABELS = ['JAN', 'FEB', 'MAR']; // เดโม: เหลือแค่ 3 เดือนตาม TOTAL_MONTHS

// พื้นหลัง Runner เป็นอนิเมชัน 2 เฟรมสลับกัน (bg_runner_main เดิมเก็บไว้เฉยๆ ไม่ได้ใช้แสดงผลแล้ว) วนลูปไปเรื่อยๆ
// จนกว่าหลอดเวลาจะครบ 12 ส่วน แล้วสลับเป็นภาพกรมสรรพากรเป็นฉากสุดท้ายก่อนจบเกม (ดู showFinalBackground)
const BG_ANIM_FRAMES = ['bg_runner_anim_1', 'bg_runner_anim_2'];
const BG_ANIM_FRAME_MS = 500; // ความเร็วสลับเฟรม ตรงกับจังหวะเดิมของไฟล์ GIF ต้นฉบับ (เฟรมละ 500ms)
const FINAL_BG_KEY = 'bg_revenue_dept';

// กันไอเทมสปอว์นทับกัน: ระยะห่างขั้นต่ำระหว่างไอเทมชิ้นล่าสุด (ไม่ว่าชนิดไหน) กับชิ้นใหม่
const MIN_ITEM_SPACING_X = 90;

export class RunnerScene extends Phaser.Scene {
  constructor() {
    super('Runner');
  }

  create() {
    // --- ขอบเขตโลก ---
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);

    // --- พื้นหลังแบบ tile เลื่อนตามกล้อง (อนิเมชัน 2 เฟรมสลับกัน วนลูปตลอดทั้งรอบ) ---
    const bgTex = this.textures.get(BG_ANIM_FRAMES[0]).getSourceImage();
    const bgScale = GAME_HEIGHT / bgTex.height;
    this.bg = this.add.tileSprite(0, 0, WORLD_WIDTH, GAME_HEIGHT, BG_ANIM_FRAMES[0])
      .setOrigin(0, 0)
      .setTileScale(bgScale, bgScale);
    this.bg.setScrollFactor(0.4); // parallax เล็กน้อย
    this.bgAnimFrameIndex = 0;
    this.bgAnimElapsedMs = 0;

    // --- พื้นดิน (physics body มองไม่เห็น) ---
    this.ground = this.physics.add.staticImage(WORLD_WIDTH / 2, GROUND_Y + 40, undefined);
    this.ground.setVisible(false);
    this.ground.body.setSize(WORLD_WIDTH, 80).updateCenter();

    // --- ตัวละคร (sprite + animation) ---
    this.player = this.physics.add.sprite(RUN_START_X, GROUND_Y - 100, GameState.character, 0);
    this.baseScale = PLAYER_DISPLAY_H / this.player.height;
    this.player.setScale(this.baseScale);
    this.player.setCollideWorldBounds(true);
    // ตั้งขนาดกล่องชนให้แคบกว่าภาพ (ภาพมีที่ว่างรอบตัว)
    const bodyW = this.player.width * 0.32;
    const bodyH = this.player.height * 0.82;
    this.player.body.setSize(bodyW, bodyH);
    this.player.body.setOffset((this.player.width - bodyW) / 2, this.player.height - bodyH);
    this.player.setDepth(10);

    this.physics.add.collider(this.player, this.ground);

    this.items = [];
    this.finished = false;
    this.jumpsUsed = 0;
    this.elapsedMs = 0;
    this.lastItemSpawnX = -Infinity; // กันไอเทมสปอว์นทับกัน (ดู spawnItem)
    this.finalBgShown = false; // สลับเป็นภาพกรมสรรพากรแล้วหรือยัง (ดู showFinalBackground)
    this.speedMultiplier = 1; // ปรับชั่วคราวตอนเก็บไอเทมยาสปีด/ยาหน่วง (ดู applySpeedEffect)
    this.speedTrail = null; // เอฟเฟคลายวิ่งเร็วติดหลังตัวละคร (ดู showSpeedTrail/hideSpeedTrail)
    this.dizzyEffect = null; // เอฟเฟคดาวมึนหมุนบนหัวตอนโดนยาหน่วง (ดู showDizzyEffect/hideDizzyEffect)
    this.singleCollectFlags = {}; // ไอเทมที่เก็บได้ครั้งเดียวแล้วหยุดสุ่มออก (กองทุน/ประกัน/มรดก) - ดู spawnItem/onCollectItem
    this.pendingSpecialSpawns = []; // กองทุน/ประกัน/มรดก ที่โดนเลื่อนคิวเพราะชนกับชนิดอื่นในหลอดเวลาช่องเดียวกัน (ดู trySpawnSpecialItem)
    this.lastSpecialSpawnSegment = -1; // ช่องหลอดเวลาล่าสุดที่มีไอเทมกลุ่มนี้ออกไปแล้ว
    this.lastCheckedSegment = -1; // ใช้ตรวจจับตอนเปลี่ยนช่องหลอดเวลาใน update() เพื่อปล่อยคิวที่ค้างไว้
    this.decisionPopupActive = false; // หยุดโลกทั้งหมดชั่วคราวตอนถามซื้อ/ไม่ซื้อ (ดู showPurchaseDecisionPopup)

    // ระบบควบคุมด้วยท่ามือผ่านกล้อง (แบมือ=วิ่ง, กำมือ=กระโดด, ไม่เจอมือ=หยุด) เริ่มขอกล้อง+โหลดโมเดลไว้ตั้งแต่ต้น
    // ให้มีเวลาพร้อมก่อนผู้เล่นกดข้ามป๊อปอัพ ถ้าล้มเหลว (ไม่มีกล้อง/ไม่อนุญาต) จะ fallback ไปคีย์บอร์ด/ปุ่มบนจอแบบเดิมอัตโนมัติ (ดู update())
    this.handController = new HandGestureController();
    this.handController.start();
    this.lastGesture = 'none';

    // แสดงป๊อปอัพอธิบายไอเทมก่อน ผู้เล่นกดต่อแล้วค่อยเริ่มวิ่งจริง
    this.introActive = true;
    this.player.setFrame(0); // ยืนนิ่งรอ
    this.buildItemIntroPopup(() => {
      this.introActive = false;
      this.startGameplay();
    });
  }

  startGameplay() {
    // --- ไอเทมเก็บได้: สปอว์นจากขอบขวาจอไปเรื่อยๆ ตามช่วงเวลาของแต่ละชนิด ---
    this.buildSpawners();
    this.physics.add.overlap(this.player, this.items, this.onCollectItem, null, this);

    // --- กล้องตามตัวละคร (offset ให้ตัวละครอยู่ค่อนซ้าย เห็นพื้นที่ข้างหน้าเยอะกว่า) ---
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, GAME_HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.1, 0.1, CAMERA_OFFSET_X, 0);

    this.setupInput();
    this.buildHud();
    this.refreshStats();

    // วิ่งอัตโนมัติตั้งแต่เริ่มฉาก ไม่ต้องรอ input
    this.player.play(`${GameState.character}_walk`);

    // เสียงวิ่งวนลูปตลอดตอนตัวละครอยู่กับพื้น (หยุดตอนลอยตัว/กระโดด ดู update())
    this.runSound = this.sound.add('sfx_run', { loop: true, volume: 0.55 });
    this.runSound.play();
    this.wasOnGround = true;

    // เพลงประกอบมินิเกม วนลูปตั้งแต่เริ่มวิ่งจริง จนกว่าจะจบมินิเกม (ดู finishRun/gameOver) - ไม่เล่นตั้งแต่หน้าเมนูหลัก
    this.bgm = this.sound.add('bgm_minigame', { loop: true, volume: 0.65 });
    this.bgm.play();
  }

  // ---------- INPUT ----------
  // วิ่งอัตโนมัติแบบ Cookie Run: ผู้เล่นคุมได้แค่ "กระโดด" (คีย์บอร์ด + ปุ่มบนจอ) รองรับดับเบิ้ลจั้ม
  setupInput() {
    const kb = this.input.keyboard;
    this.keys = kb.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      w: Phaser.Input.Keyboard.KeyCodes.W,
      space: Phaser.Input.Keyboard.KeyCodes.SPACE,
    });

    this.buildTouchButtons();
  }

  buildTouchButtons() {
    this.touchJumpQueued = false; // edge-trigger: กดหนึ่งครั้ง = จั้มหนึ่งครั้ง (ไม่ค้างยิงทุกเฟรม)

    const baseSize = 110;
    const btn = this.add.image(GAME_WIDTH - 90, GAME_HEIGHT - 90, 'btn_jump')
      .setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
    const baseScale = baseSize / Math.max(btn.width, btn.height);
    btn.setScale(baseScale);

    btn.on('pointerdown', () => {
      this.touchJumpQueued = true;
      btn.setScale(baseScale * 0.9);
    });
    btn.on('pointerup', () => btn.setScale(baseScale));
    btn.on('pointerout', () => btn.setScale(baseScale));
  }

  buildHud() {
    this.add.text(GAME_WIDTH / 2, 30, 'Space / W', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '16px',
      color: '#ffffff', backgroundColor: '#00000066', padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(100);

    const back = this.add.text(20, 20, '‹ เมนู', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px',
      color: '#ffcc33', backgroundColor: '#00000066', padding: { x: 10, y: 6 },
    }).setScrollFactor(0).setDepth(100).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => {
      // ออกจากมินิเกมกลางคันด้วยมือ ต้องหยุดเพลง/เสียงวิ่งทันที ไม่ใช่รอ finishRun/gameOver
      this.runSound.stop();
      this.bgm.stop();
      this.finished = true;
      this.handController.stop(); // ปิดกล้องด้วย ไม่งั้นไฟกล้องจะค้างเปิดอยู่หลังออกจากมินิเกม
      GameState.clearTaxWorksheets(); // ออกจากมินิเกมแล้ว ล้างข้อมูลกระดาษทดคำนวณภาษี/ตารางอัตราภาษีที่ค้างไว้
      this.scene.start('Menu');
    });

    // สถานะท่ามือสดๆ ระหว่างเล่น (ให้ผู้พรีเซนต์เห็นว่าระบบอ่านท่าไหนอยู่) อัปเดตทุกเฟรมใน update()
    this.handStatusHudText = this.add.text(20, 55, '', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '14px',
      color: '#ffffff', backgroundColor: '#00000066', padding: { x: 8, y: 4 },
    }).setScrollFactor(0).setDepth(100);

    this.statsText = this.add.text(GAME_WIDTH - 20, 20, '', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', align: 'right', fontStyle: 'bold',
      color: '#ffffff', backgroundColor: '#00000066', padding: { x: 10, y: 6 },
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(100);

    // ไอคอนค้าง (กองทุน/ประกัน) โผล่ข้างเงินรวมทันทีที่เก็บได้ ค้างจนจบเกม (ดู onCollectItem/layoutPersistentBadges)
    this.persistentBadges = {};
    for (const type of ['fund', 'insurance']) {
      const img = this.add.image(0, 0, ITEM_TYPES[type].textureKey)
        .setScrollFactor(0).setDepth(100).setVisible(false);
      img.setScale(28 / Math.max(img.width, img.height));
      this.persistentBadges[type] = img;
    }

    // วางหลอดเวลา/หลอดอาหารด้วย cursorY ไล่ลงมาเป็นแถวๆ กันไม่ให้ label ทับกับหลอด
    let y = 95;
    y = this.addBarLabel(y, 'หลอดเวลา (3 เดือน)');
    this.timeBar = this.buildTimeBar(20, y);
    y += 28 + 26; // ความสูงหลอดเวลา + ช่องว่างก่อนแถวถัดไป

    y = this.addBarLabel(y, 'หลอดอาหาร');
    this.foodBar = this.buildStaminaBar(20, y);
    y += 22 + 26;

    // หลอดนมมีเงื่อนไข "เลือกมีลูก" ซึ่ง Quick Mode ยังไม่มีหน้าเลือก เลยซ่อนไว้ก่อนถ้า hasChild = false
    if (GameState.hasChild) {
      y = this.addBarLabel(y, 'หลอดนม');
      this.milkBar = this.buildStaminaBar(20, y);
    } else {
      this.milkBar = null;
    }
  }

  addBarLabel(y, label) {
    const txt = this.add.text(20, y, label, {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
    }).setScrollFactor(0).setDepth(100);
    return y + txt.height + 8; // คืนค่า y ถัดไป (จุดเริ่มของตัวหลอด) เว้นช่องว่างจากข้อความพอดี
  }

  // หลอดเวลา 12 ช่อง แต่ละช่องมีตัวย่อเดือนกำกับ ไล่ติดสีทีละช่องทุก 10 วิ
  // x,y ที่รับเข้ามาคือมุมบนซ้ายของแถวหลอด (มุมของ cell แรก ไม่ใช่จุดกึ่งกลาง)
  buildTimeBar(x, yTop) {
    const cellW = 32;
    const cellH = 28;
    const gap = 2;
    const y = yTop + cellH / 2;

    const cells = MONTH_LABELS.map((label, i) => {
      const cx = x + i * (cellW + gap);
      const rect = this.add.rectangle(cx, y, cellW, cellH, 0x000000, 0.45)
        .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0xffffff, 0.6);
      const text = this.add.text(cx + cellW / 2, y, label, {
        fontFamily: "'SOVBokThang', monospace", fontSize: '11px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(101);
      return { rect, text };
    });

    return { cells, monthsShown: -1 };
  }

  updateTimeBar(monthsCompleted) {
    const prevShown = this.timeBar.monthsShown;
    if (prevShown === monthsCompleted) return; // อัปเดตเฉพาะตอนค่าจริงเปลี่ยน กันวาดซ้ำทุกเฟรม
    this.timeBar.monthsShown = monthsCompleted;
    this.timeBar.cells.forEach((cell, i) => {
      const done = i < monthsCompleted;
      cell.rect.setFillStyle(done ? 0xffcc33 : 0x000000, done ? 1 : 0.45);
      cell.text.setColor(done ? '#1a1a2e' : '#ffffff');
    });

    // ทุกครั้งที่หลอดเวลาเพิ่มขึ้น 1 ส่วน (ครบ 1 เดือน) จ่ายเงินเดือนอัตโนมัติ
    // prevShown เริ่มที่ -1 (ค่าตั้งต้นก่อนวิ่งจริง) จึงกันไว้ไม่ให้จ่ายตอน initialize ครั้งแรก
    if (prevShown >= 0) {
      const newlyCompleted = monthsCompleted - prevShown;
      for (let i = 0; i < newlyCompleted; i++) {
        GameState.collectItem('salary', SALARY_AMOUNT);
      }
      this.popFeedback(this.player.x, this.player.y - 70, { amount: SALARY_AMOUNT * newlyCompleted });
      this.refreshStats();
    }
  }

  // x,yTop ที่รับเข้ามาคือมุมบนซ้ายของหลอด (yTop, ไม่ใช่จุดกึ่งกลาง) ให้สอดคล้องกับ buildTimeBar
  buildStaminaBar(x, yTop) {
    const width = 260;
    const height = 22;
    const y = yTop + height / 2;
    this.add.rectangle(x, y, width, height, 0x000000, 0.5)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(100).setStrokeStyle(1, 0xffffff, 0.5);
    const fill = this.add.rectangle(x + 2, y, width - 4, height - 4, 0x4ade80, 1)
      .setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    return { fill, maxWidth: width - 4 };
  }

  // ---------- INTRO POPUP ----------
  // ป๊อปอัพก่อนเริ่มมินิเกม (เดิมมีคำอธิบายไอเทม เอาออกแล้วตามที่สั่ง เหลือแค่โครง เผื่อใส่เนื้อหาอื่นทีหลัง)
  // กดปุ่ม next แล้วป๊อปอัพหายไปเริ่มวิ่งทันที
  buildItemIntroPopup(onDismiss) {
    const cx = GAME_WIDTH / 2;
    const boxWidth = 820;

    const dim = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setDepth(200);

    const children = [];
    let cursorY = 28;
    const textPadding = 50; // ระยะขอบซ้าย-ขวาของเนื้อหาข้อความในกล่อง

    const heading = this.add.text(0, cursorY, 'กติกา', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '30px', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    children.push(heading);
    cursorY += heading.height + 20;

    const rules = [
      '1. วิ่งหรือกระโดดเก็บเหรียญเพื่อสะสมเงิน',
      '2. เพิ่มหลอดอาหารด้วยการเก็บไอเทมอาหาร',
      '3. เมื่อวิ่งจนครบ 3 เดือน ผู้เล่นจะต้องคำนวณภาษีให้ถูกต้อง',
      '4. ควบคุมด้วยท่ามือผ่านกล้อง: แบมือ = วิ่ง, กำมือ = กระโดด, ไม่แบ/ไม่กำ = หยุด (ใช้ปุ่มกระโดดบนจอ/คีย์บอร์ดแทนได้เสมอ)',
    ];
    for (const rule of rules) {
      const ruleText = this.add.text(-boxWidth / 2 + textPadding, cursorY, rule, {
        fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color: '#000000',
        wordWrap: { width: boxWidth - textPadding * 2 },
      }).setOrigin(0, 0);
      children.push(ruleText);
      cursorY += ruleText.height + 14;
    }

    // สถานะกล้อง/ระบบจับท่ามือ อัปเดตสดๆ ระหว่างรอ (เช็คทุก 300ms) ให้ผู้พรีเซนต์รู้ว่าพร้อมหรือยังก่อนกดเริ่ม
    const handStatusText = this.add.text(-boxWidth / 2 + textPadding, cursorY, 'กำลังเปิดกล้อง...', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '16px', color: '#555555', fontStyle: 'italic',
      wordWrap: { width: boxWidth - textPadding * 2 },
    }).setOrigin(0, 0);
    children.push(handStatusText);
    cursorY += handStatusText.height + 6;

    const handStatusTimer = this.time.addEvent({
      delay: 300, loop: true, callback: () => {
        if (this.handController.ready) {
          handStatusText.setText('กล้องพร้อมแล้ว! ลองแบมือ/กำมือดูหน้ากล้องได้เลย').setColor('#2f9e44');
        } else if (this.handController.error) {
          handStatusText.setText('เปิดกล้องไม่สำเร็จ (ใช้ปุ่มกระโดด/คีย์บอร์ดแทนได้ปกติ)').setColor('#e03131');
        } else {
          handStatusText.setText('กำลังเปิดกล้อง...').setColor('#555555');
        }
      },
    });
    cursorY += 6;

    const buttonAreaHeight = 90;
    const boxHeight = cursorY + buttonAreaHeight;

    const box = this.add.graphics();
    box.fillStyle(0xffebcd, 1);
    box.fillRoundedRect(-boxWidth / 2, 0, boxWidth, boxHeight, 24);
    box.lineStyle(4, 0x000000, 1);
    box.strokeRoundedRect(-boxWidth / 2, 0, boxWidth, boxHeight, 24);

    const nextBtn = this.add.image(0, boxHeight - 55, 'btn_next').setInteractive({ useHandCursor: true });
    const btnSize = 88;
    nextBtn.setScale(btnSize / Math.max(nextBtn.width, nextBtn.height));

    const container = this.add.container(cx, (GAME_HEIGHT - boxHeight) / 2, [box, ...children, nextBtn]);
    container.setDepth(201);

    nextBtn.on('pointerdown', () => {
      handStatusTimer.remove();
      dim.destroy();
      container.destroy();
      onDismiss();
    });
  }

  // ---------- ITEMS ----------
  buildSpawners() {
    // ไอเทมแต่ละชนิดมีจังหวะ spawn เป็นของตัวเอง (ไม่ใช่ pool สุ่มร่วมแบบเดิม)
    // ขวดนม: ถ้าไม่ได้เลือกมีลูกไว้ ก็ไม่ต้องสปอว์นไอเทมนี้เลย
    for (const type of Object.keys(ITEM_TYPES)) {
      if (type === 'milk' && !GameState.hasChild) continue;
      if (type in SPEED_POTION_WEIGHTS) continue; // จัดการแยกเป็นคู่ถ่วงน้ำหนัก (ดู buildSpeedPotionSpawner)
      if (type === 'coin') continue; // เหรียญมีตัวจับเวลาพิเศษของตัวเอง ออกเป็นขบวนสั้นๆ (ดู buildCoinTrailSpawner)
      const def = ITEM_TYPES[type];

      if (SPECIAL_ITEM_TYPES.includes(type)) {
        // กองทุน/ประกัน/มรดก: กันไม่ให้ 2 ใน 3 ชนิดออกพร้อมกันในหลอดเวลาช่องเดียวกัน (ดู trySpawnSpecialItem)
        this.time.addEvent({ delay: def.intervalSec * 1000, loop: true, callback: () => this.trySpawnSpecialItem(type) });
        continue;
      }

      if (def.spawnOnce) {
        // มินิเกมละ 1 ชิ้นเท่านั้น (เช่นลอตเตอรี่) - สุ่มเวลาที่จะโผล่สักครั้งเดียวระหว่างรอบวิ่ง
        const delay = Phaser.Math.Between(3000, RUN_DURATION_SEC * 1000 - 2000);
        this.time.addEvent({ delay, loop: false, callback: () => this.spawnItem(type) });
      } else {
        this.time.addEvent({
          delay: def.intervalSec * 1000,
          loop: true,
          callback: () => this.spawnItem(type),
        });
      }
    }

    this.buildSpeedPotionSpawner();
    this.buildCoinTrailSpawner();
  }

  // เหรียญ: เพิ่มความถี่ให้ออกถี่กว่าไอเทมอื่นมาก และออกเป็นขบวนสั้นๆ ต่อครั้ง (ได้อารมณ์เกมวิ่งเก็บเหรียญแบบ Subway Surfers)
  // แต่ไม่ทำเต็มระบบตามเกมต้นแบบ (ไม่มีเลน/ไม่มีเหรียญโค้งเป็นเส้นทาง) แค่ยกความถี่ขึ้น + ให้ออกมาเป็นแถวสั้นๆ ต่อครั้ง
  buildCoinTrailSpawner() {
    const def = ITEM_TYPES.coin;
    this.time.addEvent({
      delay: def.intervalSec * 1000,
      loop: true,
      callback: () => this.spawnCoinTrail(),
    });
  }

  spawnCoinTrail() {
    if (this.finished || this.finalBgShown) return;
    const y = Phaser.Utils.Array.GetRandom(ITEM_HEIGHTS);
    const trailLen = Phaser.Math.Between(3, 5);
    const gap = 55;
    for (let i = 0; i < trailLen; i++) {
      const naturalX = this.cameras.main.scrollX + GAME_WIDTH + 60 + i * gap;
      const x = Math.max(naturalX, this.lastItemSpawnX + MIN_ITEM_SPACING_X);
      this.lastItemSpawnX = x;
      this.spawnItemAt(x, y, 'coin');
    }
  }

  // ตำแหน่งช่องหลอดเวลาปัจจุบัน (0-11) คำนวณจากเวลาที่ผ่านไปจริง ใช้กันไม่ให้กองทุน/ประกัน/มรดกออกซ้อนกันในช่องเดียวกัน
  currentTimeSegment() {
    return Math.floor(this.elapsedMs / 1000 / TIME_SEGMENT_SEC);
  }

  // กองทุน/ประกัน/มรดก: ถ้าช่องหลอดเวลานี้มีชนิดอื่นในกลุ่มเดียวกันออกไปแล้ว จะเลื่อนไปคิวช่องถัดไปแทน (ไม่ทิ้ง) ไม่ใช่ปล่อยออกซ้อนกัน
  trySpawnSpecialItem(type) {
    if (this.singleCollectFlags[type]) return; // เก็บไปแล้ว ไม่ต้องเข้าคิวอีก
    // กองทุน/ประกัน: ให้เก็บได้เฉพาะหลังผ่านไปสักพักเท่านั้น (segment 0 = เดือน 1) กันไม่ให้ออกมาเลยก่อนถึงเวลา ให้ผู้เล่นมีเวลาเก็บเงินก่อน
    // เดโม 3 เดือน: ย่อสัดส่วนจากต้นฉบับ (ปลดล็อกหลังเดือนที่ 5 จาก 12 เดือน) ลงมาเป็นหลังเดือนที่ 1 จาก 3 เดือน
    if (PURCHASE_DECISION_TYPES.includes(type) && this.currentTimeSegment() < 1) return;
    const segment = this.currentTimeSegment();
    if (this.lastSpecialSpawnSegment === segment) {
      if (!this.pendingSpecialSpawns.includes(type)) this.pendingSpecialSpawns.push(type);
      return;
    }
    this.lastSpecialSpawnSegment = segment;
    this.spawnItem(type);
  }

  // ยาสปีด/ยาหน่วง สุ่มถ่วงน้ำหนักจากตัวจับเวลาเดียว (ดู SPEED_POTION_WEIGHTS) กันมาพร้อมกันเองในตัว
  // เพราะออกได้ทีละชนิดต่อการ spawn หนึ่งครั้งเท่านั้น
  buildSpeedPotionSpawner() {
    // ขยาย weight เป็น pool ให้สุ่มด้วย Phaser.Utils.Array.GetRandom ได้ตรงสัดส่วน
    this.speedPotionPool = Object.entries(SPEED_POTION_WEIGHTS)
      .flatMap(([type, weight]) => Array(weight).fill(type));

    this.time.addEvent({
      delay: SPEED_POTION_INTERVAL_SEC * 1000,
      loop: true,
      callback: () => {
        const type = Phaser.Utils.Array.GetRandom(this.speedPotionPool);
        this.spawnItem(type);
      },
    });
  }

  spawnItem(type) {
    if (this.finished || this.finalBgShown) return; // เข้าฉากสุดท้าย (กรมสรรพากร) แล้ว เลิกสปอว์นไอเทมใหม่
    if (this.singleCollectFlags[type]) return; // เก็บไปแล้ว (กองทุน/ประกัน) หยุดสุ่มออกไปเลยตามที่สั่ง
    const naturalX = this.cameras.main.scrollX + GAME_WIDTH + 60; // โผล่จากขอบขวาของจอ
    // ไอเทมแต่ละชนิดมีตัวจับเวลาของตัวเอง เลยมีโอกาสสปอว์นพร้อมกันพอดี (คนละชนิด) จนตำแหน่งชนกัน
    // เลยบังคับให้ไอเทมชิ้นใหม่ (ไม่ว่าชนิดไหน) ห่างจากชิ้นล่าสุดอย่างน้อย MIN_ITEM_SPACING_X เสมอ
    const x = Math.max(naturalX, this.lastItemSpawnX + MIN_ITEM_SPACING_X);
    this.lastItemSpawnX = x;
    const y = Phaser.Utils.Array.GetRandom(ITEM_HEIGHTS); // สลับตำแหน่งสูง-ต่ำแบบสุ่ม
    this.spawnItemAt(x, y, type);
  }

  spawnItemAt(x, y, type) {
    const def = ITEM_TYPES[type];
    const container = this.add.container(x, y);

    if (def.textureKey) {
      const img = this.add.image(0, 0, def.textureKey);
      const displaySize = 50;
      img.setScale(displaySize / Math.max(img.width, img.height));
      container.add(img);
    } else {
      // ยังไม่มีรูปจริง (เช่นลอตเตอรี่) - ใช้ placeholder วงกลม+เครื่องหมาย ? แทนไปก่อน
      container.add(this.add.circle(0, 0, 25, 0xffcc33));
      container.add(this.add.text(0, 0, '?', {
        fontFamily: "'SOVBokThang', sans-serif", fontSize: '22px', color: '#000000', fontStyle: 'bold',
      }).setOrigin(0.5));
    }

    container.setDepth(5);
    container.itemType = type;

    this.physics.add.existing(container);
    container.body.setCircle(22, -22, -22);
    container.body.setAllowGravity(false);
    container.body.setImmovable(true);

    this.items.push(container);
  }

  // ลบไอเทมที่ไหลผ่านจอไปทางซ้ายแล้ว (กันหน่วยความจำบวมระหว่างวิ่งยาวๆ)
  cleanupOffscreenItems() {
    const cutoffX = this.cameras.main.scrollX - 100;
    for (let i = this.items.length - 1; i >= 0; i--) {
      if (this.items[i].x < cutoffX) {
        this.items[i].destroy();
        this.items.splice(i, 1);
      }
    }
  }

  onCollectItem(player, item) {
    const def = ITEM_TYPES[item.itemType];

    if (def.kind === 'speed') {
      // ไม่มีผลต่อเงิน/ภาษี เลยไม่เรียก GameState.collectItem (ไม่บันทึกลง itemLog ที่ใช้ในหน้าสรุป/คำนวณภาษี)
      this.applySpeedEffect(def);
      this.popSpeedFeedback(item.x, item.y, def);
      this.sound.play('sfx_pickup');
      this.items.splice(this.items.indexOf(item), 1);
      item.destroy();
      return;
    }

    if (def.stopAfterCollect) {
      // กองทุน/ประกัน/มรดก: เก็บได้ครั้งเดียว หยุดสุ่มออกทันที (ดู spawnItem/trySpawnSpecialItem)
      // มรดก: บวกเงินก้อนเดียวทันทีตอนเก็บ / กองทุน-ประกัน: ต้องถามซื้อ-ไม่ซื้อก่อน (ดู showPurchaseDecisionPopup) ค่อยหักเงินถ้าเลือกซื้อ
      // ไอคอนค้างข้างเงินรวมมีเฉพาะกองทุน/ประกัน (persistentBadges ไม่มี key 'inheritance' เลยข้ามอัตโนมัติ)
      if (this.singleCollectFlags[item.itemType]) {
        // เก็บไปแล้วจริงๆ แต่มีอีกชิ้นเดียวกันหลงเหลืออยู่ในโลก (ชิ้นที่ออกมาก่อนหยุดสุ่มทัน) - ไม่ให้ผลซ้ำ แค่ลบทิ้งเฉยๆ
        this.items.splice(this.items.indexOf(item), 1);
        item.destroy();
        return;
      }
      if (PURCHASE_DECISION_TYPES.includes(item.itemType)) {
        // กองทุน/ประกัน: หยุดสุ่มออกทันทีที่เก็บได้ (ไม่ว่าจะเลือกซื้อหรือไม่ก็ตาม) แต่รอผู้เล่นเลือกก่อนค่อยหักเงินจริง
        this.showPurchaseDecisionPopup(item, def);
        return;
      }

      this.singleCollectFlags[item.itemType] = true;
      GameState.collectItem(item.itemType, def.amount);
      this.popFeedback(item.x, item.y, { amount: def.amount });
      this.sound.play('sfx_pickup');
      this.items.splice(this.items.indexOf(item), 1);
      item.destroy();
      this.refreshStats();
      return;
    }

    // ลอตเตอรี่: สุ่มผลตอนเก็บจริง ๆ (ไม่ใช่ amount คงที่แบบไอเทมอื่น)
    const amount = def.rewardOptions ? Phaser.Utils.Array.GetRandom(def.rewardOptions) : def.amount;

    GameState.collectItem(item.itemType, amount);
    if (def.staminaType === 'food') GameState.adjustFoodStamina(def.staminaRefill);
    if (def.staminaType === 'milk' && GameState.hasChild) GameState.adjustMilkStamina(def.staminaRefill);
    if (item.itemType === 'coin') this.sound.play('sfx_coin');
    else if (item.itemType !== 'milk') this.sound.play('sfx_pickup');
    this.popFeedback(item.x, item.y, { ...def, amount });
    this.items.splice(this.items.indexOf(item), 1);
    item.destroy();
    this.refreshStats();
  }

  // ป๊อปอัพถามซื้อ/ไม่ซื้อตอนเก็บไอเทมกองทุน/ประกัน หยุดโลกทั้งหมดไว้ชั่วคราวรอผู้เล่นตัดสินใจ
  // ซื้อ (เงินพอ) -> หักเงินตามราคาไอเทม ปิดป๊อปอัพทันที / ไม่ซื้อ -> ไม่หักเงินเลย ปิดป๊อปอัพทันที
  // ซื้อแต่เงินไม่พอ -> ไม่ปิดป๊อปอัพ ขึ้น toast สีเทา "จำนวนเงินไม่พอ" แล้ว fade หายเองใน 2 วิ ให้ผู้เล่นเลือกใหม่ได้
  // ทั้งสามกรณีไอเทมนี้จะไม่สุ่มออกมาอีกในรอบนี้เหมือนเดิม (เซ็ต flag ไว้ตั้งแต่ตอนเก็บได้ ไม่รอผลการซื้อ)
  showPurchaseDecisionPopup(item, def) {
    this.singleCollectFlags[item.itemType] = true;
    this.sound.play('sfx_pickup');
    this.items.splice(this.items.indexOf(item), 1);
    item.destroy();

    this.decisionPopupActive = true;
    this.physics.world.pause();
    this.time.paused = true;

    const config = PURCHASE_POPUP_CONFIG[item.itemType];
    const cx = GAME_WIDTH / 2;
    const boxWidth = 860;
    const linePad = 30;
    const lineHeight = 28;
    const bodyFontSize = 15;
    const headingAreaH = 66;
    const buttonsAreaH = 150; // เว้นที่ให้ toast "จำนวนเงินไม่พอ" ลอยขึ้นมาได้โดยไม่ทับปุ่ม + แถวปุ่มเอง
    const boxHeight = headingAreaH + config.lines.length * lineHeight + buttonsAreaH;
    const boxTop = (GAME_HEIGHT - boxHeight) / 2;

    const elements = [];

    const dim = this.add.rectangle(cx, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55).setScrollFactor(0).setDepth(300);
    elements.push(dim);

    const box = this.add.graphics().setScrollFactor(0).setDepth(301);
    box.fillStyle(config.bgColor, 1);
    box.fillRoundedRect(cx - boxWidth / 2, boxTop, boxWidth, boxHeight, 26);
    box.lineStyle(4, 0x000000, 1);
    box.strokeRoundedRect(cx - boxWidth / 2, boxTop, boxWidth, boxHeight, 26);
    elements.push(box);

    const heading = this.add.text(cx, boxTop + 22, config.heading, {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '24px', color: '#000000', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(302);
    elements.push(heading);

    // เนื้อหาแต่ละบรรทัดประกอบจากหลาย span สีต่างกัน (ดู PURCHASE_POPUP_CONFIG) วางต่อกันซ้ายไปขวาเอง
    let lineY = boxTop + headingAreaH;
    const textX = cx - boxWidth / 2 + linePad;
    for (const segments of config.lines) {
      let cursorX = textX;
      for (const seg of segments) {
        const span = this.add.text(cursorX, lineY, seg.text, {
          fontFamily: "'SOVBokThang', sans-serif", fontSize: `${bodyFontSize}px`,
          color: seg.color || '#000000', fontStyle: seg.color ? 'bold' : 'normal',
        }).setScrollFactor(0).setDepth(302);
        elements.push(span);
        cursorX += span.width;
      }
      lineY += lineHeight;
    }
    const toastY = lineY + (boxTop + boxHeight - 64 - lineY) / 2; // กึ่งกลางช่องว่างระหว่างบรรทัดสุดท้ายกับแถวปุ่ม

    let settled = false; // กันกดซ้ำ/กดสองปุ่มพร้อมกันตอนรอปิดป๊อปอัพ
    let toast = null;

    const finish = (bought) => {
      if (settled) return;
      settled = true;

      for (const el of elements) el.destroy();
      buyBtn.destroy();
      skipBtn.destroy();
      if (toast) toast.destroy();

      this.physics.world.resume();
      this.time.paused = false;
      this.decisionPopupActive = false;

      if (bought) {
        GameState.collectItem(item.itemType, def.amount);
        if (this.persistentBadges[item.itemType]) this.persistentBadges[item.itemType].setVisible(true);
        this.popFeedback(this.player.x, this.player.y - 70, { amount: def.amount });
      }
      this.refreshStats();
    };

    // เงินไม่พอ: ไม่ปิดป๊อปอัพหลัก แค่โชว์ toast เทาสั้นๆ แล้วให้ผู้เล่นเลือกใหม่ (กดซื้ออีกทีหรือกดไม่ซื้อ)
    // ใช้ tween (ไม่ใช่ this.time.delayedCall) เพราะ this.time.paused = true ตอนป๊อปอัพเปิดอยู่ ทำให้ตัวจับเวลาของ Phaser ไม่เดิน แต่ tween ไม่ถูกกระทบ
    const showInsufficientFundsToast = () => {
      if (toast) toast.destroy();
      const toastW = 320;
      const toastH = 64;
      const bg2 = this.add.graphics();
      bg2.fillStyle(0x4b4b4b, 0.95);
      bg2.fillRoundedRect(-toastW / 2, -toastH / 2, toastW, toastH, 16);
      const txt = this.add.text(0, 0, 'จำนวนเงินไม่พอ', {
        fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);
      const t = this.add.container(cx, toastY, [bg2, txt]).setScrollFactor(0).setDepth(310);
      toast = t;
      this.tweens.add({
        targets: t, alpha: { from: 1, to: 0 }, duration: 2000, ease: 'Sine.In',
        onComplete: () => { t.destroy(); if (toast === t) toast = null; },
      });
    };

    const buyBtn = makeButton(this, cx - 130, boxTop + boxHeight - 44, 'ซื้อ', () => {
      const cost = Math.abs(def.amount);
      if (GameState.money >= cost) {
        finish(true);
        return;
      }
      showInsufficientFundsToast();
    }, { width: 200, height: 58, color: 0x2f9e44, scrollFactor: 0 });
    buyBtn.setDepth(302);

    const skipBtn = makeButton(this, cx + 130, boxTop + boxHeight - 44, 'ไม่ซื้อ', () => finish(false), { width: 200, height: 58, color: 0xd23c2e, scrollFactor: 0 });
    skipBtn.setDepth(302);
  }

  // ปรับความเร็ววิ่งชั่วคราวตอนเก็บยาสปีด/ยาหน่วง เก็บซ้อนได้ (รีเซ็ตนับเวลาใหม่ ไม่บวกทบ)
  applySpeedEffect(def) {
    this.speedMultiplier = def.speedMultiplier;
    if (this.speedEffectTimer) this.speedEffectTimer.remove(false);

    // เอฟเฟคลายวิ่งเร็วติดหลังตัวละคร (เขียว) กับดาวมึนหมุนบนหัว (แดง) แสดงแยกกันตามชนิด หายไปเมื่อไอเทมหมดเวลา (หรือโดนอีกสีทับ)
    if (def.speedMultiplier > 1) {
      this.showSpeedTrail();
      this.hideDizzyEffect();
    } else {
      this.hideSpeedTrail();
      this.showDizzyEffect();
    }

    this.speedEffectTimer = this.time.delayedCall(def.effectDurationSec * 1000, () => {
      this.speedMultiplier = 1;
      this.hideSpeedTrail();
      this.hideDizzyEffect();
      this.speedEffectTimer = null;
    });
  }

  showSpeedTrail() {
    if (!this.speedTrail) {
      this.speedTrail = this.add.image(this.player.x, this.player.y, 'fx_speed_trail');
      const displayW = 90;
      this.speedTrail.setScale(displayW / this.speedTrail.width);
      this.speedTrail.setDepth(this.player.depth - 1); // อยู่หลังตัวละคร
    }
    this.speedTrail.setVisible(true);
    this.updateSpeedTrailPosition();
  }

  hideSpeedTrail() {
    if (this.speedTrail) this.speedTrail.setVisible(false);
  }

  // ติดอยู่ด้านหลังตัวละครเสมอ (ฝั่งตรงข้ามทิศวิ่ง) - เรียกทุกเฟรมตอนเอฟเฟคทำงานอยู่ (ดู update())
  updateSpeedTrailPosition() {
    this.speedTrail.setPosition(this.player.x - this.player.displayWidth * 0.35, this.player.y);
  }

  // เอฟเฟคมึนประกอบด้วยหลายชั้นซ้อนกันในคอนเทนเนอร์เดียว: วงเวท Pixel Art เดิม (หมุนทั้งชิ้น รูปทรง/สี/สไตล์ไม่เปลี่ยนเลย)
  // + จุดพลังงานไหลวนรอบวง + อนุภาคทองกระพริบลอยเบาๆ (วาดเป็นวงกลมเล็กเอง ไม่ได้ตัดจากภาพต้นฉบับ กันปัญหาตัดภาพไม่แม่น)
  showDizzyEffect() {
    if (!this.dizzyEffect) {
      const ring = this.add.image(0, 0, 'fx_dizzy_slow');
      const displayW = 70;
      ring.setScale(displayW / ring.width);
      this.dizzyRing = ring;

      // จุดพลังงานเรืองแสงไหลวนรอบวงเป็นวงรีตามแนวเดียวกับวงเวท ทิศตามเข็มนาฬิกาเหมือนกัน
      const orb = this.add.circle(0, 0, 3, 0xd8f8ff, 0.95).setBlendMode(Phaser.BlendModes.ADD);
      this.dizzyOrb = orb;

      // อนุภาคทองลอยกระพริบ 3 จุด รอบวง คนละจังหวะกันกันดูซ้ำแข็งทื่อ
      this.dizzySparkles = [];
      for (let i = 0; i < 3; i++) {
        const sp = this.add.circle(0, 0, 2.5, 0xffcc33, 1);
        sp.baseAngle = (i / 3) * Math.PI * 2;
        this.dizzySparkles.push(sp);
        this.tweens.add({
          targets: sp, alpha: { from: 1, to: 0.2 }, duration: 400 + i * 150,
          yoyo: true, repeat: -1, delay: i * 200, ease: 'Sine.InOut',
        });
      }

      // วงเวททั้งชิ้นระยิบระยับเบาๆ (กระพริบความสว่างรวม) วนลูปไม่รู้จบ - ไม่กระทบรูปทรง แค่ความสว่าง
      this.tweens.add({
        targets: ring, alpha: { from: 1, to: 0.8 }, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.InOut',
      });

      this.dizzyEffect = this.add.container(this.player.x, this.player.y, [ring, orb, ...this.dizzySparkles]);
      this.dizzyEffect.setDepth(this.player.depth + 1); // อยู่หน้าตัวละคร (ลอยเหนือหัว)
      this.dizzyOrbAngle = 0;
    }
    this.dizzyEffect.setVisible(true);
    this.updateDizzyEffectPosition();
  }

  hideDizzyEffect() {
    if (this.dizzyEffect) this.dizzyEffect.setVisible(false);
  }

  // ลอยอยู่เหนือหัวตัวละครเสมอ - เรียกทุกเฟรมตอนเอฟเฟคทำงานอยู่ (ดู update()) ห้ามขยับกล้องเลย แก้แค่ตำแหน่ง/หมุนของเอฟเฟคเอง
  updateDizzyEffectPosition() {
    this.dizzyEffect.setPosition(this.player.x, this.player.y - this.player.displayHeight / 2 - 20);

    // วงเวทหมุนตามเข็มนาฬิกาต่อเนื่อง (มุมบวกใน Phaser = ตามเข็มนาฬิกา) เป็นการหมุนล้วนๆ รูปทรงเดิมทุกเฟรม ไม่มีการบิดสัดส่วน
    this.dizzyRing.rotation += 0.05;

    // จุดพลังงาน + อนุภาคทอง เดินตามวงรีรัศมีใกล้เคียงเส้นวงเวท (70px กว้าง สเกลจากภาพต้นฉบับ ~1195x717)
    const rx = 32;
    const ry = 17;
    this.dizzyOrbAngle += 0.06;
    this.dizzyOrb.setPosition(Math.cos(this.dizzyOrbAngle) * rx, Math.sin(this.dizzyOrbAngle) * ry);

    const t = this.time.now / 1000;
    this.dizzySparkles.forEach((sp, i) => {
      const angle = sp.baseAngle + this.dizzyOrbAngle * 0.4;
      const bob = Math.sin(t * 2 + i) * 4; // ลอยขึ้นลงเบาๆ
      sp.setPosition(Math.cos(angle) * rx * 1.15, Math.sin(angle) * ry * 1.15 + bob);
    });
  }

  popSpeedFeedback(x, y, def) {
    const isBoost = def.speedMultiplier > 1;
    const text = isBoost ? 'x2 เร็วขึ้น!' : 'x0.5 ช้าลง!';
    const color = isBoost ? '#4ade80' : '#f87171';
    const txt = this.add.text(x, y - 20, text, {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color, fontStyle: 'bold',
      backgroundColor: '#00000066', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: txt, y: y - 60, alpha: 0, duration: 700,
      onComplete: () => txt.destroy(),
    });
  }

  // ควันพวยพุ่งจากปลายเท้าตอนกระโดด (ทั้งจั้มแรกและดับเบิ้ลจั้ม)
  spawnJumpEffect() {
    const feetY = this.player.y + this.player.displayHeight / 2 - 8;
    const img = this.add.image(this.player.x, feetY, 'fx_jump_puff');
    const size = 110;
    const startScale = size / Math.max(img.width, img.height);
    img.setScale(startScale).setAlpha(0.9).setDepth(9);
    this.tweens.add({
      targets: img,
      scaleX: startScale * 1.5,
      scaleY: startScale * 1.5,
      alpha: 0,
      duration: 350,
      ease: 'Quad.Out',
      onComplete: () => img.destroy(),
    });
  }

  popFeedback(x, y, def) {
    const sign = def.amount >= 0 ? '+' : '';
    const color = def.amount >= 0 ? '#4ade80' : '#f87171';
    const txt = this.add.text(x, y - 20, `${sign}${def.amount.toLocaleString()} บาท`, {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color, fontStyle: 'bold',
      backgroundColor: '#00000066', padding: { x: 6, y: 3 },
    }).setOrigin(0.5).setDepth(50);
    this.tweens.add({
      targets: txt, y: y - 60, alpha: 0, duration: 700,
      onComplete: () => txt.destroy(),
    });
  }

  refreshStats() {
    // เรียกทุกเฟรมจาก update() แต่เงินไม่ได้เปลี่ยนทุกเฟรม เลยเช็คก่อนค่อย setText (กัน texture regen ทุกเฟรมจนเกมสะดุด)
    const sign = GameState.money >= 0 ? '+' : '';
    const text = `เงิน: ${sign}${GameState.money.toLocaleString()} บาท`;
    if (text !== this.lastStatsText) {
      this.lastStatsText = text;
      this.statsText.setText(text);
      this.statsText.setColor(GameState.money >= 0 ? '#ffffff' : '#f87171');
      this.layoutPersistentBadges();
    }

    this.updateStaminaBar(this.foodBar, GameState.foodStamina);
    if (this.milkBar) this.updateStaminaBar(this.milkBar, GameState.milkStamina);
  }

  // จัดตำแหน่งไอคอนค้าง (กองทุน/ประกัน) ให้ชิดซ้ายกล่องเงินรวมเสมอ ไม่ว่าตัวเลขเงินจะยาวแค่ไหน (เรียกทุกครั้งที่ตัวเลขเงินเปลี่ยน)
  layoutPersistentBadges() {
    let x = this.statsText.getBounds().left - 10;
    for (const type of ['fund', 'insurance']) {
      const badge = this.persistentBadges[type];
      if (!badge || !badge.visible) continue;
      x -= badge.displayWidth / 2;
      badge.setPosition(x, this.statsText.y + this.statsText.height / 2);
      x -= badge.displayWidth / 2 + 8;
    }
  }

  updateStaminaBar(bar, value) {
    const pct = Math.max(0, Math.min(100, value)) / 100;
    bar.fill.width = bar.maxWidth * pct;
    bar.fill.setFillStyle(pct < 0.25 ? 0xf87171 : pct < 0.5 ? 0xfbbf24 : 0x4ade80);
  }

  // ---------- LOOP ----------
  update(time, delta) {
    if (this.introActive || this.finished || this.decisionPopupActive) return;

    const k = this.keys;
    const jumpKeyPressed = Phaser.Input.Keyboard.JustDown(k.up)
      || Phaser.Input.Keyboard.JustDown(k.w)
      || Phaser.Input.Keyboard.JustDown(k.space);
    const jumpPressed = jumpKeyPressed || this.touchJumpQueued;
    this.touchJumpQueued = false;

    // ระบบท่ามือ (ถ้ากล้อง/โมเดลพร้อมใช้งานจริง): แบมือ=วิ่ง, กำมือ=กระโดด, ไม่แบ/ไม่กำ=หยุดวิ่ง
    // กำมือกระตุ้นกระโดดแค่ตอน "ขอบขาขึ้น" (พึ่งกำ) ครั้งเดียว กันกระโดดรัวทุกเฟรมตอนกำมือค้างไว้
    // ถ้ากล้องไม่พร้อม (ไม่อนุญาต/ไม่มีกล้อง) ตัวละครวิ่งอัตโนมัติแบบเดิมเป๊ะ คุมได้แค่กระโดดผ่านคีย์บอร์ด/ปุ่มบนจอ
    const handReady = this.handController && this.handController.ready;
    const gesture = handReady ? this.handController.gesture : null;
    const gestureJumpTriggered = handReady && gesture === 'fist' && this.lastGesture !== 'fist';
    if (handReady) this.lastGesture = gesture;
    // ช่วงเดินเข้าฉากสุดท้าย (finalBgShown) ให้เดินหน้าต่อเสมอไม่สนท่ามือ เหมือนที่ปิดกระโดดไว้ตรงนั้นด้วย
    const shouldRun = this.finalBgShown || !handReady || gesture === 'open' || gesture === 'fist';

    // setText() ทำให้ Phaser วาดใหม่ + อัปโหลด texture ขึ้น GPU ทุกครั้ง เรียกทุกเฟรมจะทำให้เกมสะดุด
    // เลยเช็คก่อนว่าข้อความเปลี่ยนจริงไหมค่อยเรียก (ท่ามือไม่ได้เปลี่ยนทุกเฟรมอยู่แล้ว)
    const handStatusMsg = !handReady
      ? (this.handController.error ? 'มือ: ไม่ได้ใช้กล้อง (ใช้ปุ่ม/คีย์บอร์ด)' : 'มือ: กำลังเปิดกล้อง...')
      : gesture === 'open' ? 'มือ: แบมือ (วิ่ง)'
      : gesture === 'fist' ? 'มือ: กำมือ (กระโดด!)'
      : 'มือ: ไม่เจอท่า (หยุด)';
    if (handStatusMsg !== this.lastHandStatusMsg) {
      this.lastHandStatusMsg = handStatusMsg;
      this.handStatusHudText.setText(handStatusMsg);
    }

    const body = this.player.body;
    const onGround = body.blocked.down || body.touching.down;
    if (onGround) this.jumpsUsed = 0;

    // เสียงวิ่งเล่นเฉพาะตอนอยู่กับพื้น หยุดตอนลอยตัว/กระโดด แล้วกลับมาเล่นต่อตอนลงพื้น
    if (onGround !== this.wasOnGround) {
      if (onGround) this.runSound.resume();
      else this.runSound.pause();
      this.wasOnGround = onGround;
    }

    // วิ่งไปข้างหน้าเองตลอดเวลา (Cookie Run style) ผู้เล่นคุมได้แค่กระโดด/ดับเบิ้ลจั้ม (หรือหยุดวิ่งด้วยท่ามือ ถ้าระบบกล้องพร้อม)
    // ความเร็วคูณด้วย speedMultiplier ถ้าเก็บยาสปีด/ยาหน่วงมา (ดู applySpeedEffect)
    body.setVelocityX(shouldRun ? AUTO_SPEED * this.speedMultiplier : 0);

    // เข้าฉากกรมสรรพากรแล้ว (finalBgShown) ห้ามกระโดด/ทำอะไรได้อีก ให้เดินเข้าฉากเฉยๆ
    if (!this.finalBgShown && (jumpPressed || gestureJumpTriggered) && this.jumpsUsed < MAX_JUMPS) {
      body.setVelocityY(-JUMP_SPEED);
      this.jumpsUsed++;
      this.spawnJumpEffect();
      this.sound.play('sfx_jump');
    }

    this.updateAnim(onGround);
    this.cleanupOffscreenItems();
    if (this.speedTrail && this.speedTrail.visible) this.updateSpeedTrailPosition();
    if (this.dizzyEffect && this.dizzyEffect.visible) this.updateDizzyEffectPosition();
    if (!this.finalBgShown) this.updateBgAnimation(delta); // สลับเฟรมพื้นหลังไปเรื่อยๆ จนกว่าจะตัดเข้าฉากกรมสรรพากร

    // หลอด stamina ไหลลงตามเวลาจริง (delta เป็น ms) - ระบบเดิม ไม่เกี่ยวกับหลอดเวลา/เงินเดือน
    const dtSec = delta / 1000;
    GameState.adjustFoodStamina(-STAMINA_DRAIN_RATE.food * dtSec);
    if (GameState.hasChild) GameState.adjustMilkStamina(-STAMINA_DRAIN_RATE.milk * dtSec);
    this.refreshStats();

    if (GameState.foodStamina <= 0 || (GameState.hasChild && GameState.milkStamina <= 0)) {
      this.gameOver(GameState.foodStamina <= 0 ? 'food' : 'milk');
      return;
    }

    // หลอดเวลา 12 เดือน: ครบแล้วสลับเป็นฉากกรมสรรพากร (ฉากสุดท้าย) วิ่งผ่านอีกพักหนึ่งแล้วค่อยจบเกมจริง
    this.elapsedMs += delta;
    const elapsedSec = this.elapsedMs / 1000;
    this.updateTimeBar(Math.min(TOTAL_MONTHS, Math.floor(elapsedSec / TIME_SEGMENT_SEC)));

    // ขึ้นช่องหลอดเวลาใหม่ -> ลองปล่อยไอเทมกองทุน/ประกัน/มรดกที่เลื่อนคิวไว้ (ถ้ามีและช่องนี้ยังไม่มีชนิดอื่นออกไปก่อน)
    const currentSegment = this.currentTimeSegment();
    if (currentSegment !== this.lastCheckedSegment) {
      this.lastCheckedSegment = currentSegment;
      if (this.pendingSpecialSpawns.length > 0 && this.lastSpecialSpawnSegment !== currentSegment) {
        const type = this.pendingSpecialSpawns.shift();
        if (!this.singleCollectFlags[type]) {
          this.lastSpecialSpawnSegment = currentSegment;
          this.spawnItem(type);
        }
      }
    }

    if (elapsedSec >= RUN_DURATION_SEC && !this.finalBgShown) {
      this.showFinalBackground();
    }

    if (elapsedSec >= TOTAL_RUN_SEC) {
      this.finishRun();
    }
  }

  // สลับเฟรมพื้นหลังไปมาทุก BG_ANIM_FRAME_MS ให้ดูเป็นอนิเมชัน (เมฆลอย/รายละเอียดขยับเบาๆ) เรียกทุกเฟรมจาก update()
  updateBgAnimation(delta) {
    this.bgAnimElapsedMs += delta;
    if (this.bgAnimElapsedMs < BG_ANIM_FRAME_MS) return;
    this.bgAnimElapsedMs -= BG_ANIM_FRAME_MS;
    this.bgAnimFrameIndex = (this.bgAnimFrameIndex + 1) % BG_ANIM_FRAMES.length;
    this.bg.setTexture(BG_ANIM_FRAMES[this.bgAnimFrameIndex]);
  }

  // หลอดเวลาครบ 12 ส่วน -> สลับพื้นหลังเป็นภาพกรมสรรพากร (ฉากสุดท้ายของรอบวิ่ง) เลิกสปอว์นไอเทมใหม่ตั้งแต่จุดนี้
  // ฉากนี้ควรเหลือแค่ตัวละครเดินเข้าฉากเฉยๆ (กำลังจะตัดเข้าหน้าคำนวณภาษีแล้ว) เลยต้องล้างเอฟเฟกต์/ไอเทมที่ค้างอยู่ทั้งหมดด้วย
  showFinalBackground() {
    this.finalBgShown = true;
    const bgTex = this.textures.get(FINAL_BG_KEY).getSourceImage();
    const bgScale = GAME_HEIGHT / bgTex.height;
    this.bg.setTexture(FINAL_BG_KEY);
    this.bg.setTileScale(bgScale, bgScale);
    // พื้นหลังปกติเลื่อนตามกล้องแบบพารัลแลกซ์ (scrollFactor 0.4) แต่ฉากนี้ต้องนิ่งสนิท ขยับแค่ตัวละคร
    this.bg.setScrollFactor(0);
    this.bg.setTilePosition(0, 0);

    // หยุดเอฟเฟกต์ที่ติดตัวละครอยู่ทั้งหมดทันที (ยาสปีด x2 / ยาหน่วงมึน) คืนความเร็วเป็นปกติ
    this.speedMultiplier = 1;
    if (this.speedEffectTimer) {
      this.speedEffectTimer.remove(false);
      this.speedEffectTimer = null;
    }
    this.hideSpeedTrail();
    this.hideDizzyEffect();

    // ไอเทมที่ลอยค้างอยู่ในโลก (สปอว์นไปแล้วแต่ยังไม่ถูกเก็บ/ไหลออกจอ) ให้หายไปทันที ไม่ใช่แค่หยุด spawn ใหม่เฉยๆ
    for (const item of this.items) item.destroy();
    this.items.length = 0;

    // ข้อความ "กำลังโหลด..." ระหว่างเดินเข้าฉากสุดท้าย จนกว่าจะตัดเข้าหน้าสรุปไอเทม (ถูกทำลายอัตโนมัติตอนเปลี่ยน scene ไป Summary)
    const loadingText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'กำลังโหลด...', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color: '#F8F8FF', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(150);
    this.tweens.add({
      targets: loadingText, alpha: { from: 1, to: 0.3 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.InOut',
    });
  }

  finishRun() {
    this.finished = true;
    this.runSound.stop();
    this.bgm.stop();
    this.handController.stop(); // ปิดกล้องด้วย ไม่งั้นไฟกล้องจะค้างเปิดอยู่หลังจบมินิเกม
    this.scene.start('Summary');
  }

  gameOver(reason) {
    this.finished = true;
    this.runSound.stop();
    this.bgm.stop();
    this.handController.stop(); // ปิดกล้องด้วย ไม่งั้นไฟกล้องจะค้างเปิดอยู่หลังจบเกม
    this.scene.start('GameOver', { reason });
  }

  updateAnim(onGround) {
    const who = GameState.character;
    if (!onGround) {
      // อยู่กลางอากาศ: ค้างท่าวิ่ง 1 เฟรมให้ดูเหมือนกระโดด
      this.player.anims.stop();
      this.player.setFrame(1);
      return;
    }
    // เช็ค isPlaying ด้วย ไม่ใช่แค่ชื่อ anim เพราะ .stop() ตอนกระโดดไม่ได้ล้างชื่อ anim ออก
    // ถ้าเช็คแค่ชื่อ พอลงพื้นครั้งแรกหลังกระโดด anim จะค้างเฟรมเดิมตลอดเพราะชื่อไม่เปลี่ยนเลยไม่ถูกสั่ง play ซ้ำ
    if (!this.player.anims.isPlaying || this.player.anims.getName() !== `${who}_walk`) {
      this.player.play(`${who}_walk`);
    }
  }
}
