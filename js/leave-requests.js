// ─────────────────────────────────────────────────────────────
// js/leave-requests.js — หน้าที่ 1 รายการใบลา
// สัปดาห์ที่ 6: อ่านจาก Firestore จริง (โฟลเดอร์ leaveRequests)
// ─────────────────────────────────────────────────────────────

(function () {
  var กล่อง = document.getElementById("ผลลัพธ์");

  // รอให้แน่ใจก่อนว่าล็อกอินอยู่จริง (auth token พร้อม) แล้วค่อยอ่าน Firestore
  window.รอสถานะล็อกอิน.then(function () {
    return db.collection("leaveRequests").get();
  }).then(function (snap) {
    var ใบลาจากFirestore = snap.docs.map(function (d) {
      return Object.assign({ id: d.id }, d.data());
    });

    // ใบที่เพิ่งยื่นในหน้าถัดไปยังไม่บันทึกลง Firestore จริง (เป็นงานสัปดาห์ที่ 7)
    // จึงยังต้องรวมกับของที่ค้างไว้ใน sessionStorage เหมือนเดิม
    var ใบลาที่ยื่นใหม่ = JSON.parse(sessionStorage.getItem("ใบลาที่ยื่นใหม่") || "[]");
    var ใบลาทั้งหมด = ใบลาจากFirestore.concat(ใบลาที่ยื่นใหม่);

    // ถ้ามีสถานะติดมาท้าย URL ให้กรองเฉพาะสถานะนั้น
    var สถานะที่กรอง = ค่าจากURL("status");
    if (สถานะที่กรอง) {
      ใบลาทั้งหมด = ใบลาทั้งหมด.filter(function (ใบ) { return ใบ.status === สถานะที่กรอง; });
      document.querySelector(".subtitle").textContent =
        "กำลังแสดงเฉพาะใบลาที่สถานะ " + สถานะที่กรอง + " · กดเมนู รายการใบลา เพื่อดูทั้งหมด";
    }

    แสดงตาราง(ใบลาทั้งหมด);
  }).catch(function (err) {
    กล่อง.innerHTML = "<p>โหลดข้อมูลจาก Firestore ไม่สำเร็จ: " + esc(err.message) + "</p>";
  });

  function แสดงตาราง(รายการ) {
    if (รายการ.length === 0) {
      กล่อง.innerHTML = "<p>ยังไม่มีใบขอลาในระบบ</p>";
      return;
    }

    var html =
      "<table><thead><tr>" +
      "<th>หัวข้อ</th>" +
      "<th>ประเภทการลา</th>" +
      "<th>สถานะ</th>" +
      '<th class="hide-mobile">ผู้ขอลา</th>' +
      '<th class="hide-mobile">วันที่ลา</th>' +
      "</tr></thead><tbody>";

    รายการ.forEach(function (ใบ) {
      html +=
        '<tr class="clickable" data-id="' + esc(ใบ.id) + '">' +
        "<td>" + esc(ใบ.title) + "</td>" +
        "<td>" + esc(ใบ.leaveTypeName) + "</td>" +
        "<td>" + ป้ายสถานะ(ใบ.status) + "</td>" +
        '<td class="hide-mobile">' + esc(ใบ.requesterName) + "</td>" +
        '<td class="hide-mobile">' + esc(ใบ.startDate) + " ถึง " + esc(ใบ.endDate) + "</td>" +
        "</tr>";
    });

    html += "</tbody></table>";
    กล่อง.innerHTML = html;

    // กดที่แถวไหน ไปหน้ารายละเอียดของใบนั้น
    กล่อง.querySelectorAll("tr.clickable").forEach(function (แถว) {
      แถว.addEventListener("click", function () {
        location.href = "leave-request-detail.html?id=" + แถว.dataset.id;
      });
    });
  }
})();
