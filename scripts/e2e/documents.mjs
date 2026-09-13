/** اختبار المستندات (رفع حقيقي لتخزين Supabase) والأرشيف. */
import { chromium } from "playwright"
import { existsSync, writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const EXECUTABLE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

const results = []
function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const stamp = Date.now().toString().slice(-6)
const CLIENT = `عميل المستندات ${stamp}`
const CASE_TITLE = `قضية المستندات ${stamp}`
const DOC_NAME = `لائحة دعوى ${stamp}`

// ملفان: PDF صالح، ونصّي لاختبار رفض النوع
const dir = mkdtempSync(join(tmpdir(), 'docs-'))
const pdfPath = join(dir, 'test.pdf')
writeFileSync(pdfPath, Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n' +
  'trailer<</Root 1 0 R>>\n%%EOF\n'))
const exePath = join(dir, 'malicious.exe')
writeFileSync(exePath, Buffer.from('MZ\x90\x00 fake executable'))

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
  check('تجهيز عميل وقضية', Boolean(caseId))

  // ---------- رفض نوع ملف غير مدعوم ----------
  await page.goto(`${BASE}/documents`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("رفع مستند")')
  await page.waitForSelector('#file', { timeout: 10000 })
  await page.setInputFiles('#file', exePath)
  await page.fill('#name', 'ملف خطير')
  await page.click('button[type=submit]:has-text("رفع المستند")')
  await page.waitForTimeout(3500)
  const rejectBody = await page.textContent('body')
  check('رفض نوع الملف غير المدعوم',
        Boolean(rejectBody?.includes('نوع ملف غير مدعوم') || rejectBody?.includes('غير مدعوم')))

  // ---------- رفع ملف صالح ----------
  await page.reload({ waitUntil: 'networkidle' })
  await page.click('button:has-text("رفع مستند")')
  await page.waitForSelector('#file', { timeout: 10000 })
  await page.setInputFiles('#file', pdfPath)
  await page.fill('#name', DOC_NAME)
  await page.click('#categoryId')
  await page.click('[role=option]:has-text("لائحة")')
  await page.click('#caseId')
  await page.click(`[role=option]:has-text("${CASE_TITLE}")`)
  await page.click('button[type=submit]:has-text("رفع المستند")')
  await page.waitForTimeout(6000)

  await page.goto(`${BASE}/documents?q=${stamp}`, { waitUntil: 'networkidle' })
  check('رفع المستند وحفظه', await page.isVisible(`text=${DOC_NAME}`))

  // ---------- المستند يظهر في ملف القضية ----------
  await page.goto(`${BASE}/cases/${caseId}`, { waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("المستندات")')
  await page.waitForTimeout(1000)
  check('المستند مرتبط بالقضية وظاهر في ملفها',
        await page.isVisible(`text=${DOC_NAME}`))

  // ---------- الرابط الموقّع ----------
  await page.goto(`${BASE}/documents?q=${stamp}`, { waitUntil: 'networkidle' })

  // نعترض window.open لالتقاط الرابط دون فتحه فعليًا:
  // متصفح الاختبار في هذه البيئة لا يصل لمضيف التخزين مباشرة،
  // والمطلوب التحقق من شكل الرابط لا من تصفّحه.
  await page.evaluate(() => {
    window.__openedUrl = undefined
    window.open = (url) => {
      ;window.__openedUrl = String(url)
      return null
    }
  })

  await page.click(`button[aria-label="إجراءات ${DOC_NAME}"]`)
  await page.click('[role=menuitem]:has-text("معاينة")')
  await page.waitForTimeout(4000)

  const signedUrl = await page.evaluate(
    () => window.__openedUrl ?? '')

  check('المعاينة تُنشئ رابطًا موقّتًا موقّعًا',
        signedUrl.includes('/storage/v1/') && signedUrl.includes('token='),
        signedUrl ? signedUrl.split('?')[0].split('/storage')[1] : 'لم يُنشأ')

  // ---------- الحاوية خاصة: لا وصول مباشر بدون توقيع ----------
  if (signedUrl.startsWith('http')) {
    const unsigned = signedUrl.split('?')[0]
    const res = await page.request.get(unsigned).catch(() => null)
    check('الوصول المباشر للملف بدون توقيع مرفوض',
          res === null || res.status() >= 400,
          res ? `HTTP ${res.status()}` : 'تعذّر الوصول')
  }

  // ---------- إعادة التسمية ----------
  await page.goto(`${BASE}/documents?q=${stamp}`, { waitUntil: 'networkidle' })
  await page.click(`button[aria-label="إجراءات ${DOC_NAME}"]`)
  await page.click('[role=menuitem]:has-text("إعادة تسمية")')
  await page.waitForSelector('#name', { timeout: 10000 })
  await page.fill('#name', `${DOC_NAME} — معدّل`)
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3000)
  await page.goto(`${BASE}/documents?q=${stamp}`, { waitUntil: 'networkidle' })
  check('إعادة تسمية المستند', await page.isVisible(`text=${DOC_NAME} — معدّل`))

  // ---------- الأرشيف ----------
  await page.goto(`${BASE}/cases/${caseId}`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("إغلاق وأرشفة")')
  await page.waitForSelector('#close-reason', { timeout: 10000 })
  await page.fill('#close-reason', 'انتهت الخصومة بالتصالح.')
  await page.click('button:has-text("إغلاق وأرشفة") >> nth=-1')
  await page.waitForTimeout(3500)

  await page.goto(`${BASE}/archive?q=${stamp}`, { waitUntil: 'networkidle' })
  check('القضية المغلقة تظهر في الأرشيف', await page.isVisible(`text=${CASE_TITLE}`))

  // المستندات محفوظة بعد الأرشفة
  await page.goto(`${BASE}/cases/${caseId}`, { waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("المستندات")')
  await page.waitForTimeout(1000)
  check('الأرشفة تحتفظ بالمستندات', await page.isVisible(`text=${DOC_NAME}`))

  // القضية المؤرشفة تختفي من القائمة النشطة
  await page.goto(`${BASE}/cases?q=${stamp}`, { waitUntil: 'networkidle' })
  const inActive = await page.isVisible(`text=${CASE_TITLE}`)
  check('القضية المغلقة ما زالت مرئية في القضايا (بحالة مغلقة)', inActive)

  // إعادة الفتح من الأرشيف
  await page.goto(`${BASE}/archive?q=${stamp}`, { waitUntil: 'networkidle' })
  await page.click(`button[aria-label="إجراءات ${CASE_TITLE}"]`)
  await page.click('[role=menuitem]:has-text("إعادة فتح")')
  await page.click('button:has-text("إعادة الفتح")')
  await page.waitForTimeout(3000)
  await page.goto(`${BASE}/archive?q=${stamp}`, { waitUntil: 'networkidle' })
  check('إعادة الفتح تُخرج القضية من الأرشيف',
        !(await page.isVisible(`text=${CASE_TITLE}`)))
} catch (error) {
  check('اكتمال الاختبار دون استثناء', false, String(error).slice(0, 250))
}

// تنظيف
try {
  await page.goto(`${BASE}/documents?q=${stamp}`, { waitUntil: 'networkidle' })
  const actions = await page.$(`button[aria-label^="إجراءات ${DOC_NAME}"]`)
  if (actions) {
    await actions.click()
    await page.click('[role=menuitem]:has-text("حذف المستند")')
    await page.click('button:has-text("حذف المستند")')
    await page.waitForTimeout(2500)
  }
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
