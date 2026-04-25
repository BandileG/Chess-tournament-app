import type { Metadata } from 'next'
import './globals.css'
import { SupabaseProvider } from '@/components/providers/SupabaseProvider'
import { ToastProvider } from '@/components/providers/ToastProvider'

export const metadata: Metadata = {
  title: 'Blitzstake',
  description: 'Real-time chess tournaments with prize pools.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SupabaseProvider>
      </body>
    </html>
  )
}
