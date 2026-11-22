import React, { createContext, useContext, useEffect, useState } from 'react'
import { repository } from '@/services'
import type { UserSession } from '@/types'

interface AuthContextValue {
  user: UserSession | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, nome: string) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updateAccount: (patch: { nome?: string; email?: string; password?: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    repository
      .getSession()
      .then((s) => setUser(s))
      .finally(() => setLoading(false))
  }, [])

  const signIn = async (email: string, password: string) => {
    const session = await repository.signIn(email, password)
    setUser(session)
  }

  const signUp = async (email: string, password: string, nome: string) => {
    const session = await repository.signUp(email, password, nome)
    setUser(session)
  }

  const signOut = async () => {
    await repository.signOut()
    setUser(null)
  }

  const resetPassword = async (email: string) => {
    await repository.resetPassword(email)
  }

  const updateAccount = async (patch: { nome?: string; email?: string; password?: string }) => {
    const session = await repository.updateAccount(patch)
    setUser(session)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword, updateAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
