import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowRight, KeyRound, Lock, Mail, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/services'
import { Button, Card, Input, Label } from '@/components/ui'

const loginSchema = z.object({
  email: z.string().email('Digite um e-mail válido'),
  password: z.string().min(4, 'A senha deve ter pelo menos 4 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>('login')
  const [nome, setNome] = useState('Nathalia Rangel')
  const [submitting, setSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: isSupabaseConfigured ? '' : 'nathalia@radiologianr.com.br',
      password: isSupabaseConfigured ? '' : '123456',
    },
  })

  const onSubmit = async (data: LoginForm) => {
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(data.email, data.password)
        toast.success('Bem-vinda de volta, Nathalia!')
        navigate('/')
      } else if (mode === 'signup') {
        await signUp(data.email, data.password, nome)
        toast.success('Conta criada com sucesso!')
        navigate('/')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao autenticar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = getValues('email')
    if (!email) {
      toast.error('Informe seu e-mail para recuperar a senha.')
      return
    }
    setSubmitting(true)
    try {
      await resetPassword(email)
      toast.success(
        isSupabaseConfigured
          ? 'Link de recuperação enviado para seu e-mail!'
          : 'Em modo local, basta usar qualquer senha com 4+ caracteres.'
      )
      setMode('login')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar recuperação')
    } finally {
      setSubmitting(false)
    }
  }

  const handleQuickDemo = async () => {
    setSubmitting(true)
    try {
      await signIn('nathalia@radiologianr.com.br', '123456')
      toast.success('Entrando no modo local com dados de exemplo!')
      navigate('/')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh bg-[#F6F4FB] dark:bg-[#14121B] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-5">
        <Card className="p-7 sm:p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <img
              src="/logo.png"
              alt="Nathalia Rangel Radiologia"
              className="w-36 h-36 object-contain mb-2 rounded-3xl"
            />
            <h1 className="text-xl font-extrabold text-[#4B4D50] dark:text-white">
              Radiologia NR
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Gestão completa
            </p>
          </div>

          {!isSupabaseConfigured && (
            <div className="mb-5 p-3.5 rounded-2xl bg-[#EDE7F6]/70 dark:bg-[#29223D] border border-[#DFD5F2] dark:border-[#3C3159] text-xs text-[#563C82] dark:text-[#D9CBF5]">
              <p className="font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Modo Local (localStorage) ativo
              </p>
              <p className="mt-1 opacity-90">
                Testando localmente com dados de exemplo. Para conectar ao Supabase, configure o arquivo <code className="font-mono">.env</code>.
              </p>
            </div>
          )}

          {mode === 'forgot' ? (
            <form onSubmit={handleForgot} className="space-y-4">
              <div>
                <Label htmlFor="email-forgot">Seu e-mail</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="email-forgot"
                    type="email"
                    className="pl-10"
                    placeholder="nathalia@radiologianr.com.br"
                    {...register('email')}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={submitting}>
                <KeyRound className="w-4 h-4" />
                Enviar link de recuperação
              </Button>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="w-full text-xs font-semibold text-[#9B7BC7] hover:underline cursor-pointer"
              >
                Voltar para o login
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <Label htmlFor="nome">Nome profissional</Label>
                  <Input
                    id="nome"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nathalia Rangel"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-10"
                    placeholder="nathalia@radiologianr.com.br"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-500 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label htmlFor="password" className="mb-0">
                    Senha
                  </Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs font-semibold text-[#9B7BC7] hover:underline cursor-pointer"
                    >
                      Esqueci a senha
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="password"
                    type="password"
                    className="pl-10"
                    placeholder="••••••"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-500 mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={submitting}>
                {mode === 'login' ? 'Entrar' : 'Criar conta'}
                <ArrowRight className="w-4 h-4" />
              </Button>

              {!isSupabaseConfigured && mode === 'login' && (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={handleQuickDemo}
                  disabled={submitting}
                >
                  Entrar rápido como Nathalia
                </Button>
              )}

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="text-xs font-semibold text-gray-500 hover:text-[#9B7BC7] cursor-pointer"
                >
                  {mode === 'login'
                    ? 'Ainda não tem conta? Criar acesso'
                    : 'Já possui conta? Fazer login'}
                </button>
              </div>
            </form>
          )}
        </Card>

        <p className="text-center text-[11px] text-gray-400 leading-relaxed">
          © 2026 Radiologia NR. Todos os direitos reservados.
          <br />
          Desenvolvido por Ruan Ennes
        </p>
      </div>
    </div>
  )
}
