// ─────────────────────────────────────────────────────────────
// js/seed-data.js — ปุ่มกดครั้งเดียว เอาข้อมูลตัวอย่างจาก js/data.js
// ไปใส่ลง Firestore จริง (users, leaveTypes, leaveRequests, approvals)
//
// ใช้ .set() พร้อมกำหนด id เอง (เช่น "u001") แทน .add()
// เพื่อให้กดปุ่มนี้ซ้ำได้โดยไม่เกิดข้อมูลซ้ำ — กดซ้ำแค่เขียนทับด้วยค่าเดิม
// ─────────────────────────────────────────────────────────────

(function () {
  var ปุ่ม = document.getElementById("ปุ่มใส่ข้อมูลตัวอย่าง");
  if (!ปุ่ม) return;

  var กล่องสถานะ = document.getElementById("สถานะข้อมูลตัวอย่าง");

  ปุ่ม.addEventListener("click", function () {
    if (!confirm("ใส่ข้อมูลตัวอย่างลง Firestore ตอนนี้เลยหรือไม่? (กดซ้ำได้ ไม่เกิดข้อมูลซ้ำ)")) return;

    ปุ่ม.disabled = true;
    แสดงสถานะ("กำลังใส่ข้อมูล…");

    ใส่ข้อมูลตัวอย่าง()
      .then(function () { แสดงสถานะ("✅ ใส่ข้อมูลสำเร็จ — เปิดหน้ารายการใบลาดูได้เลย"); })
      .catch(function (err) { แสดงสถานะ("❌ ใส่ข้อมูลไม่สำเร็จ: " + err.message); })
      .then(function () { ปุ่ม.disabled = false; });
  });

  function แสดงสถานะ(ข้อความ) {
    if (กล่องสถานะ) กล่องสถานะ.textContent = ข้อความ;
  }

  async function ใส่ข้อมูลตัวอย่าง() {
    var ข้อมูล = window.LEAVE_DATA;

    for (var i = 0; i < ข้อมูล.users.length; i++) {
      var ผู้ใช้ = ข้อมูล.users[i];
      await db.collection("users").doc(ผู้ใช้.id).set({
        name: ผู้ใช้.name, email: ผู้ใช้.email, role: ผู้ใช้.role
      });
    }

    for (var j = 0; j < ข้อมูล.leaveTypes.length; j++) {
      var ประเภท = ข้อมูล.leaveTypes[j];
      await db.collection("leaveTypes").doc(ประเภท.id).set({ name: ประเภท.name });
    }

    for (var k = 0; k < ข้อมูล.leaveRequests.length; k++) {
      var ใบ = ข้อมูล.leaveRequests[k];
      await db.collection("leaveRequests").doc(ใบ.id).set({
        title: ใบ.title, reason: ใบ.reason, status: ใบ.status,
        requesterId: ใบ.requesterId, requesterName: ใบ.requesterName,
        approverId: ใบ.approverId, approverName: ใบ.approverName,
        leaveTypeId: ใบ.leaveTypeId, leaveTypeName: ใบ.leaveTypeName,
        startDate: ใบ.startDate, endDate: ใบ.endDate, createdAt: ใบ.createdAt
      });
    }

    for (var m = 0; m < ข้อมูล.approvals.length; m++) {
      var ความเห็น = ข้อมูล.approvals[m];
      await db.collection("leaveRequests").doc(ความเห็น.requestId)
        .collection("approvals").doc(ความเห็น.id).set({
          authorId: ความเห็น.authorId, authorName: ความเห็น.authorName,
          message: ความเห็น.message, createdAt: ความเห็น.createdAt
        });
    }
  }
})();
