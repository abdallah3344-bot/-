import { getCurrency, type CurrencyForms } from '@/lib/constants/currencies'

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر']
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون']
const HUNDREDS = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
  'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة']

function underThousand(n: number): string {
  if (n === 0) return ''
  const parts: string[] = []
  const h = Math.floor(n / 100)
  const rest = n % 100
  if (h > 0) parts.push(HUNDREDS[h])
  if (rest > 0) {
    if (rest < 20) parts.push(ONES[rest])
    else {
      const unit = rest % 10
      const ten = Math.floor(rest / 10)
      parts.push(unit > 0 ? `${ONES[unit]} و${TENS[ten]}` : TENS[ten])
    }
  }
  return parts.join(' و')
}

/** تمييز العدد في العربية: 3-10 جمع قلّة، و11 فأكثر مفرد منصوب. */
function countOf(n: number, forms: CurrencyForms): string {
  if (n === 1) return forms.singular
  if (n === 2) return forms.dual
  if (n >= 3 && n <= 10) return `${underThousand(n)} ${forms.plural}`
  return `${underThousand(n)} ${forms.accusative}`
}

const THOUSAND_FORMS: CurrencyForms =
  { singular: 'ألف', dual: 'ألفان', plural: 'آلاف', accusative: 'ألفًا' }
const MILLION_FORMS: CurrencyForms =
  { singular: 'مليون', dual: 'مليونان', plural: 'ملايين', accusative: 'مليونًا' }

/** العدد الصحيح كلماتٍ، بلا اسم عملة. */
export function numberInWords(value: number): string {
  const whole = Math.floor(Math.abs(value))
  if (whole === 0) return 'صفر'

  const groups: string[] = []
  const millions = Math.floor(whole / 1_000_000)
  const thousands = Math.floor((whole % 1_000_000) / 1000)
  const rest = whole % 1000

  if (millions > 0) groups.push(countOf(millions, MILLION_FORMS))
  if (thousands > 0) groups.push(countOf(thousands, THOUSAND_FORMS))
  if (rest > 0) groups.push(underThousand(rest))

  return groups.join(' و')
}

/**
 * صيغة اسم العملة المناسبة للعدد:
 * 1 مفرد · 2 مثنى · 3-10 جمع قلّة · 11-99 مفرد منصوب · 100 فأكثر مفرد مجرور.
 */
function unitForm(n: number, forms: CurrencyForms): string {
  if (n === 1) return forms.singular
  if (n === 2) return forms.dual
  const rem = n % 100
  if (rem >= 3 && rem <= 10) return forms.plural
  if (rem >= 11 && rem <= 99) return forms.accusative
  return forms.singular
}

/** «خمسة آلاف شيكل» — العدد متبوعًا بالتمييز الصحيح. */
function phrase(n: number, forms: CurrencyForms): string {
  if (n === 1) return `${forms.singular} واحد`
  if (n === 2) return forms.dual
  return `${numberInWords(n)} ${unitForm(n, forms)}`
}

/**
 * تفقيط المبلغ باسم العملة — يمنع التلاعب بالرقم في الإيصال الورقي.
 * مثال: 5250.75 بالشيكل ⇒ «خمسة آلاف ومائتان وخمسون شيكلًا وخمس وسبعون أغورة».
 *
 * الكسور تُقرأ بالوحدة الصغرى. التخزين في القاعدة بخانتين عشريتين،
 * فالدينار الأردني يُعرض بالقرش لا بالفلس.
 */
export function amountInWords(amount: number, currencyCode: string | null | undefined): string {
  const currency = getCurrency(currencyCode)
  const safe = Number.isFinite(amount) ? Math.abs(amount) : 0
  const whole = Math.floor(safe)
  const fraction = Math.round((safe - whole) * 100)

  const major = whole === 0 ? `صفر ${currency.major.accusative}` : phrase(whole, currency.major)
  if (fraction === 0) return major
  return `${major} و${phrase(fraction, currency.minor)}`
}
