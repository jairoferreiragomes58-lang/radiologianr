import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ClinicasPage } from '@/pages/ClinicasPage'
import { ClinicaDetalhePage } from '@/pages/ClinicaDetalhePage'
import { AtendimentosPage } from '@/pages/AtendimentosPage'
import { DespesasPage } from '@/pages/DespesasPage'
import { SimuladorPage } from '@/pages/SimuladorPage'
import { AgendaPage } from '@/pages/AgendaPage'
import { FinanceiroPage } from '@/pages/FinanceiroPage'
import { AjustesPage } from '@/pages/AjustesPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-[#F6F4FB] dark:bg-[#14121B]">
        <div className="flex flex-col items-center gap-3">
          <img src="/logo.png" alt="Radiologia NR" className="w-20 h-20 object-contain animate-pulse" />
          <p className="text-xs font-semibold text-[#9B7BC7]">Carregando Radiologia NR...</p>
        </div>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/clinicas" element={<ClinicasPage />} />
                <Route path="/clinicas/:id" element={<ClinicaDetalhePage />} />
                <Route path="/atendimentos" element={<AtendimentosPage />} />
                <Route path="/despesas" element={<DespesasPage />} />
                <Route path="/simulador" element={<SimuladorPage />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route path="/financeiro" element={<FinanceiroPage />} />
                <Route path="/ajustes" element={<AjustesPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}

export default App
