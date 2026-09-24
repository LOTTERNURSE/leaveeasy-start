// ─────────────────────────────────────────────────────────────
// js/leave-request-detail.js — หน้าที่ 3 รายละเอียดใบลา
// สัปดาห์ที่ 6: อ่านใบลา + ความเห็นจาก Firestore จริง
// สัปดาห์ที่ 7: ปุ่มอนุมัติ/ไม่อนุมัติ และส่งความเห็น เขียนกลับ Firestore จริงแล้ว
// ─────────────────────────────────────────────────────────────

(function () {
  var รหัสใบลา = ค่าจากURL("id");
  var กล่องใบลา = document.getElementById("กล่องใบลา");
  var กล่องความเห็น = document.getElementById("กล่องความเห็น");
  var ใบ, ความเห็น;
  var บทบาทผู้ใช้;   // role ของผู้ใช้ที่ล็อกอินอยู่ (จาก users/{uid}) ใช้คุมปุ่มอนุมัติ/ไม่อนุมัติ/AI

  // ใบที่เพิ่งยื่นในหน้าที่ 2 ยังไม่บันทึกลง Firestore จริง (งานสัปดาห์ที่ 7)
  // ถ้าหาใน Firestore ไม่เจอ ให้ลองหาใน sessionStorage แทน
  var ใบลาที่ยื่นใหม่ = JSON.parse(sessionStorage.getItem("ใบลาที่ยื่นใหม่") || "[]");

  // รอให้แน่ใจก่อนว่าล็อกอินอยู่จริง (auth token พร้อม) แล้วอ่าน role ของผู้ใช้ก่อน แล้วค่อยอ่าน Firestore
  window.รอสถานะล็อกอิน.then(function (user) {
    return db.collection("users").doc(user.uid).get();
  }).then(function (userDoc) {
    บทบาทผู้ใช้ = userDoc.exists ? userDoc.data().role : null;
    return db.collection("leaveRequests").doc(รหัสใบลา).get();
  }).then(function (doc) {
    if (doc.exists) {
      ใบ = Object.assign({ id: doc.id }, doc.data());
      return db.collection("leaveRequests").doc(รหัสใบลา).collection("approvals").get()
        .then(function (snap) {
          ความเห็น = snap.docs.map(function (d) { return Object.assign({ id: d.id }, d.data()); });
        });
    }
    ใบ = ใบลาที่ยื่นใหม่.find(function (x) { return x.id === รหัสใบลา; });
    ความเห็น = [];
  }).then(function () {
    if (!ใบ) {
      กล่องใบลา.innerHTML = "<p>ไม่พบใบขอลาที่ต้องการ — อาจถูกลบไปแล้ว หรือลิงก์ไม่ถูกต้อง</p>";
      return;
    }

    วาดใบลา();
    วาดความเห็น();
    กล่องความเห็น.classList.remove("hidden");

    document.getElementById("ปุ่มส่งความเห็น").addEventListener("click", ส่งความเห็น);
  }).catch(function (err) {
    กล่องใบลา.innerHTML = "<p>โหลดข้อมูลจาก Firestore ไม่สำเร็จ: " + esc(err.message) + "</p>";
  });

  // ── วาดข้อมูลใบลาลงหน้าจอ ──
  function วาดใบลา() {
    var แถว = [
      ["หัวข้อ", esc(ใบ.title)],
      ["เหตุผลการลา", esc(ใบ.reason)],
      ["ประเภทการลา", esc(ใบ.leaveTypeName)],
      ["วันที่ลา", esc(ใบ.startDate) + " ถึง " + esc(ใบ.endDate)],
      ["ผู้ขอลา", esc(ใบ.requesterName)],
      ["ผู้อนุมัติ", ใบ.approverName ? esc(ใบ.approverName) : "ยังไม่ได้กำหนดผู้อนุมัติ"],
      ["สถานะ", ป้ายสถานะ(ใบ.status)],
      ["วันที่ยื่น", esc(ใบ.createdAt)]
    ];

    var html = แถว.map(function (r) {
      return '<div class="field-row"><span class="k">' + r[0] + "</span><span>" + r[1] + "</span></div>";
    }).join("");

    // ปุ่มให้ AI ช่วยสรุปใบลา — ขึ้นเฉพาะใบที่ยังรอพิจารณา และเฉพาะ manager/hr
    // (ฟีเจอร์นี้มีไว้ช่วยหัวหน้าอ่านก่อนตัดสินใจอนุมัติ ไม่ใช่ของผู้ขอลาเอง)
    var มีสิทธิ์พิจารณา = บทบาทผู้ใช้ === "manager" || บทบาทผู้ใช้ === "hr";
    if (ใบ.status === "รอพิจารณา" && มีสิทธิ์พิจารณา) {
      if (ใบ.aiSuggestion) {
        html +=
          '<div class="alert alert-ai"><strong>สรุปโดย AI — ช่วยอ่านก่อนตัดสินใจ ไม่ใช่คำตัดสิน</strong>' +
          "<p>" + esc(ใบ.aiSuggestion) + "</p></div>";
      }
      html +=
        '<div class="btn-row">' +
        '<button type="button" class="btn-ghost" id="ปุ่มAIสรุป">🤖 ' +
        (ใบ.aiSuggestion ? "สรุปใหม่ด้วย AI" : "ให้ AI ช่วยสรุปใบลา") +
        "</button></div>" +
        '<p id="สถานะAIสรุป" class="hint hidden"></p>';
    }

    // ปุ่มอนุมัติ / ไม่อนุมัติ ขึ้นเฉพาะใบที่ยังรอพิจารณา และเฉพาะ manager/hr
    // (employee เปลี่ยนสถานะไม่ได้เลย แม้จะเป็นเจ้าของใบเองก็ตาม — ตาม ACL)
    if (ใบ.status === "รอพิจารณา" && มีสิทธิ์พิจารณา) {
      html +=
        '<div class="btn-row">' +
        '<button type="button" class="btn-ok" id="ปุ่มอนุมัติ">อนุมัติ</button>' +
        '<button type="button" class="btn-danger" id="ปุ่มไม่อนุมัติ">ไม่อนุมัติ</button>' +
        "</div>";
    } else if (ใบ.status !== "รอพิจารณา") {
      html += '<p class="hint">ใบนี้พิจารณาแล้ว จึงเปลี่ยนสถานะต่อไม่ได้</p>';
    }

    // ปุ่มลบ แสดงตลอด แต่กดไม่ได้ถ้าใบนี้พิจารณาแล้ว หรือไม่ใช่เจ้าของใบ
    // (ลบได้เฉพาะใบของตัวเองที่ยัง รอพิจารณา ไม่ว่า role จะเป็นอะไรก็ตาม)
    var เป็นเจ้าของใบ = ใบ.requesterId === firebase.auth().currentUser.uid;
    html +=
      '<div class="btn-row">' +
      '<button type="button" class="btn-danger" id="ปุ่มลบ"' +
      (ใบ.status === "รอพิจารณา" && เป็นเจ้าของใบ ? "" : " disabled") +
      ">ลบใบลา</button>" +
      "</div>";

    กล่องใบลา.innerHTML = html;

    if (ใบ.status === "รอพิจารณา" && มีสิทธิ์พิจารณา) {
      document.getElementById("ปุ่มอนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("อนุมัติ"); });
      document.getElementById("ปุ่มไม่อนุมัติ").addEventListener("click", function () { เปลี่ยนสถานะ("ไม่อนุมัติ"); });
      document.getElementById("ปุ่มAIสรุป").addEventListener("click", สรุปด้วยAI);
    }
    document.getElementById("ปุ่มลบ").addEventListener("click", ลบใบลา);
  }

  // ── ให้ AI ช่วยสรุปใบลา แล้วบันทึกผลสรุปกลับ Firestore ──
  async function สรุปด้วยAI() {
    var ปุ่ม = document.getElementById("ปุ่มAIสรุป");
    var สถานะ = document.getElementById("สถานะAIสรุป");

    ปุ่ม.disabled = true;
    var ข้อความปุ่มเดิม = ปุ่ม.textContent;
    ปุ่ม.textContent = "กำลังสรุป...";
    สถานะ.classList.add("hidden");

    var ข้อความที่ส่ง = ข้อความสรุปAI(ใบ);

    try {
      var สรุป = await สรุปใบลาด้วยAI(ใบ);
      await db.collection("leaveRequests").doc(รหัสใบลา).update({ aiSuggestion: สรุป });
      บันทึกล็อกAI(ข้อความที่ส่ง, สรุป);
      ใบ.aiSuggestion = สรุป;
      วาดใบลา();
    } catch (err) {
      บันทึกล็อกAI(ข้อความที่ส่ง, "ผิดพลาด: " + err.message);
      สถานะ.textContent = "AI สรุปให้ไม่ได้ตอนนี้ (" + err.message + ") — ยังกดอนุมัติ/ไม่อนุมัติได้ตามปกติ";
      สถานะ.classList.remove("hidden");
      ปุ่ม.disabled = false;
      ปุ่ม.textContent = ข้อความปุ่มเดิม;
    }
  }

  // ── บันทึกทุกครั้งที่เรียก AI ไว้ในโฟลเดอร์ย่อย aiLog (ไม่ block การทำงานหลัก) ──
  function บันทึกล็อกAI(input, output) {
    db.collection("leaveRequests").doc(รหัสใบลา).collection("aiLog").add({
      input: input,
      output: output,
      createdAt: เวลาตอนนี้()
    }).catch(function (err) {
      console.error("บันทึกล็อก AI ไม่สำเร็จ:", err);
    });
  }

  // ── เปลี่ยนสถานะ (เขียนกลับ Firestore จริง) ──
  function เปลี่ยนสถานะ(สถานะใหม่) {
    // กฎ: จะไม่อนุมัติได้ ต้องมีความเห็นอย่างน้อย 1 รายการก่อน
    if (สถานะใหม่ === "ไม่อนุมัติ" && ความเห็น.length === 0) {
      alert("ต้องเขียนความเห็นอย่างน้อย 1 รายการก่อน จึงจะกดไม่อนุมัติได้");
      return;
    }

    var ปุ่มอนุมัติ = document.getElementById("ปุ่มอนุมัติ");
    var ปุ่มไม่อนุมัติ = document.getElementById("ปุ่มไม่อนุมัติ");
    if (ปุ่มอนุมัติ) ปุ่มอนุมัติ.disabled = true;
    if (ปุ่มไม่อนุมัติ) ปุ่มไม่อนุมัติ.disabled = true;

    db.collection("leaveRequests").doc(รหัสใบลา).update({ status: สถานะใหม่ }).then(function () {
      ใบ.status = สถานะใหม่;   // แก้เฉพาะช่อง status เท่านั้น
      วาดใบลา();
    }).catch(function (err) {
      alert("เปลี่ยนสถานะไม่สำเร็จ: " + err.message);
      if (ปุ่มอนุมัติ) ปุ่มอนุมัติ.disabled = false;
      if (ปุ่มไม่อนุมัติ) ปุ่มไม่อนุมัติ.disabled = false;
    });
  }

  // ── ลบใบลา (ต้องยืนยันก่อนเสมอ) ──
  function ลบใบลา() {
    if (!confirm("ยืนยันลบใบลานี้? การลบไม่สามารถกู้คืนได้")) return;

    var ปุ่ม = document.getElementById("ปุ่มลบ");
    ปุ่ม.disabled = true;

    db.collection("leaveRequests").doc(รหัสใบลา).delete().then(function () {
      location.href = "leave-requests.html";
    }).catch(function (err) {
      alert("ลบไม่สำเร็จ: " + err.message);
      ปุ่ม.disabled = false;
    });
  }

  // ── รายการความเห็น เรียงจากเก่าไปใหม่ ──
  function วาดความเห็น() {
    var ที่วาง = document.getElementById("รายการความเห็น");
    if (ความเห็น.length === 0) {
      ที่วาง.innerHTML = "<p>ยังไม่มีความเห็นในใบนี้</p>";
      return;
    }
    ที่วาง.innerHTML = ความเห็น
      .slice()
      .sort(function (a, b) { return a.createdAt < b.createdAt ? -1 : 1; })
      .map(function (c) {
        return '<div class="comment"><div class="meta">' + esc(c.authorName) + " · " + esc(c.createdAt) +
               "</div><div>" + esc(c.message) + "</div></div>";
      }).join("");
  }

  // ── ส่งความเห็นใหม่ (เขียนกลับ Firestore จริง) ──
  function ส่งความเห็น() {
    var ช่อง = document.getElementById("ข้อความความเห็น");
    var เตือน = document.getElementById("เตือนความเห็น");
    var ข้อความ = ช่อง.value.trim();

    if (!ข้อความ) {
      เตือน.textContent = "⚠️ พิมพ์ข้อความก่อน จึงจะส่งความเห็นได้";
      เตือน.classList.remove("hidden");
      return;
    }
    เตือน.classList.add("hidden");

    // ผู้เขียนความเห็นคือคนที่ล็อกอินอยู่จริง (เหมือนกับ new-leave-request.js)
    var ผู้ใช้ = firebase.auth().currentUser;
    var ปุ่ม = document.getElementById("ปุ่มส่งความเห็น");
    ปุ่ม.disabled = true;

    var ความเห็นใหม่ = {
      authorId: ผู้ใช้.uid, authorName: ผู้ใช้.displayName || ผู้ใช้.email,
      message: ข้อความ,
      createdAt: เวลาตอนนี้()
    };

    db.collection("leaveRequests").doc(รหัสใบลา).collection("approvals").add(ความเห็นใหม่).then(function (ref) {
      ความเห็น.push(Object.assign({ id: ref.id }, ความเห็นใหม่));
      ช่อง.value = "";
      วาดความเห็น();
      ปุ่ม.disabled = false;
    }).catch(function (err) {
      เตือน.textContent = "⚠️ ส่งความเห็นไม่สำเร็จ: " + err.message;
      เตือน.classList.remove("hidden");
      ปุ่ม.disabled = false;
    });
  }
})();
