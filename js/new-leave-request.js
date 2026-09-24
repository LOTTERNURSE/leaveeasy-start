// ─────────────────────────────────────────────────────────────
// js/new-leave-request.js — หน้าที่ 2 ยื่นใบลาใหม่
// สัปดาห์ที่ 7: บันทึกลงฐานข้อมูล Firestore จริง
// ─────────────────────────────────────────────────────────────

(function () {
  var ฟอร์ม = document.getElementById("ฟอร์มใบลา");
  var ช่องประเภท = document.getElementById("leaveTypeId");
  var กล่องเตือน = document.getElementById("ข้อความเตือน");
  var ช่องเหตุผล = document.getElementById("reason");
  var ปุ่มAI = document.getElementById("ปุ่มAI");
  var สถานะAI = document.getElementById("สถานะAI");
  var ป้ายAI = document.getElementById("ป้ายAI");

  var ประเภททั้งหมด = [];

  // อ่านประเภทการลาจาก Firestore หลังจากล็อกอินพร้อม
  window.รอสถานะล็อกอิน.then(function () {
    return db.collection("leaveTypes").get();
  }).then(function (snap) {
    ประเภททั้งหมด = snap.docs.map(function (d) {
      return Object.assign({ id: d.id }, d.data());
    });

    // เติมรายการเลื่อนลง
    ประเภททั้งหมด.forEach(function (ประเภท) {
      var ตัวเลือก = document.createElement("option");
      ตัวเลือก.value = ประเภท.id;
      ตัวเลือก.textContent = ประเภท.name;
      ช่องประเภท.appendChild(ตัวเลือก);
    });
  }).catch(function (err) {
    เตือน("โหลดประเภทการลาไม่สำเร็จ: " + err.message);
  });

  ปุ่มAI.addEventListener("click", async function () {
    var เหตุผล = ช่องเหตุผล.value.trim();
    if (!เหตุผล) {
      แจ้งAI("พิมพ์เหตุผลการลาก่อน แล้วค่อยกดให้ AI ช่วยจัดประเภท");
      return;
    }

    ป้ายAI.classList.add("hidden");
    แจ้งAI("");
    ปุ่มAI.disabled = true;
    var ข้อความปุ่มเดิม = ปุ่มAI.textContent;
    ปุ่มAI.textContent = "กำลังจัดประเภท...";

    try {
      var ประเภทที่AIเลือก = await จัดประเภทด้วยAI(เหตุผล, ประเภททั้งหมด);
      if (ประเภทที่AIเลือก) {
        ช่องประเภท.value = ประเภทที่AIเลือก.id;
        ป้ายAI.classList.remove("hidden");
      } else {
        แจ้งAI("AI จัดประเภทให้ไม่ได้ — ลองเลือกเองได้เลย");
      }
    } catch (err) {
      แจ้งAI("AI จัดประเภทให้ไม่ได้ตอนนี้ (" + err.message + ") — ลองเลือกเองได้เลย");
    } finally {
      ปุ่มAI.disabled = false;
      ปุ่มAI.textContent = ข้อความปุ่มเดิม;
    }
  });

  function แจ้งAI(ข้อความ) {
    สถานะAI.textContent = ข้อความ;
    สถานะAI.classList.toggle("hidden", !ข้อความ);
  }

  ฟอร์ม.addEventListener("submit", function (e) {
    e.preventDefault();

    var ค่า = {
      title: document.getElementById("title").value.trim(),
      reason: document.getElementById("reason").value.trim(),
      leaveTypeId: ช่องประเภท.value,
      startDate: document.getElementById("startDate").value,
      endDate: document.getElementById("endDate").value
    };

    // ตรวจว่ากรอกครบก่อนบันทึก
    if (!ค่า.title || !ค่า.reason || !ค่า.leaveTypeId || !ค่า.startDate || !ค่า.endDate) {
      เตือน("กรอกไม่ครบ — ต้องกรอกทุกช่องก่อนกดบันทึก");
      return;
    }
    if (ค่า.endDate < ค่า.startDate) {
      เตือน("วันที่สิ้นสุดต้องไม่มาก่อนวันที่เริ่มลา");
      return;
    }

    var ประเภท = ประเภททั้งหมด.find(function (t) { return t.id === ค่า.leaveTypeId; });

    var ผู้ใช้ = firebase.auth().currentUser;
    var ใบใหม่ = {
      title: ค่า.title,
      reason: ค่า.reason,
      status: "รอพิจารณา",
      requesterId: ผู้ใช้.uid,
      requesterName: ผู้ใช้.displayName || ผู้ใช้.email,
      approverId: "",
      approverName: "",
      leaveTypeId: ประเภท.id,
      leaveTypeName: ประเภท.name,
      startDate: ค่า.startDate,
      endDate: ค่า.endDate,
      createdAt: เวลาตอนนี้()
    };

    db.collection("leaveRequests").add(ใบใหม่).then(function () {
      location.href = "leave-requests.html";
    }).catch(function (err) {
      เตือน("บันทึกใบลาไม่สำเร็จ: " + err.message);
    });
  });

  function เตือน(ข้อความ) {
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    กล่องเตือน.classList.remove("hidden");
  }
})();
