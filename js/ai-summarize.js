// ─────────────────────────────────────────────────────────────
// js/ai-summarize.js — เรียก OpenRouter ให้ช่วยสรุปใบลาให้หัวหน้าอ่าน
// ก่อนกดอนุมัติ (สัปดาห์ที่ 8 — ตารางหัวข้อ 8 ของสเปก)
// แยกจาก js/ai-classify.js เพราะคนละหน้า คนละ prompt
// ─────────────────────────────────────────────────────────────

var โมเดลAI = "google/gemini-2.5-flash-lite";
var ปลายทางAI = "https://openrouter.ai/api/v1/chat/completions";
var เวลาสูงสุดAI = 15000; // ms — ตามสเปก "รอเกิน 15 วินาที ต้องไม่ค้าง"

// ข้อความรายละเอียดใบลาที่จะส่งให้ AI — แยกไว้เป็นฟังก์ชันเดียว
// เพื่อให้หน้าที่เรียกใช้เอาไปบันทึกเป็น "input" ลง aiLog ได้ด้วย (ไม่ต้องสร้างซ้ำ)
function ข้อความสรุปAI(ใบ) {
  return (
    "หัวข้อ: " + ใบ.title + "\n" +
    "ประเภทการลา: " + ใบ.leaveTypeName + "\n" +
    "วันที่ลา: " + ใบ.startDate + " ถึง " + ใบ.endDate + "\n" +
    "เหตุผล: " + ใบ.reason
  );
}

// สรุปใบลาให้หัวหน้าอ่านสั้น ๆ ก่อนกดอนุมัติ (ไม่ส่งชื่อผู้ขอลาไปให้ AI)
// คืนค่า: ข้อความสรุป — throw error เมื่อเรียกไม่สำเร็จหรือเกินเวลา
async function สรุปใบลาด้วยAI(ใบ) {
  if (!window.OPENROUTER_API_KEY) {
    throw new Error("ยังไม่ได้ตั้งค่าคีย์ AI (คัดลอก js/openrouter-config.example.js ไปตั้งชื่อ js/openrouter-config.js แล้วใส่คีย์)");
  }

  var คำสั่งระบบ =
    "คุณคือผู้ช่วยสรุปใบลาให้หัวหน้าอ่านก่อนตัดสินใจอนุมัติ " +
    "เขียนสรุปสั้น ๆ ไม่เกิน 2 ประโยค เป็นภาษาไทย กระชับ ตรงประเด็น " +
    "ห้ามเดาข้อมูลที่ไม่ได้ให้มา ห้ามใส่ความเห็นส่วนตัวว่าควรอนุมัติหรือไม่";

  var รายละเอียด = ข้อความสรุปAI(ใบ);

  var ตัวตัดเวลา = new AbortController();
  var ตัวจับเวลา = setTimeout(function () { ตัวตัดเวลา.abort(); }, เวลาสูงสุดAI);

  var res;
  try {
    res = await fetch(ปลายทางAI, {
      method: "POST",
      signal: ตัวตัดเวลา.signal,
      headers: {
        "Authorization": "Bearer " + window.OPENROUTER_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: โมเดลAI,
        max_tokens: 150,
        messages: [
          { role: "system", content: คำสั่งระบบ },
          { role: "user", content: รายละเอียด },
        ],
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") throw new Error("รอนานเกิน 15 วินาที");
    throw new Error("เรียก AI ไม่สำเร็จ — ตรวจการเชื่อมต่ออินเทอร์เน็ต");
  } finally {
    clearTimeout(ตัวจับเวลา);
  }

  var ข้อมูล = await res.json();
  if (!res.ok) {
    throw new Error((ข้อมูล && ข้อมูล.error && ข้อมูล.error.message) || ("เรียก AI ไม่สำเร็จ (HTTP " + res.status + ")"));
  }

  var สรุป = ((ข้อมูล.choices && ข้อมูล.choices[0] && ข้อมูล.choices[0].message && ข้อมูล.choices[0].message.content) || "").trim();
  if (!สรุป) throw new Error("AI ไม่ได้ตอบข้อความสรุปกลับมา");
  return สรุป;
}
