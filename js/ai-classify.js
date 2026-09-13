// ─────────────────────────────────────────────────────────────
// js/ai-classify.js — เรียก OpenRouter ให้ช่วยจัดประเภทการลา (US-09, สัปดาห์ที่ 8)
// แยกออกจาก new-leave-request.js เพื่อไม่ให้ตรรกะเรียก AI ปนกับตรรกะฟอร์ม
// ─────────────────────────────────────────────────────────────

var โมเดลAI = "google/gemini-2.5-flash-lite";
var ปลายทางAI = "https://openrouter.ai/api/v1/chat/completions";
var เวลาสูงสุดAI = 15000; // ms — ตามสเปก "รอเกิน 15 วินาที ต้องไม่ค้าง"

// จัดประเภทการลาด้วย AI จากเหตุผลที่พิมพ์ + รายชื่อประเภทที่มีอยู่จริงในระบบ
// คืนค่า: ตัวประเภทที่ตรง (อ้างจาก รายการประเภท เดิม) หรือ null ถ้า AI หาที่ตรงไม่เจอ
// throw error เมื่อเรียกไม่สำเร็จหรือเกินเวลา — ผู้เรียกต้อง try/catch เอง
async function จัดประเภทด้วยAI(เหตุผล, รายการประเภท) {
  if (!window.OPENROUTER_API_KEY) {
    throw new Error("ยังไม่ได้ตั้งค่าคีย์ AI (คัดลอก js/openrouter-config.example.js ไปตั้งชื่อ js/openrouter-config.js แล้วใส่คีย์)");
  }

  var รายชื่อ = รายการประเภท.map(function (t) { return t.name; });
  var คำสั่งระบบ =
    "คุณคือผู้ช่วยจัดประเภทใบลา เลือกชื่อประเภทการลาที่ตรงกับเหตุผลที่สุด " +
    "จากรายการนี้เท่านั้น: " + รายชื่อ.join(", ") + " " +
    "ห้ามตอบชื่ออื่นนอกรายการเด็ดขาด ถ้าไม่มีชื่อไหนตรงกับเหตุผลเลย ให้ตอบคำเดียวว่า ไม่พบ " +
    "ตอบกลับเฉพาะชื่อประเภท หรือคำว่า ไม่พบ เท่านั้น ห้ามอธิบายเพิ่มเติม";

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
        max_tokens: 20,
        messages: [
          { role: "system", content: คำสั่งระบบ },
          { role: "user", content: เหตุผล },
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

  var คำตอบ = ((ข้อมูล.choices && ข้อมูล.choices[0] && ข้อมูล.choices[0].message && ข้อมูล.choices[0].message.content) || "").trim();

  var ประเภทที่ตรง = รายการประเภท.find(function (t) {
    return t.name.trim().toLowerCase() === คำตอบ.toLowerCase();
  });

  return ประเภทที่ตรง || null;
}
