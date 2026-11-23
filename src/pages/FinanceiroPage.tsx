import { useMemo, useState } from 'react'
import { addMonths, subMonths } from 'date-fns'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'
import { useAtendimentos, useClinicas, useDespesas } from '@/hooks/useData'
import {
  formatCurrency,
  formatDateBR,
  formatMonthYear,
  formatShortMonth,
  getMonthKey,
  getTodayISO,
} from '@/lib/utils'
import { Badge, Button, Card, Select } from '@/components/ui'

export function FinanceiroPage() {
  const { data: atendimentos = [] } = useAtendimentos()
  const { data: despesas = [] } = useDespesas()
  const { data: clinicas = [] } = useClinicas()

  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [tab, setTab] = useState<'todos' | 'pendentes' | 'pagos'>('todos')
  const [clinicaExport, setClinicaExport] = useState('all')

  const monthKey = getMonthKey(selectedMonth)
  const todayISO = getTodayISO()
  const clinicaMap = useMemo(() => new Map(clinicas.map((c) => [c.id, c.nome])), [clinicas])

  const atMes = useMemo(
    () =>
      atendimentos.filter(
        (a) =>
          a.data.startsWith(monthKey) &&
          (clinicaExport === 'all' || a.clinica_id === clinicaExport)
      ),
    [atendimentos, monthKey, clinicaExport]
  )

  const despMes = useMemo(
    () =>
      despesas.filter(
        (d) =>
          d.data.startsWith(monthKey) &&
          (clinicaExport === 'all' || d.clinica_id === clinicaExport)
      ),
    [despesas, monthKey, clinicaExport]
  )

  const resumo = useMemo(() => {
    const faturado = atMes.reduce((acc, a) => acc + a.total, 0)
    const recebido = atMes
      .filter((a) => a.status_pagamento === 'pago')
      .reduce((acc, a) => acc + a.total, 0)
    const aReceber = atMes
      .filter((a) => a.status_pagamento === 'nao_pago')
      .reduce((acc, a) => acc + a.total, 0)
    // Considera vencido o que está "nao_pago" com mais de 15 dias da data do exame
    const vencido = atMes
      .filter((a) => {
        if (a.status_pagamento !== 'nao_pago') return false
        const diffDays =
          (new Date(todayISO).getTime() - new Date(a.data).getTime()) / (1000 * 60 * 60 * 24)
        return diffDays > 15
      })
      .reduce((acc, a) => acc + a.total, 0)

    const totalDespesas = despMes.reduce((acc, d) => acc + d.valor, 0)
    const lucro = faturado - totalDespesas

    return { faturado, recebido, aReceber, vencido, totalDespesas, lucro }
  }, [atMes, despMes, todayISO])

  // DRE simples por categoria de despesa
  const dreDespesas = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of despMes) {
      map.set(d.categoria, (map.get(d.categoria) ?? 0) + d.valor)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [despMes])

  // Lucro por clínica no mês
  const lucroPorClinica = useMemo(() => {
    return clinicas
      .map((c) => {
        const rec = atendimentos
          .filter((a) => a.data.startsWith(monthKey) && a.clinica_id === c.id)
          .reduce((acc, a) => acc + a.total, 0)
        const desp = despesas
          .filter((d) => d.data.startsWith(monthKey) && d.clinica_id === c.id)
          .reduce((acc, d) => acc + d.valor, 0)
        return { nome: c.nome, receita: rec, despesas: desp, lucro: rec - desp }
      })
      .filter((x) => x.receita > 0 || x.despesas > 0)
      .sort((a, b) => b.lucro - a.lucro)
  }, [clinicas, atendimentos, despesas, monthKey])

  // Evolução do lucro (últimos 6 meses)
  const lucroMensalChart = useMemo(() => {
    const base = selectedMonth
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(base, 5 - i)
      const key = getMonthKey(m)
      const rec = atendimentos
        .filter((a) => a.data.startsWith(key))
        .reduce((acc, a) => acc + a.total, 0)
      const desp = despesas
        .filter((d) => d.data.startsWith(key))
        .reduce((acc, d) => acc + d.valor, 0)
      return {
        mes: formatShortMonth(m),
        Lucro: Number((rec - desp).toFixed(2)),
        Receita: Number(rec.toFixed(2)),
      }
    })
  }, [selectedMonth, atendimentos, despesas])

  const lancamentosFiltrados = useMemo(() => {
    if (tab === 'pendentes') return atMes.filter((a) => a.status_pagamento === 'nao_pago')
    if (tab === 'pagos') return atMes.filter((a) => a.status_pagamento === 'pago')
    return atMes
  }, [atMes, tab])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A3C3F] dark:text-white">Financeiro</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={clinicaExport}
            onChange={(e) => setClinicaExport(e.target.value)}
            className="w-auto h-9 text-xs"
          >
            <option value="all">Todas as clínicas</option>
            {clinicas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {/* Navegação entre meses */}
      <Card className="p-3 flex items-center justify-between max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedMonth((m) => subMonths(m, 1))}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="font-extrabold text-sm">{formatMonthYear(selectedMonth)}</span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSelectedMonth((m) => addMonths(m, 1))}
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
      </Card>

      {/* 4 cards principais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500">Faturado</p>
          <p className="text-xl font-extrabold mt-1">{formatCurrency(resumo.faturado)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500">A receber</p>
          <p className="text-xl font-extrabold mt-1 text-amber-600 dark:text-amber-400">
            {formatCurrency(resumo.aReceber)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500">Recebido</p>
          <p className="text-xl font-extrabold mt-1 text-[#4EA87E]">
            {formatCurrency(resumo.recebido)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold text-gray-500">Vencido (&gt;15 dias)</p>
          <p className="text-xl font-extrabold mt-1 text-rose-500">
            {formatCurrency(resumo.vencido)}
          </p>
        </Card>
      </div>

      {/* DRE Simples + Gráfico de Lucro Mensal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="p-5 lg:col-span-5 space-y-3">
          <h2 className="font-bold text-base">DRE Simples ({formatMonthYear(selectedMonth)})</h2>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-[#F2EEF9] dark:border-[#2E2940]">
              <span className="flex items-center gap-2 font-semibold text-[#4EA87E]">
                <TrendingUp className="w-4 h-4" /> (+) Receita Bruta (Exames)
              </span>
              <span className="font-extrabold text-[#4EA87E]">
                {formatCurrency(resumo.faturado)}
              </span>
            </div>

            {dreDespesas.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">Nenhuma despesa lançada neste mês.</p>
            ) : (
              dreDespesas.map(([cat, val]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 pl-3"
                >
                  <span>(−) {cat}</span>
                  <span className="font-semibold text-rose-500">-{formatCurrency(val)}</span>
                </div>
              ))
            )}

            <div className="flex items-center justify-between py-2 border-t border-[#F2EEF9] dark:border-[#2E2940]">
              <span className="flex items-center gap-2 font-semibold text-rose-500">
                <TrendingDown className="w-4 h-4" /> (−) Total de Despesas
              </span>
              <span className="font-extrabold text-rose-500">
                -{formatCurrency(resumo.totalDespesas)}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F2FBF6] dark:bg-[#192F25] flex items-center justify-between">
              <span className="font-extrabold text-sm">(=) Lucro Líquido</span>
              <span
                className={`text-lg font-extrabold ${
                  resumo.lucro >= 0 ? 'text-[#246E4B] dark:text-[#7AD5AA]' : 'text-rose-500'
                }`}
              >
                {formatCurrency(resumo.lucro)}
              </span>
            </div>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-7">
          <h2 className="font-bold text-base mb-1">Lucro líquido por mês</h2>
          <p className="text-xs text-gray-500 mb-4">Receita menos despesas nos últimos 6 meses</p>
          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lucroMensalChart}>
                <defs>
                  <linearGradient id="lucroGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6CC59A" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6CC59A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ECE8F6" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip formatter={(v: unknown) => formatCurrency(Number(v) || 0)} />
                <Area
                  type="monotone"
                  dataKey="Lucro"
                  stroke="#4EA87E"
                  strokeWidth={3}
                  fill="url(#lucroGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Lucro por Clínica */}
      {lucroPorClinica.length > 0 && (
        <Card className="p-5">
          <h2 className="font-bold text-base mb-3">Resultado por clínica no mês</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lucroPorClinica.map((c) => (
              <div
                key={c.nome}
                className="p-3.5 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320] flex items-center justify-between"
              >
                <div>
                  <p className="font-bold text-sm">{c.nome}</p>
                  <p className="text-[11px] text-gray-500">
                    Rec: {formatCurrency(c.receita)} • Desp: {formatCurrency(c.despesas)}
                  </p>
                </div>
                <span
                  className={`font-extrabold text-sm ${
                    c.lucro >= 0 ? 'text-[#4EA87E]' : 'text-rose-500'
                  }`}
                >
                  {formatCurrency(c.lucro)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Abas Todos / Pendentes / Pagos */}
      <Card className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-bold text-base">Lançamentos de receita do mês</h2>
          <div className="inline-flex p-1 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320]">
            {(['todos', 'pendentes', 'pagos'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                  tab === t ? 'bg-[#9B7BC7] text-white' : 'text-gray-500'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {lancamentosFiltrados.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            Nenhum lançamento encontrado nesta aba.
          </p>
        ) : (
          <div className="divide-y divide-[#F3EFFA] dark:divide-[#282338]">
            {lancamentosFiltrados.map((a) => (
              <div
                key={a.id}
                className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <div>
                  <p className="font-bold">
                    {a.paciente_nome || 'Sem paciente'}{' '}
                    <span className="font-normal text-xs text-gray-500">
                      ({(a.clinica_id && clinicaMap.get(a.clinica_id)) || 'Avulso'})
                    </span>
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateBR(a.data)} •{' '}
                    {a.itens.map((i) => `${i.especificacao || 'RX'} (${i.quantidade}x)`).join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-extrabold">{formatCurrency(a.total)}</span>
                  <Badge variant={a.status_pagamento === 'pago' ? 'success' : 'warning'}>
                    {a.status_pagamento === 'pago' ? 'Pago' : 'Pendente'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
