/**
 * اختبار وحدة المستخدمين والصلاحيات على بيانات حقيقية.
 * ينشئ مستخدمًا، يعدّله، يختبر عزل الصلاحيات، ثم ينظّف بعده.
 */
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
const NEW_USER = {
  fullName: 'سارة عبدالله المطيري',
  username: `sara${stamp}`,
  email: `sara${stamp}@lawoffice.local`,
  password: 'Secretary@2026',
}

const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})

async function login(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#identifier', username)
  await page.fill('#password', password)
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard', { timeout: 25000 })
}

const consoleErrors = []
const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await admin.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

try {
  await login(page, 'admin', 'Admin@2026')

  // ---- إنشاء مستخدم ----
  await page.goto(`${BASE}/users/new`, { waitUntil: 'networkidle' })
  await page.fill('#fullName', NEW_USER.fullName)
  await page.fill('#username', NEW_USER.username)
  await page.fill('#email', NEW_USER.email)
  await page.fill('#password', NEW_USER.password)
  await page.click('#roleCode')
  await page.click('[role=option]:has-text("سكرتير")')
  await page.click('button[type=submit]')
  await page.waitForURL('**/users', { timeout: 25000 })
  check('إنشاء مستخدم جديد', true)

  // ---- ظهوره في القائمة (قراءة من قاعدة البيانات) ----
  await page.fill('input[aria-label*="ابحث"]', NEW_USER.username)
  await page.waitForTimeout(1200)
  const visible = await page.isVisible(`text=${NEW_USER.fullName}`)
  check('المستخدم محفوظ في قاعدة البيانات وظاهر في القائمة', visible)

  // ---- رفض اسم مستخدم مكرّر ----
  await page.goto(`${BASE}/users/new`, { waitUntil: 'networkidle' })
  await page.fill('#fullName', 'اسم آخر')
  await page.fill('#username', NEW_USER.username)
  await page.fill('#email', `other${stamp}@lawoffice.local`)
  await page.fill('#password', 'Another@2026')
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-form-error]', { timeout: 20000 })
  const dupText = await page.textContent('[data-form-error]')
  check('رفض اسم المستخدم المكرّر', Boolean(dupText?.includes('مستخدم مسبقًا')), dupText?.trim().slice(0, 60))

  // ---- التحقق من صحة المدخلات ----
  await page.goto(`${BASE}/users/new`, { waitUntil: 'networkidle' })
  await page.fill('#fullName', 'ش')
  await page.fill('#username', 'ab')
  await page.fill('#email', 'ليس-بريدًا')
  await page.fill('#password', '123')
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-form-error]', { timeout: 20000 })
  const errorCount = await page.locator('p.text-xs.text-danger').count()
  check('التحقق من صحة المدخلات يمنع الحفظ', errorCount >= 3, `${errorCount} رسائل خطأ`)
} catch (error) {
  check('مسار إنشاء المستخدم', false, String(error).slice(0, 200))
}

// ---- اختبار عزل الصلاحيات بحساب السكرتير ----
const secretary = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const secPage = await secretary.newPage()

try {
  await login(secPage, NEW_USER.username, NEW_USER.password)
  check('المستخدم الجديد يستطيع تسجيل الدخول', true)

  const navLabels = await secPage.$$eval('aside nav a', (els) => els.map((e) => e.textContent?.trim()))
  const joined = navLabels.join('|')

  check('السكرتير لا يرى الوحدات المالية',
    !joined.includes('الفواتير') && !joined.includes('المقبوضات') && !joined.includes('الحسابات'),
    `الوحدات: ${navLabels.length}`)

  check('السكرتير لا يرى إدارة المستخدمين', !joined.includes('المستخدمون'))
  check('السكرتير يرى العملاء والجلسات',
    joined.includes('العملاء') && joined.includes('الجلسات'))

  // محاولة الوصول المباشر لصفحة ممنوعة
  await secPage.goto(`${BASE}/users`, { waitUntil: 'networkidle' })
  check('الوصول المباشر لصفحة ممنوعة يُحجب',
    secPage.url().includes('/forbidden'), secPage.url().replace(BASE, ''))
} catch (error) {
  check('اختبار عزل الصلاحيات', false, String(error).slice(0, 200))
}

// ---- التنظيف: حذف المستخدم التجريبي ----
try {
  await page.goto(`${BASE}/users`, { waitUntil: 'networkidle' })
  await page.fill('input[aria-label*="ابحث"]', NEW_USER.username)
  await page.waitForTimeout(1200)
  await page.click(`button[aria-label="إجراءات ${NEW_USER.fullName}"]`)
  await page.click('[role=menuitem]:has-text("حذف المستخدم")')
  await page.click('button:has-text("حذف المستخدم")')
  await page.waitForTimeout(2500)
  await page.goto(`${BASE}/users?q=${NEW_USER.username}`, { waitUntil: 'networkidle' })
  const stillThere = await page.isVisible(`text=${NEW_USER.fullName}`)
  check('حذف المستخدم التجريبي', !stillThere)
} catch (error) {
  check('تنظيف بيانات الاختبار', false, String(error).slice(0, 200))
}

const realErrors = consoleErrors.filter(
  (e) => !e.includes('favicon') && !e.includes('React DevTools') && !e.includes('status of 404'),
)
check('لا توجد أخطاء في الكونسول', realErrors.length === 0, realErrors.slice(0, 2).join(' | ').slice(0, 200))

await browser.close()
const failed = results.filter((r) => !r.passed)
console.log(`\n${results.length - failed.length}/${results.length} اختبار ناجح`)
process.exit(failed.length === 0 ? 0 : 1)
