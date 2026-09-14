/**
 * اختبار وحدة القضايا ومساحة عمل القضية.
 * يغطّي: فتح قضية، الخصوم المتعددون، الملاحظات، الإغلاق والأرشفة وإعادة الفتح،
 * ومنع حذف عميل مرتبط بقضية.
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
const CLIENT = `مؤسسة النخبة ${stamp}`
const CASE_TITLE = `مطالبة مالية ${stamp}`

const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

let clientId = null
let caseId = null

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#identifier', 'admin')
  await page.fill('#password', 'Admin@2026')
  await page.click('button[type=submit]')
  await page.waitForURL('**/dashboard', { timeout: 25000 })

  // عميل يحمل القضية
  await page.goto(`${BASE}/clients/new`, { waitUntil: 'networkidle' })
  await page.fill('#name', CLIENT)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/, { timeout: 25000 })
  clientId = page.url().split('/clients/')[1]
  check('تجهيز عميل للاختبار', Boolean(clientId))

  // ---------- فتح قضية من صفحة العميل ----------
  await page.goto(`${BASE}/cases/new?client=${clientId}`, { waitUntil: 'networkidle' })
  await page.fill('#title', CASE_TITLE)
  await page.fill('#courtCaseNo', `2026/${stamp}`)
  await page.fill('#claimAmount', '150000')
  await page.click('#caseTypeId')
  const caseTypeOptions = (await page.locator('[role=option]').allTextContents()).join(' | ')
  // النظام موجَّه لفلسطين: التسميات تتبع الممارسة هناك
  for (const t of ['حقوق', 'جزاء', 'تنفيذ', 'أحوال شخصية شرعية', 'أراضي وتسوية']) {
    check(`نوع القضية «${t}» متاح`, caseTypeOptions.includes(t))
  }
  check('لا أنواع قضايا من بقايا الاختبارات', !/قضايا تحكيم \d{6}/.test(caseTypeOptions))
  await page.click('[role=option]:has-text("تجارية")')

  // المحاكم فلسطينية
  await page.click('#courtId')
  const courtOptions = (await page.locator('[role=option]').allTextContents()).join(' | ')
  check('المحاكم الفلسطينية مُحمَّلة',
    courtOptions.includes('محكمة بداية رام الله') && courtOptions.includes('محكمة صلح نابلس'))
  check('محكمة النقض موجودة', courtOptions.includes('محكمة النقض'))
  check('لا محاكم من خارج فلسطين', !courtOptions.includes('الرياض'))
  await page.keyboard.press('Escape')

  // المحافظة قائمة اختيار بالمحافظات الفلسطينية لا حقلًا حرًّا
  await page.click('#governorate')
  const govOptions = (await page.locator('[role=option]').allTextContents()).join(' | ')
  for (const g of ['رام الله والبيرة', 'نابلس', 'الخليل', 'غزة', 'خان يونس']) {
    check(`المحافظة «${g}» متاحة`, govOptions.includes(g))
  }
  await page.click('[role=option]:has-text("رام الله والبيرة")')

  await page.click('#priority')
  await page.click('[role=option]:has-text("عالية")')
  await page.click('button[type=submit]')
  await page.waitForURL(/\/cases\/[0-9a-f-]{36}$/, { timeout: 25000 })
  caseId = page.url().split('/cases/')[1]
  check('فتح قضية جديدة', Boolean(caseId))

  const h1 = await page.textContent('h1')
  check('مساحة عمل القضية تعرض الاسم', h1?.trim() === CASE_TITLE, h1?.trim())

  const body = await page.textContent('body')
  check('رقم الملف الداخلي مُولَّد', /CS-\d{4}-\d{5}/.test(body ?? ''),
        body?.match(/CS-\d{4}-\d{5}/)?.[0])
  check('العميل مربوط بالقضية', Boolean(body?.includes(CLIENT)))
  check('الأولوية والنوع ظاهران',
        Boolean(body?.includes('عالية') && body?.includes('تجارية')))

  // ---------- التبويبات ----------
  const tabs = await page.$$eval('[role=tab]', (els) => els.map((e) => e.textContent?.trim()))
  check('تبويبات مساحة العمل موجودة', tabs.length >= 8, `${tabs.length} تبويب`)

  // ---------- الخصوم: أكثر من خصم ----------
  await page.click('[role=tab]:has-text("الأطراف")')
  await page.waitForTimeout(600)

  for (const [name, lawyer] of [['شركة النور التجارية', 'أ. سعد القحطاني'], ['مؤسسة البيان', 'أ. ليلى حسن']]) {
    await page.click('button:has-text("إضافة خصم")')
    await page.waitForSelector('#name', { timeout: 10000 })
    await page.fill('#name', name)
    await page.fill('#lawyerName', lawyer)
    await page.click('button[type=submit]:has-text("حفظ")')
    await page.waitForTimeout(2500)
  }

  await page.reload({ waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("الأطراف")')
  await page.waitForTimeout(800)
  const partiesText = await page.textContent('body')
  check('القضية تقبل أكثر من خصم',
        Boolean(partiesText?.includes('شركة النور التجارية') && partiesText?.includes('مؤسسة البيان')))

  // ---------- الملاحظات ----------
  await page.click('[role=tab]:has-text("الملاحظات")')
  await page.waitForSelector('textarea[aria-label="نص الملاحظة"]', { timeout: 10000 })
  await page.fill('textarea[aria-label="نص الملاحظة"]', 'تم تقديم اللائحة الجوابية بتاريخ اليوم.')
  await page.click('button:has-text("إضافة ملاحظة")')
  await page.waitForTimeout(2500)
  await page.reload({ waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("الملاحظات")')
  await page.waitForTimeout(800)
  const noteSaved = await page.isVisible('text=اللائحة الجوابية')
  check('الملاحظات تُحفظ في قاعدة البيانات', noteSaved)

  // ---------- منع حذف عميل مرتبط بقضية ----------
  await page.goto(`${BASE}/clients?q=${stamp}`, { waitUntil: 'networkidle' })
  await page.click(`button[aria-label="إجراءات ${CLIENT}"]`)
  await page.click('[role=menuitem]:has-text("حذف العميل")')
  await page.click('button:has-text("حذف العميل")')
  await page.waitForTimeout(2500)
  await page.goto(`${BASE}/clients?q=${stamp}`, { waitUntil: 'networkidle' })
  const clientStillThere = await page.isVisible(`text=${CLIENT}`)
  check('منع حذف عميل مرتبط بقضية قائمة', clientStillThere)

  // ---------- الإغلاق والأرشفة ----------
  await page.goto(`${BASE}/cases/${caseId}`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("إغلاق وأرشفة")')
  await page.waitForSelector('#close-reason', { timeout: 10000 })
  await page.fill('#close-reason', 'صدر حكم نهائي لصالح الموكّل وتم التنفيذ.')
  await page.click('button:has-text("إغلاق وأرشفة") >> nth=-1')
  await page.waitForTimeout(3000)
  await page.reload({ waitUntil: 'networkidle' })
  const closedText = await page.textContent('body')
  check('إغلاق القضية وتسجيل السبب',
        Boolean(closedText?.includes('مغلقة') && closedText?.includes('صدر حكم نهائي')))

  // سجل الحالة يرصد التغيير تلقائيًا
  await page.click('[role=tab]:has-text("سجل الحالة")')
  await page.waitForTimeout(800)
  const historyText = await page.textContent('body')
  check('سجل تغيّر الحالة يُكتب تلقائيًا', Boolean(historyText?.includes('مغلقة')))

  // ---------- إعادة الفتح ----------
  await page.click('button:has-text("إعادة فتح")')
  await page.click('button:has-text("إعادة الفتح")')
  await page.waitForTimeout(3000)
  await page.reload({ waitUntil: 'networkidle' })
  const reopened = await page.textContent('body')
  check('إعادة فتح القضية من الأرشيف', Boolean(reopened?.includes('قيد المتابعة')))

  // ---------- البحث والتصفية ----------
  await page.goto(`${BASE}/cases?q=${stamp}`, { waitUntil: 'networkidle' })
  check('البحث في القضايا', await page.isVisible(`text=${CASE_TITLE}`))

  // ---------- الموبايل ----------
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${BASE}/cases/${caseId}`, { waitUntil: 'networkidle' })
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1)
  check('مساحة عمل القضية بلا تمرير أفقي على الموبايل', !overflow)
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
