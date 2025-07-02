import './globals.css'

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
      <body>{children}</body>
    </html>
  )
}