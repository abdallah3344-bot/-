import html from './guide-html'

/** دليل الاستخدام المصوّر: صفحة عامة برابط ثابت تُرسل للمكاتب بالواتساب. */
export function GET() {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
