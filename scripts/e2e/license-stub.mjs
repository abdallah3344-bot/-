/**
 * خادم تراخيص محاكٍ للاختبار المحلي.
 *
 * الاختبارات لا تلمس خادم تراخيص المصري جروب الحقيقي: إنشاء تراخيص
 * وهمية في نظام تجاري حيّ غير مقبول، والاعتماد عليه يجعل الاختبارات
 * تفشل عند انقطاع الشبكة. هذا الخادم يردّ بنفس صيغة verify_license.
 *
 * التشغيل المستقل:  node scripts/e2e/license-stub.mjs
 * ثم شغّل التطبيق بـ:  npm run dev:test
 */
import { createServer } from 'node:http'

export const DEFAULT_REPLY = {
  ok: true,
  state: 'licensed_valid',
  licenseType: 'annual',
  licenseKey: 'LAWO-TEST-0001',
  expiresAt: '2027-01-01T00:00:00.000Z',
  daysRemaining: 300,
  isLifetime: false,
}

/**
 * يشغّل الخادم المحاكي.
 * - POST /__state : يضبط الرد التالي (جسم JSON)
 * - POST /__fail  : يجعل الخادم يقطع الاتصال لمحاكاة انقطاع الشبكة
 * - أي مسار آخر  : يردّ بالحالة المضبوطة حاليًا
 */
export function startLicenseStub(port = Number(process.env.LICENSE_STUB_PORT ?? 3999)) {
  let reply = { ...DEFAULT_REPLY }
  let failing = false

  const server = createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      if (req.url === '/__state') {
        reply = body ? JSON.parse(body) : { ...DEFAULT_REPLY }
        failing = false
        res.writeHead(204).end()
        return
      }
      if (req.url === '/__fail') {
        failing = true
        res.writeHead(204).end()
        return
      }
      if (failing) { req.socket.destroy(); return }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(reply))
    })
  })

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve({
      port,
      url: `http://127.0.0.1:${port}`,
      stop: () => new Promise((done) => server.close(done)),
    }))
  })
}

// التشغيل المباشر من سطر الأوامر
if (import.meta.url === `file://${process.argv[1]}`) {
  const stub = await startLicenseStub()
  console.log(`خادم التراخيص المحاكي يعمل على ${stub.url}`)
}
