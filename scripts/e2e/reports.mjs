/** اختبار مركز التقارير: التشغيل، التصفية، الإجماليات، التصدير، وعزل الصلاحيات. */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const results = []
function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  acceptDownloads: true,
})
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

const stamp = Date.now().toString().slice(-6)
const SECRETARY = { username: `sec${stamp}`, password: 'Secretary@2026' }

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#identifier', 'admin')
  await page.fill('#password', 'Admin@2026')
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard', { timeout: 25000 })

  // ---------- مركز التقارير ----------
  await page.goto(`${BASE}/reports`, { waitUntil: 'networkidle' })
  const cards = await page.locator('a[href^="/reports/"]').count()
  check('مركز التقارير يعرض كل التقارير', cards >= 17, `${cards} تقريرًا`)

  const groups = await page.$$eval('h2', (els) => els.map((e) => e.textContent?.trim()))
  check('التقارير مجمّعة حسب النوع',
        groups.includes('تقارير القضايا') && groups.includes('التقارير المالية'),
        groups.join('، '))

  // ---------- تشغيل كل تقرير بلا خطأ ----------
  const slugs = await page.$$eval('a[href^="/reports/"]',
    (els) => els.map((e) => e.getAttribute('href')))

  const broken = []
  for (const href of slugs) {
    const res = await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded' })
    if (!res || res.status() >= 400) broken.push(`${href}:${res?.status()}`)
    else {
      const body = await page.textContent('body')
      if (body?.includes('Unhandled') || body?.includes('Application error')) broken.push(href)
    }
  }
  check(`كل التقارير تعمل بلا خطأ (${slugs.length})`, broken.length === 0,
        broken.join(', ') || 'كلها تعمل')

  // ---------- تقرير بإجماليات ----------
  await page.goto(`${BASE}/reports/cases-by-lawyer`, { waitUntil: 'networkidle' })
  const hasTotals = await page.isVisible('tfoot')
  check('تقرير القضايا حسب المحامي يعرض سطر الإجمالي', hasTotals)

  // ---------- التصفية بالنطاق الزمني ----------
  await page.goto(`${BASE}/reports/cases-all`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("التصفية")')
  await page.waitForSelector('#from', { timeout: 10000 })
  await page.fill('#from', '2099-01-01')
  await page.waitForTimeout(2000)
  const emptyBody = await page.textContent('body')
  check('التصفية بالنطاق الزمني تُطبَّق فعليًا',
        Boolean(emptyBody?.includes('لا توجد بيانات')))
  check('حالة التصفية محفوظة في الرابط', page.url().includes('from=2099-01-01'))

  // ---------- تصدير Excel ----------
  await page.goto(`${BASE}/reports/cases-by-lawyer`, { waitUntil: 'networkidle' })
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20000 }).catch(() => null),
    page.click('button:has-text("تصدير Excel")'),
  ])
  check('تصدير التقرير إلى ملف Excel/CSV', Boolean(download),
        download?.suggestedFilename() ?? 'لم يُنزَّل')

  if (download) {
    const stream = await download.createReadStream()
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const content = Buffer.concat(chunks).toString('utf8')
    check('الملف المصدَّر يبدأ بعلامة BOM ليقرأ Excel العربية',
          content.charCodeAt(0) === 0xfeff)
    check('الملف المصدَّر يحتوي رؤوس الأعمدة العربية',
          content.includes('المحامي') && content.includes('إجمالي القضايا'))
  }

  // ---------- عزل الصلاحيات: السكرتير لا يرى التقارير المالية ----------
  await page.goto(`${BASE}/users/new`, { waitUntil: 'networkidle' })
  await page.fill('#fullName', 'سكرتير التقارير')
  await page.fill('#username', SECRETARY.username)
  await page.fill('#email', `${SECRETARY.username}@lawoffice.local`)
  await page.fill('#password', SECRETARY.password)
  await page.click('#roleCode')
  await page.click('[role=option]:has-text("سكرتير")')
  await page.click('button[type=submit]')
  await page.waitForURL('**/users', { timeout: 25000 })
} catch (error) {
  check('اكتمال اختبار المدير', false, String(error).slice(0, 250))
}

const secCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const secPage = await secCtx.newPage()

try {
  await secPage.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await secPage.fill('#identifier', SECRETARY.username)
  await secPage.fill('#password', SECRETARY.password)
  await secPage.click('button[type=submit]')
  await secPage.waitForURL('**/dashboard', { timeout: 25000 })

  await secPage.goto(`${BASE}/reports`, { waitUntil: 'networkidle' })
  const secBody = await secPage.textContent('body')
  check('السكرتير لا يرى مجموعة التقارير المالية',
        !secBody?.includes('التقارير المالية'))
  check('السكرتير يرى تقارير القضايا والجلسات',
        Boolean(secBody?.includes('تقارير القضايا') && secBody?.includes('تقارير الجلسات')))

  await secPage.goto(`${BASE}/reports/finance-profit`, { waitUntil: 'networkidle' })
  check('الوصول المباشر لتقرير مالي محجوب عن السكرتير',
        secPage.url().includes('/forbidden'), secPage.url().replace(BASE, ''))
} catch (error) {
  check('اختبار عزل صلاحيات التقارير', false, String(error).slice(0, 250))
}

// تنظيف
try {
  await page.goto(`${BASE}/users?q=${SECRETARY.username}`, { waitUntil: 'networkidle' })
  await page.click('button[aria-label="إجراءات سكرتير التقارير"]')
  await page.click('[role=menuitem]:has-text("حذف المستخدم")')
  await page.click('button:has-text("حذف المستخدم")')
  await page.waitForTimeout(2500)
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
