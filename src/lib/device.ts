/** اسم مقروء للجهاز من نص المتصفح: «Chrome · Windows». */
export function describeDevice(ua: string | null | undefined): string {
  const s = ua ?? ''
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Firefox\//.test(s) ? 'Firefox'
    : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : 'متصفح'
  const os = /iPhone/.test(s) ? 'iPhone' : /iPad/.test(s) ? 'iPad' : /Android/.test(s) ? 'Android'
    : /Windows/.test(s) ? 'Windows' : /Mac OS X|Macintosh/.test(s) ? 'Mac' : /Linux/.test(s) ? 'Linux' : ''
  return os ? `${browser} · ${os}` : browser
}

/** هل الجهاز جوال؟ لاختيار الأيقونة. */
export function isMobileDevice(ua: string | null | undefined): boolean {
  return /iPhone|iPad|Android|Mobile/.test(ua ?? '')
}
