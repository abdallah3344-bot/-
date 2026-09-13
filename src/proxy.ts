import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * الطبقة الأولى من الحماية (انظر docs/ARCHITECTURE.md §4.3):
 * تُحدّث توكن الجلسة في كل طلب وتمنع الوصول لأي مسار محمي بدون جلسة.
 */
export default async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    // كل المسارات عدا الملفات الثابتة والصور
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
