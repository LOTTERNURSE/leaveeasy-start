// ─────────────────────────────────────────────────────────────
// js/firebase-config.js — ต่อเว็บนี้เข้ากับโปรเจกต์ Firebase จริง
// สัปดาห์ที่ 6: เปิดใช้ Firestore เป็นคลังเก็บข้อมูลจริง
//
// ⚠️ apiKey ด้านล่างไม่ใช่ความลับ — ปลอดภัยที่จะ commit ลง repo
// Firebase คุมสิทธิ์เข้าถึงข้อมูลจริงด้วย Security Rules (ฝั่ง Firestore)
// ไม่ได้คุมด้วยการซ่อน apiKey นี้
// ─────────────────────────────────────────────────────────────

var firebaseConfig = {
  apiKey: "AIzaSyDMDwZOvns400XNXxrqfTplivZDlLvtmW0",
  authDomain: "lotternurse.firebaseapp.com",
  projectId: "lotternurse",
  storageBucket: "lotternurse.firebasestorage.app",
  messagingSenderId: "734742041917",
  appId: "1:734742041917:web:0cf139c2e8eeabe4b3a154",
  measurementId: "G-BE0CL0T8KS"
};

firebase.initializeApp(firebaseConfig);

// ตัวแปร global เดียวที่ทุกหน้าจะเรียกใช้เพื่ออ่าน/เขียน Firestore
window.db = firebase.firestore();
