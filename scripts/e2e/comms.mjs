/** اختبار المراسلات والتنبيهات. */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const results = []
function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`)
}

async function selectOption(page, triggerId, optionText) {
  await page.click(triggerId)
  await page.waitForSelector('[role=option]', { timeout: 10000 })
  await page.click(`[role=option]:has-text(${JSON.stringify(optionText)})`)
  await page.waitForSelector('[role=option]', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(250)
}

const stamp = Date.now().toString().slice(-6)
const CLIENT = `عميل المراسلات ${stamp}`
const CASE_TITLE = `قضية المراسلات ${stamp}`
const SUBJECT = `طلب صورة من الحكم ${stamp}`
const iso = (d) => d.toISOString().slice(0, 10)
const today = new Date()
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 3)

const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

let clientId = null, caseId = null

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#identifier', 'admin')
  await page.fill('#password', 'Admin@2026')
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard', { timeout: 25000 })

  await page.goto(`${BASE}/clients/new`, { waitUntil: 'networkidle' })
  await page.fill('#name', CLIENT)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/, { timeout: 25000 })
  clientId = page.url().split('/clients/')[1]

  await page.goto(`${BASE}/cases/new?client=${clientId}`, { waitUntil: 'networkidle' })
  await page.fill('#title', CASE_TITLE)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/cases\/[0-9a-f-]{36}$/, { timeout: 25000 })
  caseId = page.url().split('/cases/')[1]

  // ---------- مراسلة صادرة ----------
  await page.goto(`${BASE}/correspondence`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("تسجيل مراسلة")')
  await page.waitForSelector('#partyName', { timeout: 10000 })
  await selectOption(page, '#partyType', 'محكمة')
  await page.fill('#partyName', 'محكمة الاستئناف — الدائرة التجارية')
  await page.fill('#subject', SUBJECT)
  await selectOption(page, '#caseId', CASE_TITLE)
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3500)

  await page.goto(`${BASE}/correspondence?q=${stamp}`, { waitUntil: 'networkidle' })
  const corrBody = await page.textContent('body')
  check('تسجيل مراسلة صادرة', Boolean(corrBody?.includes(SUBJECT)))
  check('توليد رقم مرجعي للصادر', /OUT-\d{4}-\d{5}/.test(corrBody ?? ''),
        corrBody?.match(/OUT-\d{4}-\d{5}/)?.[0])

  // ---------- مراسلة واردة برقم مستقل ----------
  await page.goto(`${BASE}/correspondence`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("تسجيل مراسلة")')
  await page.waitForSelector('#partyName', { timeout: 10000 })
  await selectOption(page, '#direction', 'وارد')
  await page.fill('#partyName', 'وزارة العدل')
  await page.fill('#subject', `رد على الطلب ${stamp}`)
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3500)

  await page.goto(`${BASE}/correspondence?q=${stamp}`, { waitUntil: 'networkidle' })
  const bothBody = await page.textContent('body')
  check('توليد رقم مرجعي مستقل للوارد', /IN-\d{4}-\d{5}/.test(bothBody ?? ''),
        bothBody?.match(/IN-\d{4}-\d{5}/)?.[0])

  // ---------- التصفية ----------
  await page.goto(`${BASE}/correspondence?direction=incoming&q=${stamp}`, { waitUntil: 'networkidle' })
  const incomingOnly = await page.textContent('body')
  check('التصفية بالصادر/الوارد تعمل',
        Boolean(incomingOnly?.includes(`رد على الطلب ${stamp}`) && !incomingOnly?.includes(SUBJECT)))

  // ---------- التنبيهات: جلسة اليوم ----------
  await page.goto(`${BASE}/hearings`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("إضافة جلسة")')
  await page.waitForSelector('#hearingDate', { timeout: 10000 })
  await selectOption(page, '#caseId', CASE_TITLE)
  await page.fill('#hearingDate', iso(today))
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3500)

  // ---------- التنبيهات: مهمة متأخرة ----------
  await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("مهمة جديدة")')
  await page.waitForSelector('#title', { timeout: 10000 })
  await page.fill('#title', `مهمة متأخرة ${stamp}`)
  await selectOption(page, '#caseId', CASE_TITLE)
  await page.fill('#dueDate', iso(yesterday))
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3500)

  // ---------- مركز التنبيهات ----------
  await page.goto(`${BASE}/notifications`, { waitUntil: 'networkidle' })
  const notifBody = await page.textContent('body')
  check('توليد تنبيه الجلسة تلقائيًا', Boolean(notifBody?.includes('لديك جلسة اليوم')))
  check('توليد تنبيه المهمة المتأخرة', Boolean(notifBody?.includes('لديك مهمة متأخرة')))

  // عدّاد الترويسة
  const badge = await page.textContent('a[aria-label="التنبيهات"]')
  check('عدّاد التنبيهات يظهر في الترويسة', Boolean(badge && /\d/.test(badge)), badge?.trim())

  // ---------- عدم التكرار ----------
  const before = await page.locator('li:has-text("لديك جلسة اليوم")').count()
  await page.reload({ waitUntil: 'networkidle' })
  await page.reload({ waitUntil: 'networkidle' })
  const after = await page.locator('li:has-text("لديك جلسة اليوم")').count()
  check('التنبيهات لا تتكرّر عند إعادة التحميل', before === after, `${before} ← ${after}`)

  // ---------- تعليم الكل مقروءًا ----------
  await page.click('button:has-text("تعليم الكل مقروءًا")')
  await page.waitForTimeout(3000)
  await page.goto(`${BASE}/notifications`, { waitUntil: 'networkidle' })
  const afterRead = await page.textContent('body')
  check('تعليم كل التنبيهات مقروءة',
        Boolean(afterRead?.includes('لا توجد تنبيهات غير مقروءة')))

  // ---------- إعدادات التنبيهات ----------
  await page.click('[role=tab]:has-text("إعدادات التنبيهات")')
  await page.waitForSelector('#hearingDaysBefore', { timeout: 10000 })
  await page.fill('#hearingDaysBefore', '7')
  await page.click('button[type=submit]:has-text("حفظ الإعدادات")')
  await page.waitForTimeout(3000)
  await page.reload({ waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("إعدادات التنبيهات")')
  await page.waitForSelector('#hearingDaysBefore', { timeout: 10000 })
  const saved = await page.inputValue('#hearingDaysBefore')
  check('حفظ إعدادات التنبيهات', saved === '7', `القيمة: ${saved}`)
} catch (error) {
  check('اكتمال الاختبار دون استثناء', false, String(error).slice(0, 250))
}

// تنظيف
try {
  await page.goto(`${BASE}/correspondence?q=${stamp}`, { waitUntil: 'networkidle' })
  for (let i = 0; i < 3; i++) {
    const btn = await page.$('button[aria-label^="إجراءات"]')
    if (!btn) break
    await btn.click()
    await page.click('[role=menuitem]:has-text("حذف المراسلة")')
    await page.click('button:has-text("حذف المراسلة")')
    await page.waitForTimeout(2000)
    await page.goto(`${BASE}/correspondence?q=${stamp}`, { waitUntil: 'networkidle' })
  }
  if (caseId) {
    await page.goto(`${BASE}/cases?q=${stamp}`, { waitUntil: 'networkidle' })
    const btn = await page.$(`button[aria-label="إجراءات ${CASE_TITLE}"]`)
    if (btn) {
      await btn.click()
      await page.click('[role=menuitem]:has-text("حذف القضية")')
      await page.click('button:has-text("حذف القضية")')
      await page.waitForTimeout(2500)
    }
  }
  if (clientId) {
    await page.goto(`${BASE}/clients?q=${stamp}`, { waitUntil: 'networkidle' })
    const btn = await page.$(`button[aria-label="إجراءات ${CLIENT}"]`)
    if (btn) {
      await btn.click()
      await page.click('[role=menuitem]:has-text("حذف العميل")')
      await page.click('button:has-text("حذف العميل")')
      await page.waitForTimeout(2500)
    }
  }
  check('تنظيف بيانات الاختبار', true)
} catch (error) {
  check('تنظيف بيانات الاختبار', false, String(error).slice(0, 150))
}

const realErrors = consoleErrors.filter(
  (e) => !e.includes('favicon') && !e.includes('React DevTools') && !e.includes('status of 404'))
check('لا توجد أخطاء في الكونسول', realErrors.length === 0,
      realErrors.slice(0, 2).join(' | ').slice(0, 200))

await browser.close()
const failed = results.filter((r) => !r.passed)
console.log(`\n${results.length - failed.length}/${results.length} اختبار ناجح`)
process.exit(failed.length === 0 ? 0 : 1)
