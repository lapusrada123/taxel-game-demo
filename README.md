# Taxel — Phase 0 (เดโม่ขยับตัวละคร)

เกม Pixel Art สอนการยื่นภาษี — เวอร์ชัน Phase 0 นี้ทำ **Quick Mode** ให้เล่นได้ถึงขั้น
เลือกตัวละครแล้ว **เดิน/กระโดด** ในฉาก runner ได้จริง

> เวอร์ชันนี้เป็นแบบ **no-build** (ใช้ Phaser 4 ที่ vendor ไว้ใน `lib/`) รันได้ทันที
> โดยไม่ต้องติดตั้ง Node.js — เหมาะกับการเริ่มต้นอย่างรวดเร็ว ภายหลังค่อยย้ายไป Vite + TypeScript ตาม Dev Guide ได้

---

## วิธีรัน (ต้องมี Python — เครื่องนี้มี Python 3.9 อยู่แล้ว)

**ทางที่ 1 — ดับเบิลคลิก**
ดับเบิลคลิกไฟล์ `start.bat` แล้วเปิดเบราว์เซอร์ไปที่ http://localhost:8000

**ทางที่ 2 — พิมพ์คำสั่งเอง**
เปิด Terminal ที่โฟลเดอร์ `taxel/` แล้วรัน:

```bash
python -m http.server 8000
```

จากนั้นเปิด http://localhost:8000

> ⚠️ **ต้องรันผ่าน web server** ห้ามดับเบิลคลิก `index.html` ตรงๆ
> เพราะ ES module + การโหลดรูปจะติด CORS ของ `file://`

---

## การควบคุม

| การกระทำ | คีย์บอร์ด | มือถือ |
|---|---|---|
| เดินซ้าย | ◀ หรือ `A` | ปุ่ม ◀ ซ้ายล่าง |
| เดินขวา | ▶ หรือ `D` | ปุ่ม ▶ ซ้ายล่าง |
| กระโดด | `Space` / `W` / ▲ | ปุ่ม ⤒ ขวาล่าง |

---

## โครงสร้างไฟล์

```
taxel/
├─ index.html            # โหลด Phaser + main.js
├─ start.bat             # ปุ่มรัน server (Python)
├─ lib/phaser.min.js     # Phaser 4.2.1 (vendored)
├─ public/assets/
│  ├─ sprites/           # boy_sheet.png, girl_sheet.png (3 เฟรม: ยืน/วิ่ง1/วิ่ง2)
│  └─ backgrounds/       # menu.jpg, runner_month1.jpg
└─ src/
   ├─ main.js
   ├─ config/gameConfig.js
   ├─ domain/GameState.js        # สถานะกลาง (ไม่พึ่ง Phaser)
   └─ scenes/
      ├─ BootScene.js
      ├─ PreloadScene.js         # progress bar
      ├─ MenuScene.js            # เลือกโหมด
      ├─ ui/makeButton.js
      └─ quick/
         ├─ CharSelectScene.js   # เลือก boy/girl
         └─ RunnerScene.js       # ⭐ ขยับตัวละคร + animation เดิน (ขาขยับ)
```

## Flow ตอนนี้

```
Boot → Preload → Menu → (Quick Mode) → CharSelect → Runner (เดิน/กระโดด)
```

## ถัดไป (Phase 1+)

- `domain/tax/TaxEngine.js` + unit test
- Lesson → Form (กรอกภาษี + validate) → Summary
- เก็บเหรียญ/ไอเทมลดหย่อน + หลอดพลังงานในฉาก Runner
