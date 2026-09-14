/**
 * اختبار بوابة الترخيص: سارٍ، قرب الانتهاء، منتهٍ، وانقطاع الاتصال.
 *
 * يتطلّب التطبيق يعمل بـ `npm run dev:test` (موجَّهًا لخادم التراخيص
 * المحاكي) وخادم المحاكاة يعمل. `npm run test:e2e` يتكفّل بهذا.
 *
 * التشغيل:  node scripts/e2e/license.mjs
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { DEFAULT_REPLY } from './license-stub.mjs'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const STUB = process.env.LICENSE_STUB_URL ?? `http://127.0.0.1:${process.env.LICENSE_STUB_PORT ?? 3999}`
const USER = process.env.E2E_USER ?? 'admin'
const PASS = process.env.E2E_PASS ?? 'Admin@2026'

const results = []
const consoleErrors = []
function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const setState = (body) => fetch(`${STUB}/__state`, { method: 'POST', body: JSON.stringify(body) })
const setFailing = () => fetch(`${STUB}/__fail`, { method: 'POST' })

const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

try {
  // 1) ترخيص سارٍ ⇒ النظام يعمل
  await setState(DEFAULT_REPLY)
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[name="identifier"]', USER)
  await page.fill('input[name="password"]', PASS)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 })
  await page.waitForLoadState('networkidle')
  check('ترخيص سارٍ يفتح النظام', page.url().includes('/dashboard'))
  check('لا شريط تحذير والترخيص بعيد عن الانتهاء',
    !((await page.textContent('body')) ?? '').includes('ينتهي خلال'))

  // 2) صفحة التفعيل لا معنى لها والترخيص سارٍ
  await page.goto(`${BASE}/activation`, { waitUntil: 'networkidle' })
  check('زيارة /activation بترخيص سارٍ تعيد للوحة المعلومات', page.url().includes('/dashboard'))

  // 3) بطاقة الترخيص في الإعدادات
  await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("الترخيص")')
  await page.waitForTimeout(300)
  const card = (await page.textContent('body')) ?? ''
  check('بطاقة الإعدادات تعرض حالة الترخيص', card.includes('ترخيص سارٍ'))
  check('بطاقة الإعدادات تعرض نوع الترخيص', card.includes('اشتراك سنوي'))
  check('بطاقة الإعدادات تعرض مفتاح الترخيص', card.includes('LAWO-TEST-0001'))

  // 4) قرب الانتهاء ⇒ شريط تحذير
  await setState({ ...DEFAULT_REPLY, daysRemaining: 5 })
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  check('قرب انتهاء الترخيص يظهر شريط تحذير',
    ((await page.textContent('body')) ?? '').includes('ينتهي خلال'))

  // 5) ترخيص منتهٍ ⇒ إغلاق فوري لكل المسارات
  await setState({
    ok: false, state: 'expired',
    message: 'انتهت صلاحية هذا الترخيص. الرجاء التجديد من مكتب البرمجيات.',
  })
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  check('الترخيص المنتهي يغلق النظام', page.url().includes('/activation'), page.url())
  check('تظهر رسالة الانتهاء للمستخدم',
    ((await page.textContent('body')) ?? '').includes('انتهت صلاحية'))

  await page.goto(`${BASE}/invoices`, { waitUntil: 'networkidle' })
  check('كل المسارات مغلقة بترخيص منتهٍ', page.url().includes('/activation'))

  // 6) نسخة تجريبية سارية تعمل كالترخيص الكامل
  await setState({
    ok: true, state: 'trial_active', licenseType: 'trial',
    licenseKey: 'TRIAL-LAW-OFFICE-TEST', daysRemaining: 20,
    expiresAt: '2027-01-01T00:00:00.000Z', isLifetime: false,
  })
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  check('النسخة التجريبية السارية تفتح النظام', page.url().includes('/dashboard'))

  // 7) انقطاع خادم التراخيص ⇒ عمل مؤقت مع تنبيه، لا تعطيل للمكتب
  await setFailing()
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' })
  check('انقطاع خادم التراخيص لا يعطّل المكتب', page.url().includes('/dashboard'), page.url())
  check('يظهر تنبيه تعذّر التحقق',
    ((await page.textContent('body')) ?? '').includes('تعذّر الوصول لخادم التراخيص'))

  await setState(DEFAULT_REPLY)
  check('لا أخطاء في الكونسول', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} catch (error) {
  check('اكتمال الاختبار دون استثناء', false, String(error).split('\n')[0])
} finally {
  await browser.close()
}

const passed = results.filter((r) => r.passed).length
console.log(`\n${passed}/${results.length} اختبار ناجح`)
if (passed !== results.length) process.exitCode = 1
