// ─────────────────────────────────────────────────────────────
// tests/leave-flow.spec.js — เทสต์ end-to-end (สัปดาห์ที่ 9)
// ใช้บัญชีที่สมัครขึ้นมาเองในแต่ละเทสต์ (อีเมลสุ่มกันชนกับของจริง/ของเทสต์อื่น)
// แล้วลบทิ้งทุกอย่างที่สร้างขึ้นท้ายเทสต์เสมอผ่าน test.afterEach
// ห้ามยุ่งกับข้อมูล seed เดิม (u001-u003, lr001-lr005, lt001-lt003)
// ─────────────────────────────────────────────────────────────
const { test, expect } = require('@playwright/test');

const PASSWORD = 'TestPass123!';

function สุ่มอีเมล(ป้าย) {
  return `playwright-test-${ป้าย}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

async function สมัครแล้วล็อกอิน(page, { name, email, password }) {
  await page.goto('/register.html');
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('#ปุ่มสมัคร');
  await page.waitForURL(/index\.html$/, { timeout: 30000 });
}

async function อ่านuid(page) {
  return page.evaluate(() => firebase.auth().currentUser.uid);
}

async function ตั้งบทบาท(page, uid, role) {
  await page.evaluate(
    ({ uid, role }) => window.db.collection('users').doc(uid).update({ role }),
    { uid, role }
  );
}

async function ลบใบลาตรง(page, id) {
  if (!id) return;
  await page.evaluate((id) => window.db.collection('leaveRequests').doc(id).delete().catch(() => {}), id);
}

async function ลบบัญชี(page) {
  await page.evaluate(async () => {
    const user = firebase.auth().currentUser;
    if (!user) return;
    try { await window.db.collection('users').doc(user.uid).delete(); } catch (e) {}
    try { await user.delete(); } catch (e) {}
  });
}

// กรอกฟอร์มยื่นใบลาใหม่ให้ครบ (เลือกประเภทการลาตัวแรกที่มีอยู่จริงในรายการเลื่อนลง)
async function กรอกฟอร์มใบลา(page, { title, reason, startDate, endDate }) {
  await page.goto('/new-leave-request.html');
  // รอให้โหลดประเภทการลาจาก Firestore เสร็จก่อน (มี option seed อย่างน้อย 1 ตัวเสมอ)
  await page.waitForFunction(() => document.querySelectorAll('#leaveTypeId option').length > 1);
  if (title !== undefined) await page.fill('#title', title);
  if (reason !== undefined) await page.fill('#reason', reason);
  if (startDate !== undefined) await page.fill('#startDate', startDate);
  if (endDate !== undefined) await page.fill('#endDate', endDate);
}

// หารหัสใบลาที่เพิ่งสร้าง จากแถวในตารางที่มี title ตรงกัน (เปิดหน้ารายการแล้วเรียก)
async function หารหัสใบลาจากหัวข้อ(page, title) {
  await page.goto('/leave-requests.html');
  const แถว = page.locator('tr.clickable', { hasText: title });
  await expect(แถว).toHaveCount(1, { timeout: 20000 });
  return แถว.getAttribute('data-id');
}

test.describe('เส้นทางหลัก: ยื่นใบลา → อนุมัติ', () => {
  let leaveRequestId;

  test.afterEach(async ({ page }) => {
    await ลบใบลาตรง(page, leaveRequestId);
    await ลบบัญชี(page);
  });

  test('พนักงานยื่นใบลา → เห็นรอพิจารณา → employee เปิดเองไม่เห็นปุ่มอนุมัติ → ยกระดับเป็น manager แล้วอนุมัติได้', async ({ page }) => {
    test.setTimeout(90000);
    const email = สุ่มอีเมล('main');
    const title = 'ทดสอบ Playwright ลาพักร้อน ' + Date.now();

    await สมัครแล้วล็อกอิน(page, { name: 'ผู้ทดสอบ Playwright', email, password: PASSWORD });

    await กรอกฟอร์มใบลา(page, {
      title,
      reason: 'เหตุผลทดสอบอัตโนมัติจาก Playwright',
      startDate: '2026-11-01',
      endDate: '2026-11-03',
    });
    await page.selectOption('#leaveTypeId', { index: 1 });
    await page.click('#ปุ่มบันทึก');
    await page.waitForURL(/leave-requests\.html$/, { timeout: 30000 });

    // เห็นในรายการ สถานะ รอพิจารณา
    const แถวใบลา = page.locator('tr.clickable', { hasText: title });
    await expect(แถวใบลา).toHaveCount(1);
    await expect(แถวใบลา.locator('.badge')).toHaveText('รอพิจารณา');
    leaveRequestId = await แถวใบลา.getAttribute('data-id');

    // เปิดใบของตัวเอง (ยังเป็น employee) — ต้องไม่เห็นปุ่มอนุมัติ/ไม่อนุมัติ
    await page.goto('/leave-request-detail.html?id=' + leaveRequestId);
    await expect(page.locator('#กล่องใบลา')).toContainText(title, { timeout: 20000 });
    await expect(page.locator('#ปุ่มอนุมัติ')).toHaveCount(0);
    await expect(page.locator('#ปุ่มไม่อนุมัติ')).toHaveCount(0);

    // ยกระดับบัญชีตัวเองเป็น manager ตรงผ่าน Firestore
    const uid = await อ่านuid(page);
    await ตั้งบทบาท(page, uid, 'manager');

    // reload แล้วต้องเห็นปุ่มอนุมัติ/ไม่อนุมัติแล้ว
    await page.reload();
    await expect(page.locator('#ปุ่มอนุมัติ')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#ปุ่มไม่อนุมัติ')).toBeVisible();

    // กดอนุมัติ
    await page.click('#ปุ่มอนุมัติ');
    await expect(page.locator('#กล่องใบลา .badge')).toHaveText('อนุมัติ', { timeout: 20000 });

    // สถานะต้องอยู่หลัง reload
    await page.reload();
    await expect(page.locator('#กล่องใบลา .badge')).toHaveText('อนุมัติ');
  });
});

test.describe('ปุ่มเปลี่ยนสถานะ: ไม่อนุมัติต้องมีความเห็นก่อน', () => {
  let leaveRequestId;

  test.afterEach(async ({ page }) => {
    await ลบใบลาตรง(page, leaveRequestId);
    await ลบบัญชี(page);
  });

  test('กดไม่อนุมัติก่อนมีความเห็น ต้องเตือนและสถานะไม่เปลี่ยน → เขียนความเห็นแล้วกดใหม่ต้องสำเร็จ', async ({ page }) => {
    test.setTimeout(90000);
    const email = สุ่มอีเมล('reject');
    const title = 'ทดสอบ Playwright ลากิจ ' + Date.now();

    await สมัครแล้วล็อกอิน(page, { name: 'ผู้ทดสอบ Playwright สอง', email, password: PASSWORD });

    await กรอกฟอร์มใบลา(page, {
      title,
      reason: 'ทดสอบปุ่มไม่อนุมัติ',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
    });
    await page.selectOption('#leaveTypeId', { index: 1 });
    await page.click('#ปุ่มบันทึก');
    await page.waitForURL(/leave-requests\.html$/, { timeout: 30000 });

    leaveRequestId = await หารหัสใบลาจากหัวข้อ(page, title);

    const uid = await อ่านuid(page);
    await ตั้งบทบาท(page, uid, 'manager');

    await page.goto('/leave-request-detail.html?id=' + leaveRequestId);
    await expect(page.locator('#ปุ่มไม่อนุมัติ')).toBeVisible({ timeout: 20000 });

    // กดไม่อนุมัติก่อนมีความเห็น — ต้องมี alert เตือน และสถานะต้องไม่เปลี่ยน
    let ข้อความAlert = '';
    page.once('dialog', async (dialog) => {
      ข้อความAlert = dialog.message();
      await dialog.accept();
    });
    await page.click('#ปุ่มไม่อนุมัติ');
    await expect.poll(() => ข้อความAlert).not.toBe('');
    expect(ข้อความAlert).toContain('ความเห็น');
    await expect(page.locator('#กล่องใบลา .badge')).toHaveText('รอพิจารณา');

    // เขียนความเห็น 1 รายการ
    await page.fill('#ข้อความความเห็น', 'ขอเลื่อนก่อนนะครับ (ทดสอบอัตโนมัติ)');
    await page.click('#ปุ่มส่งความเห็น');
    await expect(page.locator('#รายการความเห็น')).toContainText('ขอเลื่อนก่อนนะครับ', { timeout: 20000 });

    // กดไม่อนุมัติอีกครั้ง — ต้องสำเร็จ
    await page.click('#ปุ่มไม่อนุมัติ');
    await expect(page.locator('#กล่องใบลา .badge')).toHaveText('ไม่อนุมัติ', { timeout: 20000 });
  });
});

test.describe('กรอกไม่ครบต้องไม่บันทึก', () => {
  let leaveRequestId;

  test.afterEach(async ({ page }) => {
    await ลบใบลาตรง(page, leaveRequestId);
    await ลบบัญชี(page);
  });

  test('ปล่อยช่องว่างทีละช่อง / วันที่สิ้นสุดก่อนวันที่เริ่ม / ความเห็นว่างเปล่า ต้องเตือนเสมอและไม่บันทึก', async ({ page }) => {
    test.setTimeout(120000);
    const email = สุ่มอีเมล('validate');
    await สมัครแล้วล็อกอิน(page, { name: 'ผู้ทดสอบตรวจฟอร์ม', email, password: PASSWORD });

    const ฟอร์มเต็ม = {
      title: 'ทดสอบกรอกไม่ครบ ' + Date.now(),
      reason: 'เหตุผลทดสอบ',
      startDate: '2026-11-10',
      endDate: '2026-11-12',
    };

    await page.goto('/leave-requests.html');
    const จำนวนแถวก่อน = await page.locator('tr.clickable').count();

    // เปิดหน้าฟอร์มครั้งเดียว แล้วกรอก/เคลียร์ทีละช่องในหน้าเดิม (ไม่โหลดหน้าใหม่ทุกรอบ
    // เพราะกดบันทึกไม่ครบไม่ทำให้หน้าเปลี่ยนอยู่แล้ว — เร็วกว่าและเสถียรกว่าการ goto ซ้ำ)
    await page.goto('/new-leave-request.html');
    await page.waitForFunction(() => document.querySelectorAll('#leaveTypeId option').length > 1);

    // กรอกทุกช่องให้ครบตาม ฟอร์มเต็ม ยกเว้นช่องที่ระบุ (เว้นว่างไว้)
    async function กรอกครบยกเว้น(ช่องที่เว้น) {
      await page.fill('#title', ช่องที่เว้น === 'title' ? '' : ฟอร์มเต็ม.title);
      await page.fill('#reason', ช่องที่เว้น === 'reason' ? '' : ฟอร์มเต็ม.reason);
      await page.selectOption('#leaveTypeId', { index: ช่องที่เว้น === 'leaveTypeId' ? 0 : 1 });
      await page.fill('#startDate', ช่องที่เว้น === 'startDate' ? '' : ฟอร์มเต็ม.startDate);
      await page.fill('#endDate', ช่องที่เว้น === 'endDate' ? '' : ฟอร์มเต็ม.endDate);
    }

    // ── ปล่อยว่างทีละช่อง: title / reason / leaveTypeId / startDate / endDate ──
    for (const ช่อง of ['title', 'reason', 'leaveTypeId', 'startDate', 'endDate']) {
      await กรอกครบยกเว้น(ช่อง);
      await page.click('#ปุ่มบันทึก');
      await expect(page.locator('#ข้อความเตือน')).toBeVisible();
      await expect(page.locator('#ข้อความเตือน')).toContainText('กรอกไม่ครบ');
      await expect(page).toHaveURL(/new-leave-request\.html$/); // ยังไม่ถูกพาไปหน้ารายการ
    }

    // ── endDate < startDate ──
    await กรอกครบยกเว้น(null);
    await page.fill('#startDate', '2026-11-12');
    await page.fill('#endDate', '2026-11-10');
    await page.click('#ปุ่มบันทึก');
    await expect(page.locator('#ข้อความเตือน')).toBeVisible();
    await expect(page.locator('#ข้อความเตือน')).toContainText('วันที่สิ้นสุด');
    await expect(page).toHaveURL(/new-leave-request\.html$/);

    const จำนวนแถวหลัง = await (async () => {
      await page.goto('/leave-requests.html');
      return page.locator('tr.clickable').count();
    })();
    expect(จำนวนแถวหลัง).toBe(จำนวนแถวก่อน); // ไม่มีใบใหม่เกิดขึ้นจริงจากทุกกรณีข้างบน

    // ── สร้างใบลาที่ถูกต้อง 1 ใบ เพื่อทดสอบ "ส่งความเห็นว่างเปล่า" ในหน้ารายละเอียด ──
    await page.goto('/new-leave-request.html');
    await page.waitForFunction(() => document.querySelectorAll('#leaveTypeId option').length > 1);
    await กรอกครบยกเว้น(null);
    await page.click('#ปุ่มบันทึก');
    await page.waitForURL(/leave-requests\.html$/, { timeout: 30000 });
    leaveRequestId = await หารหัสใบลาจากหัวข้อ(page, ฟอร์มเต็ม.title);

    await page.goto('/leave-request-detail.html?id=' + leaveRequestId);
    await expect(page.locator('#กล่องความเห็น')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#รายการความเห็น')).toContainText('ยังไม่มีความเห็น');

    await page.click('#ปุ่มส่งความเห็น'); // กล่องความเห็นว่างเปล่า
    await expect(page.locator('#เตือนความเห็น')).toBeVisible();
    await expect(page.locator('#เตือนความเห็น')).toContainText('พิมพ์ข้อความก่อน');
    await expect(page.locator('#รายการความเห็น')).toContainText('ยังไม่มีความเห็น'); // ยังไม่มีความเห็นเพิ่มขึ้น
  });
});

test.describe('ลบใบลา', () => {
  let leaveRequestIdรอพิจารณา;
  let leaveRequestIdพิจารณาแล้ว;

  test.afterEach(async ({ page }) => {
    await ลบใบลาตรง(page, leaveRequestIdรอพิจารณา);
    await ลบใบลาตรง(page, leaveRequestIdพิจารณาแล้ว);
    await ลบบัญชี(page);
  });

  test('เจ้าของใบ+รอพิจารณา ลบได้จริง · ใบที่พิจารณาแล้ว ปุ่มลบต้อง disabled', async ({ page }) => {
    test.setTimeout(90000);
    const email = สุ่มอีเมล('delete');
    await สมัครแล้วล็อกอิน(page, { name: 'ผู้ทดสอบลบใบลา', email, password: PASSWORD });

    // ใบที่ 1 — ยังรอพิจารณา ลบได้จริง
    const title1 = 'ทดสอบลบใบลา (รอพิจารณา) ' + Date.now();
    await กรอกฟอร์มใบลา(page, { title: title1, reason: 'r', startDate: '2026-11-15', endDate: '2026-11-15' });
    await page.selectOption('#leaveTypeId', { index: 1 });
    await page.click('#ปุ่มบันทึก');
    await page.waitForURL(/leave-requests\.html$/, { timeout: 30000 });
    const id1 = await หารหัสใบลาจากหัวข้อ(page, title1);

    await page.goto('/leave-request-detail.html?id=' + id1);
    await expect(page.locator('#ปุ่มลบ')).toBeEnabled({ timeout: 20000 });
    page.once('dialog', (dialog) => dialog.accept());
    await page.click('#ปุ่มลบ');
    await page.waitForURL(/leave-requests\.html$/, { timeout: 30000 });
    await expect(page.locator('tr.clickable', { hasText: title1 })).toHaveCount(0);
    // ลบสำเร็จแล้วจริง ไม่ต้องลบซ้ำใน afterEach
    leaveRequestIdรอพิจารณา = null;

    // ใบที่ 2 — ยกระดับเป็น manager แล้วอนุมัติ ให้สถานะพิจารณาแล้ว
    const title2 = 'ทดสอบลบใบลา (พิจารณาแล้ว) ' + Date.now();
    await กรอกฟอร์มใบลา(page, { title: title2, reason: 'r', startDate: '2026-11-16', endDate: '2026-11-16' });
    await page.selectOption('#leaveTypeId', { index: 1 });
    await page.click('#ปุ่มบันทึก');
    await page.waitForURL(/leave-requests\.html$/, { timeout: 30000 });
    leaveRequestIdพิจารณาแล้ว = await หารหัสใบลาจากหัวข้อ(page, title2);

    const uid = await อ่านuid(page);
    await ตั้งบทบาท(page, uid, 'manager');

    await page.goto('/leave-request-detail.html?id=' + leaveRequestIdพิจารณาแล้ว);
    await expect(page.locator('#ปุ่มอนุมัติ')).toBeVisible({ timeout: 20000 });
    await page.click('#ปุ่มอนุมัติ');
    await expect(page.locator('#กล่องใบลา .badge')).toHaveText('อนุมัติ', { timeout: 20000 });

    // ปุ่มลบต้อง disabled กดไม่ได้
    await expect(page.locator('#ปุ่มลบ')).toBeDisabled();
  });
});

test.describe('ประเภทการลา (hr-only gate)', () => {
  let leaveTypeId;

  test.afterEach(async ({ page }) => {
    if (leaveTypeId) {
      await page.evaluate((id) => window.db.collection('leaveTypes').doc(id).delete().catch(() => {}), leaveTypeId);
    }
    await ลบบัญชี(page);
  });

  test('employee เข้าไม่ได้ · ยกระดับเป็น hr แล้วเพิ่ม/ลบ ประเภทการลาได้ และไปโผล่ในฟอร์มยื่นใบลา', async ({ page }) => {
    test.setTimeout(90000);
    const email = สุ่มอีเมล('hrgate');
    await สมัครแล้วล็อกอิน(page, { name: 'ผู้ทดสอบสิทธิ์ HR', email, password: PASSWORD });

    // employee เข้า leave-types.html ตรง ๆ — ต้องเห็นข้อความปฏิเสธ ไม่ใช่ฟอร์ม/ตาราง
    await page.goto('/leave-types.html');
    await expect(page.locator('#ไม่มีสิทธิ์เข้าถึง')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#ไม่มีสิทธิ์เข้าถึง')).toContainText('หน้านี้สำหรับฝ่ายบุคคลเท่านั้น');
    await expect(page.locator('#เนื้อหาประเภทการลา')).toBeHidden();
    // เมนูบนสุดต้องไม่มีลิงก์ "ประเภทการลา"
    await expect(page.locator('.navbar a', { hasText: 'ประเภทการลา' })).toHaveCount(0);

    // ยกระดับเป็น hr
    const uid = await อ่านuid(page);
    await ตั้งบทบาท(page, uid, 'hr');

    await page.reload();
    await expect(page.locator('.navbar a', { hasText: 'ประเภทการลา' })).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#เนื้อหาประเภทการลา')).toBeVisible();

    // เพิ่มประเภทการลาทดสอบ 1 รายการ
    const ชื่อประเภท = 'ทดสอบ Playwright ' + Date.now();
    await page.fill('#ชื่อประเภทใหม่', ชื่อประเภท);
    await page.click('#ปุ่มเพิ่ม');
    const แถวประเภท = page.locator('#ตารางประเภท tr', { hasText: ชื่อประเภท });
    await expect(แถวประเภท).toHaveCount(1, { timeout: 20000 });
    leaveTypeId = await แถวประเภท.locator('[data-del]').getAttribute('data-del');

    // ต้องไปโผล่ในดรอปดาวน์หน้ายื่นใบลาใหม่จริง
    await page.goto('/new-leave-request.html');
    await page.waitForFunction(() => document.querySelectorAll('#leaveTypeId option').length > 1);
    await expect(page.locator('#leaveTypeId option', { hasText: ชื่อประเภท })).toHaveCount(1, { timeout: 20000 });

    // ลบประเภททดสอบทิ้ง (อย่าลบของ seed)
    await page.goto('/leave-types.html');
    await expect(page.locator('#ตารางประเภท tr', { hasText: ชื่อประเภท })).toBeVisible({ timeout: 20000 });
    page.once('dialog', (dialog) => dialog.accept());
    await page.click(`#ตารางประเภท [data-del="${leaveTypeId}"]`);
    await expect(page.locator('#ตารางประเภท tr', { hasText: ชื่อประเภท })).toHaveCount(0);
    leaveTypeId = null; // ลบสำเร็จแล้ว ไม่ต้องลบซ้ำใน afterEach
  });
});
