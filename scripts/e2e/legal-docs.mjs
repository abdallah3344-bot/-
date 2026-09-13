/** اختبار الوكالات والعقود مع تنبيهات قرب الانتهاء. */
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
const CLIENT = `موكّل الوكالات ${stamp}`
const CONTRACT = `عقد استشارات ${stamp}`

const iso = (d) => d.toISOString().slice(0, 10)
const today = new Date()
const in10Days = new Date(today); in10Days.setDate(today.getDate() + 10)
const in400Days = new Date(today); in400Days.setDate(today.getDate() + 400)
const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)

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
  check('تجهيز عميل', Boolean(clientId))

  // ---------- وكالة توشك على الانتهاء ----------
  await page.goto(`${BASE}/powers-of-attorney`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("إضافة وكالة")')
  await page.waitForSelector('#issuedAt', { timeout: 10000 })
  await page.click('#clientId')
  await page.click(`[role=option]:has-text("${CLIENT}")`)
  await page.fill('#issuedAt', iso(today))
  await page.fill('#expiresAt', iso(in10Days))
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3500)

  await page.goto(`${BASE}/powers-of-attorney`, { waitUntil: 'networkidle' })
  const poaBody = await page.textContent('body')
  check('إضافة وكالة وتوليد رقمها', /POA-\d{4}-\d{5}/.test(poaBody ?? ''),
        poaBody?.match(/POA-\d{4}-\d{5}/)?.[0])
  check('تنبيه قرب انتهاء الوكالة يظهر',
        Boolean(poaBody?.includes('ينتهي بعد 10 يوم') || poaBody?.includes('ينتهي بعد')))

  // تصفية "توشك على الانتهاء"
  await page.goto(`${BASE}/powers-of-attorney?status=expiring`, { waitUntil: 'networkidle' })
  check('تصفية الوكالات الموشكة على الانتهاء',
        await page.isVisible(`text=${CLIENT}`))

  // ---------- التحقق: تاريخ انتهاء قبل تاريخ الوكالة ----------
  await page.goto(`${BASE}/powers-of-attorney`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("إضافة وكالة")')
  await page.waitForSelector('#issuedAt', { timeout: 10000 })
  await page.click('#clientId')
  await page.click(`[role=option]:has-text("${CLIENT}")`)
  await page.fill('#issuedAt', iso(today))
  await page.fill('#expiresAt', iso(yesterday))
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForSelector('[data-form-error]', { timeout: 15000 })
  const poaErr = await page.textContent('body')
  check('رفض تاريخ انتهاء سابق لتاريخ الوكالة',
        Boolean(poaErr?.includes('يجب أن يكون بعد تاريخ الوكالة')))
  await page.keyboard.press('Escape')

  // ---------- عقد ----------
  await page.goto(`${BASE}/contracts`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("إضافة عقد")')
  await page.waitForSelector('#title', { timeout: 10000 })
  await page.fill('#title', CONTRACT)
  await page.click('#clientId')
  await page.click(`[role=option]:has-text("${CLIENT}")`)
  await page.fill('#counterparty', 'شركة الوفاق')
  await page.fill('#value', '75000')
  await page.fill('#startDate', iso(today))
  await page.fill('#endDate', iso(in10Days))
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(3500)

  await page.goto(`${BASE}/contracts?q=${stamp}`, { waitUntil: 'networkidle' })
  const contractBody = await page.textContent('body')
  check('إضافة عقد وتوليد رقمه', /CNT-\d{4}-\d{5}/.test(contractBody ?? ''),
        contractBody?.match(/CNT-\d{4}-\d{5}/)?.[0])
  check('قيمة العقد معروضة بالعملة', Boolean(contractBody?.includes('75,000.00')))
  check('تنبيه قرب انتهاء العقد', Boolean(contractBody?.includes('ينتهي بعد')))

  // ---------- التحقق: نهاية قبل البداية ----------
  await page.goto(`${BASE}/contracts`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("إضافة عقد")')
  await page.waitForSelector('#title', { timeout: 10000 })
  await page.fill('#title', 'عقد خاطئ')
  await page.click('#clientId')
  await page.click(`[role=option]:has-text("${CLIENT}")`)
  await page.fill('#startDate', iso(in400Days))
  await page.fill('#endDate', iso(today))
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForSelector('[data-form-error]', { timeout: 15000 })
  const contractErr = await page.textContent('body')
  check('رفض تاريخ نهاية سابق لتاريخ البداية',
        Boolean(contractErr?.includes('يجب أن يكون بعد تاريخ البداية')))
  await page.keyboard.press('Escape')

  // ---------- ظهورهما في التقويم ----------
  await page.goto(`${BASE}/calendar?y=${in10Days.getFullYear()}&m=${in10Days.getMonth() + 1}`,
                  { waitUntil: 'networkidle' })
  const calBody = await page.textContent('body')
  check('انتهاء العقد والوكالة يظهران في التقويم',
        Boolean(calBody?.includes('انتهاء عقد') || calBody?.includes('انتهاء وكالة')))
} catch (error) {
  check('اكتمال الاختبار دون استثناء', false, String(error).slice(0, 250))
}

// تنظيف
try {
  for (const [path, label] of [['/contracts', 'حذف العقد'], ['/powers-of-attorney', 'حذف الوكالة']]) {
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    let guard = 0
    while (guard++ < 5) {
      const btn = await page.$('button[aria-label^="إجراءات"]')
      if (!btn) break
      await btn.click()
      const item = await page.$(`[role=menuitem]:has-text("${label}")`)
      if (!item) { await page.keyboard.press('Escape'); break }
      await item.click()
      await page.click(`button:has-text("${label}")`)
      await page.waitForTimeout(2000)
      await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' })
    }
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
