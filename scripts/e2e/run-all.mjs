/**
 * مشغّل الاختبارات: يرفع خادم التراخيص المحاكي ثم ينفّذ كل المجموعات.
 *
 * بوابة الترخيص تحجب النظام بلا ترخيص سارٍ، ولا يصحّ أن تعتمد
 * الاختبارات على خادم تراخيص إنتاجي، فنُشغّل محاكيًا محليًا.
 * يتطلّب التطبيق يعمل بـ `npm run dev:test`.
 */
import { spawn } from 'node:child_process'
import { startLicenseStub } from './license-stub.mjs'

const SUITES = [
  'smoke', 'users', 'permissions', 'clients', 'cases', 'hearings',
  'documents', 'legal-docs', 'finance', 'reports', 'comms', 'admin', 'license',
]

const only = process.argv.slice(2).filter((a) => !a.startsWith('-'))
const suites = only.length ? only : SUITES

const stub = await startLicenseStub()
console.log(`خادم التراخيص المحاكي: ${stub.url}\n`)

let failed = 0

for (const suite of suites) {
  const code = await new Promise((resolve) => {
    const child = spawn('node', [`scripts/e2e/${suite}.mjs`], { stdio: 'inherit' })
    child.on('close', resolve)
  })
  if (code !== 0) failed += 1
}

await stub.stop()

if (failed > 0) {
  console.log(`\n${failed} مجموعة فشلت`)
  process.exitCode = 1
} else {
  console.log('\nكل المجموعات ناجحة')
}
