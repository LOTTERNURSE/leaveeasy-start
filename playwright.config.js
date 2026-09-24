// playwright.config.js — ตั้งค่า Playwright ให้ทดสอบเว็บ LeaveEasy จริงบน Firebase Hosting
const { defineConfig, devices } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// อ่านบัญชีทดสอบ manager/hr จากไฟล์ .env (ไม่ขึ้น GitHub — ดูเทมเพลตที่ .env.example)
// เขียนตัวอ่านเองสั้น ๆ แทนการติดตั้งแพ็กเกจ dotenv เพิ่ม
const ไฟล์env = path.join(__dirname, '.env');
if (fs.existsSync(ไฟล์env)) {
  for (const บรรทัด of fs.readFileSync(ไฟล์env, 'utf8').split(/\r?\n/)) {
    const m = บรรทัด.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: 'html',

  use: {
    baseURL: 'https://lotternurse.web.app',
    trace: 'on-first-retry',
  },

  // หมายเหตุ: ไม่รวม Firefox — เครื่องพัฒนานี้ขาด Microsoft Visual C++
  // Redistributable (x64) ทำให้ firefox.exe เปิดไม่ได้ (side-by-side
  // configuration incorrect) เพิ่มกลับได้ทันทีหลังติดตั้ง redistributable แล้ว
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
