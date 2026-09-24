// ─────────────────────────────────────────────────────────────
// js/leave-types.js — หน้าที่ 4 จัดการประเภทการลา
// สัปดาห์ที่ 7: เพิ่ม แก้ ลบ ใน Firestore จริง (collection leaveTypes)
// ─────────────────────────────────────────────────────────────

(function () {
  var รายการ = [];
  var ที่วางตาราง = document.getElementById("ตารางประเภท");
  var ช่องชื่อใหม่ = document.getElementById("ชื่อประเภทใหม่");
  var กล่องเตือน = document.getElementById("เตือนประเภท");
  var กล่องเนื้อหา = document.getElementById("เนื้อหาประเภทการลา");
  var กล่องไม่มีสิทธิ์ = document.getElementById("ไม่มีสิทธิ์เข้าถึง");

  // รอให้แน่ใจก่อนว่าล็อกอินอยู่จริง (auth token พร้อม) แล้วเช็คสิทธิ์ก่อนค่อยอ่าน Firestore
  // หน้านี้สำหรับฝ่ายบุคคล (role: hr) เท่านั้น — สัปดาห์ที่ 8
  window.รอสถานะล็อกอิน.then(function (user) {
    return db.collection("users").doc(user.uid).get();
  }).then(function (docผู้ใช้) {
    var ข้อมูลผู้ใช้ = docผู้ใช้.data();
    if (!ข้อมูลผู้ใช้ || ข้อมูลผู้ใช้.role !== "hr") {
      กล่องเนื้อหา.classList.add("hidden");
      กล่องไม่มีสิทธิ์.classList.remove("hidden");
      return null;   // ไม่ใช่ hr จึงไม่อ่าน leaveTypes ต่อ
    }
    return db.collection("leaveTypes").get();
  }).then(function (snap) {
    if (!snap) return;   // ไม่ใช่ hr เข้ามา จบตั้งแต่ขั้นเช็คสิทธิ์แล้ว
    รายการ = snap.docs.map(function (d) {
      return Object.assign({ id: d.id }, d.data());
    });
    วาดตาราง();
  }).catch(function (err) {
    ที่วางตาราง.innerHTML = "<p>โหลดข้อมูลจาก Firestore ไม่สำเร็จ: " + esc(err.message) + "</p>";
  });

  document.getElementById("ปุ่มเพิ่ม").addEventListener("click", เพิ่มประเภท);

  function วาดตาราง() {
    if (รายการ.length === 0) {
      ที่วางตาราง.innerHTML = "<p>ยังไม่มีประเภทการลาในระบบ</p>";
      return;
    }

    var html = "<table><thead><tr><th>ชื่อประเภทการลา</th><th>จัดการ</th></tr></thead><tbody>";
    รายการ.forEach(function (ประเภท) {
      html +=
        "<tr><td>" + esc(ประเภท.name) + "</td><td>" +
        '<button type="button" class="btn-ghost" data-edit="' + esc(ประเภท.id) + '">แก้ไข</button> ' +
        '<button type="button" class="btn-danger" data-del="' + esc(ประเภท.id) + '">ลบ</button>' +
        "</td></tr>";
    });
    html += "</tbody></table>";
    ที่วางตาราง.innerHTML = html;

    ที่วางตาราง.querySelectorAll("[data-edit]").forEach(function (ปุ่ม) {
      ปุ่ม.addEventListener("click", function () { แก้ประเภท(ปุ่ม.dataset.edit); });
    });
    ที่วางตาราง.querySelectorAll("[data-del]").forEach(function (ปุ่ม) {
      ปุ่ม.addEventListener("click", function () { ลบประเภท(ปุ่ม.dataset.del); });
    });
  }

  function เพิ่มประเภท() {
    var ชื่อ = ช่องชื่อใหม่.value.trim();
    if (!ชื่อ) {
      กล่องเตือน.textContent = "⚠️ พิมพ์ชื่อประเภทการลาก่อน จึงจะเพิ่มได้";
      กล่องเตือน.classList.remove("hidden");
      return;
    }
    กล่องเตือน.classList.add("hidden");

    db.collection("leaveTypes").add({ name: ชื่อ })
      .then(function (docRef) {
        รายการ.push({ id: docRef.id, name: ชื่อ });
        ช่องชื่อใหม่.value = "";
        วาดตาราง();
      })
      .catch(function (err) {
        กล่องเตือน.textContent = "⚠️ เพิ่มประเภทไม่สำเร็จ: " + err.message;
        กล่องเตือน.classList.remove("hidden");
      });
  }

  function แก้ประเภท(id) {
    var ประเภท = รายการ.find(function (t) { return t.id === id; });
    var ชื่อใหม่ = prompt("แก้ชื่อประเภทการลา", ประเภท.name);
    if (ชื่อใหม่ === null) return;              // กดยกเลิก
    if (!ชื่อใหม่.trim()) { alert("ชื่อประเภทการลาว่างเปล่าไม่ได้"); return; }

    db.collection("leaveTypes").doc(id).update({ name: ชื่อใหม่.trim() })
      .then(function () {
        ประเภท.name = ชื่อใหม่.trim();
        วาดตาราง();
      })
      .catch(function (err) {
        กล่องเตือน.textContent = "⚠️ แก้ประเภทไม่สำเร็จ: " + err.message;
        กล่องเตือน.classList.remove("hidden");
      });
  }

  function ลบประเภท(id) {
    var ประเภท = รายการ.find(function (t) { return t.id === id; });
    if (!confirm('ยืนยันการลบประเภท "' + ประเภท.name + '" หรือไม่')) return;

    db.collection("leaveTypes").doc(id).delete()
      .then(function () {
        รายการ = รายการ.filter(function (t) { return t.id !== id; });
        วาดตาราง();
      })
      .catch(function (err) {
        กล่องเตือน.textContent = "⚠️ ลบประเภทไม่สำเร็จ: " + err.message;
        กล่องเตือน.classList.remove("hidden");
      });
  }
})();
