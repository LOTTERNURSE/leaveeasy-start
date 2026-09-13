// หน้าทดสอบเล็ก ๆ: ส่งข้อความว่า "สวัสดี" ไปยัง OpenRouter แล้วแสดงคำตอบ
// คีย์ API มาจากช่องกรอกของผู้ใช้เท่านั้น (เก็บใน sessionStorage) ไม่เขียนลงไฟล์ใด ๆ

const โมเดล = "google/gemini-2.5-flash-lite";
const ปลายทาง = "https://openrouter.ai/api/v1/chat/completions";
const กุญแจเก็บคีย์ = "openrouterApiKey";

document.addEventListener("DOMContentLoaded", () => {
  const ช่องคีย์ = document.getElementById("ช่องคีย์");
  const ปุ่มส่ง = document.getElementById("ปุ่มส่ง");
  const สถานะ = document.getElementById("สถานะ");
  const กล่องคำตอบ = document.getElementById("กล่องคำตอบ");
  const คำตอบ = document.getElementById("คำตอบ");

  const คีย์เดิม = sessionStorage.getItem(กุญแจเก็บคีย์);
  if (คีย์เดิม) ช่องคีย์.value = คีย์เดิม;

  ปุ่มส่ง.addEventListener("click", async () => {
    const คีย์ = ช่องคีย์.value.trim();
    if (!คีย์) {
      สถานะ.textContent = "กรุณาใส่ API Key ก่อน";
      return;
    }
    sessionStorage.setItem(กุญแจเก็บคีย์, คีย์);

    ปุ่มส่ง.disabled = true;
    สถานะ.textContent = "กำลังส่งข้อความ...";
    กล่องคำตอบ.style.display = "none";

    try {
      const res = await fetch(ปลายทาง, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${คีย์}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: โมเดล,
          messages: [{ role: "user", content: "สวัสดี" }],
        }),
      });

      const ข้อมูล = await res.json();

      if (!res.ok) {
        throw new Error(ข้อมูล?.error?.message || `เรียก API ไม่สำเร็จ (HTTP ${res.status})`);
      }

      const ข้อความตอบกลับ = ข้อมูล?.choices?.[0]?.message?.content ?? "(ไม่มีคำตอบ)";
      คำตอบ.textContent = ข้อความตอบกลับ;
      กล่องคำตอบ.style.display = "block";
      สถานะ.textContent = "";
    } catch (err) {
      สถานะ.textContent = `เกิดข้อผิดพลาด: ${err.message}`;
    } finally {
      ปุ่มส่ง.disabled = false;
    }
  });
});
