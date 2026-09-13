'use client'

import { useEffect } from 'react'

/** يفتح حوار الطباعة تلقائيًا عند الوصول بالرابط ?print=1 */
export function AutoPrint() {
  useEffect(() => {
    const timer = setTimeout(() => window.print(), 600)
    return () => clearTimeout(timer)
  }, [])
  return null
}
