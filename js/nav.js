// ─────────────────────────────────────────────────────────────
// js/nav.js — แถบเมนูด้านบนที่ใช้ร่วมกันทุกหน้า
// แก้เมนูที่ไฟล์นี้ที่เดียว ทุกหน้าเปลี่ยนตามพร้อมกัน
//
// วิธีใช้: ทุกหน้ามี <div id="nav"></div> ไว้บนสุดของ body
// ─────────────────────────────────────────────────────────────

(function () {
  // "ประเภทการลา" ไม่อยู่ในนี้ตั้งแต่แรก เพราะเป็นเมนูเฉพาะฝ่ายบุคคล (role: hr)
  // ต้องรอรู้ก่อนว่าใครล็อกอินอยู่ จึงค่อยแทรกเข้าไปทีหลัง (ดู onAuthStateChanged ด้านล่าง)
  var เมนู = [
    { href: "index.html",             ชื่อ: "หน้าแรก" },
    { href: "leave-requests.html",    ชื่อ: "รายการใบลา" },
    { href: "new-leave-request.html", ชื่อ: "ยื่นใบลาใหม่" }
  ];

  // ชื่อไฟล์ของหน้าที่กำลังเปิดอยู่ เอาไว้ขีดเส้นใต้เมนูที่ตรงกัน
  var หน้าปัจจุบัน = location.pathname.split("/").pop() || "index.html";

  var html = '<div class="navbar"><span class="brand">🔧 LeaveEasy</span>';
  เมนู.forEach(function (m) {
    var active = m.href === หน้าปัจจุบัน ? ' class="active"' : "";
    html += '<a href="' + m.href + '"' + active + ">" + m.ชื่อ + "</a>";
  });
  // ช่องว่างสำหรับแสดงชื่อคนที่ล็อกอินอยู่ (เติมค่าในสัปดาห์ที่ 7)
  html += '<span class="nav-user" id="navUser"></span></div>';

  var ที่วาง = document.getElementById("nav");
  if (ที่วาง) ที่วาง.innerHTML = html;
})();

// เติมชื่อผู้ใช้ที่ล็อกอินอยู่ + ปุ่มออกจากระบบ (สัปดาห์ที่ 7)
firebase.auth().onAuthStateChanged(function (user) {
  var ที่วางชื่อ = document.getElementById("navUser");
  if (!ที่วางชื่อ) return;

  if (!user) {
    ที่วางชื่อ.textContent = "";
    return;
  }

  ที่วางชื่อ.innerHTML = esc(user.displayName || user.email) + ' · <a href="#" id="ปุ่มออกจากระบบ">ออกจากระบบ</a>';
  document.getElementById("ปุ่มออกจากระบบ").addEventListener("click", function (e) {
    e.preventDefault();
    firebase.auth().signOut().then(function () { location.href = "login.html"; });
  });

  // ฝ่ายบุคคล (role: hr) เท่านั้นที่เห็นเมนู "ประเภทการลา" — เช็คจาก users/{uid}
  db.collection("users").doc(user.uid).get().then(function (doc) {
    var ข้อมูลผู้ใช้ = doc.data();
    if (!ข้อมูลผู้ใช้ || ข้อมูลผู้ใช้.role !== "hr") return;

    var หน้าปัจจุบัน = location.pathname.split("/").pop() || "index.html";
    var ลิงก์ประเภทการลา = document.createElement("a");
    ลิงก์ประเภทการลา.href = "leave-types.html";
    ลิงก์ประเภทการลา.textContent = "ประเภทการลา";
    if (หน้าปัจจุบัน === "leave-types.html") ลิงก์ประเภทการลา.className = "active";

    ที่วางชื่อ.parentNode.insertBefore(ลิงก์ประเภทการลา, ที่วางชื่อ);
  }).catch(function () {
    // อ่าน role ไม่สำเร็จ (เช่น ยังไม่มีเอกสารผู้ใช้) ก็แค่ไม่แสดงเมนูนี้ ไม่ต้องแจ้งเตือน
  });
});

// แถบเตือนสีเหลือง ใช้ตอนที่ยังไม่ได้ตั้งค่า Firebase
function showConfigWarning(ข้อความ) {
  var กล่อง = document.createElement("div");
  กล่อง.className = "alert alert-warn";
  กล่อง.innerHTML =
    "⚠️ <strong>ยังไม่ได้ตั้งค่า Firebase</strong> — " +
    (ข้อความ || "หน้านี้จึงยังไม่ได้อ่านข้อมูลจากฐานข้อมูลจริง") +
    "<br>วิธีตั้งค่าอยู่ในไฟล์ SETUP.md ขั้นที่ 4";
  var ที่วาง = document.querySelector(".container") || document.body;
  ที่วาง.insertBefore(กล่อง, ที่วาง.firstChild);
}
