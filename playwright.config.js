// playwright.config.js — ตั้งค่า Playwright ให้ทดสอบเว็บ LeaveEasy จริงบน Firebase Hosting
const { defineConfig, devices } = require('@playwright/test');

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
