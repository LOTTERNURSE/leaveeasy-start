// ─────────────────────────────────────────────────────────────
// scripts/seed-firestore.js — รันด้วย `npm run seed`
// ใส่ข้อมูลตัวอย่าง users / leaveTypes / leaveRequests ลง Firestore จริง
//
// ใช้ Firebase Web SDK ตัวเดียวกับที่เว็บใช้ (ไม่ใช่ firebase-admin
// เพราะยังไม่ต้องมี Service Account key — Firestore rules เปิดกว้างอยู่จนถึงสัปดาห์ที่ 8)
//
// เขียนด้วย id คงที่ (setDoc ไม่ใช่ addDoc) รันซ้ำได้โดยไม่เกิดข้อมูลซ้ำ
// ─────────────────────────────────────────────────────────────

const { initializeApp } = require("firebase/app");
const { getFirestore, doc, setDoc } = require("firebase/firestore");

const firebaseConfig = {
  apiKey: "AIzaSyDMDwZOvns400XNXxrqfTplivZDlLvtmW0",
  authDomain: "lotternurse.firebaseapp.com",
  projectId: "lotternurse",
  storageBucket: "lotternurse.firebasestorage.app",
  messagingSenderId: "734742041917",
  appId: "1:734742041917:web:0cf139c2e8eeabe4b3a154",
  measurementId: "G-BE0CL0T8KS"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const users = [
  { id: "u001", name: "สมชาย ใจดี",   email: "somchai@example.com", role: "employee" },
  { id: "u002", name: "สมหญิง รักงาน", email: "somying@example.com", role: "manager" },
  { id: "u003", name: "สมศรี ตั้งใจ",  email: "somsri@example.com",  role: "hr" }
];

const leaveTypes = [
  { id: "lt001", name: "ลาพักร้อน" },
  { id: "lt002", name: "ลาป่วย" },
  { id: "lt003", name: "ลากิจ" }
];

const leaveRequests = [
  {
    id: "lr001",
    title: "ลาพักร้อนไปเที่ยวกับครอบครัว",
    reason: "วางแผนเดินทางไปต่างจังหวัดกับครอบครัว จองที่พักไว้ล่วงหน้าแล้ว",
    status: "รอพิจารณา",
    requesterId: "u001", requesterName: "สมชาย ใจดี",
    approverId: "u002",  approverName: "สมหญิง รักงาน",
    leaveTypeId: "lt001", leaveTypeName: "ลาพักร้อน",
    startDate: "2026-09-07", endDate: "2026-09-09",
    createdAt: "2026-09-01 09:15"
  },
  {
    id: "lr002",
    title: "ลาป่วยไข้หวัดใหญ่",
    reason: "มีไข้สูงและไอมาก แพทย์แนะนำให้พักอยู่บ้าน 2 วัน",
    status: "อนุมัติ",
    requesterId: "u001", requesterName: "สมชาย ใจดี",
    approverId: "u002",  approverName: "สมหญิง รักงาน",
    leaveTypeId: "lt002", leaveTypeName: "ลาป่วย",
    startDate: "2026-08-24", endDate: "2026-08-25",
    createdAt: "2026-08-24 08:05"
  },
  {
    id: "lr003",
    title: "ลากิจไปทำบัตรประชาชน",
    reason: "บัตรประชาชนหมดอายุ ต้องไปทำที่สำนักงานเขตในวันทำการ",
    status: "รอพิจารณา",
    requesterId: "u003", requesterName: "สมศรี ตั้งใจ",
    approverId: "",      approverName: "",
    leaveTypeId: "lt003", leaveTypeName: "ลากิจ",
    startDate: "2026-09-15", endDate: "2026-09-15",
    createdAt: "2026-09-10 16:30"
  },
  {
    id: "lr004",
    title: "ลาพักร้อนช่วงวันหยุดยาว",
    reason: "อยากต่อวันหยุดยาวไปพักผ่อนกับครอบครัวอีก 3 วัน",
    status: "ไม่อนุมัติ",
    requesterId: "u003", requesterName: "สมศรี ตั้งใจ",
    approverId: "u002",  approverName: "สมหญิง รักงาน",
    leaveTypeId: "lt001", leaveTypeName: "ลาพักร้อน",
    startDate: "2026-10-12", endDate: "2026-10-16",
    createdAt: "2026-09-20 11:00"
  },
  {
    id: "lr005",
    title: "ลาป่วยไปพบแพทย์ตามนัด",
    reason: "มีนัดตรวจติดตามอาการกับแพทย์ในช่วงเช้า",
    status: "รอพิจารณา",
    requesterId: "u001", requesterName: "สมชาย ใจดี",
    approverId: "u002",  approverName: "สมหญิง รักงาน",
    leaveTypeId: "lt002", leaveTypeName: "ลาป่วย",
    startDate: "2026-09-22", endDate: "2026-09-22",
    createdAt: "2026-09-18 14:45"
  }
];

async function seed() {
  for (const u of users) {
    await setDoc(doc(db, "users", u.id), { name: u.name, email: u.email, role: u.role });
  }
  for (const t of leaveTypes) {
    await setDoc(doc(db, "leaveTypes", t.id), { name: t.name });
  }
  for (const r of leaveRequests) {
    const { id, ...ข้อมูล } = r;
    await setDoc(doc(db, "leaveRequests", id), ข้อมูล);
  }
  console.log(
    `ใส่ข้อมูลสำเร็จ: users ${users.length} · leaveTypes ${leaveTypes.length} · leaveRequests ${leaveRequests.length}`
  );
  process.exit(0);
}

seed().catch((err) => {
  console.error("ใส่ข้อมูลไม่สำเร็จ:", err);
  process.exit(1);
});
