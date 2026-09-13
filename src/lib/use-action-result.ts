'use client'

import { useEffect, useRef } from 'react'

type Result = { ok: boolean; message?: string; error?: string }

type Handlers = {
  onSuccess?: (message: string) => void
  onError?: (error: string) => void
}

/**
 * يستجيب لنتيجة Server Action القادمة من useActionState.
 *
 * لماذا تأثير أصلًا: لا يوفّر useActionState ردّ نداء عند النجاح، فالنتيجة
 * تصل كحالة جديدة بعد التصيير. التأثير هو المخرج المتاح للاستجابة لها.
 *
 * ولماذا مؤقّت صفري: تحديث الحالة تزامنيًا داخل جسم التأثير (إغلاق حوار،
 * تفريغ حقل) يُسبّب تصييرًا متتاليًا. تأجيله لدورة واحدة يُجنّب ذلك.
 *
 * ومرجع آخر نتيجة عولجت يمنع تكرار الاستجابة عند أي إعادة تصيير لاحقة.
 * كل لمسٍ للمراجع يجري داخل التأثير لا أثناء التصيير.
 */
export function useActionResult(state: Result, handlers: Handlers) {
  const handled = useRef<Result | null>(null)
  const latest = useRef<Handlers>(handlers)

  // تحديث المراجع يجري داخل تأثير، فلا تُقرأ ولا تُكتب أثناء التصيير
  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    if (handled.current === state) return
    handled.current = state

    const timer = setTimeout(() => {
      if (state.ok && state.message) latest.current.onSuccess?.(state.message)
      else if (!state.ok && state.error) latest.current.onError?.(state.error)
    }, 0)

    return () => clearTimeout(timer)
  }, [state])
}
