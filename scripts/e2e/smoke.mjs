/**
 * اختبار دخان: يسجّل الدخول فعليًا ويتحقق من عمل الصفحات والصلاحيات.
 * التشغيل:  node scripts/e2e/smoke.mjs
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const USER = process.env.E2E_USER ?? 'admin'
const PASS = process.env.E2E_PASS ?? 'Admin@2026'

/** المسارات التي يُتوقَّع وجودها. تُضاف مع كل مرحلة. */
const MODULE_ROUTES = (process.env.E2E_ROUTES ?? '/dashboard,/clients,/cases,/hearings,/calendar,/tasks,/documents,/powers-of-attorney,/contracts,/fees,/invoices,/payments,/expenses,/accounts,/archive,/users,/profile').split(',').filter(Boolean)

const results = []
const consoleErrors = []

function check(name, passed, detail = '') {
  results.push({ name, passed, detail })
  console.log(`${passed ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`)
}

// المتصفح مثبّت مسبقًا في هذه البيئة — نشير إليه مباشرة بدل تنزيل نسخة جديدة.
const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text())
})
page.on('pageerror', (err) => consoleErrors.push(String(err)))

try {
  // 1) حماية المسارات
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  check('المسار المحمي يعيد التوجيه لصفحة الدخول', page.url().includes('/login'))

  // 2) اتجاه الصفحة RTL
  const dir = await page.getAttribute('html', 'dir')
  const lang = await page.getAttribute('html', 'lang')
  check('الصفحة بالاتجاه العربي', dir === 'rtl' && lang === 'ar', `dir=${dir} lang=${lang}`)

  // 3) رفض بيانات دخول خاطئة
  await page.fill('#identifier', USER)
  await page.fill('#password', 'كلمة-مرور-خاطئة-تمامًا')
  await page.click('button[type=submit]')
  await page.waitForSelector('[data-login-error]', { timeout: 15000 })
  const alertText = await page.textContent('[data-login-error]')
  check('رفض بيانات الدخول الخاطئة', Boolean(alertText?.includes('غير صحيحة')), alertText?.trim())
  check('عدم البقاء في صفحة محمية بعد الفشل', page.url().includes('/login'))

  const keptIdentifier = await page.inputValue('#identifier')
  check('اسم المستخدم لا يضيع بعد محاولة فاشلة', keptIdentifier === USER, `القيمة: "${keptIdentifier}"`)
  const clearedPassword = await page.inputValue('#password')
  check('كلمة المرور تُفرَّغ بعد المحاولة الفاشلة', clearedPassword === '')

  // 4) تسجيل دخول صحيح
  await page.fill('#identifier', USER)
  await page.fill('#password', PASS)
  await page.waitForTimeout(200)
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard', { timeout: 20000 })
  check('تسجيل الدخول باسم المستخدم ينجح', page.url().includes('/dashboard'))

  // 5) لوحة التحكم تعرض البيانات
  await page.waitForSelector('h1', { timeout: 10000 })
  const heading = await page.textContent('h1')
  check('لوحة التحكم تعرض اسم المستخدم', Boolean(heading?.includes('مدير النظام')), heading?.trim())

  // 6) القائمة الجانبية تحتوي كل الوحدات
  const navLinks = await page.$$eval('aside nav a', (els) => els.map((e) => e.textContent?.trim()))
  check('القائمة الجانبية تعرض 22 وحدة', navLinks.length === 22, `العدد: ${navLinks.length}`)

  // 7) التنقل بين الصفحات يعمل
  const built = []
  const notYet = []
  for (const path of MODULE_ROUTES) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: 'domcontentloaded' })
    if (res && res.status() < 400) built.push(path)
    else notYet.push(path)
  }
  check(
    `صفحات الوحدات المبنيّة تستجيب (${built.length}/${MODULE_ROUTES.length})`,
    built.length === MODULE_ROUTES.length,
    notYet.length ? `لم تُبنَ بعد: ${notYet.join(', ')}` : 'كلها تعمل',
  )

  // 8) البحث الموحّد
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  const hasSearch = await page.isVisible('input[aria-label="البحث الموحّد"]')
  check('البحث الموحّد ظاهر', hasSearch)

  // 9) الوضع الليلي
  await page.click('button[aria-label*="الليلي"]')
  await page.waitForTimeout(600)
  const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
  check('الوضع الليلي يعمل', isDark)

  // 10) التجاوب مع الموبايل
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  )
  check('لا يوجد تمرير أفقي على الموبايل', !overflow)
  const burger = await page.isVisible('button[aria-label="فتح القائمة"]')
  check('زر القائمة يظهر على الموبايل', burger)

  // 11) تسجيل الخروج
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("مدير النظام")')
  await page.click('[role=menuitem]:has-text("تسجيل الخروج")')
  await page.waitForURL('**/login**', { timeout: 15000 })
  check('تسجيل الخروج يعمل', page.url().includes('/login'))

  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  check('الجلسة أُبطلت فعليًا بعد الخروج', page.url().includes('/login'))
} catch (error) {
  check('اكتمال الاختبار دون استثناء', false, String(error).slice(0, 300))
} finally {
  const realErrors = consoleErrors.filter(
    (e) =>
      !e.includes('favicon') &&
      !e.includes('Download the React DevTools') &&
      !e.includes('status of 404'),
  )
  check('لا توجد أخطاء في الكونسول', realErrors.length === 0,
        realErrors.slice(0, 3).join(' | ').slice(0, 300))

  await browser.close()

  const failed = results.filter((r) => !r.passed)
  console.log(`\n${results.length - failed.length}/${results.length} اختبار ناجح`)
  process.exit(failed.length === 0 ? 0 : 1)
}
