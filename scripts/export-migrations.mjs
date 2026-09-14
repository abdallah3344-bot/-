/**
 * يُصدّر ملفات الترحيل من القاعدة الحيّة إلى supabase/migrations/.
 * التشغيل:  npm run migrations:export
 *
 * الحاجة ظهرت بعد انحراف فعلي: ترحيلات طُبّقت على القاعدة ولم تصل
 * المستودع، فصار بناء القاعدة من الصفر ناقصًا. شغّله بعد أي تعديل
 * على المخطط ليبقى المستودع هو المصدر الكامل.
 */
import { writeFileSync, readdirSync, mkdirSync } from 'node:fs'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const EMAIL = process.env.TYPEGEN_EMAIL ?? 'admin@lawoffice.local'
const PASSWORD = process.env.TYPEGEN_PASSWORD ?? 'Admin@2026'
const DIR = 'supabase/migrations'

if (!URL || !KEY) {
  console.error('✖ NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY مطلوبان في .env.local')
  process.exit(1)
}

const auth = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: KEY },
  body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
}).then((r) => r.json())

if (!auth.access_token) {
  console.error('✖ تعذّر تسجيل الدخول بحساب مدير النظام')
  process.exit(1)
}

const migrations = await fetch(`${URL}/rest/v1/rpc/export_migrations`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    apikey: KEY,
    Authorization: `Bearer ${auth.access_token}`,
  },
  body: '{}',
}).then((r) => r.json())

if (!Array.isArray(migrations)) {
  console.error('✖ رد غير متوقَّع من export_migrations:', migrations)
  process.exit(1)
}

mkdirSync(DIR, { recursive: true })
const existing = new Set(readdirSync(DIR))

let added = 0
for (const m of migrations) {
  const file = `${m.version}_${m.name}.sql`
  if (existing.has(file)) continue
  writeFileSync(`${DIR}/${file}`, m.sql.endsWith('\n') ? m.sql : `${m.sql}\n`)
  console.log(`+ ${file}`)
  added += 1
}

console.log(
  added === 0
    ? `✔ المستودع متطابق مع القاعدة — ${migrations.length} ترحيلًا`
    : `✔ أُضيف ${added} ترحيلًا — الإجمالي ${migrations.length}`,
)
