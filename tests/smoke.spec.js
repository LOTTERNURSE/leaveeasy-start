// tests/smoke.spec.js — เทสต์พื้นฐาน: ยังไม่ล็อกอินแล้วต้องถูกเด้งไปหน้า login เสมอ
// (ดู js/auth-guard.js — ทุกหน้ายกเว้น login.html/register.html บังคับล็อกอินก่อน)
const { test, expect } = require('@playwright/test');

test('เปิดหน้าแรกโดยไม่ล็อกอิน ต้องถูกเด้งไปหน้าเข้าสู่ระบบ', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/login\.html$/);
  await expect(page).toHaveTitle('เข้าสู่ระบบ · LeaveEasy');
  await expect(page.locator('h1')).toHaveText('🔧 LeaveEasy — เข้าสู่ระบบ');
});

// เพิ่มเทสต์ (สัปดาห์ที่ 9) — ทุกหน้าที่ต้องล็อกอินก่อน ต้องเด้งไปหน้า login.html
// เหมือนกันหมด ไม่ว่าจะเป็นหน้าไหนก็ตาม (auth-guard.js ครอบทุกหน้ายกเว้น login/register)
// แต่ละ test ได้ browser context ใหม่ของตัวเองจาก Playwright อยู่แล้ว (ไม่มี cookie/
// session ค้างจากเทสต์อื่น) จึงไม่ต้องเคลียร์ cookie เพิ่มเอง
const หน้าที่ต้องล็อกอินก่อน = [
  'leave-requests.html',
  'new-leave-request.html',
  'leave-request-detail.html?id=lr001',
  'leave-types.html',
];

for (const หน้า of หน้าที่ต้องล็อกอินก่อน) {
  test(`เปิด ${หน้า} โดยไม่ล็อกอิน ต้องถูกเด้งไปหน้าเข้าสู่ระบบ`, async ({ page }) => {
    await page.goto('/' + หน้า);
    await expect(page).toHaveURL(/login\.html$/);
  });
}
