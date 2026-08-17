// systems/HandGestureController.js
// ควบคุมตัวละครด้วยท่ามือผ่านกล้อง (MediaPipe Gesture Recognizer - รันในเบราว์เซอร์ล้วนๆ ไม่ต้องมีเซิร์ฟเวอร์)
// แบมือ (Open_Palm) = วิ่ง, กำมือ (Closed_Fist) = กระโดด, ท่าอื่น/ไม่เจอมือ = หยุดวิ่ง
// ถ้ากล้อง/โมเดลโหลดไม่สำเร็จ (ผู้เล่นไม่อนุญาตกล้อง, ไม่มีกล้อง ฯลฯ) -> ready จะค้างเป็น false
// ตัวเรียกใช้ (RunnerScene) ต้องเช็ค .ready ก่อนเสมอ แล้ว fallback ไปใช้คีย์บอร์ด/ปุ่มบนจอแทนแบบเดิม ไม่ให้เกมค้าง
const GESTURE_SCORE_THRESHOLD = 0.6; // ความมั่นใจขั้นต่ำก่อนเชื่อผลท่ามือ กันสั่นไหว/ทายมั่ว

let visionModulePromise = null;
function loadVisionModule() {
  if (!visionModulePromise) {
    visionModulePromise = import('../../lib/mediapipe/vision_bundle.mjs');
  }
  return visionModulePromise;
}

export class HandGestureController {
  constructor() {
    this.gesture = 'none'; // 'open' | 'fist' | 'none'
    this.ready = false; // กล้อง+โมเดลพร้อมใช้งานแล้วจริง (เช็คก่อนเชื่อ .gesture เสมอ)
    this.error = null; // ข้อความ error ล่าสุด (ถ้ามี) เผื่อโชว์ debug บนจอ
    this.videoEl = null;
    this.stream = null;
    this.recognizer = null;
    this._rafId = null;
    this._lastVideoTime = -1;
    this._stopped = false;
  }

  // เริ่มขอกล้อง + โหลดโมเดล (async, เรียกครั้งเดียวตอนเข้าฉาก) ไม่ throw ออกไปข้างนอก แค่เซ็ต this.error ไว้ให้เช็ค
  async start() {
    try {
      const { GestureRecognizer, FilesetResolver } = await loadVisionModule();
      const filesetResolver = await FilesetResolver.forVisionTasks('lib/mediapipe/wasm');

      const baseOptions = { modelAssetPath: 'public/assets/models/gesture_recognizer.task' };
      try {
        this.recognizer = await GestureRecognizer.createFromOptions(filesetResolver, {
          baseOptions: { ...baseOptions, delegate: 'GPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      } catch (gpuErr) {
        // เครื่องพรีเซนต์บางเครื่อง GPU delegate อาจใช้ไม่ได้ (driver/browser ไม่รองรับ) ลอง CPU ซ้ำอีกที
        this.recognizer = await GestureRecognizer.createFromOptions(filesetResolver, {
          baseOptions: { ...baseOptions, delegate: 'CPU' },
          runningMode: 'VIDEO',
          numHands: 1,
        });
      }

      if (this._stopped) return; // ผู้เล่นออกจากฉากไปแล้วระหว่างรอโหลด ไม่ต้องขอกล้องต่อ

      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 }, audio: false,
      });

      if (this._stopped) {
        this.stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // ใช้ <video id="handCamPreview"> ตัวเดียวกับที่โชว์พรีวิวมุมจอ (ดู index.html) กล้องสตรีมเดียวกัน
      // ทั้งเลี้ยงภาพให้คนเล่นเห็น และป้อนเข้าโมเดลจับท่ามือไปพร้อมกัน ไม่ต้องขอกล้องซ้ำสอง element
      this.videoEl = document.getElementById('handCamPreview');
      this.videoEl.srcObject = this.stream;
      await this.videoEl.play();
      this.videoEl.style.display = 'block';

      this.ready = true;
      this._loop();
    } catch (err) {
      this.error = err?.message || String(err);
      this.ready = false;
    }
  }

  _loop() {
    if (this._stopped) return;
    this._rafId = requestAnimationFrame(() => this._loop());
    if (!this.videoEl || this.videoEl.readyState < 2) return;
    if (this.videoEl.currentTime === this._lastVideoTime) return; // ยังไม่มีเฟรมใหม่ ไม่ต้อง infer ซ้ำ
    this._lastVideoTime = this.videoEl.currentTime;

    let result;
    try {
      result = this.recognizer.recognizeForVideo(this.videoEl, Math.round(performance.now()));
    } catch (err) {
      return; // เฟรมเพี้ยนบางเฟรมข้ามไปเฉยๆ ไม่ให้เกม crash
    }

    const top = result?.gestures?.[0]?.[0];
    if (top && top.score >= GESTURE_SCORE_THRESHOLD) {
      if (top.categoryName === 'Open_Palm') this.gesture = 'open';
      else if (top.categoryName === 'Closed_Fist') this.gesture = 'fist';
      else this.gesture = 'none';
    } else {
      this.gesture = 'none';
    }
  }

  // ปิดกล้อง + เลิกใช้โมเดล ต้องเรียกตอนออกจากฉากเสมอ ไม่งั้นไฟกล้องจะค้างเปิดอยู่หลังเกมจบ
  stop() {
    this._stopped = true;
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    if (this.recognizer) this.recognizer.close();
    if (this.videoEl) {
      this.videoEl.style.display = 'none';
      this.videoEl.srcObject = null;
    }
  }
}
