import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Clock,
  Receipt,
  Settings,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  useAtendimentos,
  useClinicas,
  useDespesas,
  useEventos,
  useMarcarAtendimentosPagos,
  useMetas,
  useParcelasMaquina,
  useProfile,
  useVeiculo,
} from '@/hooks/useData'
import { formatCurrency, formatDateBR, formatShortMonth, getMonthKey, getTodayISO } from '@/lib/utils'
import { Badge, Button, Card, Skeleton } from '@/components/ui'
import { MaquinaRaioXCard } from '@/components/dashboard/MaquinaRaioXCard'
import { LuanSantanaCard } from '@/components/dashboard/LuanSantanaCard'
import { UserMenu } from '@/components/layout/UserMenu'

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: profile, isLoading: l1 } = useProfile()
  const { data: metas = [] } = useMetas()
  const { data: parcelas = [] } = useParcelasMaquina()
  const { data: atendimentos = [], isLoading: l2 } = useAtendimentos()
  const { data: despesas = [], isLoading: l3 } = useDespesas()
  const { data: clinicas = [] } = useClinicas()
  const { data: eventos = [] } = useEventos()
  const { data: veiculo } = useVeiculo()
  const marcarPagos = useMarcarAtendimentosPagos()

  const currentMonthKey = getMonthKey()
  const todayISO = getTodayISO()

  // Pagamentos pendentes (todos os atendimentos não pagos)
  const pagamentosPendentes = useMemo(() => {
    const cliMap = new Map(clinicas.map((c) => [c.id, c.nome]))
    const list = atendimentos
      .filter((a) => a.status_pagamento === 'nao_pago')
      .map((a) => ({
        ...a,
        clinicaNome: (a.clinica_id && cliMap.get(a.clinica_id)) || 'Avulso',
      }))
    const total = list.reduce((acc, a) => acc + a.total, 0)
    return { list, total }
  }, [atendimentos, clinicas])

  const resumoMes = useMemo(() => {
    const atMes = atendimentos.filter((a) => a.data.startsWith(currentMonthKey))
    const despMes = despesas.filter((d) => d.data.startsWith(currentMonthKey))

    const faturado = atMes.reduce((acc, a) => acc + a.total, 0)
    const recebido = atMes
      .filter((a) => a.status_pagamento === 'pago')
      .reduce((acc, a) => acc + a.total, 0)
    const aReceber = atMes
      .filter((a) => a.status_pagamento === 'nao_pago')
      .reduce((acc, a) => acc + a.total, 0)
    const totalDespesas = despMes.reduce((acc, d) => acc + d.valor, 0)
    const lucroLiquido = faturado - totalDespesas
    const numExames = atMes.reduce(
      (acc, a) => acc + a.itens.reduce((s, it) => s + it.quantidade, 0),
      0
    )

    return { faturado, recebido, aReceber, totalDespesas, lucroLiquido, numExames }
  }, [atendimentos, despesas, currentMonthKey])

  // Gráfico dos últimos 6 meses
  const chartData = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, idx) => subMonths(now, 5 - idx))
    return months.map((m) => {
      const key = getMonthKey(m)
      const fat = atendimentos
        .filter((a) => a.data.startsWith(key))
        .reduce((acc, a) => acc + a.total, 0)
      const desp = despesas
        .filter((d) => d.data.startsWith(key))
        .reduce((acc, d) => acc + d.valor, 0)
      return {
        mes: formatShortMonth(m),
        Faturamento: Number(fat.toFixed(2)),
        Despesas: Number(desp.toFixed(2)),
      }
    })
  }, [atendimentos, despesas])

  // Ranking de clínicas por faturamento e lucratividade
  const rankingClinicas = useMemo(() => {
    const consumo = veiculo?.consumo_cidade || 10
    const precoComb = veiculo?.preco_combustivel || 6
    const desgaste = veiculo?.desgaste_por_km || 0.3

    return clinicas
      .map((c) => {
        const atCli = atendimentos.filter((a) => a.clinica_id === c.id)
        const faturado = atCli.reduce((acc, a) => acc + a.total, 0)
        const despDiretas = despesas
          .filter((d) => d.clinica_id === c.id)
          .reduce((acc, d) => acc + d.valor, 0)
        const dias = new Set(atCli.map((a) => a.data)).size
        const kmTotal = c.distancia_km * 2
        const custoVisita = (kmTotal / consumo) * precoComb + kmTotal * desgaste + c.pedagio_padrao
        const lucro = faturado - despDiretas - dias * custoVisita
        return { id: c.id, nome: c.nome, faturado, lucro, atendimentos: atCli.length }
      })
      .sort((a, b) => b.faturado - a.faturado)
      .slice(0, 5)
  }, [clinicas, atendimentos, despesas, veiculo])

  // Próximos eventos da agenda
  const proximosEventos = useMemo(() => {
    const cliMap = new Map(clinicas.map((c) => [c.id, c.nome]))
    return eventos
      .filter((e) => e.data >= todayISO && e.status !== 'cancelado')
      .slice(0, 4)
      .map((e) => ({
        ...e,
        clinicaNome: (e.clinica_id && cliMap.get(e.clinica_id)) || e.titulo || 'Visita agendada',
      }))
  }, [eventos, clinicas, todayISO])

  const dataHojeFormatada = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })
  const firstName = (profile?.nome || 'Nathalia').split(' ')[0]

  if (l1 || l2 || l3 || !profile) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-64" />
        <Skeleton className="h-52 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Saudação estilo SelfVet */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3A3C3F] dark:text-white tracking-tight">
            Olá, {firstName} 👋
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 capitalize mt-0.5">
            {dataHojeFormatada}
          </p>
        </div>
        <UserMenu compact className="lg:hidden shrink-0" />
      </div>

      {/* Atalhos rápidos Mobile (Agenda, Despesas, Ajustes) */}
      <div className="grid grid-cols-3 gap-2.5 lg:hidden">
        <button
          type="button"
          onClick={() => navigate('/agenda')}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-white dark:bg-[#1E1B29] border border-[#ECE8F6] dark:border-[#2E2940] shadow-sm active:scale-[0.98] transition cursor-pointer"
        >
          <Calendar className="w-4 h-4 text-[#9B7BC7] shrink-0" />
          <span className="text-xs font-bold text-[#3A3C3F] dark:text-white truncate">
            Agenda
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/despesas')}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-white dark:bg-[#1E1B29] border border-[#ECE8F6] dark:border-[#2E2940] shadow-sm active:scale-[0.98] transition cursor-pointer"
        >
          <Receipt className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="text-xs font-bold text-[#3A3C3F] dark:text-white truncate">
            Despesas
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate('/ajustes')}
          className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-white dark:bg-[#1E1B29] border border-[#ECE8F6] dark:border-[#2E2940] shadow-sm active:scale-[0.98] transition cursor-pointer"
        >
          <Settings className="w-4 h-4 text-[#7F5DB0] dark:text-[#C9B3EE] shrink-0" />
          <span className="text-xs font-bold text-[#3A3C3F] dark:text-white truncate">
            Ajustes
          </span>
        </button>
      </div>

      {/* Avatar Luan Santana — Frase motivacional do dia */}
      <LuanSantanaCard todayISO={todayISO} nome={profile.nome} />

      {/* CARD DE METAS (Aparelho de Raio X e outras metas) */}
      <MaquinaRaioXCard
        profile={profile}
        metas={metas}
        parcelas={parcelas}
        faturadoMesAtual={resumoMes.faturado}
      />

      {/* Cards de resumo do mês */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500">Faturado</span>
            <TrendingUp className="w-4 h-4 text-[#9B7BC7]" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold mt-1.5">
            {formatCurrency(resumoMes.faturado)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500">Recebido</span>
            <Wallet className="w-4 h-4 text-[#6CC59A]" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold mt-1.5 text-[#3B9A6E] dark:text-[#6CC59A]">
            {formatCurrency(resumoMes.recebido)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500">A receber</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold mt-1.5 text-amber-600 dark:text-amber-400">
            {formatCurrency(resumoMes.aReceber)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500">Despesas</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold mt-1.5 text-rose-500">
            {formatCurrency(resumoMes.totalDespesas)}
          </p>
        </Card>

        <Card className="p-4 bg-[#F2FBF6] dark:bg-[#182922] border-[#CDEEDB] dark:border-[#244435]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#2E7D57] dark:text-[#7AD5AA]">
              Lucro líquido
            </span>
          </div>
          <p
            className={`text-lg sm:text-xl font-extrabold mt-1.5 ${
              resumoMes.lucroLiquido >= 0
                ? 'text-[#246E4B] dark:text-[#7AD5AA]'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(resumoMes.lucroLiquido)}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold text-gray-500">Nº de exames</span>
            <Activity className="w-4 h-4 text-[#9B7BC7]" />
          </div>
          <p className="text-lg sm:text-xl font-extrabold mt-1.5">{resumoMes.numExames}</p>
        </Card>
      </div>

      {/* Gráfico + Próximos eventos & Simulador */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-base">Faturamento x Despesas</h2>
              <p className="text-xs text-gray-500">Evolução dos últimos 6 meses</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/financeiro')}>
              Ver financeiro <ArrowUpRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECE8F6" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip
                  formatter={(value: unknown) => formatCurrency(Number(value) || 0)}
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid #ECE8F6',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="Faturamento" fill="#9B7BC7" radius={[8, 8, 0, 0]} />
                <Bar dataKey="Despesas" fill="#6CC59A" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Próximos eventos + Atalho Simulador */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#9B7BC7]" />
                Próximos eventos
              </h2>
              <button
                type="button"
                onClick={() => navigate('/agenda')}
                className="text-xs font-semibold text-[#9B7BC7] hover:underline cursor-pointer"
              >
                Ver agenda
              </button>
            </div>

            {proximosEventos.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                Nenhuma visita agendada nos próximos dias.
              </p>
            ) : (
              <div className="space-y-2.5">
                {proximosEventos.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => navigate('/agenda')}
                    className="p-3 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320] hover:bg-[#EDE7F6] dark:hover:bg-[#241E36] transition cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{ev.clinicaNome}</p>
                      <p className="text-xs text-gray-500">
                        {formatDateBR(ev.data)} • {ev.hora_inicio}
                      </p>
                    </div>
                    <Badge variant={ev.data === todayISO ? 'success' : 'purple'}>
                      {ev.data === todayISO ? 'Hoje' : 'Agendado'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                Pagamentos pendentes
              </h2>
              <button
                type="button"
                onClick={() => navigate('/financeiro')}
                className="text-xs font-semibold text-[#9B7BC7] hover:underline cursor-pointer"
              >
                Ver todos
              </button>
            </div>

            {pagamentosPendentes.list.length === 0 ? (
              <div className="p-4 rounded-2xl bg-[#E6F7EF] dark:bg-[#193528] text-center">
                <p className="text-xs font-bold text-[#287D56] dark:text-[#7AD5AA]">
                  Tudo em dia! Nenhum pagamento pendente ✅
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="px-3 py-2 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-between text-xs">
                  <span className="font-semibold text-amber-700 dark:text-amber-300">
                    {pagamentosPendentes.list.length} pendente(s)
                  </span>
                  <span className="font-extrabold text-amber-700 dark:text-amber-300">
                    {formatCurrency(pagamentosPendentes.total)}
                  </span>
                </div>

                {pagamentosPendentes.list.slice(0, 4).map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320] flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">
                        {p.paciente_nome || p.clinicaNome}
                      </p>
                      <p className="text-[11px] text-gray-500 truncate">
                        {p.clinicaNome} • {formatDateBR(p.data)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        {formatCurrency(p.total)}
                      </span>
                      <button
                        type="button"
                        title="Marcar como pago"
                        onClick={() => marcarPagos.mutate({ ids: [p.id], formaPagamento: 'Pix' })}
                        className="w-8 h-8 rounded-xl bg-[#E6F7EF] dark:bg-[#1C3B2D] text-[#2E855B] dark:text-[#7AD5AA] hover:bg-[#6CC59A] hover:text-white flex items-center justify-center transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Ranking de Clínicas */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-base">Ranking de Clínicas</h2>
            <p className="text-xs text-gray-500">Por faturamento total e lucratividade estimada</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/clinicas')}>
            Ver todas <ArrowUpRight className="w-4 h-4" />
          </Button>
        </div>

        {rankingClinicas.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Cadastre clínicas e lance atendimentos para ver o ranking.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {rankingClinicas.map((c, idx) => (
              <div
                key={c.id}
                onClick={() => navigate(`/clinicas/${c.id}`)}
                className="p-3.5 rounded-2xl border border-[#ECE8F6] dark:border-[#2E2940] hover:border-[#9B7BC7] transition cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-7 h-7 rounded-xl bg-[#EDE7F6] dark:bg-[#2F2447] text-[#7F5DB0] dark:text-[#D5C2F5] font-extrabold text-xs flex items-center justify-center shrink-0">
                    #{idx + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate">{c.nome}</p>
                    <p className="text-[11px] text-gray-500">{c.atendimentos} atendimento(s)</p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-extrabold">{formatCurrency(c.faturado)}</p>
                  <p
                    className={`text-[11px] font-semibold ${
                      c.lucro >= 0 ? 'text-[#4EA87E]' : 'text-rose-500'
                    }`}
                  >
                    Lucro: {formatCurrency(c.lucro)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
