'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { NotificationBell } from '@/components/notificacoes/notification-bell'
import { Sidebar } from './sidebar'

interface HeaderProps {
  title?: string
  left?: React.ReactNode
}

export function Header({ title, left }: HeaderProps) {
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {left && left}
          {title && (
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          )}
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-semibold text-green-700">
              {user?.nome?.charAt(0)?.toUpperCase()}
            </div>
            <span className="text-sm font-medium text-gray-700">{user?.nome}</span>
          </div>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <Sidebar onClose={() => setMobileMenuOpen(false)} />
          </div>
        </>
      )}
    </>
  )
}
