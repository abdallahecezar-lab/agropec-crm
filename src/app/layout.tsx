import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/hooks/use-auth'

export const metadata: Metadata = {
  title: 'Agropec Brasil CRM',
  description: 'Sistema de gestão de leads e vendas para Agropec Brasil',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
