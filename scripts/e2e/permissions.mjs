/**
 * يتحقق من أن محرّر الصلاحيات يغيّر ما يراه المستخدم فعليًا.
 * ينشئ مستخدمًا بدور «مستخدم مخصص» (بلا صلاحيات)، يمنحه صلاحيات يدويًا،
 * ثم يسجّل الدخول بحسابه ويتأكّد أن القائمة تغيّرت.
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
const U = {
  fullName: 'خالد فهد الدوسري',
  username: `khaled${stamp}`,
  email: `khaled${stamp}@lawoffice.local`,
  password: 'Custom@2026',
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

const adminCtx = await browser.newContext({ viewport: { width: 1600, height: 1000 } })
const page = await adminCtx.newPage()
let userId = null

try {
  await login(page, 'admin', 'Admin@2026')

  // إنشاء مستخدم بدور «مستخدم مخصص»
  await page.goto(`${BASE}/users/new`, { waitUntil: 'networkidle' })
  await page.fill('#fullName', U.fullName)
  await page.fill('#username', U.username)
  await page.fill('#email', U.email)
  await page.fill('#password', U.password)
  await page.click('#roleCode')
  await page.click('[role=option]:has-text("مستخدم مخصص")')
  await page.click('button[type=submit]')
  await page.waitForURL('**/users', { timeout: 25000 })
  check('إنشاء مستخدم بدور مخصص', true)

  // الدخول لصفحته
  await page.goto(`${BASE}/users?q=${U.username}`, { waitUntil: 'networkidle' })
  await page.click(`a:has-text("${U.fullName}")`)
  await page.waitForURL('**/users/**', { timeout: 20000 })
  userId = page.url().split('/users/')[1]?.split('?')[0] ?? null
  check('فتح صفحة المستخدم', Boolean(userId))

  // فتح تبويب الصلاحيات
  await page.click('[role=tab]:has-text("الصلاحيات")')
  await page.waitForSelector('table', { timeout: 15000 })

  const badge = await page.textContent('text=استثناء عن الدور').catch(() => null)
  check('المستخدم المخصص يبدأ بلا صلاحيات', badge === null, badge ?? 'لا استثناءات')

  // منح صلاحيات وحدتَي العملاء والمهام عبر مربّع «الكل» في صفّيهما
  for (const moduleName of ['العملاء', 'المهام']) {
    const row = page.locator('tr', { has: page.locator(`td:text-is("${moduleName}")`) })
    await row.locator('button[role=checkbox]').last().click()
  }
  await page.waitForTimeout(400)

  await page.click('button:has-text("حفظ الصلاحيات")')
  await page.waitForSelector('text=تم حفظ الصلاحيات', { timeout: 20000 })
  check('حفظ الصلاحيات الفردية', true)

  // إعادة التحميل للتأكد من الحفظ في قاعدة البيانات
  await page.reload({ waitUntil: 'networkidle' })
  await page.click('[role=tab]:has-text("الصلاحيات")')
  await page.waitForSelector('table', { timeout: 15000 })
  const persisted = await page.isVisible('text=استثناء عن الدور')
  check('الصلاحيات محفوظة في قاعدة البيانات بعد التحديث', persisted)
} catch (error) {
  check('مسار محرّر الصلاحيات', false, String(error).slice(0, 250))
}

// التحقق من الأثر الفعلي بحساب المستخدم نفسه
const userCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const userPage = await userCtx.newPage()

try {
  await login(userPage, U.username, U.password)
  const nav = await userPage.$$eval('aside nav a', (els) => els.map((e) => e.textContent?.trim()))
  const joined = nav.join('|')

  check('الصلاحيات الممنوحة يدويًا ظهرت في القائمة',
    joined.includes('العملاء') && joined.includes('المهام'), `الوحدات: ${nav.join('، ')}`)

  check('ما لم يُمنح يبقى محجوبًا',
    !joined.includes('الفواتير') && !joined.includes('القضايا') && !joined.includes('المستخدمون'))

  // نستخدم صفحة مبنيّة فعلًا: الصفحات غير المبنيّة تُرجع 404 لا /forbidden
  await userPage.goto(`${BASE}/users`, { waitUntil: 'networkidle' })
  check('الوصول المباشر لوحدة غير ممنوحة يُحجب',
    userPage.url().includes('/forbidden'), userPage.url().replace(BASE, ''))

  await userPage.goto(`${BASE}/profile`, { waitUntil: 'networkidle' })
  check('الصفحات العامة لكل مستخدم مسجّل متاحة', !userPage.url().includes('/forbidden'))
} catch (error) {
  check('اختبار أثر الصلاحيات', false, String(error).slice(0, 250))
}

// تنظيف
try {
  await page.goto(`${BASE}/users?q=${U.username}`, { waitUntil: 'networkidle' })
  await page.click(`button[aria-label="إجراءات ${U.fullName}"]`)
  await page.click('[role=menuitem]:has-text("حذف المستخدم")')
  await page.click('button:has-text("حذف المستخدم")')
  await page.waitForTimeout(2500)
  check('تنظيف بيانات الاختبار', true)
} catch (error) {
  check('تنظيف بيانات الاختبار', false, String(error).slice(0, 150))
}

await browser.close()
const failed = results.filter((r) => !r.passed)
console.log(`\n${results.length - failed.length}/${results.length} اختبار ناجح`)
process.exit(failed.length === 0 ? 0 : 1)
