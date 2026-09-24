// ─────────────────────────────────────────────────────────────
// tests/access-isolation.spec.js — เทสต์แยกสิทธิ์ระหว่างบัญชี (สัปดาห์ที่ 9)
//
// บัญชี A กับ B เป็นคนละ browser context กันจริง (browser.newContext())
// เพื่อไม่ให้มี session ค้างข้ามบัญชี
//
// (5ก)(5ข) ทดสอบผ่านหน้าเว็บ — B ต้องเห็นใบของ A ไม่ได้ทั้งหน้ารายการและ URL ตรง
// (5ค)(5ง)(5จ) ทดสอบ "ข้ามหน้าเว็บ" ยิงคำสั่งเข้า Firestore ตรงแบบที่คนเปิด devtools
// ทำได้ — พิสูจน์ว่ากันไว้ที่ firestore.rules จริง ไม่ใช่แค่ซ่อนปุ่มในหน้าเว็บ
// ทุกข้อต้องได้ permission-denied
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

test.describe.serial('การแยกสิทธิ์ระหว่างบัญชี A และ B (access isolation)', () => {
  let contextA, contextB, pageA, pageB;
  let idของA;
  const titleA = 'ทดสอบแยกสิทธิ์ A ' + Date.now();
  const emailA = สุ่มอีเมล('isoA');
  const emailB = สุ่มอีเมล('isoB');

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(120000);
    contextA = await browser.newContext();
    contextB = await browser.newContext();
    pageA = await contextA.newPage();
    pageB = await contextB.newPage();

    // บัญชี A: สมัครแล้วยื่นใบลา 1 ใบ จดรหัสไว้
    await สมัครแล้วล็อกอิน(pageA, { name: 'บัญชี A ทดสอบแยกสิทธิ์', email: emailA, password: PASSWORD });
    await pageA.goto('/new-leave-request.html');
    await pageA.waitForFunction(() => document.querySelectorAll('#leaveTypeId option').length > 1);
    await pageA.fill('#title', titleA);
    await pageA.fill('#reason', 'เหตุผลของบัญชี A (ทดสอบอัตโนมัติ)');
    await pageA.selectOption('#leaveTypeId', { index: 1 });
    await pageA.fill('#startDate', '2026-12-01');
    await pageA.fill('#endDate', '2026-12-02');
    await pageA.click('#ปุ่มบันทึก');
    await pageA.waitForURL(/leave-requests\.html$/, { timeout: 30000 });

    const แถวA = pageA.locator('tr.clickable', { hasText: titleA });
    await expect(แถวA).toHaveCount(1);
    idของA = await แถวA.getAttribute('data-id');

    // บัญชี B: สมัครแยกต่างหาก คนละ context
    await สมัครแล้วล็อกอิน(pageB, { name: 'บัญชี B ทดสอบแยกสิทธิ์', email: emailB, password: PASSWORD });
  });

  test.afterAll(async () => {
    try { await ลบใบลาตรง(pageA, idของA); } catch (e) {}
    try { await ลบบัญชี(pageA); } catch (e) {}
    try { await ลบบัญชี(pageB); } catch (e) {}
    if (contextA) await contextA.close();
    if (contextB) await contextB.close();
  });

  test('(5ก) หน้ารายการของ B ต้องไม่เห็นใบของ A เลย', async () => {
    test.setTimeout(60000);
    await pageB.goto('/leave-requests.html');
    // ไม่ใช้ waitForLoadState('networkidle') เพราะ Firestore ใช้ WebChannel
    // แบบ long-polling ค้างสายไว้ตลอด ทำให้ network ไม่มีทาง "idle" จริง —
    // รอให้ข้อความ "กำลังโหลดข้อมูล…" หายไปแทน (หมายถึงโหลดเสร็จแล้ว)
    await expect(pageB.locator('#ผลลัพธ์')).not.toContainText('กำลังโหลดข้อมูล', { timeout: 20000 });
    await expect(pageB.locator('body')).not.toContainText(titleA);
  });

  test('(5ข) B พิมพ์ URL ตรงไปที่ leave-request-detail.html?id=<idของA> ต้องเปิดไม่ได้', async () => {
    test.setTimeout(60000);
    await pageB.goto('/leave-request-detail.html?id=' + idของA);
    // รอให้การอ่าน Firestore (ไม่ว่าจะสำเร็จหรือถูกปฏิเสธ) จบก่อน — รอจนข้อความ
    // "กำลังโหลดข้อมูล…" หายไป (ไม่ว่าจะเปลี่ยนเป็นข้อมูลจริงหรือข้อความ error)
    await expect(pageB.locator('#กล่องใบลา')).not.toContainText('กำลังโหลดข้อมูล', { timeout: 20000 });
    const เนื้อหาที่Bเห็น = await pageB.locator('#กล่องใบลา').innerText();
    expect(เนื้อหาที่Bเห็น).not.toContain(titleA);
  });

  test('(5ค) B ยกระดับตัวเองเป็น manager ผ่าน Firestore ตรง ๆ ไม่ได้', async () => {
    test.setTimeout(60000);
    await pageB.goto('/index.html');
    const ผล = await pageB.evaluate(async () => {
      await window.รอสถานะล็อกอิน;
      const uid = firebase.auth().currentUser.uid;
      try {
        await window.db.collection('users').doc(uid).update({ role: 'manager' });
        return 'เขียนสำเร็จ (กฎรั่ว!)';
      } catch (e) {
        return e.code;
      }
    });
    expect(ผล).toBe('permission-denied');
  });

  test('(5ง) A อนุมัติใบของตัวเองผ่าน Firestore ตรง ๆ ไม่ได้', async () => {
    test.setTimeout(60000);
    await pageA.goto('/index.html');
    const ผล = await pageA.evaluate(async (id) => {
      await window.รอสถานะล็อกอิน;
      try {
        await window.db.collection('leaveRequests').doc(id).update({ status: 'อนุมัติ' });
        return 'เขียนสำเร็จ (กฎรั่ว!)';
      } catch (e) {
        return e.code;
      }
    }, idของA);
    expect(ผล).toBe('permission-denied');
  });

  test('(5จ) B เขียนความเห็นลงใบของ A ไม่ได้', async () => {
    test.setTimeout(60000);
    await pageB.goto('/index.html');
    const ผล = await pageB.evaluate(async (id) => {
      await window.รอสถานะล็อกอิน;
      const user = firebase.auth().currentUser;
      try {
        await window.db.collection('leaveRequests').doc(id).collection('approvals').add({
          authorId: user.uid,
          authorName: 'บัญชี B ทดสอบแยกสิทธิ์',
          message: 'แอบเขียนใบของคนอื่น (ทดสอบอัตโนมัติ)',
          createdAt: '2026-09-24 00:00',
        });
        return 'เขียนสำเร็จ (กฎรั่ว!)';
      } catch (e) {
        return e.code;
      }
    }, idของA);
    expect(ผล).toBe('permission-denied');
  });
});
