'use client'

import { useAuth } from '@/hooks/use-auth'
import { Header } from '@/components/layout/header'
import { VendedorDashboard } from '@/components/dashboard/vendedor-dashboard'
import { GestorDashboard } from '@/components/dashboard/gestor-dashboard'

export default function DashboardPage() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-4 lg:p-6">
        {user?.role === 'gestor' ? <GestorDashboard /> : <VendedorDashboard />}
      </div>
    </div>
  )
}
