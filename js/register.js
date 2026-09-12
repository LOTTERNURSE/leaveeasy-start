// ─────────────────────────────────────────────────────────────
// js/register.js — หน้าสมัครสมาชิก
// สัปดาห์ที่ 7: สมัครด้วย Firebase Authentication แล้วสร้างไฟล์
// ในโฟลเดอร์ users พร้อมช่อง role เริ่มต้นเป็น employee เสมอ
// ─────────────────────────────────────────────────────────────

(function () {
  var ฟอร์ม = document.getElementById("ฟอร์มสมัคร");
  var กล่องเตือน = document.getElementById("ข้อความเตือน");

  // ล็อกอินอยู่แล้ว ไม่ต้องมาหน้านี้อีก — เช็คแค่ตอนเปิดหน้าครั้งแรกครั้งเดียว
  // (ต้อง unsubscribe ทันที ไม่งั้นตอนสมัครสำเร็จ event นี้จะยิงซ้ำแล้วเด้งไปก่อน
  // ที่จะเขียน users/{uid} เสร็จ)
  var เลิกฟังสถานะ = firebase.auth().onAuthStateChanged(function (user) {
    เลิกฟังสถานะ();
    if (user) location.href = "index.html";
  });

  ฟอร์ม.addEventListener("submit", function (e) {
    e.preventDefault();
    กล่องเตือน.classList.add("hidden");

    var ชื่อ = document.getElementById("name").value.trim();
    var อีเมล = document.getElementById("email").value.trim();
    var รหัสผ่าน = document.getElementById("password").value;

    if (!ชื่อ || !อีเมล || !รหัสผ่าน) {
      เตือน("กรอกให้ครบทุกช่อง");
      return;
    }

    var ปุ่ม = document.getElementById("ปุ่มสมัคร");
    ปุ่ม.disabled = true;

    firebase.auth().createUserWithEmailAndPassword(อีเมล, รหัสผ่าน).then(function (ผลลัพธ์) {
      return ผลลัพธ์.user.updateProfile({ displayName: ชื่อ }).then(function () {
        return db.collection("users").doc(ผลลัพธ์.user.uid).set({
          name: ชื่อ,
          email: อีเมล,
          role: "employee"
        });
      });
    }).then(function () {
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
    if (err.code === "auth/email-already-in-use") return "อีเมลนี้ถูกใช้สมัครแล้ว";
    if (err.code === "auth/invalid-email") return "รูปแบบอีเมลไม่ถูกต้อง";
    if (err.code === "auth/weak-password") return "รหัสผ่านสั้นเกินไป ต้องมีอย่างน้อย 6 ตัวอักษร";
    return "สมัครสมาชิกไม่สำเร็จ: " + err.message;
  }
})();
