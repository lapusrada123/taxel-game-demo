// main.js — จุดเริ่มเกม: รวม scene ทั้งหมดแล้วสร้าง Phaser.Game
import { createGameConfig } from './config/gameConfig.js';
import { BootScene } from './scenes/BootScene.js';
import { PreloadScene } from './scenes/PreloadScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { TaxModeSelectScene } from './scenes/quick/TaxModeSelectScene.js';
import { CharSelectScene } from './scenes/quick/CharSelectScene.js';
import { RunnerScene } from './scenes/quick/RunnerScene.js';
import { SummaryScene } from './scenes/quick/SummaryScene.js';
import { GameOverScene } from './scenes/quick/GameOverScene.js';
import { TaxCalcScene } from './scenes/quick/TaxCalcScene.js';
import { TaxBracketScene } from './scenes/quick/TaxBracketScene.js';

const scenes = [
  BootScene,
  PreloadScene,
  MenuScene,
  TaxModeSelectScene,
  CharSelectScene,
  RunnerScene,
  SummaryScene,
  GameOverScene,
  TaxCalcScene,
  TaxBracketScene,
];

// แก้ทีเดียวที่นี่แทนตั้ง fontSize/resolution ทีละจุดทั่วโค้ด (add.text ทุกที่ในเกมผ่านจุดนี้จุดเดียว):
// - ขยายขนาดฟอนต์ทุกจุดขึ้น 1.4 เท่า (เดิม 1.3)
// - เพิ่ม resolution ให้ตัวหนังสือคมชัดขึ้น (canvas text เบลอได้ตอนโดน Phaser.Scale.FIT ขยายจอ) (เดิม 3 เพิ่มเป็น 4)
// - บังคับ texture ของตัวหนังสือให้เป็น LINEAR filter เสมอ เพราะ gameConfig ตั้ง pixelArt:true ไว้ทั้งเกม (ให้สไปรท์คมแบบพิกเซล)
//   แต่ค่านี้ดันไปกระทบ texture ของ Text object ด้วย ทำให้ตัวอักษรถูก filter แบบ NEAREST จนคมกระด้าง/อ่านยาก ทั้งที่ตัวหนังสือควรเรียบแบบ anti-alias
const originalTextFactory = Phaser.GameObjects.GameObjectFactory.prototype.text;
Phaser.GameObjects.GameObjectFactory.prototype.text = function (x, y, text, style) {
  style = Object.assign({}, style);
  if (style.resolution === undefined) style.resolution = 6;
  if (typeof style.fontSize === 'string' && style.fontSize.endsWith('px')) {
    style.fontSize = `${Math.round(parseFloat(style.fontSize) * 1.4)}px`;
  }
  const textObj = originalTextFactory.call(this, x, y, text, style);
  textObj.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return textObj;
};

// ต้องรอฟอนต์โหลดเสร็จก่อนสร้างเกม ไม่งั้นเฟรมแรกๆ Phaser จะวาดข้อความด้วยฟอนต์สำรองไปก่อน (canvas text ไม่รอฟอนต์เอง)
document.fonts.load('16px SOVBokThang').catch(() => {}).finally(() => {
  const game = new Phaser.Game(createGameConfig(scenes));

  // debug hook (ใช้ตอนพัฒนา/ทดสอบ) — เปิด console แล้วเข้าถึง window.game ได้
  window.game = game;
});
