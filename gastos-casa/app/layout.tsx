import './globals.css'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { CuentaGuard } from '@/components/layout/cuenta-guard'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { Toaster as ShadcnToaster } from '@/components/ui/toaster'
import { Toaster } from 'sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { ThemeProvider } from 'next-themes'

export const metadata = {
  title: 'Gastos Casa',
  description: 'Sistema de control de gastos domésticos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <div className="relative flex min-h-screen flex-col">
              <Header />
              <OfflineBanner />
              <div className="flex-1 flex">
                <aside className="hidden w-64 flex-col border-r bg-background md:flex">
                  <Sidebar />
                </aside>
                <main className="flex-1 overflow-y-auto">
                  <div className="container mx-auto py-6">
                    <CuentaGuard>
                      {children}
                    </CuentaGuard>
                  </div>
                </main>
              </div>
            </div>
            <Toaster richColors />
            <ShadcnToaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}