/**
 * العملات المدعومة في النظام.
 *
 * كل عملة تحمل صيغ التمييز العربي الثلاث (مفرد/مثنى/جمع) لأن تفقيط
 * المبالغ في الإيصالات يحتاجها: «شيكل واحد» و«شيكلان» و«خمسة شواكل»
 * و«أحد عشر شيكلًا».
 */

export type CurrencyForms = {
  singular: string
  dual: string
  /** جمع القلّة — يُستعمل مع الأعداد 3 إلى 10 */
  plural: string
  /** المفرد المنصوب — يُستعمل مع 11 فأكثر */
  accusative: string
}

export type Currency = {
  code: string
  /** الاسم في قائمة الإعدادات */
  nameAr: string
  /** ما يظهر بجانب المبالغ في الجداول والفواتير */
  symbol: string
  /** صيغ الوحدة الكبرى للتفقيط */
  major: CurrencyForms
  /** صيغ الوحدة الصغرى (الكسور) للتفقيط */
  minor: CurrencyForms
}

export const CURRENCIES: readonly Currency[] = [
  {
    code: 'ILS', nameAr: 'شيكل', symbol: '₪',
    major: { singular: 'شيكل', dual: 'شيكلان', plural: 'شواكل', accusative: 'شيكلًا' },
    minor: { singular: 'أغورة', dual: 'أغورتان', plural: 'أغورات', accusative: 'أغورةً' },
  },
  {
    code: 'JOD', nameAr: 'دينار أردني', symbol: 'د.أ',
    major: { singular: 'دينار', dual: 'ديناران', plural: 'دنانير', accusative: 'دينارًا' },
    minor: { singular: 'قرش', dual: 'قرشان', plural: 'قروش', accusative: 'قرشًا' },
  },
  {
    code: 'USD', nameAr: 'دولار أمريكي', symbol: '$',
    major: { singular: 'دولار', dual: 'دولاران', plural: 'دولارات', accusative: 'دولارًا' },
    minor: { singular: 'سنت', dual: 'سنتان', plural: 'سنتات', accusative: 'سنتًا' },
  },
  {
    code: 'EUR', nameAr: 'يورو', symbol: '€',
    major: { singular: 'يورو', dual: 'يوروهان', plural: 'يوروهات', accusative: 'يورو' },
    minor: { singular: 'سنت', dual: 'سنتان', plural: 'سنتات', accusative: 'سنتًا' },
  },
  {
    code: 'SAR', nameAr: 'ريال سعودي', symbol: 'ر.س',
    major: { singular: 'ريال', dual: 'ريالان', plural: 'ريالات', accusative: 'ريالًا' },
    minor: { singular: 'هللة', dual: 'هللتان', plural: 'هللات', accusative: 'هللةً' },
  },
  {
    code: 'EGP', nameAr: 'جنيه مصري', symbol: 'ج.م',
    major: { singular: 'جنيه', dual: 'جنيهان', plural: 'جنيهات', accusative: 'جنيهًا' },
    minor: { singular: 'قرش', dual: 'قرشان', plural: 'قروش', accusative: 'قرشًا' },
  },
] as const

/** العملة الافتراضية عند غياب الإعداد. */
export const DEFAULT_CURRENCY_CODE = 'ILS'

export const CURRENCY_CODES = CURRENCIES.map((c) => c.code)

export function getCurrency(code: string | null | undefined): Currency {
  return (
    CURRENCIES.find((c) => c.code === code)
    ?? CURRENCIES.find((c) => c.code === DEFAULT_CURRENCY_CODE)!
  )
}

/** رمز العرض لعملة، مع السقوط إلى الافتراضية. */
export function currencySymbol(code: string | null | undefined): string {
  return getCurrency(code).symbol
}
