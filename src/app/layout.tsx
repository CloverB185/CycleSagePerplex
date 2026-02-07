import type { Metadata } from 'next'
import { AuthProvider } from '@/components/AuthProvider'
import { SiteProvider } from '@/components/SiteProvider'
import { ToastProvider } from '@/components/ToastProvider'
import './globals.css'

export const metadata: Metadata = {
  title: 'OnsitePro Claude',
  description: 'Construction site operational truth capture',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <SiteProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SiteProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
