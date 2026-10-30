/* story.js — ข้อมูลเนื้อเรื่อง (แก้ไฟล์นี้เพื่อเขียนเรื่องของคุณเอง ไม่ต้องแตะ engine.js)

   แต่ละเหตุการณ์อ้างอิงด้วย ID  ประเภท (type) ที่รองรับ:
   ──────────────────────────────────────────────────────────────
   dialogue  บทสนทนา
       speaker      ชื่อที่แสดง (ไม่ใส่ = ใช้ชื่อจาก characters.js, ไม่มีตัวละคร = บรรยาย)
       text         ข้อความ
       background   id ฉากหลัง (จาก backgrounds.js)
       character / expression / position(left|center|right)   แสดง/เปลี่ยนตัวละคร 1 คน
       show         [{character, expression, position}, ...]   แสดงหลายคนพร้อมกัน
       hide         ["luna"] หรือ "all"                        ซ่อนตัวละคร
       bgm / sfx    ชื่อไฟล์ใน assets/audio (bgm: null = หยุดเพลง)
       effect       "shake" | "flash"
       set / add    { ตัวแปร: ค่า }  ตั้งค่า / บวกค่าตัวแปร
       next         ID เหตุการณ์ถัดไป
   choice    ตัวเลือก
       text/speaker (ไม่บังคับ) ข้อความนำ,  choices: [{ text, next, set, add, requires }]
   quiz      คำถาม
       questionSet  id จาก questions.js,  next / passNext / failNext
       count (ไม่บังคับ) จำนวนข้อที่ใช้,  requiredCorrect (ไม่บังคับ) ทับค่าของชุดคำถาม
   condition ตรวจเงื่อนไขแล้วแยกทาง (ผู้เล่นไม่เห็น)
       if: { var, op, value }  op: == != > >= < <=   (รวมเงื่อนไขได้ด้วย all / any / not)
       then / else  หรือ  branches: [{ if, next }, ...] + else
   set       ตั้งค่าตัวแปรเงียบ ๆ แล้วไปต่อ  (set / add / next)
   ending    ฉากจบ
       title, text, background, next (ใส่ = มีปุ่ม "เล่นต่อ")
   ──────────────────────────────────────────────────────────────
   ตัวแปรที่ระบบสร้างให้: score, correct, wrong
   และหลังจบชุดคำถาม: <questionSet>_correct, _wrong, _score, _passed */

const storyData = {
  start: {
    id: "start", type: "dialogue",
    background: "future_lab", bgm: "theme_main",
    character: "luna", expression: "surprised", position: "right",
    speaker: "ลูน่า", text: "ยินดีต้อนรับสู่โลกอนาคต!",
    next: "intro_02"
  },
  intro_02: {
    id: "intro_02", type: "dialogue",
    character: "protagonist", expression: "normal", position: "left",
    speaker: "ตัวเอก", text: "ที่นี่คือที่ไหน? เมื่อกี้ฉันยังนั่งอยู่ในห้องเรียนอยู่เลย",
    next: "intro_03"
  },
  intro_03: {
    id: "intro_03", type: "dialogue",
    character: "luna", expression: "happy",
    speaker: "ลูน่า", text: "ที่นี่คือห้องแล็บแห่งปี 2200 ฉันดึงเธอมาผ่านพอร์ทัลเวลา เพราะต้องการให้เธอช่วยกู้ระบบข้อมูลของโลก",
    next: "choice_01"
  },
  choice_01: {
    id: "choice_01", type: "choice",
    character: "luna", expression: "normal",
    speaker: "ลูน่า", text: "เธออยากเริ่มจากอะไรก่อน?",
    choices: [
      { text: "สำรวจห้องแล็บก่อน", next: "path_explore", set: { curious: true } },
      { text: "ถามลูน่าให้ละเอียดก่อน", next: "path_ask" }
    ]
  },
  path_explore: {
    id: "path_explore", type: "dialogue",
    background: "digital_world", effect: "flash",
    character: "protagonist", expression: "surprised",
    speaker: "ตัวเอก", text: "โอ้โห! จอทุกจอเต็มไปด้วยโค้ดเลย!",
    next: "question_intro"
  },
  path_ask: {
    id: "path_ask", type: "dialogue",
    character: "luna", expression: "normal",
    speaker: "ลูน่า", text: "ดีมาก ถามก่อนลงมือเป็นนิสัยที่ดี ระบบนี้ถูกล็อกด้วยคำถามพื้นฐานด้าน IT",
    next: "question_intro"
  },
  question_intro: {
    id: "question_intro", type: "dialogue",
    character: "luna", expression: "normal",
    speaker: "ลูน่า", text: "ตอบคำถามให้ถูกอย่างน้อย 2 ข้อ แล้วระบบจะปลดล็อก พร้อมไหม?",
    next: "question_01"
  },
  question_01: {
    id: "question_01", type: "quiz",
    questionSet: "it_basics",
    passNext: "pass_01", failNext: "fail_01"
  },
  pass_01: {
    id: "pass_01", type: "dialogue",
    character: "luna", expression: "happy",
    speaker: "ลูน่า", text: "เยี่ยมมาก! ระบบปลดล็อกแล้ว", set: { mission_complete: true },
    next: "check_01"
  },
  fail_01: {
    id: "fail_01", type: "dialogue",
    character: "luna", expression: "sad",
    speaker: "ลูน่า", text: "ยังไม่ผ่านนะ แต่ไม่เป็นไร เราไปต่อกันก่อน",
    next: "check_01"
  },
  check_01: {
    id: "check_01", type: "condition",
    if: { var: "curious", op: "==", value: true },
    then: "ending_curious", else: "ending"
  },
  ending_curious: {
    id: "ending_curious", type: "ending",
    title: "นักสำรวจแห่งกาลเวลา", background: "time_portal",
    text: "ความช่างสงสัยของเธอเปิดประตูบานแรกของการเดินทาง"
  },
  ending: {
    id: "ending", type: "ending",
    title: "จุดเริ่มต้นของการเดินทาง", background: "time_portal",
    text: "การผจญภัยเพิ่งเริ่มต้นขึ้น"
  }
};

/* ทะเบียนวิชา — เพิ่มวิชาใหม่ที่นี่ (ดูวิธีใน README.md ข้อ "เพิ่มวิชาใหม่")
   หากมีมากกว่า 1 วิชา เกมจะให้ผู้เล่นเลือกวิชาตอนกด New Game */
const subjects = {
  it: {
    title: "เทคโนโลยีสารสนเทศ (IT)",
    description: "ภารกิจกู้ระบบข้อมูลของโลกอนาคต",
    cover: "future_lab",              // id ฉากหลังที่ใช้เป็นภาพหน้าปก
    start: "start",                   // ID เหตุการณ์แรก
    questionSets: ["it_basics"],      // ชุดคำถามของวิชานี้ (ใช้ตรวจสอบความถูกต้อง)
    story: storyData
  }
};
