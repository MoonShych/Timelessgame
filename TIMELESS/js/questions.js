/* questions.js — ข้อมูลคำถามทั้งหมด (แก้ไฟล์นี้ได้เลย ไม่ต้องแตะ engine.js)

   ตัวเลือกระดับ "ชุดคำถาม":
     title            ชื่อชุด
     questions        รายการคำถาม
     requiredCorrect  ต้องตอบถูกกี่ข้อจึงจะผ่าน (ไม่ใส่ = ต้องถูกทุกข้อ)
     pointsPerQuestion คะแนนต่อข้อ (ค่าเริ่มต้น 1)
     showExplanation  แสดงคำอธิบายเฉลยหลังตอบ (ค่าเริ่มต้น true)
     allowRetry       ตอบผิดแล้วให้ตอบใหม่ได้ (ค่าเริ่มต้น false)
     shuffleQuestions สุ่มลำดับคำถาม (ค่าเริ่มต้น false)
     shuffleOptions   สุ่มลำดับตัวเลือก (ค่าเริ่มต้น false)

   ตัวเลือกระดับ "คำถาม":
     id, question, options (2 ตัวเลือกขึ้นไป), answer (เริ่มนับจาก 0), explanation
     points       (ไม่บังคับ) คะแนนเฉพาะข้อนี้
     correctNext  (ไม่บังคับ) ตอบถูกแล้วกระโดดไปเหตุการณ์นี้ทันที
     wrongNext    (ไม่บังคับ) ตอบผิดแล้วกระโดดไปเหตุการณ์นี้ทันที
     showAnswerBefore (ไม่บังคับ) true = ใบ้คำตอบก่อนตอบ (ปกติไม่เปิดเผย) */
const questionSets = {
  it_basics: {
    title: "พื้นฐานเทคโนโลยีสารสนเทศ",
    requiredCorrect: 2,
    pointsPerQuestion: 1,
    showExplanation: true,
    allowRetry: false,
    shuffleQuestions: false,
    shuffleOptions: true,
    questions: [
      {
        id: "it_q001",
        question: "ภาษาใดใช้กำหนดโครงสร้างของเว็บไซต์?",
        options: ["HTML", "CSS", "JavaScript", "SQL"],
        answer: 0,
        explanation: "HTML ใช้กำหนดโครงสร้างและเนื้อหาของเว็บไซต์"
      },
      {
        id: "it_q002",
        question: "อุปกรณ์ใดทำหน้าที่เป็นหน่วยประมวลผลกลางของคอมพิวเตอร์?",
        options: ["RAM", "CPU", "Mouse", "Monitor"],
        answer: 1,
        explanation: "CPU (Central Processing Unit) คือสมองของคอมพิวเตอร์ ทำหน้าที่ประมวลผลคำสั่ง"
      },
      {
        id: "it_q003",
        question: "ข้อใดคือตัวอย่างของซอฟต์แวร์ระบบปฏิบัติการ?",
        options: ["Microsoft Word", "Google Chrome", "Windows", "Photoshop"],
        answer: 2,
        explanation: "Windows เป็นระบบปฏิบัติการ ส่วนที่เหลือเป็นซอฟต์แวร์ประยุกต์"
      },
      {
        id: "it_q004",
        question: "ข้อมูลขนาด 1 ไบต์ (Byte) เท่ากับกี่บิต (Bit)?",
        options: ["4 บิต", "16 บิต", "32 บิต", "8 บิต"],
        answer: 3,
        explanation: "1 Byte เท่ากับ 8 Bit"
      }
    ]
  }
};
