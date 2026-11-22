import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Building2,
  Calculator,
  Calendar,
  FileSpreadsheet,
  Home,
  LogOut,
  Plus,
  Receipt,
  Settings,
  Wallet,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtimeSync } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import { UserMenu } from '@/components/layout/UserMenu'

const desktopNavItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/clinicas', label: 'Clínicas', icon: Building2 },
  { to: '/atendimentos', label: 'Atendimentos', icon: FileSpreadsheet },
  { to: '/despesas', label: 'Despesas', icon: Receipt },
  { to: '/simulador', label: 'Simulador', icon: Calculator },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
  { to: '/ajustes', label: 'Ajustes', icon: Settings },
]

const mobileNavItems = [
  { to: '/', label: 'Home', icon: Home, end: true },
  { to: '/clinicas', label: 'Clínicas', icon: Building2 },
  { to: '/atendimentos', label: 'Exames', icon: FileSpreadsheet },
  { to: '/simulador', label: 'Simulador', icon: Calculator },
  { to: '/financeiro', label: 'Financeiro', icon: Wallet },
]

export function AppLayout() {
  useRealtimeSync()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-dvh bg-[#F6F4FB] dark:bg-[#14121B] text-[#3A3C3F] dark:text-[#F3F1F9] flex">
      {/* Sidebar Desktop (>= 1024px) */}
      <aside className="hidden lg:flex lg:flex-col lg:w-68 lg:fixed lg:inset-y-0 bg-white dark:bg-[#1E1B29] border-r border-[#ECE8F6] dark:border-[#2E2940] z-30">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-[#F2EEF9] dark:border-[#2E2940]">
          <img
            src="/logo.png"
            alt="Radiologia NR"
            className="w-12 h-12 rounded-2xl object-contain bg-white p-1 border border-[#ECE8F6]"
          />
          <div className="min-w-0">
            <p className="text-base font-extrabold tracking-tight text-[#4B4D50] dark:text-white truncate">
              Radiologia NR
            </p>
            <p className="text-[11px] font-medium text-[#9B7BC7] truncate">
              Painel de Controle
            </p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {desktopNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all',
                    isActive
                      ? 'bg-[#9B7BC7] text-white shadow-sm shadow-[#9B7BC7]/30'
                      : 'text-[#5A5C60] dark:text-[#C9C3DA] hover:bg-[#F5F1FC] dark:hover:bg-[#29243B]'
                  )
                }
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4.5 h-4.5" />
                  {item.label}
                </span>
              </NavLink>
            )
          })}
        </nav>

        <div className="p-4 border-t border-[#F2EEF9] dark:border-[#2E2940]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm font-semibold text-gray-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-68">
        {/* Topbar Desktop */}
        <header className="hidden lg:flex items-center justify-end gap-3 px-8 py-4 bg-white/80 dark:bg-[#1E1B29]/80 backdrop-blur-md border-b border-[#ECE8F6] dark:border-[#2E2940] sticky top-0 z-20">
          <button
            type="button"
            onClick={() => navigate('/atendimentos?novo=1')}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-[#9B7BC7] hover:bg-[#8663B8] text-white text-sm font-semibold shadow-sm shadow-[#9B7BC7]/25 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo atendimento
          </button>

          {/* Menu Dropdown do Usuário */}
          <UserMenu />
        </header>

        {/* Page container */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 pb-28 lg:pb-10">
          <Outlet />
        </main>
      </div>

      {/* FAB "+" Mobile para Novo Atendimento */}
      {location.pathname !== '/atendimentos' && (
        <button
          type="button"
          onClick={() => navigate('/atendimentos?novo=1')}
          aria-label="Novo atendimento"
          className="lg:hidden fixed right-4 bottom-24 z-40 w-14 h-14 rounded-full bg-[#9B7BC7] hover:bg-[#8663B8] text-white shadow-lg shadow-[#9B7BC7]/40 flex items-center justify-center active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-7 h-7" />
        </button>
      )}

      {/* Bottom Navigation Flutuante Mobile (< 1024px) */}
      <nav
        aria-label="Navegação principal"
        className="lg:hidden fixed bottom-3 inset-x-3 z-40 bg-white/95 dark:bg-[#1E1B29]/95 backdrop-blur-md border border-[#ECE8F6] dark:border-[#2E2940] rounded-[24px] shadow-[0_12px_32px_-8px_rgba(75,77,80,0.22)] px-2 py-1.5"
      >
        <div className="grid grid-cols-5 gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex flex-col items-center justify-center py-1.5 rounded-2xl text-[11px] font-semibold transition-all',
                    isActive
                      ? 'text-[#9B7BC7] bg-[#F3EEFB] dark:bg-[#2C2442]'
                      : 'text-gray-500 dark:text-gray-400'
                  )
                }
              >
                <Icon className="w-5 h-5 mb-0.5" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
