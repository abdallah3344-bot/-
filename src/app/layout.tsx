import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import './globals.css'

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'نظام إدارة مكتب المحاماة',
    template: '%s · نظام إدارة مكتب المحاماة',
  },
  description: 'نظام متكامل لإدارة القضايا والعملاء والجلسات والشؤون المالية لمكاتب المحاماة',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f1e3d' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1428' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body className={`${arabic.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <Toaster
            position="top-center"
            dir="rtl"
            richColors
            toastOptions={{ style: { fontFamily: 'var(--font-arabic)' } }}
          />
        </ThemeProvider>
      </body>
    </html>
  )
}
