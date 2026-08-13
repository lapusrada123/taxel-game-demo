// scenes/PreloadScene.js
// โหลด asset ทั้งหมดของเกม + แสดง progress bar
import { GAME_WIDTH, GAME_HEIGHT } from '../config/gameConfig.js';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('Preload');
  }

  preload() {
    this.buildProgressBar();

    // --- ตัวละคร (ประกอบจาก ass/ตัวละคร/ เอง เป็น spritesheet 3 เฟรม: 0=ยืน, 1=วิ่ง, 2=ยืน(ซ้ำ)) ---
    // boy: boychar/boyR + boychar/boyrun1 + boychar/boyR
    this.load.spritesheet('boy', 'public/assets/sprites/boy_walk_sheet.png', { frameWidth: 320, frameHeight: 340 });
    // girl: girlchar/girlright + girlchar/girlrun1 + girlchar/girlright
    this.load.spritesheet('girl', 'public/assets/sprites/girl_walk_sheet.png', { frameWidth: 320, frameHeight: 340 });

    // --- พื้นหลัง ---
    this.load.image('bg_menu', 'public/assets/backgrounds/menu.jpg');
    // พื้นหลัง Runner เดิม (ภาพนิ่ง) - เก็บไว้ตามที่สั่ง ไม่ได้ใช้แสดงผลจริงแล้ว (ถูกแทนที่ด้วยเวอร์ชันอนิเมชันด้านล่าง)
    this.load.image('bg_runner_main', 'public/assets/backgrounds/runner_main.jpg');
    // พื้นหลัง Runner เวอร์ชันอนิเมชัน (2 เฟรมสลับกัน ขนาด/สัดส่วนเท่าไฟล์เดิมทุกประการ) วนลูปตลอดจนหลอดเวลาครบ 12 ส่วน แล้วสลับเป็นภาพกรมสรรพากรเป็นฉากสุดท้ายก่อนจบเกม
    this.load.image('bg_runner_anim_1', 'public/assets/backgrounds/runner_main_anim_1.png');
    this.load.image('bg_runner_anim_2', 'public/assets/backgrounds/runner_main_anim_2.png');
    this.load.image('bg_revenue_dept', 'public/assets/backgrounds/revenue_department.jpg');
    this.load.image('bg_tax_mode_select', 'public/assets/backgrounds/tax_mode_select.jpg');
    this.load.image('bg_tax_calc', 'public/assets/backgrounds/tax_calc.jpg');

    // --- UI: ปุ่ม (ตัดพื้นหลังออกจากไฟล์ต้นฉบับใน ass/button แล้ว) ---
    this.load.image('btn_jump', 'public/assets/ui/btn_jump.png');
    this.load.image('btn_pick', 'public/assets/ui/btn_pick.png'); // ยังไม่ได้ใช้ - เตรียมไว้สำหรับปุ่มเลือกรถ/บ้าน/กองทุนในอนาคต
    this.load.image('btn_next', 'public/assets/ui/btn_next.png');
    // กราฟิกปุ่มเลือกโหมดเกมหน้าแรก (ตัดพื้นหลังออกแล้ว) แทนปุ่มข้อความเดิมใน MenuScene
    this.load.image('btn_quick_mode', 'public/assets/ui/btn_quick_mode.png');
    this.load.image('btn_full_mode', 'public/assets/ui/btn_full_mode.png');

    // --- ไอเทม ---
    this.load.image('item_coin', 'public/assets/items/coin.png');
    this.load.image('item_food', 'public/assets/items/food.png');
    this.load.image('item_milk', 'public/assets/items/milk.png');
    // ยาสปีด/ยาหน่วง (ตัดพื้นหลังจากไฟล์ต้นฉบับ ass ใน Drive แล้ว)
    this.load.image('item_speed_boost', 'public/assets/items/speed_boost.png');
    this.load.image('item_speed_slow', 'public/assets/items/speed_slow.png');
    // กองทุน/ประกัน/มรดก (ไฟล์จากไดร์ฟ พื้นหลังใสอยู่แล้วไม่ต้องตัด ยกเว้นกองทุนที่เป็นแบดจ์ทึบตั้งใจ)
    this.load.image('item_fund', 'public/assets/items/fund.png');
    this.load.image('item_insurance', 'public/assets/items/insurance.png');
    this.load.image('item_inheritance', 'public/assets/items/inheritance.png');

    // --- เอฟเฟค: กลุ่มควันตอนกระโดด (ตัดพื้นหลังออกจากไฟล์ต้นฉบับ ass/กระโดด แล้ว) ---
    this.load.image('fx_jump_puff', 'public/assets/effects/jump_puff.png');
    // --- เอฟเฟค: ลายวิ่งเร็วติดหลังตัวละคร ตอนเก็บยาสปีด x2 สีเขียว (ตัดพื้นหลังตารางออกแล้ว) ---
    this.load.image('fx_speed_trail', 'public/assets/effects/speed_trail.png');
    // --- เอฟเฟค: ดาวมึนหมุนบนหัว ตอนเก็บยาหน่วง x2 สีแดง (ตัดพื้นหลังม่วงออกแล้ว) ---
    this.load.image('fx_dizzy_slow', 'public/assets/effects/dizzy_slow.png');

    // --- เสียง: เอฟเฟคเสียงตอนกระโดด (จาก ass/ซาวด์เสียง/เสียงกระโดด(ในมินิเกม).mp3) ---
    this.load.audio('sfx_jump', 'public/assets/audio/jump.mp3');
    // --- เสียง: เอฟเฟคเสียงวิ่ง วนลูปตอนตัวละครวิ่งอยู่กับพื้น (หยุดตอนกระโดด) ---
    this.load.audio('sfx_run', 'public/assets/audio/run.mp3');
    // --- เสียง: เอฟเฟคกดเลือก ใช้ตอนกดเริ่ม/เลือกโหมด/เลือกภงด (ไม่ใช้ในมินิเกม) ---
    this.load.audio('sfx_select', 'public/assets/audio/select.mp3');
    // --- เสียง: เอฟเฟคเก็บเหรียญ เฉพาะไอเทมเหรียญเท่านั้น ---
    this.load.audio('sfx_coin', 'public/assets/audio/coin.mp3');
    // --- เสียง: เอฟเฟคเก็บไอเทมทั่วไป (อาหาร/ลอตเตอรี่/x2/กองทุน/ประกัน/มรดก) ---
    this.load.audio('sfx_pickup', 'public/assets/audio/pickup.mp3');
    // --- เพลง: BGM มินิเกม วนลูปตั้งแต่เริ่มวิ่งจริงจนจบมินิเกม ---
    this.load.audio('bgm_minigame', 'public/assets/audio/bgm_minigame.mp3');
  }

  buildProgressBar() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    this.add.text(cx, cy - 60, 'TAXEL', {
      fontFamily: "'SOVBokThang', monospace", fontSize: '48px', color: '#ffcc33',
    }).setOrigin(0.5);

    const label = this.add.text(cx, cy - 10, 'กำลังโหลด...', {
      fontFamily: "'SOVBokThang', sans-serif", fontSize: '18px', color: '#ffffff',
    }).setOrigin(0.5);

    const barW = 420, barH = 26;
    const box = this.add.graphics();
    box.fillStyle(0x000000, 0.4);
    box.fillRect(cx - barW / 2, cy + 20, barW, barH);

    const bar = this.add.graphics();
    this.load.on('progress', (p) => {
      bar.clear();
      bar.fillStyle(0xffcc33, 1);
      bar.fillRect(cx - barW / 2 + 3, cy + 23, (barW - 6) * p, barH - 6);
      label.setText(`กำลังโหลด... ${Math.round(p * 100)}%`);
    });
  }

  create() {
    // สร้าง animation เดิน — anim เป็น global ใช้ได้ทุก scene
    // boy/girl มี 3 เฟรมเท่ากัน (0=ยืน,1=วิ่ง,2=ยืนซ้ำ) เลยสลับแค่ 0<->1 ก็พอ (เฟรม 2 ซ้ำกับเฟรม 0 อยู่แล้ว)
    const WALK_FRAMES = { boy: [0, 1], girl: [0, 1] };

    for (const who of ['boy', 'girl']) {
      this.anims.create({
        key: `${who}_walk`,
        frames: this.anims.generateFrameNumbers(who, { frames: WALK_FRAMES[who] }),
        frameRate: 9,
        repeat: -1,
      });
      this.anims.create({
        key: `${who}_idle`,
        frames: [{ key: who, frame: 0 }],
        frameRate: 1,
      });
    }

    this.scene.start('Menu');
  }
}
