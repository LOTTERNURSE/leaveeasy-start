// ─────────────────────────────────────────────────────────────
// js/login.js — หน้าเข้าสู่ระบบ
// สัปดาห์ที่ 7: ล็อกอินด้วยอีเมล/รหัสผ่านของ Firebase Authentication
// ─────────────────────────────────────────────────────────────

(function () {
  var ฟอร์ม = document.getElementById("ฟอร์มล็อกอิน");
  var กล่องเตือน = document.getElementById("ข้อความเตือน");

  // ล็อกอินอยู่แล้ว ไม่ต้องมาหน้านี้อีก — เช็คแค่ตอนเปิดหน้าครั้งแรกครั้งเดียว
  var เลิกฟังสถานะ = firebase.auth().onAuthStateChanged(function (user) {
    เลิกฟังสถานะ();
    if (user) location.href = "index.html";
  });

  ฟอร์ม.addEventListener("submit", function (e) {
    e.preventDefault();
    กล่องเตือน.classList.add("hidden");

    var อีเมล = document.getElementById("email").value.trim();
    var รหัสผ่าน = document.getElementById("password").value;

    if (!อีเมล || !รหัสผ่าน) {
      เตือน("กรอกอีเมลและรหัสผ่านให้ครบ");
      return;
    }

    var ปุ่ม = document.getElementById("ปุ่มเข้าสู่ระบบ");
    ปุ่ม.disabled = true;

    firebase.auth().signInWithEmailAndPassword(อีเมล, รหัสผ่าน).then(function () {
      location.href = "index.html";
    }).catch(function (err) {
      เตือน(แปลข้อผิดพลาด(err));
      ปุ่ม.disabled = false;
    });
  });

  function เตือน(ข้อความ) {
    กล่องเตือน.textContent = "⚠️ " + ข้อความ;
    กล่องเตือน.classList.remove("hidden");
  }

  function แปลข้อผิดพลาด(err) {
    if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
      return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
    }
    if (err.code === "auth/invalid-email") return "รูปแบบอีเมลไม่ถูกต้อง";
    if (err.code === "auth/too-many-requests") return "ลองผิดหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่";
    return "เข้าสู่ระบบไม่สำเร็จ: " + err.message;
  }
})();
