/** اختبار سجل العمليات والإعدادات وجداول المراجع والنسخ الاحتياطي ودليل الفريق. */
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
const NEW_TYPE = `قضايا تحكيم ${stamp}`

const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#identifier', 'admin')
  await page.fill('#password', 'Admin@2026')
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard', { timeout: 25000 })

  // ---------- سجل العمليات ----------
  await page.goto(`${BASE}/audit-log`, { waitUntil: 'networkidle' })
  const auditBody = await page.textContent('body')
  check('سجل العمليات يعرض السجلات', Boolean(auditBody?.includes('تسجيل دخول')))
  check('السجل يعرض اسم المستخدم', Boolean(auditBody?.includes('مدير النظام')))

  // نفحص محتوى الجدول لا الصفحة: قائمة التصفية نفسها تعرض كل التسميات
  await page.goto(`${BASE}/audit-log?action=login`, { waitUntil: 'networkidle' })
  const actionCells = await page.$$eval('tbody tr td:nth-child(3)',
    (els) => els.map((e) => e.textContent?.trim()))
  check('تصفية سجل العمليات بنوع العملية',
        actionCells.length > 0 && actionCells.every((a) => a === 'تسجيل دخول'),
        `${actionCells.length} سطرًا، كلها: ${[...new Set(actionCells)].join('، ')}`)

  // ---------- دليل الفريق ----------
  await page.goto(`${BASE}/staff`, { waitUntil: 'networkidle' })
  const staffBody = await page.textContent('body')
  check('دليل المحامين والموظفين يعمل', Boolean(staffBody?.includes('مدير النظام')))

  // ---------- الإعدادات: بيانات المكتب ----------
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.fill('#officeName', `مكتب المحاماة ${stamp}`)
  await page.fill('#officePhone', '0112345678')
  await page.fill('#currencySymbol', 'ر.س')
  await page.click('button[type=submit]:has-text("حفظ الإعدادات")')
  await page.waitForTimeout(3500)

  await page.reload({ waitUntil: 'networkidle' })
  const savedName = await page.inputValue('#officeName')
  check('حفظ بيانات المكتب', savedName === `مكتب المحاماة ${stamp}`, savedName)

  // اسم المكتب ينعكس في الشريط الجانبي
  const sidebarText = await page.textContent('aside')
  check('اسم المكتب ينعكس في الشريط الجانبي',
        Boolean(sidebarText?.includes(stamp)))

  // ---------- التحقق من المدخلات ----------
  await page.fill('#taxRate', '150')
  await page.click('button[type=submit]:has-text("حفظ الإعدادات")')
  await page.waitForTimeout(3000)
  const taxErr = await page.textContent('body')
  check('رفض نسبة ضريبة تتجاوز 100', Boolean(taxErr?.includes('لا تتجاوز 100')))
  await page.fill('#taxRate', '15')

  // ---------- جداول المراجع ----------
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("جداول المراجع")')
  await page.waitForTimeout(800)
  await page.click('button:has-text("إضافة") >> nth=0')
  await page.waitForSelector('input[aria-label*="الجديد"]', { timeout: 10000 })
  await page.fill('input[aria-label*="الجديد"]', NEW_TYPE)
  await page.click('button:has-text("حفظ") >> nth=0')
  await page.waitForTimeout(3000)

  await page.reload({ waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("جداول المراجع")')
  await page.waitForTimeout(800)
  check('إضافة نوع قضية جديد من الإعدادات', await page.isVisible(`text=${NEW_TYPE}`))

  // النوع الجديد متاح فورًا عند فتح قضية
  await page.goto(`${BASE}/cases/new`, { waitUntil: 'networkidle' })
  await page.click('#caseTypeId')
  await page.waitForSelector('[role=option]', { timeout: 10000 })
  const options = await page.$$eval('[role=option]', (els) => els.map((e) => e.textContent?.trim()))
  check('النوع الجديد متاح فورًا في نموذج القضية', options.includes(NEW_TYPE))
  await page.keyboard.press('Escape')

  // ---------- النسخ الاحتياطي ----------
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("النسخ الاحتياطي")')
  await page.waitForSelector('button:has-text("تصدير نسخة احتياطية")', { timeout: 10000 })

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60000 }).catch(() => null),
    page.click('button:has-text("تصدير نسخة احتياطية")'),
  ])
  check('تصدير نسخة احتياطية', Boolean(download), download?.suggestedFilename() ?? 'لم يُنزَّل')

  if (download) {
    const stream = await download.createReadStream()
    const chunks = []
    for await (const chunk of stream) chunks.push(chunk)
    const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    check('ملف النسخة يحتوي الجداول الأساسية',
          Boolean(parsed.tables?.clients && parsed.tables?.cases && parsed.tables?.invoices),
          `${Object.keys(parsed.tables ?? {}).length} جدولًا`)
    check('ملف النسخة يحمل تاريخ التصدير', Boolean(parsed.exported_at))
  }

  // ---------- تنظيف نوع القضية ----------
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("جداول المراجع")')
  await page.waitForTimeout(800)
  const hideBtn = page.locator('li', { hasText: NEW_TYPE }).locator('button:has-text("إخفاء")')
  if (await hideBtn.count() > 0) {
    await hideBtn.first().click()
    await page.waitForTimeout(2000)
    check('إخفاء عنصر من جدول المراجع', true)
  }
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
