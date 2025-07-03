import './globals.css'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Toaster } from '@/components/ui/toaster'

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
    <html lang="es">
      <body>
        <div className="relative flex min-h-screen flex-col">
          <Header />
          <div className="flex-1 flex">
            <aside className="hidden w-64 flex-col border-r bg-background md:flex">
              <Sidebar />
            </aside>
            <main className="flex-1 overflow-y-auto">
              <div className="container mx-auto py-6">
                {children}
              </div>
            </main>
          </div>
        </div>
        <Toaster />
      </body>
    </html>
  )
}