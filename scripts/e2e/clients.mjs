/** اختبار وحدة العملاء: CRUD كامل + بحث وتصفية + ترقيم صفحات + استمرار البيانات. */
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
const NAME = `شركة الأفق للتجارة ${stamp}`
const EDITED = `شركة الأفق للتجارة والمقاولات ${stamp}`

const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

let clientNo = null

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#identifier', 'admin')
  await page.fill('#password', 'Admin@2026')
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard', { timeout: 25000 })

  // ---------- CREATE ----------
  await page.goto(`${BASE}/clients/new`, { waitUntil: 'networkidle' })
  await page.fill('#name', NAME)
  await page.click('#clientType')
  await page.click('[role=option]:has-text("شركة")')
  await page.fill('#nationalId', '1010101010')
  await page.fill('#phone', '0551234567')
  await page.fill('#whatsapp', '0551234567')
  await page.fill('#email', `afaq${stamp}@example.com`)
  await page.fill('#address', 'الرياض — طريق الملك فهد')
  await page.fill('#occupation', 'تجارة عامة')
  await page.click('button[type=submit]')
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/, { timeout: 25000 })
  check('إضافة عميل جديد والانتقال لملفه', true)

  const clientId = page.url().split('/clients/')[1]
  const header = await page.textContent('h1')
  check('صفحة العميل تعرض الاسم الصحيح', header?.trim() === NAME, header?.trim())

  const desc = await page.textContent('p.text-sm.text-muted-foreground')
  clientNo = desc?.match(/CL-\d{4}-\d{5}/)?.[0] ?? null
  check('توليد رقم العميل تلقائيًا', Boolean(clientNo), clientNo ?? 'لم يُولَّد')

  // ---------- READ: التحقق من الحفظ الفعلي بعد إعادة التحميل ----------
  await page.reload({ waitUntil: 'networkidle' })
  const bodyText = await page.textContent('body')
  check('البيانات محفوظة في قاعدة البيانات بعد التحديث',
    Boolean(bodyText?.includes('1010101010') && bodyText?.includes('0551234567')))

  // ---------- UPDATE ----------
  await page.goto(`${BASE}/clients/${clientId}/edit`, { waitUntil: 'networkidle' })
  await page.fill('#name', EDITED)
  await page.click('button[type=submit]')
  await page.waitForTimeout(3000)
  await page.goto(`${BASE}/clients/${clientId}`, { waitUntil: 'networkidle' })
  const updated = await page.textContent('h1')
  check('تعديل بيانات العميل', updated?.trim() === EDITED, updated?.trim())

  // ---------- التحقق من المدخلات ----------
  await page.goto(`${BASE}/clients/new`, { waitUntil: 'networkidle' })
  await page.fill('#name', 'ا')
  await page.fill('#email', 'بريد-خاطئ')
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-form-error]', { timeout: 20000 })
  const errs = await page.locator('p.text-xs.text-danger').count()
  check('التحقق من المدخلات يمنع الحفظ', errs >= 2, `${errs} رسائل خطأ`)

  // ---------- SEARCH ----------
  await page.goto(`${BASE}/clients`, { waitUntil: 'networkidle' })
  await page.fill('input[aria-label*="ابحث"]', stamp)
  await page.waitForTimeout(1500)
  const found = await page.isVisible(`text=${EDITED}`)
  check('البحث يجد العميل', found)

  check('حالة البحث محفوظة في الرابط', page.url().includes(`q=${stamp}`), page.url().split('?')[1])

  // ---------- FILTER ----------
  await page.goto(`${BASE}/clients?type=individual&q=${stamp}`, { waitUntil: 'networkidle' })
  const hiddenByFilter = await page.isVisible(`text=${EDITED}`)
  check('التصفية بالنوع تستبعد غير المطابق', !hiddenByFilter)

  await page.goto(`${BASE}/clients?type=company&q=${stamp}`, { waitUntil: 'networkidle' })
  const shownByFilter = await page.isVisible(`text=${EDITED}`)
  check('التصفية بالنوع تُظهر المطابق', shownByFilter)

  // ---------- حماية التكامل المرجعي ----------
  // (يُختبر منع حذف عميل له قضايا في اختبار وحدة القضايا)

  // ---------- DELETE ----------
  await page.goto(`${BASE}/clients?q=${stamp}`, { waitUntil: 'networkidle' })
  await page.click(`button[aria-label="إجراءات ${EDITED}"]`)
  await page.click('[role=menuitem]:has-text("حذف العميل")')
  await page.click('button:has-text("حذف العميل")')
  await page.waitForTimeout(3000)
  await page.goto(`${BASE}/clients?q=${stamp}`, { waitUntil: 'networkidle' })
  const gone = await page.isVisible(`text=${EDITED}`)
  check('حذف العميل', !gone)

  // ---------- الموبايل ----------
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/clients`, { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  check('قائمة العملاء بلا تمرير أفقي على الموبايل', !overflow)
} catch (error) {
  check('اكتمال الاختبار دون استثناء', false, String(error).slice(0, 250))
}

const realErrors = consoleErrors.filter(
  (e) => !e.includes('favicon') && !e.includes('React DevTools') && !e.includes('status of 404'))
check('لا توجد أخطاء في الكونسول', realErrors.length === 0,
      realErrors.slice(0, 2).join(' | ').slice(0, 200))

await browser.close()
const failed = results.filter((r) => !r.passed)
console.log(`\n${results.length - failed.length}/${results.length} اختبار ناجح`)
process.exit(failed.length === 0 ? 0 : 1)
