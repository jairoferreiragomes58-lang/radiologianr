import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown,
  Lock,
  LogOut,
  Mail,
  MessageCircle,
  Moon,
  Save,
  Settings,
  Sun,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useProfile, useUpdateProfile } from '@/hooks/useData'
import { cn } from '@/lib/utils'
import { Button, Input, Label, Modal } from '@/components/ui'

interface UserMenuProps {
  compact?: boolean
  className?: string
}

export function UserMenu({ compact = false, className }: UserMenuProps) {
  const { user, signOut, updateAccount } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { data: profile } = useProfile()
  const updateProfile = useUpdateProfile()
  const navigate = useNavigate()

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Modal Meu Perfil
  const [perfilModalOpen, setPerfilModalOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [savingPerfil, setSavingPerfil] = useState(false)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const openPerfilModal = () => {
    setMenuOpen(false)
    setNome(profile?.nome || user?.nome || 'Nathalia Rangel')
    setEmail(user?.email || '')
    setWhatsapp(profile?.whatsapp || '')
    setNovaSenha('')
    setConfirmarSenha('')
    setPerfilModalOpen(true)
  }

  const handleSavePerfil = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!nome.trim()) {
      toast.error('Informe seu nome.')
      return
    }
    if (!email.trim()) {
      toast.error('Informe seu e-mail.')
      return
    }
    if (novaSenha && novaSenha.length < 4) {
      toast.error('A nova senha deve ter pelo menos 4 caracteres.')
      return
    }
    if (novaSenha && novaSenha !== confirmarSenha) {
      toast.error('As senhas não conferem.')
      return
    }

    setSavingPerfil(true)
    try {
      await updateAccount({
        nome: nome.trim(),
        email: email.trim(),
        password: novaSenha || undefined,
      })
      await updateProfile.mutateAsync({
        nome: nome.trim(),
        whatsapp: whatsapp.trim(),
      })
      setPerfilModalOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao atualizar perfil.')
    } finally {
      setSavingPerfil(false)
    }
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await signOut()
    navigate('/login')
  }

  const fullName = profile?.nome || 'Nathalia Rangel'
  const initials = (profile?.nome || 'NR').slice(0, 2).toUpperCase()

  return (
    <>
      <div className={cn('relative', className)} ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-label="Menu do usuário"
          className={cn(
            'flex items-center transition cursor-pointer',
            compact
              ? 'rounded-full active:scale-95'
              : 'gap-2.5 pl-2 pr-3 py-1.5 rounded-2xl hover:bg-[#F6F4FB] dark:hover:bg-[#282438]'
          )}
        >
          <div
            className={cn(
              'rounded-full bg-[#EDE7F6] dark:bg-[#2F2447] text-[#9B7BC7] font-bold flex items-center justify-center shrink-0',
              compact ? 'w-10 h-10 text-sm' : 'w-9 h-9 text-xs'
            )}
          >
            {initials}
          </div>
          {!compact && (
            <>
              <div className="text-left">
                <p className="text-xs font-bold leading-tight">{fullName}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{user?.email || 'Modo local'}</p>
              </div>
              <ChevronDown
                className={cn(
                  'w-4 h-4 text-gray-400 transition-transform shrink-0',
                  menuOpen && 'rotate-180'
                )}
              />
            </>
          )}
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-[#1E1B29] border border-[#ECE8F6] dark:border-[#2E2940] shadow-xl p-1.5 z-50">
            <button
              type="button"
              onClick={openPerfilModal}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#4B4D50] dark:text-[#EAE6F5] hover:bg-[#F6F4FB] dark:hover:bg-[#282438] transition cursor-pointer"
            >
              <User className="w-4 h-4 text-[#9B7BC7]" />
              Meu perfil
            </button>

            {compact && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  navigate('/ajustes')
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-[#4B4D50] dark:text-[#EAE6F5] hover:bg-[#F6F4FB] dark:hover:bg-[#282438] transition cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#9B7BC7]" />
                Ajustes
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                toggleTheme()
                setMenuOpen(false)
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-[#4B4D50] dark:text-[#EAE6F5] hover:bg-[#F6F4FB] dark:hover:bg-[#282438] transition cursor-pointer"
            >
              <span className="flex items-center gap-2.5">
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-[#9B7BC7]" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
                {theme === 'light' ? 'Modo escuro' : 'Modo claro'}
              </span>
            </button>

            <div className="my-1 border-t border-[#F2EEF9] dark:border-[#2E2940]" />

            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
      </div>

      {/* Modal Meu Perfil */}
      <Modal
        open={perfilModalOpen}
        onClose={() => setPerfilModalOpen(false)}
        title="Meu perfil"
        subtitle="Atualize seus dados pessoais e credenciais de acesso"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSavePerfil} className="space-y-4">
          <div>
            <Label htmlFor="mp-nome">Nome completo</Label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                id="mp-nome"
                className="pl-10"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="mp-email">E-mail</Label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                id="mp-email"
                type="email"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="mp-whats">WhatsApp</Label>
            <div className="relative">
              <MessageCircle className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                id="mp-whats"
                className="pl-10"
                placeholder="(11) 99999-9999"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#F2EEF9] dark:border-[#2E2940] space-y-3">
            <p className="text-xs font-bold text-gray-500">
              Alterar senha (deixe em branco para manter a atual)
            </p>
            <div>
              <Label htmlFor="mp-senha">Nova senha</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="mp-senha"
                  type="password"
                  className="pl-10"
                  placeholder="••••••"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="mp-senha2">Confirmar nova senha</Label>
              <div className="relative">
                <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input
                  id="mp-senha2"
                  type="password"
                  className="pl-10"
                  placeholder="••••••"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPerfilModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={savingPerfil}>
              <Save className="w-4 h-4" />
              Salvar alterações
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
