import type { Metadata, Viewport } from 'next'
import { AuthProvider } from '@/components/AuthProvider'
import { SiteProvider } from '@/components/SiteProvider'
import { ToastProvider } from '@/components/ToastProvider'
import { DevToolbarWrapper } from '@/components/DevToolbarWrapper'
import './globals.css'

export const metadata: Metadata = {
  title: 'OnsitePro Claude',
  description: 'Construction site operational truth capture',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
              <DevToolbarWrapper>
                {children}
              </DevToolbarWrapper>
            </ToastProvider>
          </SiteProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
