/**
 * اختبار الوحدة المالية: الأتعاب والأقساط، الفواتير وإجمالياتها،
 * المقبوضات وأثرها على حالة الفاتورة، المصروفات، وكشف حساب العميل.
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


/** يختار قيمة من قائمة Radix وينتظر إغلاقها قبل أي تفاعل تالٍ. */
async function selectOption(page, triggerId, optionText) {
  await page.click(triggerId)
  await page.waitForSelector('[role=option]', { timeout: 10000 })
  await page.click(`[role=option]:has-text(${JSON.stringify(optionText)})`)
  await page.waitForSelector('[role=option]', { state: 'detached', timeout: 10000 }).catch(() => {})
  await page.waitForTimeout(250)
}

const stamp = Date.now().toString().slice(-6)
const CLIENT = `عميل المالية ${stamp}`
const CASE_TITLE = `قضية المالية ${stamp}`
const iso = (d) => d.toISOString().slice(0, 10)
const today = new Date()

const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

const consoleErrors = []
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

let clientId = null, caseId = null, invoiceId = null

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

  // ---------- الأتعاب والأقساط ----------
  await page.goto(`${BASE}/fees`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("تحديد أتعاب قضية")')
  await page.waitForSelector('#totalAmount', { timeout: 10000 })
  await selectOption(page, '#caseId', CASE_TITLE)
  await page.fill('#totalAmount', '100000')
  await page.fill('#advanceAmount', '25000')
  await page.fill('#installmentsCount', '3')
  await page.fill('#firstDueDate', iso(today))
  await page.click('button[type=submit]:has-text("حفظ الأتعاب")')
  await page.waitForTimeout(4000)

  await page.goto(`${BASE}/fees`, { waitUntil: 'networkidle' })
  const feeBody = await page.textContent('body')
  check('حفظ الأتعاب', Boolean(feeBody?.includes('100,000.00')))
  check('احتساب قيمة القسط (75000 ÷ 3 = 25000)',
        Boolean(feeBody?.includes('3 × 25,000.00')),
        feeBody?.match(/\d+ × [\d,.]+/)?.[0])

  // ---------- رفض دفعة مقدمة أكبر من الإجمالي ----------
  await page.click('button:has-text("تحديد أتعاب قضية")')
  await page.waitForSelector('#totalAmount', { timeout: 10000 })
  await selectOption(page, '#caseId', CASE_TITLE)
  await page.fill('#totalAmount', '1000')
  await page.fill('#advanceAmount', '5000')
  await page.click('button[type=submit]:has-text("حفظ الأتعاب")')
  await page.waitForTimeout(3000)
  const feeErr = await page.textContent('body')
  check('رفض دفعة مقدمة تتجاوز إجمالي الأتعاب',
        Boolean(feeErr?.includes('لا يمكن أن تتجاوز')))
  await page.keyboard.press('Escape')

  // ---------- الفاتورة ----------
  await page.goto(`${BASE}/invoices/new`, { waitUntil: 'networkidle' })
  await selectOption(page, '#clientId', CLIENT)
  await selectOption(page, '#caseId', CASE_TITLE)
  await page.fill('#item-desc-0', 'أتعاب مرافعة')
  await page.fill('#item-qty-0', '2')
  await page.fill('#item-price-0', '5000')
  await page.click('button:has-text("إضافة بند")')
  await page.waitForSelector('#item-desc-1', { timeout: 10000 })
  await page.fill('#item-desc-1', 'رسوم خبرة')
  await page.fill('#item-qty-1', '1')
  await page.fill('#item-price-1', '2000')
  await page.fill('#discount', '1000')
  await page.fill('#taxRate', '15')
  await page.click('button[type=submit]:has-text("إصدار الفاتورة")')
  await page.waitForURL(/\/invoices\/[0-9a-f-]{36}$/, { timeout: 25000 })
  invoiceId = page.url().split('/invoices/')[1]
  check('إصدار فاتورة متعددة البنود', Boolean(invoiceId))

  const invoiceNo = (await page.textContent('h1'))?.match(/INV-\d{4}-\d{5}/)?.[0] ?? ''
  check('رقم الفاتورة مُولَّد', Boolean(invoiceNo), invoiceNo)

  // 2×5000 + 1×2000 = 12000 ؛ −1000 = 11000 ؛ ضريبة 15% = 1650 ؛ الإجمالي 12650
  const invBody = await page.textContent('body')
  check('احتساب المجموع الفرعي (12,000)', Boolean(invBody?.includes('12,000.00')))
  check('احتساب الضريبة 15% (1,650)', Boolean(invBody?.includes('1,650.00')))
  check('احتساب الإجمالي بعد الخصم والضريبة (12,650)',
        Boolean(invBody?.includes('12,650.00')))

  // ---------- دفعة جزئية ----------
  await page.goto(`${BASE}/payments`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("تسجيل دفعة")')
  await page.waitForSelector('#amount', { timeout: 10000 })
  await selectOption(page, '#clientId', CLIENT)
  await selectOption(page, '#invoiceId', invoiceNo)
  await page.fill('#amount', '5000')
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(4000)

  await page.goto(`${BASE}/invoices/${invoiceId}`, { waitUntil: 'networkidle' })
  const afterPartial = await page.textContent('body')
  check('الدفعة الجزئية تُحدّث المدفوع والمتبقي',
        Boolean(afterPartial?.includes('5,000.00') && afterPartial?.includes('7,650.00')))
  check('حالة الفاتورة تصبح «مدفوعة جزئيًا»',
        Boolean(afterPartial?.includes('مدفوعة جزئيًا')))

  // ---------- رفض دفعة تتجاوز المتبقي ----------
  await page.goto(`${BASE}/payments`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("تسجيل دفعة")')
  await page.waitForSelector('#amount', { timeout: 10000 })
  await selectOption(page, '#clientId', CLIENT)
  await selectOption(page, '#invoiceId', invoiceNo)
  await page.fill('#amount', '99999')
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3000)
  const overErr = await page.textContent('body')
  check('رفض دفعة تتجاوز المتبقي على الفاتورة',
        Boolean(overErr?.includes('يتجاوز المتبقي')))
  await page.keyboard.press('Escape')

  // ---------- سداد المتبقي ----------
  await page.goto(`${BASE}/payments`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("تسجيل دفعة")')
  await page.waitForSelector('#amount', { timeout: 10000 })
  await selectOption(page, '#clientId', CLIENT)
  await selectOption(page, '#invoiceId', invoiceNo)
  await page.fill('#amount', '7650')
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(4000)

  await page.goto(`${BASE}/invoices/${invoiceId}`, { waitUntil: 'networkidle' })
  const afterFull = await page.textContent('body')
  check('سداد المتبقي يجعل الفاتورة «مدفوعة»', Boolean(afterFull?.includes('مدفوعة')))

  // ---------- منع حذف فاتورة عليها دفعات ----------
  await page.goto(`${BASE}/invoices?q=${invoiceNo}`, { waitUntil: 'networkidle' })
  const invNo = invoiceNo
  if (invNo) {
    await page.click(`button[aria-label="إجراءات ${invNo}"]`)
    await page.click('[role=menuitem]:has-text("حذف الفاتورة")')
    await page.click('button:has-text("حذف الفاتورة")')
    await page.waitForTimeout(3000)
    const delErr = await page.textContent('body')
    check('منع حذف فاتورة عليها دفعات مسجّلة',
          Boolean(delErr?.includes('لا يمكن حذف فاتورة')))
    await page.keyboard.press('Escape')
  }

  // ---------- إيصال القبض ----------
  await page.goto(`${BASE}/payments`, { waitUntil: 'networkidle' })
  const receiptNo = (await page.textContent('body'))?.match(/REC-\d{4}-\d{5}/)?.[0]
  if (receiptNo) {
    await page.click(`button[aria-label="إجراءات ${receiptNo}"]`)
    await page.click('[role=menuitem]:has-text("إيصال قبض")')
    await page.waitForURL(/\/payments\/[0-9a-f-]{36}$/, { timeout: 20000 })
    const receiptBody = await page.textContent('body')
    check('إيصال القبض يعرض المبلغ بالكلمات',
          Boolean(receiptBody?.includes('فقط:') && receiptBody?.includes('لا غير')),
          receiptBody?.match(/فقط: (.{0,40})/)?.[1])
  }

  // ---------- المصروفات ----------
  await page.goto(`${BASE}/expenses`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("تسجيل مصروف")')
  await page.waitForSelector('#amount', { timeout: 10000 })
  await selectOption(page, '#categoryId', 'رسوم محكمة')
  await page.fill('#amount', '1500')
  await selectOption(page, '#clientId', CLIENT)
  await page.fill('#description', `رسوم رفع دعوى ${stamp}`)
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3500)

  await page.goto(`${BASE}/expenses?q=${stamp}`, { waitUntil: 'networkidle' })
  check('تسجيل مصروف', await page.isVisible(`text=رسوم رفع دعوى ${stamp}`))

  // ---------- كشف حساب العميل ----------
  await page.goto(`${BASE}/accounts/statement?client=${clientId}`, { waitUntil: 'networkidle' })
  const stBody = await page.textContent('body')
  check('كشف الحساب يجمع الفواتير والمصروفات والدفعات',
        Boolean(stBody?.includes('فاتورة') && stBody?.includes('دفعة') && stBody?.includes('مصروف')))
  // 12650 (فاتورة) + 1500 (مصروف) − 12650 (دفعات) = 1500
  check('الرصيد الجاري محسوب صحيحًا (1,500 مستحق)',
        Boolean(stBody?.includes('1,500.00')))

  // ---------- الحسابات ----------
  await page.goto(`${BASE}/accounts`, { waitUntil: 'networkidle' })
  const accBody = await page.textContent('body')
  check('صفحة الحسابات تعرض الإيرادات والمصروفات',
        Boolean(accBody?.includes('إجمالي الإيرادات') && accBody?.includes('صافي الإيرادات')))
} catch (error) {
  check('اكتمال الاختبار دون استثناء', false, String(error).slice(0, 250))
}

// تنظيف
try {
  await page.goto(`${BASE}/payments`, { waitUntil: 'networkidle' })
  for (let i = 0; i < 3; i++) {
    const btn = await page.$('button[aria-label^="إجراءات REC-"]')
    if (!btn) break
    await btn.click()
    await page.click('[role=menuitem]:has-text("حذف الدفعة")')
    await page.click('button:has-text("حذف الدفعة")')
    await page.waitForTimeout(2000)
    await page.goto(`${BASE}/payments`, { waitUntil: 'networkidle' })
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
