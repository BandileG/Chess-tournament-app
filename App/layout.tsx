import type { Metadata, Viewport } from 'next'
import { Syne, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700', '800'],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: { default: 'Blitzstake', template: '%s | Blitzstake' },
  description: 'Real-time chess tournaments with prize pools. Compete, win, dominate.',
  keywords: ['chess', 'tournament', 'blitz', 'online chess', 'prize'],
  authors: [{ name: 'Blitzstake' }],
  openGraph: {
    title: 'Blitzstake',
    description: 'Real-time chess tournaments with prize pools.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#080c10',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${jetbrainsMono.variable} dark`}>
      <body className="bg-base text-white antialiased">
        <SupabaseProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}

