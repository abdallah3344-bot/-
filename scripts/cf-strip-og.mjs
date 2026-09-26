/**
 * يُشغَّل بعد `opennextjs-cloudflare build` ويُزيل مكتبة توليد الصور
 * (@vercel/og) من حزمة طبقة الحماية (proxy / middleware).
 *
 * لماذا: المحوّل يُدرج دائمًا حالة لـ @vercel/og داخل حزمة الـ middleware
 * عند البناء بـ Turbopack، فتُسحب المكتبة (~800 ك.ب) مع resvg.wasm
 * (~1.4 م.ب) و yoga.wasm إلى الـ Worker رغم أن النظام لا يستعمل
 * ImageResponse ولا next/og إطلاقًا. هذا وحده كان يرفع الـ Worker فوق
 * حدّ 3 ميجابايت للخطة المجانية.
 *
 * ما يفعله: يستبدل استيراد ملفّي wasm بقيمة فارغة، ويجعل الحالة الوحيدة
 * التي تنادي المكتبة ترمي خطأً واضحًا، فيحذف الـ bundler بقيتها كشيفرة
 * ميتة. إن استُعمل next/og يومًا فسيظهر الخطأ فورًا لا بصمت.
 *
 * الحارس: إن وجد السكربت المكتبة مستعملة فعلًا في src/ يتوقّف.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const target = path.join(root, '.open-next/middleware/handler.mjs')

function usesOg(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name)
    if (statSync(p).isDirectory()) {
      if (usesOg(p)) return true
    } else if (/\.(tsx?|jsx?|mjs)$/.test(name)) {
      const s = readFileSync(p, 'utf8')
      if (s.includes('next/og') || s.includes('ImageResponse')) return true
    }
  }
  return false
}

if (usesOg(path.join(root, 'src'))) {
  console.error('cf-strip-og: النظام يستعمل next/og — لن تُحذف المكتبة.')
  process.exit(0)
}

if (!existsSync(target)) {
  console.log('cf-strip-og: لا توجد حزمة middleware — لا شيء لفعله.')
  process.exit(0)
}

let src = readFileSync(target, 'utf8')
const before = src.length

src = src.replace(
  /^import (yoga_wasm|resvg_wasm) from "[^"]*@vercel\/og\/(yoga|resvg)\.wasm\?module";$/gm,
  'const $1 = undefined;',
)
src = src.replace(
  /raw = await Promise\.resolve\(\)\.then\(\(\) => \(init_index_edge\(\), index_edge_exports\)\);/g,
  'throw new Error("@vercel/og مُزالة من هذه الحزمة (scripts/cf-strip-og.mjs)");',
)

if (src.length === before) {
  console.log('cf-strip-og: لم يُعثر على @vercel/og في الحزمة — لا تغيير.')
} else {
  writeFileSync(target, src)
  console.log('cf-strip-og: أُزيلت @vercel/og من حزمة middleware.')
}
