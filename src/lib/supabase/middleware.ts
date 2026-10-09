import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/** المسارات العامة التي لا تتطلب تسجيل دخول. */
const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password', '/auth', '/privacy']

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

/**
 * يُحدّث توكن الجلسة في كل طلب ويحرس المسارات المحمية.
 * هذه هي الطبقة الأولى من ثلاث طبقات حماية (انظر docs/ARCHITECTURE.md §4.3).
 */
/**
 * معرّف ثابت لكل متصفح/جهاز: كل جهاز يُعدّ على حدة في ترخيص المكتب
 * (الحد الأقصى للأجهزة، والموافقة على الجهاز الجديد، وقائمة الأجهزة).
 */
export const DEVICE_COOKIE = 'law_dev'
const DEVICE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export async function updateSession(request: NextRequest) {
  let newDevice: string | null = null
  if (!DEVICE_RE.test(request.cookies.get(DEVICE_COOKIE)?.value ?? '')) {
    newDevice = crypto.randomUUID()
    // على الطلب نفسه أيضًا حتى تراه صفحات الخادم من أول زيارة
    request.cookies.set(DEVICE_COOKIE, newDevice)
  }
  const withDevice = (res: NextResponse) => {
    if (newDevice) {
      res.cookies.set(DEVICE_COOKIE, newDevice, {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 365 * 5,
      })
    }
    return res
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // مهم: getUser() يتحقق من التوكن مع خادم Supabase ولا يثق بالكوكي وحده.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return withDevice(NextResponse.redirect(url))
  }

  if (user && (pathname === '/login' || pathname === '/')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return withDevice(NextResponse.redirect(url))
  }

  return withDevice(supabaseResponse)
}
