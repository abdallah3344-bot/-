/**
 * اختبار أدوات لائحة الدعوى: القوالب، ومدقّق المادة 52، وورقة ميزان.
 * التشغيل:  node scripts/e2e/legal-tools.mjs
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import PizZip from 'pizzip'

const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const USER = process.env.E2E_USER ?? 'admin'
const PASS = process.env.E2E_PASS ?? 'Admin@2026'
const stamp = String(Date.now()).slice(-6)

const results = []
const consoleErrors = []
function check(name, passed, detail = '') {
  results.push({ name, passed })
  console.log(`${passed ? '✔' : '✘'} ${name}${detail ? ` — ${detail}` : ''}`)
}

const EXECUTABLE = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({
  executablePath: existsSync(EXECUTABLE) ? EXECUTABLE : undefined,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
})
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()) })
page.on('pageerror', (e) => consoleErrors.push(String(e)))

let clientId = ''
let caseId = ''

try {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('#identifier', USER)
  await page.fill('#password', PASS)
  await page.click('button[type=submit]')
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 })

  // ---------- قالب نصّي ----------
  await page.goto(`${BASE}/templates`, { waitUntil: 'networkidle' })
  check('صفحة القوالب تفتح', page.url().includes('/templates'))
  check('كتالوج حقول الدمج معروض',
    ((await page.textContent('body')) ?? '').includes('حقول الدمج'))

  await page.click('button:has-text("قالب جديد")')
  await page.fill('#name', `لائحة دعوى ${stamp}`)
  await page.fill('#description', 'قالب اختبار')
  await page.fill('#body',
    'محكمة {{case.court}} الموقّرة\n\nالمدعي: {{client.name}}\nالمدعى عليه: {{opponent.name}}\n' +
    'الموضوع: {{case.title}}\nالطلبات: {{case.claim_requests}}\n' +
    'أهلية الموكل: {{client.legal_capacity}}\n\n{{office.name}} — {{today}}')
  await page.click('button[type=submit]:has-text("حفظ القالب")')
  await page.waitForTimeout(3000)
  await page.reload({ waitUntil: 'networkidle' })
  const listBody = (await page.textContent('body')) ?? ''
  check('القالب يُحفظ ويظهر في القائمة', listBody.includes(`لائحة دعوى ${stamp}`))

  // ---------- عميل وقضية ببيانات لائحة ----------
  await page.goto(`${BASE}/clients/new`, { waitUntil: 'networkidle' })
  await page.fill('#name', `موكل النماذج ${stamp}`)
  await page.fill('#nationalId', '401234567')
  await page.fill('#workplace', 'بلدية رام الله')
  await page.fill('#address', 'رام الله — الماصيون')
  await page.click('button[type=submit]')
  await page.waitForURL(/\/clients\/[0-9a-f-]{36}$/, { timeout: 25_000 })
  clientId = page.url().split('/clients/')[1]
  check('حقل محل العمل يُحفظ على الموكل', Boolean(clientId))

  await page.goto(`${BASE}/cases/new?client=${clientId}`, { waitUntil: 'networkidle' })
  await page.fill('#title', `دعوى نماذج ${stamp}`)
  await page.fill('#claimAmount', '25000')
  await page.click('#caseTypeId')
  await page.click('[role=option]:has-text("حقوق")')
  await page.click('#courtId')
  await page.click('[role=option]:has-text("محكمة بداية رام الله")')
  await page.click('#priority')
  await page.click('[role=option]:has-text("عالية")')
  await page.fill('#claimRequests', 'إلزام المدعى عليه بأداء المبلغ والرسوم والأتعاب.')
  await page.fill('#claimAroseAt', '2026-03-01')
  await page.click('button[type=submit]')
  await page.waitForURL(/\/cases\/[0-9a-f-]{36}$/, { timeout: 25_000 })
  caseId = page.url().split('/cases/')[1]
  check('القضية تُحفظ ببيانات لائحة الدعوى', Boolean(caseId))

  // ---------- مدقّق المادة 52 ----------
  await page.click('button[role=tab]:has-text("لائحة الدعوى")')
  await page.waitForTimeout(500)
  const claimBody = (await page.textContent('body')) ?? ''
  check('تبويب لائحة الدعوى يعرض بنود المادة 52', claimBody.includes('المادة 52'))
  check('البنود المكتملة معلَّمة', (await page.locator('[data-claim-item="ok"]').count()) >= 5)
  check('نقص الخصم يُرصد',
    (await page.locator('[data-claim-item="missing"]').count()) >= 1)
  check('التنويه بأن الفحص ليس مراجعة قانونية',
    claimBody.includes('لا مراجعة قانونية'))

  // ---------- إضافة خصم ثم إعادة الفحص ----------
  await page.click('button[role=tab]:has-text("الأطراف")')
  await page.click('button:has-text("إضافة خصم")')
  await page.fill('#name', `خصم ${stamp}`)
  await page.fill('#address', 'نابلس — رفيديا')
  await page.fill('#occupation', 'تاجر')
  await page.click('button[type=submit]:has-text("حفظ")')
  await page.waitForTimeout(2500)
  await page.goto(`${BASE}/cases/${caseId}`, { waitUntil: 'networkidle' })
  await page.click('button[role=tab]:has-text("لائحة الدعوى")')
  await page.waitForTimeout(500)
  const afterBody = (await page.textContent('body')) ?? ''
  check('بند المدعى عليه يصبح مكتملًا بعد إضافته',
    /خصم — الاسم والعنوان مُدخَلان/.test(afterBody))

  // ---------- ورقة ميزان ----------
  check('ورقة بيانات القضية معروضة', afterBody.includes('ورقة بيانات القضية'))
  check('الورقة تذكر أنها ليست تكاملًا رسميًا', afterBody.includes('ليست تكاملًا رسميًا'))
  check('الورقة تعرض بيانات القضية فعلًا', afterBody.includes(`دعوى نماذج ${stamp}`))

  const csv = await page.request.get(`${BASE}/api/cases/${caseId}/mizan?format=csv`)
  const csvText = await csv.text()
  check('تصدير CSV يعمل', csv.ok() && csvText.includes('الحقل,القيمة'), String(csv.status()))
  check('CSV يحتوي بيانات القضية', csvText.includes(`دعوى نماذج ${stamp}`))
  const json = await page.request.get(`${BASE}/api/cases/${caseId}/mizan?format=json`)
  const parsed = await json.json()
  check('تصدير JSON يعمل', json.ok() && Object.keys(parsed).length > 15,
    `${Object.keys(parsed).length} حقلًا`)

  // ---------- توليد المستند من القالب ----------
  await page.click('#templateId')
  await page.click(`[role=option]:has-text("لائحة دعوى ${stamp}")`)
  await page.waitForTimeout(300)
  const previewLink = await page.getAttribute('a:has-text("معاينة وطباعة")', 'href')
  check('رابط المعاينة يحمل معرّف القضية',
    Boolean(previewLink && previewLink.includes(`case=${caseId}`)), previewLink ?? '')

  await page.goto(`${BASE}${previewLink}`, { waitUntil: 'networkidle' })
  // نقرأ ورقة المستند وحدها: textContent للصفحة كلها يشمل نصّ وسوم
  // script التي يضع فيها Next حمولة RSC، وفيها نصّ القالب الخام.
  const preview = (await page.textContent('.print-sheet')) ?? ''
  check('القالب يُملأ باسم الموكل', preview.includes(`موكل النماذج ${stamp}`))
  check('القالب يُملأ بالمحكمة', preview.includes('محكمة بداية رام الله'))
  check('القالب يُملأ بالطلبات', preview.includes('إلزام المدعى عليه'))
  check('القالب يُملأ باسم الخصم', preview.includes(`خصم ${stamp}`))
  check('حقول الدمج كلها استُبدلت في المستند',
    !preview.includes('{{') && !preview.includes('}}'))
  check('الحقل بلا بيانات يظهر فراغًا معلَّمًا', preview.includes('__________'))
  check('تنبيه الحقول الناقصة يظهر فوق المستند',
    ((await page.textContent('body')) ?? '').includes('حقلًا بلا بيانات'))

  // ---------- قالب Word مرفوع ----------
  const docxPath = '/tmp/legal-tools-template.docx'
  execFileSync('node', ['scripts/e2e/fixtures/make-docx.mjs', docxPath])

  await page.goto(`${BASE}/templates`, { waitUntil: 'networkidle' })
  await page.click('button:has-text("قالب جديد")')
  await page.fill('#name', `قالب وورد ${stamp}`)
  await page.setInputFiles('#file', docxPath)
  await page.click('button[type=submit]:has-text("حفظ القالب")')
  await page.waitForTimeout(3500)
  await page.reload({ waitUntil: 'networkidle' })
  check('قالب Word يُرفع ويُحفظ',
    ((await page.textContent('body')) ?? '').includes(`قالب وورد ${stamp}`))

  await page.goto(`${BASE}/cases/${caseId}`, { waitUntil: 'networkidle' })
  await page.click('button[role=tab]:has-text("لائحة الدعوى")')
  await page.click('#templateId')
  await page.click(`[role=option]:has-text("قالب وورد ${stamp}")`)
  await page.waitForTimeout(300)
  const docxHref = await page.getAttribute('a:has-text("تنزيل Word معبّأ")', 'href')
  check('زر تنزيل Word يظهر لقالب الملف', Boolean(docxHref), docxHref ?? '')

  const filled = await page.request.get(`${BASE}${docxHref}`)
  check('تعبئة قالب Word تنجح', filled.ok(), String(filled.status()))
  const filledBuffer = Buffer.from(await filled.body())
  check('الناتج ملف Word صالح (توقيع ZIP)',
    filledBuffer.subarray(0, 2).toString() === 'PK', `${filledBuffer.length} بايت`)

  const xml = new PizZip(filledBuffer).file('word/document.xml').asText()
  check('قالب Word مُلئ باسم الموكل', xml.includes(`موكل النماذج ${stamp}`))
  check('قالب Word مُلئ بالمحكمة', xml.includes('محكمة بداية رام الله'))
  check('لا تبقى حقول دمج في ناتج Word', !xml.includes('{{'))

  page.once('dialog', (d) => d.accept())
  await page.goto(`${BASE}/templates`, { waitUntil: 'networkidle' })
  await page.click(`button[aria-label="حذف قالب وورد ${stamp}"]`)
  await page.waitForTimeout(2000)

  // ---------- تنظيف ----------
  await page.goto(`${BASE}/templates`, { waitUntil: 'networkidle' })
  page.once('dialog', (d) => d.accept())
  await page.click(`button[aria-label="حذف لائحة دعوى ${stamp}"]`)
  await page.waitForTimeout(2000)
  await page.reload({ waitUntil: 'networkidle' })
  check('حذف القالب يعمل',
    !((await page.textContent('body')) ?? '').includes(`لائحة دعوى ${stamp}`))

  check('لا أخطاء في الكونسول', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '))
} catch (error) {
  check('اكتمال الاختبار دون استثناء', false, String(error).split('\n')[0])
} finally {
  await browser.close()
}

const passed = results.filter((r) => r.passed).length
console.log(`\n${passed}/${results.length} اختبار ناجح`)
if (passed !== results.length) process.exitCode = 1
