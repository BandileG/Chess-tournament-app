import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Blitzstake',
  description: 'Real-time chess tournaments with prize pools.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  )
}
