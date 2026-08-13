// scenes/ui/makeButton.js
// ปุ่มกดมาตรฐาน: รองรับทั้ง click (คอม) และ touch (มือถือ)
// hit area กว้างพอสำหรับนิ้ว (>= 44px) ตาม dev guide

/**
 * @param {Phaser.Scene} scene
 * @param {number} x
 * @param {number} y
 * @param {string} label
 * @param {(() => void)|null} onClick
 * @param {{ disabled?: boolean, width?: number, height?: number, color?: number, hoverColor?: number, scrollFactor?: number }} [opts]
 */
export function makeButton(scene, x, y, label, onClick, opts = {}) {
  const w = opts.width ?? 280;
  const h = opts.height ?? 72;
  const disabled = opts.disabled ?? false;

  const container = scene.add.container(x, y);

  const baseColor = disabled ? 0x555566 : (opts.color ?? 0xd23c2e);
  // สีตอน hover: ถ้าไม่ได้ส่ง hoverColor มาเอง ใช้ค่าเดิม 0xe85647 (แดงสว่างขึ้น) ตอนเป็นสีปุ่มดีฟอลต์
  // แต่ถ้าส่ง color เองมา (เช่นปุ่มเขียว) คำนวณเวอร์ชันสว่างขึ้นให้อัตโนมัติแทน
  const hoverColor = disabled
    ? baseColor
    : (opts.hoverColor ?? (opts.color !== undefined ? Phaser.Display.Color.ValueToColor(opts.color).brighten(15).color : 0xe85647));
  const bg = scene.add.rectangle(0, 0, w, h, baseColor)
    .setStrokeStyle(4, 0xffcc33, disabled ? 0.4 : 1);
  bg.setAlpha(disabled ? 0.6 : 1);

  const text = scene.add.text(0, 0, label, {
    fontFamily: "'SOVBokThang', sans-serif",
    fontSize: '22px',
    color: '#ffffff',
    align: 'center',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  container.add([bg, text]);
  container.setSize(w, h);

  // สำคัญ: ต้องตั้ง scrollFactor ให้ bg (ตัวที่ setInteractive จริง) ด้วย ไม่ใช่แค่ container ข้างนอก
  // เพราะ container.setScrollFactor() ทำให้ "เรนเดอร์" ถูกที่เฉยๆ แต่ตำแหน่งที่ใช้เช็คคลิก (hit test)
  // ของ object ลูกยังอิงจาก scrollFactor ของตัวมันเอง (default = 1) ทำให้ตำแหน่งคลิกกับตำแหน่งที่เห็นไม่ตรงกัน
  // เมื่อกล้องเลื่อน (เช่น RunnerScene ที่กล้องตามตัวละครวิ่งไปเรื่อยๆ) กดปุ่มไม่ติดทั้งที่เห็นปุ่มอยู่ตรงหน้า
  if (opts.scrollFactor !== undefined) {
    container.setScrollFactor(opts.scrollFactor);
    bg.setScrollFactor(opts.scrollFactor);
    text.setScrollFactor(opts.scrollFactor);
  }

  if (!disabled && onClick) {
    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => bg.setFillStyle(hoverColor));
    bg.on('pointerout', () => {
      bg.setFillStyle(baseColor);
      container.setScale(1);
    });
    bg.on('pointerdown', () => container.setScale(0.95));
    bg.on('pointerup', () => {
      container.setScale(1);
      onClick();
    });
  }

  return container;
}
