/** اختبار الجلسات والمهام والتقويم. */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const results = []
function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const stamp = Date.now().toString().slice(-6)
const CLIENT = `عميل الجلسات ${stamp}`
const CASE_TITLE = `قضية الجلسات ${stamp}`
const TASK = `إعداد مذكرة ${stamp}`

const iso = (d) => d.toISOString().slice(0, 10)
const today = new Date()
const inThreeDays = new Date(today); inThreeDays.setDate(today.getDate() + 3)
const inTenDays = new Date(today); inTenDays.setDate(today.getDate() + 10)

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

  // تجهيز عميل وقضية
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
  check('تجهيز عميل وقضية للاختبار', Boolean(caseId))

  // ---------- إضافة جلسة اليوم ----------
  await page.goto(`${BASE}/hearings`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("إضافة جلسة")')
  await page.waitForSelector('#hearingDate', { timeout: 10000 })
  await page.click('#caseId')
  await page.click(`[role=option]:has-text("${CASE_TITLE}")`)
  await page.fill('#hearingDate', iso(today))
  await page.fill('#hearingTime', '10:30')
  await page.fill('#room', 'A-12')
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3000)
  check('إضافة جلسة', true)

  // ---------- نطاق "اليوم" ----------
  await page.goto(`${BASE}/hearings?range=today`, { waitUntil: 'networkidle' })
  const todayVisible = await page.isVisible(`text=${CASE_TITLE}`)
  check('شاشة جلسات اليوم تعرض الجلسة', todayVisible)

  const h1 = await page.textContent('h1')
  check('عنوان النطاق صحيح', h1?.includes('جلسات اليوم'), h1?.trim())

  // ---------- نطاق "الغد" يستبعدها ----------
  await page.goto(`${BASE}/hearings?range=tomorrow`, { waitUntil: 'networkidle' })
  const tomorrowVisible = await page.isVisible(`text=${CASE_TITLE}`)
  check('نطاق الغد يستبعد جلسة اليوم', !tomorrowVisible)

  // ---------- تسجيل النتيجة مع التأجيل ينشئ الجلسة القادمة ----------
  // نُصفّي بالقضية: قد توجد جلسات أخرى في اليوم نفسه لقضايا أخرى،
  // فالنقر على أول زرّ في القائمة العامة قد يصيب جلسة غير جلستنا.
  await page.goto(`${BASE}/hearings?case=${caseId}`, { waitUntil: 'networkidle' })
  await page.click('button[aria-label^="إجراءات جلسة"]')
  await page.click('[role=menuitem]:has-text("تسجيل نتيجة الجلسة")')
  await page.waitForSelector('#rr-result', { timeout: 10000 })
  await page.fill('#rr-result', 'حضر وكيل المدّعى عليه وطلب أجلًا للرد.')
  await page.click('#rr-status')
  await page.click('[role=option]:has-text("مؤجلة")')
  await page.fill('#rr-next', iso(inThreeDays))
  await page.click('button:has-text("حفظ النتيجة")')
  await page.waitForTimeout(3500)

  await page.goto(`${BASE}/hearings?case=${caseId}`, { waitUntil: 'networkidle' })
  const caseHearingRows = await page.locator('tbody tr').count()
  check('التأجيل ينشئ الجلسة القادمة تلقائيًا', caseHearingRows >= 2,
        `${caseHearingRows} جلسة للقضية`)

  // النتيجة محفوظة على الجلسة الأصلية
  await page.goto(`${BASE}/cases/${caseId}`, { waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("الجلسات")')
  await page.waitForTimeout(800)
  const caseHearings = await page.textContent('body')
  check('نتيجة الجلسة محفوظة وظاهرة في ملف القضية',
        Boolean(caseHearings?.includes('وكيل المدّعى عليه')))

  // ---------- المهام ----------
  await page.goto(`${BASE}/tasks`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("مهمة جديدة")')
  await page.waitForSelector('#title', { timeout: 10000 })
  await page.fill('#title', TASK)
  await page.click('#caseId')
  await page.click(`[role=option]:has-text("${CASE_TITLE}")`)
  await page.fill('#dueDate', iso(inTenDays))
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3000)

  await page.goto(`${BASE}/tasks?q=${stamp}`, { waitUntil: 'networkidle' })
  check('إضافة مهمة مرتبطة بقضية', await page.isVisible(`text=${TASK}`))

  // إنجاز المهمة بنقرة واحدة
  await page.click(`input[type=checkbox], button[role=checkbox]`)
  await page.waitForTimeout(2500)
  await page.goto(`${BASE}/tasks?q=${stamp}&status=completed`, { waitUntil: 'networkidle' })
  check('تعليم المهمة منجزة بنقرة واحدة', await page.isVisible(`text=${TASK}`))

  // ---------- التقويم ----------
  await page.goto(`${BASE}/calendar`, { waitUntil: 'networkidle' })
  const calBody = await page.textContent('body')
  check('التقويم يعرض أحداث الشهر', Boolean(calBody?.includes(CASE_TITLE)))

  const legend = await page.$$eval('ul li', (els) => els.map((e) => e.textContent?.trim()))
  check('وسيلة إيضاح التقويم تعرض أنواع الأحداث',
        legend.some((l) => l === 'جلسة') && legend.some((l) => l === 'مهمة'))

  // التنقّل بين الشهور
  await page.click('button[aria-label="الشهر التالي"]')
  await page.waitForTimeout(1500)
  check('التنقّل بين شهور التقويم', page.url().includes('m='), page.url().split('?')[1])

  // ---------- الموبايل ----------
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/calendar`, { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  check('التقويم بلا تمرير أفقي على الموبايل', !overflow)
} catch (error) {
  check('اكتمال الاختبار دون استثناء', false, String(error).slice(0, 250))
}

// تنظيف
try {
  await page.setViewportSize({ width: 1440, height: 900 })
  if (caseId) {
    await page.goto(`${BASE}/cases?q=${stamp}`, { waitUntil: 'networkidle' })
    await page.click(`button[aria-label="إجراءات ${CASE_TITLE}"]`)
    await page.click('[role=menuitem]:has-text("حذف القضية")')
    await page.click('button:has-text("حذف القضية")')
    await page.waitForTimeout(2500)
  }
  if (clientId) {
    await page.goto(`${BASE}/clients?q=${stamp}`, { waitUntil: 'networkidle' })
    await page.click(`button[aria-label="إجراءات ${CLIENT}"]`)
    await page.click('[role=menuitem]:has-text("حذف العميل")')
    await page.click('button:has-text("حذف العميل")')
    await page.waitForTimeout(2500)
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
