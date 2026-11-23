import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CheckCircle2,
  Copy,
  Edit2,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useAtendimentos,
  useClinicas,
  useCreateAtendimento,
  useCreatePaciente,
  useCreateTutor,
  useDeleteAtendimento,
  useMarcarAtendimentosPagos,
  usePacientes,
  useTabelaPrecos,
  useTabelaPrecosClinica,
  useTutores,
  useUpdateAtendimento,
} from '@/hooks/useData'
import { formatCurrency, formatDateBR, getMonthKey, getTodayISO } from '@/lib/utils'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
  Skeleton,
  Switch,
  Textarea,
} from '@/components/ui'
import { FORMAS_PAGAMENTO, type Atendimento, type StatusPagamento } from '@/types'

interface ItemFormRow {
  especificacao: string
  quantidade: number
  valor_unitario: number
}

export function AtendimentosPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: atendimentos = [], isLoading } = useAtendimentos()
  const { data: clinicas = [] } = useClinicas()
  const { data: pacientes = [] } = usePacientes()
  const { data: tutores = [] } = useTutores()
  const { data: tabelaPrecos = [] } = useTabelaPrecos()
  const { data: tabelaPrecosClinica = [] } = useTabelaPrecosClinica()

  const createAtendimento = useCreateAtendimento()
  const updateAtendimento = useUpdateAtendimento()
  const deleteAtendimento = useDeleteAtendimento()
  const marcarPagos = useMarcarAtendimentosPagos()
  const createPaciente = useCreatePaciente()
  const createTutor = useCreateTutor()

  // Filtros
  const [search, setSearch] = useState(searchParams.get('q') || '')
  const [mesFilter, setMesFilter] = useState<string>(getMonthKey())
  const [clinicaFilter, setClinicaFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [urgenteOnly, setUrgenteOnly] = useState(false)

  // Seleção em lote
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal de atendimento
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Atendimento | null>(null)
  const [data, setData] = useState(getTodayISO())
  const [clinicaId, setClinicaId] = useState('')
  const [pacienteNome, setPacienteNome] = useState('')
  const [tutorNome, setTutorNome] = useState('')
  const [urgente, setUrgente] = useState(false)
  const [statusPagamento, setStatusPagamento] = useState<StatusPagamento>('nao_pago')
  const [formaPagamento, setFormaPagamento] = useState('Pix')
  const [dataPagamento, setDataPagamento] = useState(getTodayISO())
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState<ItemFormRow[]>([
    { especificacao: '1 incidência', quantidade: 1, valor_unitario: 47 },
  ])

  // Modal de cadastro rápido de paciente
  const [quickPacOpen, setQuickPacOpen] = useState(false)
  const [qpNome, setQpNome] = useState('')
  const [qpEspecie, setQpEspecie] = useState('Canino')
  const [qpRaca, setQpRaca] = useState('')
  const [qpTutor, setQpTutor] = useState('')

  // Abrir modal via query string (?novo=1&clinicaId=...)
  useEffect(() => {
    if (searchParams.get('novo') === '1') {
      const preClinica = searchParams.get('clinicaId') || ''
      const preData = searchParams.get('data') || getTodayISO()
      openNew(preClinica, preData)
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Autocompletar de códigos usados anteriormente + tabela de preços
  const codigosSugeridos = useMemo(() => {
    const set = new Set<string>()
    for (const a of atendimentos) {
      for (const it of a.itens) {
        if (it.especificacao.trim()) set.add(it.especificacao.trim())
      }
    }
    for (const tp of tabelaPrecos) {
      if (tp.codigo.trim()) set.add(tp.codigo.trim())
    }
    for (const tpc of tabelaPrecosClinica) {
      if (tpc.codigo.trim()) set.add(tpc.codigo.trim())
    }
    return Array.from(set).sort()
  }, [atendimentos, tabelaPrecos, tabelaPrecosClinica])

  const clinicaMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const c of clinicas) map.set(c.id, c.nome)
    return map
  }, [clinicas])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return atendimentos.filter((a) => {
      if (mesFilter !== 'all' && !a.data.startsWith(mesFilter)) return false
      if (clinicaFilter !== 'all' && a.clinica_id !== clinicaFilter) return false
      if (statusFilter !== 'all' && a.status_pagamento !== statusFilter) return false
      if (urgenteOnly && !a.urgente) return false
      if (q) {
        const clinName = (a.clinica_id ? clinicaMap.get(a.clinica_id) : '') || ''
        const codes = a.itens.map((i) => i.especificacao).join(' ')
        const haystack = `${a.paciente_nome} ${a.tutor_nome} ${clinName} ${codes}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [atendimentos, mesFilter, clinicaFilter, statusFilter, urgenteOnly, search, clinicaMap])

  const openNew = (preClinica = '', preData = getTodayISO()) => {
    setEditing(null)
    setData(preData)
    setClinicaId(preClinica || clinicas[0]?.id || '')
    setPacienteNome('')
    setTutorNome('')
    setUrgente(false)
    setStatusPagamento('nao_pago')
    setFormaPagamento('Pix')
    setDataPagamento(getTodayISO())
    setObservacoes('')
    setItens([{ especificacao: '1 incidência', quantidade: 1, valor_unitario: 47 }])
    setModalOpen(true)
  }

  const openEdit = (a: Atendimento) => {
    setEditing(a)
    setData(a.data)
    setClinicaId(a.clinica_id || '')
    setPacienteNome(a.paciente_nome)
    setTutorNome(a.tutor_nome)
    setUrgente(a.urgente)
    setStatusPagamento(a.status_pagamento)
    setFormaPagamento(a.forma_pagamento || 'Pix')
    setDataPagamento(a.data_pagamento || getTodayISO())
    setObservacoes(a.observacoes)
    setItens(
      a.itens.length > 0
        ? a.itens.map((i) => ({
            especificacao: i.especificacao,
            quantidade: i.quantidade,
            valor_unitario: i.valor_unitario,
          }))
        : [{ especificacao: '', quantidade: 1, valor_unitario: 0 }]
    )
    setModalOpen(true)
  }

  const duplicateAtendimento = (a: Atendimento) => {
    setEditing(null)
    setData(getTodayISO())
    setClinicaId(a.clinica_id || '')
    setPacienteNome(a.paciente_nome)
    setTutorNome(a.tutor_nome)
    setUrgente(a.urgente)
    setStatusPagamento('nao_pago')
    setFormaPagamento(a.forma_pagamento || 'Pix')
    setDataPagamento(getTodayISO())
    setObservacoes(a.observacoes)
    setItens(
      a.itens.map((i) => ({
        especificacao: i.especificacao,
        quantidade: i.quantidade,
        valor_unitario: i.valor_unitario,
      }))
    )
    setModalOpen(true)
    toast.info('Atendimento duplicado — ajuste os dados e salve.')
  }

  // Sugere preço quando o código digitado bate com a tabela da clínica ou tabela geral
  const findSuggestedPrice = (codigo: string, isUrgente: boolean, cId: string): number | null => {
    const clean = codigo.trim().toLowerCase()
    if (!clean) return null
    if (cId) {
      const clinicPrice = tabelaPrecosClinica.find(
        (p) => p.clinica_id === cId && p.codigo.trim().toLowerCase() === clean
      )
      if (clinicPrice) return clinicPrice.valor
    }
    const general = tabelaPrecos.find((p) => p.codigo.trim().toLowerCase() === clean)
    if (general) {
      return general.valor_padrao + (isUrgente ? general.adicional_urgencia : 0)
    }
    return null
  }

  const updateItemRow = (index: number, patch: Partial<ItemFormRow>) => {
    setItens((prev) =>
      prev.map((row, idx) => {
        if (idx !== index) return row
        const next = { ...row, ...patch }
        if (patch.especificacao !== undefined) {
          const suggested = findSuggestedPrice(patch.especificacao, urgente, clinicaId)
          if (suggested !== null) {
            next.valor_unitario = suggested
          }
        }
        return next
      })
    )
  }

  const handleToggleUrgente = (val: boolean) => {
    setUrgente(val)
    setItens((prev) =>
      prev.map((row) => {
        const suggested = findSuggestedPrice(row.especificacao, val, clinicaId)
        if (suggested !== null) return { ...row, valor_unitario: suggested }
        return row
      })
    )
  }

  const totalForm = itens.reduce(
    (acc, i) => acc + (Number(i.quantidade) || 0) * (Number(i.valor_unitario) || 0),
    0
  )

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item ao atendimento.')
      return
    }
    const matchedPac = pacientes.find(
      (p) => p.nome.toLowerCase() === pacienteNome.trim().toLowerCase()
    )
    const matchedTut = tutores.find(
      (t) => t.nome.toLowerCase() === tutorNome.trim().toLowerCase()
    )

    const payload = {
      data,
      clinica_id: clinicaId || null,
      paciente_id: matchedPac?.id || null,
      tutor_id: matchedTut?.id || null,
      paciente_nome: pacienteNome.trim(),
      tutor_nome: tutorNome.trim(),
      servico: 'Raio X',
      urgente,
      status_pagamento: statusPagamento,
      forma_pagamento: statusPagamento === 'pago' ? formaPagamento : '',
      data_pagamento: statusPagamento === 'pago' ? dataPagamento : null,
      observacoes: observacoes.trim(),
      itens: itens.map((i) => ({
        especificacao: i.especificacao.trim(),
        quantidade: Math.max(0.5, Number(i.quantidade) || 1),
        valor_unitario: Math.max(0, Number(i.valor_unitario) || 0),
      })),
    }

    if (editing) {
      updateAtendimento.mutate(
        { id: editing.id, data: payload },
        { onSuccess: () => setModalOpen(false) }
      )
    } else {
      createAtendimento.mutate(payload, { onSuccess: () => setModalOpen(false) })
    }
  }

  const handleQuickToggleStatus = (a: Atendimento) => {
    const nextStatus: StatusPagamento = a.status_pagamento === 'pago' ? 'nao_pago' : 'pago'
    updateAtendimento.mutate({
      id: a.id,
      data: {
        status_pagamento: nextStatus,
        forma_pagamento: nextStatus === 'pago' ? a.forma_pagamento || 'Pix' : '',
        data_pagamento: nextStatus === 'pago' ? getTodayISO() : null,
      },
    })
  }

  const handleBatchPay = () => {
    if (selectedIds.length === 0) return
    marcarPagos.mutate(
      { ids: selectedIds, formaPagamento: 'Pix' },
      { onSuccess: () => setSelectedIds([]) }
    )
  }

  const handleQuickCreatePaciente = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!qpNome.trim()) return
    let tutorId: string | null = null
    if (qpTutor.trim()) {
      const tut = await createTutor.mutateAsync({ nome: qpTutor.trim(), telefone: '' })
      tutorId = tut.id
      setTutorNome(tut.nome)
    }
    const pac = await createPaciente.mutateAsync({
      nome: qpNome.trim(),
      especie: qpEspecie,
      raca: qpRaca.trim(),
      tutor_id: tutorId,
      clinica_id: clinicaId || null,
    })
    setPacienteNome(pac.nome)
    setQpNome('')
    setQpRaca('')
    setQpTutor('')
    setQuickPacOpen(false)
  }

  const totalFiltrado = filtered.reduce((acc, a) => acc + a.total, 0)
  const totalPendenteFiltrado = filtered
    .filter((a) => a.status_pagamento === 'nao_pago')
    .reduce((acc, a) => acc + a.total, 0)

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A3C3F] dark:text-white">
            Atendimentos
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => openNew()}>
            <Plus className="w-4 h-4" />
            Novo atendimento
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <Input
              className="pl-10"
              placeholder="Buscar paciente, tutor, clínica ou código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <Input
            type="month"
            value={mesFilter === 'all' ? '' : mesFilter}
            onChange={(e) => setMesFilter(e.target.value || 'all')}
            aria-label="Filtrar por mês"
          />

          <Select value={clinicaFilter} onChange={(e) => setClinicaFilter(e.target.value)}>
            <option value="all">Todas as clínicas</option>
            {clinicas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </Select>

          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Todos os status</option>
            <option value="pago">Pago</option>
            <option value="nao_pago">Não pago</option>
          </Select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-4">
            <Switch
              checked={urgenteOnly}
              onCheckedChange={setUrgenteOnly}
              label="Somente urgentes"
            />
            {mesFilter !== 'all' && (
              <button
                type="button"
                onClick={() => setMesFilter('all')}
                className="text-xs font-semibold text-[#9B7BC7] hover:underline cursor-pointer"
              >
                Ver todos os meses
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span>
              Exibindo <strong>{filtered.length}</strong> registro(s) • Total:{' '}
              <strong className="text-[#4B4D50] dark:text-white">
                {formatCurrency(totalFiltrado)}
              </strong>
            </span>
            {totalPendenteFiltrado > 0 && (
              <Badge variant="warning">
                A receber: {formatCurrency(totalPendenteFiltrado)}
              </Badge>
            )}
          </div>
        </div>
      </Card>

      {/* Barra de ação em lote */}
      {selectedIds.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-[#EDE7F6] dark:bg-[#2E2447] flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-bold text-[#5A3E8C] dark:text-[#DFD2F7]">
            {selectedIds.length} atendimento(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
              Limpar
            </Button>
            <Button variant="success" size="sm" onClick={handleBatchPay}>
              <CheckCircle2 className="w-4 h-4" />
              Marcar como pagos
            </Button>
          </div>
        </div>
      )}

      {/* Lista / Tabela */}
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileSpreadsheet className="w-7 h-7" />}
            title="Nenhum atendimento encontrado"
            description="Lance um novo atendimento ou ajuste os filtros acima."
            action={
              <Button onClick={() => openNew()}>
                <Plus className="w-4 h-4" />
                Lançar atendimento
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Tabela Desktop (reproduz colunas do papel) */}
          <Card className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[#FAF8FE] dark:bg-[#181523] text-xs text-gray-500 border-b border-[#ECE8F6] dark:border-[#2E2940]">
                  <tr>
                    <th className="py-3 pl-4 pr-2 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={(e) =>
                          setSelectedIds(e.target.checked ? filtered.map((a) => a.id) : [])
                        }
                        aria-label="Selecionar todos"
                      />
                    </th>
                    <th className="py-3 px-2 text-left">Data</th>
                    <th className="py-3 px-2 text-left">Paciente</th>
                    <th className="py-3 px-2 text-left">Tutor</th>
                    <th className="py-3 px-2 text-left">Clínica</th>
                    <th className="py-3 px-2 text-left">Serviço</th>
                    <th className="py-3 px-2 text-left">Especificação</th>
                    <th className="py-3 px-2 text-center">Qtd</th>
                    <th className="py-3 px-2 text-right">Valor unit.</th>
                    <th className="py-3 px-2 text-right">Valor total</th>
                    <th className="py-3 px-2 text-center">Pagamento</th>
                    <th className="py-3 pl-2 pr-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3EFFA] dark:divide-[#282338]">
                  {filtered.map((a) => {
                    const totalQtd = a.itens.reduce((acc, i) => acc + i.quantidade, 0)
                    const firstItem = a.itens[0]
                    return (
                      <tr
                        key={a.id}
                        className="hover:bg-[#FAF8FE] dark:hover:bg-[#241F33] transition"
                      >
                        <td className="py-3 pl-4 pr-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(a.id)}
                            onChange={() => toggleSelect(a.id)}
                          />
                        </td>
                        <td className="py-3 px-2 whitespace-nowrap font-medium">
                          {formatDateBR(a.data)}
                        </td>
                        <td className="py-3 px-2 font-bold">
                          <span className="flex items-center gap-1">
                            {a.paciente_nome || '—'}
                            {a.urgente && (
                              <span title="Urgente">
                                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300">
                          {a.tutor_nome || '—'}
                        </td>
                        <td className="py-3 px-2 text-gray-600 dark:text-gray-300 max-w-[160px] truncate">
                          {(a.clinica_id && clinicaMap.get(a.clinica_id)) || 'Avulso'}
                        </td>
                        <td className="py-3 px-2 text-xs text-gray-500">{a.servico}</td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            {a.itens.map((it) => (
                              <Badge key={it.id} variant="purple">
                                {it.especificacao || '—'}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="py-3 px-2 text-center font-semibold">{totalQtd}</td>
                        <td className="py-3 px-2 text-right text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {a.itens.length === 1 && firstItem
                            ? formatCurrency(firstItem.valor_unitario)
                            : 'Vários'}
                        </td>
                        <td className="py-3 px-2 text-right font-extrabold text-[#3A3C3F] dark:text-white whitespace-nowrap">
                          {formatCurrency(a.total)}
                        </td>
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleQuickToggleStatus(a)}
                            title="Clique para alternar Pago / Não pago"
                            className="cursor-pointer"
                          >
                            <Badge variant={a.status_pagamento === 'pago' ? 'success' : 'warning'}>
                              {a.status_pagamento === 'pago' ? 'Pago' : 'Não pago'}
                            </Badge>
                          </button>
                        </td>
                        <td className="py-3 pl-2 pr-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => duplicateAtendimento(a)}
                              title="Duplicar atendimento"
                              className="p-1.5 rounded-lg hover:bg-[#EDE7F6] text-gray-500 hover:text-[#7F5DB0] cursor-pointer"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(a)}
                              title="Editar"
                              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2E2940] text-gray-500 cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Excluir este atendimento?')) {
                                  deleteAtendimento.mutate(a.id)
                                }
                              }}
                              title="Excluir"
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Cards Mobile (< 1024px) */}
          <div className="lg:hidden space-y-3">
            {filtered.map((a) => (
              <Card key={a.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-base">
                        {a.paciente_nome || 'Sem paciente'}
                      </span>
                      {a.urgente && <Badge variant="danger">Urgente</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">
                      {a.tutor_nome || 'Tutor não informado'} •{' '}
                      {(a.clinica_id && clinicaMap.get(a.clinica_id)) || 'Avulso'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickToggleStatus(a)}
                    className="cursor-pointer"
                  >
                    <Badge variant={a.status_pagamento === 'pago' ? 'success' : 'warning'}>
                      {a.status_pagamento === 'pago' ? 'Pago' : 'Não pago'}
                    </Badge>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {a.itens.map((it) => (
                    <span
                      key={it.id}
                      className="text-xs px-2.5 py-1 rounded-xl bg-[#F6F4FB] dark:bg-[#161320]"
                    >
                      <strong>{it.especificacao || 'Raio X'}</strong>: {it.quantidade}x{' '}
                      {formatCurrency(it.valor_unitario)}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#F2EEF9] dark:border-[#2E2940]">
                  <div>
                    <p className="text-[11px] text-gray-400">{formatDateBR(a.data)}</p>
                    <p className="text-base font-extrabold text-[#9B7BC7]">
                      {formatCurrency(a.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => duplicateAtendimento(a)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-rose-500"
                      onClick={() => {
                        if (confirm('Excluir este atendimento?')) {
                          deleteAtendimento.mutate(a.id)
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Modal Novo / Editar Atendimento */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar atendimento' : 'Novo atendimento'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <datalist id="codigos-especificacao">
            {codigosSugeridos.map((cod) => (
              <option key={cod} value={cod} />
            ))}
          </datalist>
          <datalist id="lista-pacientes">
            {pacientes.map((p) => (
              <option key={p.id} value={p.nome} />
            ))}
          </datalist>
          <datalist id="lista-tutores">
            {tutores.map((t) => (
              <option key={t.id} value={t.nome} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="at-data">Data *</Label>
              <Input
                id="at-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="at-clinica">Clínica</Label>
              <Select
                id="at-clinica"
                value={clinicaId}
                onChange={(e) => setClinicaId(e.target.value)}
              >
                <option value="">Atendimento avulso / domiciliar</option>
                {clinicas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <Label htmlFor="at-pac" className="mb-0">
                  Paciente (animal)
                </Label>
                <button
                  type="button"
                  onClick={() => setQuickPacOpen(true)}
                  className="text-[11px] font-bold text-[#9B7BC7] hover:underline cursor-pointer"
                >
                  + Cadastro rápido
                </button>
              </div>
              <Input
                id="at-pac"
                list="lista-pacientes"
                placeholder="Ex: Thor, Luna..."
                value={pacienteNome}
                onChange={(e) => setPacienteNome(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="at-tut">Tutor</Label>
              <Input
                id="at-tut"
                list="lista-tutores"
                placeholder="Nome do tutor"
                value={tutorNome}
                onChange={(e) => setTutorNome(e.target.value)}
              />
            </div>
          </div>

          {/* Itens (Especificação manual + Qtd + Valor) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="mb-0">Itens / Exames (Raio X)</Label>
              <Switch checked={urgente} onCheckedChange={handleToggleUrgente} label="Urgente ⚡" />
            </div>

            {itens.map((row, idx) => (
              <div
                key={idx}
                className="p-3 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320] grid grid-cols-12 gap-2 items-end"
              >
                <div className="col-span-12 sm:col-span-5">
                  <Label className="text-[11px]">Especificação (estudo radiográfico)</Label>
                  <Select
                    value={row.especificacao}
                    onChange={(e) => updateItemRow(idx, { especificacao: e.target.value })}
                  >
                    <option value="1 incidência">1 incidência</option>
                    <option value="2 incidência">2 incidência</option>
                    <option value="3 incidência">3 incidência</option>
                    {row.especificacao &&
                      !['1 incidência', '2 incidência', '3 incidência'].includes(
                        row.especificacao
                      ) && (
                        <option value={row.especificacao}>{row.especificacao}</option>
                      )}
                  </Select>
                </div>
                <div className="col-span-5 sm:col-span-2">
                  <Label className="text-[11px]">Qtd</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={row.quantidade}
                    onChange={(e) =>
                      updateItemRow(idx, { quantidade: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="col-span-5 sm:col-span-4">
                  <Label className="text-[11px]">Valor unit. (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={row.valor_unitario}
                    onChange={(e) =>
                      updateItemRow(idx, { valor_unitario: Number(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="col-span-2 sm:col-span-1 flex justify-end">
                  {itens.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setItens((p) => p.filter((_, i) => i !== idx))}
                      className="text-rose-500 h-11"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                setItens((p) => [
                  ...p,
                  { especificacao: '1 incidência', quantidade: 1, valor_unitario: urgente ? 85 : 47 },
                ])
              }
            >
              <Plus className="w-4 h-4" />
              Adicionar outro item
            </Button>
          </div>

          {/* Pagamento */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <Label htmlFor="at-status">Status de pagamento</Label>
              <Select
                id="at-status"
                value={statusPagamento}
                onChange={(e) => setStatusPagamento(e.target.value as StatusPagamento)}
              >
                <option value="nao_pago">Não pago (A receber)</option>
                <option value="pago">Pago</option>
              </Select>
            </div>
            {statusPagamento === 'pago' && (
              <>
                <div>
                  <Label htmlFor="at-forma">Forma de pagamento</Label>
                  <Select
                    id="at-forma"
                    value={formaPagamento}
                    onChange={(e) => setFormaPagamento(e.target.value)}
                  >
                    {FORMAS_PAGAMENTO.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="at-dpag">Data do pagamento</Label>
                  <Input
                    id="at-dpag"
                    type="date"
                    value={dataPagamento}
                    onChange={(e) => setDataPagamento(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>

          <div>
            <Label htmlFor="at-obs">Observações</Label>
            <Textarea
              id="at-obs"
              placeholder="Anotações sobre o exame ou cobrança..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>

          <div className="p-4 rounded-2xl bg-[#EDE7F6] dark:bg-[#2B2342] flex items-center justify-between">
            <span className="text-sm font-bold text-[#5A3E8C] dark:text-[#DFD2F7]">
              Valor total do atendimento
            </span>
            <span className="text-xl font-extrabold text-[#5A3E8C] dark:text-white">
              {formatCurrency(totalForm)}
            </span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createAtendimento.isPending || updateAtendimento.isPending}>
              {editing ? 'Salvar alterações' : 'Registrar atendimento'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Cadastro Rápido de Paciente */}
      <Modal
        open={quickPacOpen}
        onClose={() => setQuickPacOpen(false)}
        title="Cadastro rápido de paciente"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleQuickCreatePaciente} className="space-y-3">
          <div>
            <Label>Nome do animal *</Label>
            <Input value={qpNome} onChange={(e) => setQpNome(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Espécie</Label>
              <Select value={qpEspecie} onChange={(e) => setQpEspecie(e.target.value)}>
                <option value="Canino">Canino</option>
                <option value="Felino">Felino</option>
                <option value="Silvestre/Outro">Silvestre / Outro</option>
              </Select>
            </div>
            <div>
              <Label>Raça</Label>
              <Input value={qpRaca} onChange={(e) => setQpRaca(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Nome do tutor</Label>
            <Input value={qpTutor} onChange={(e) => setQpTutor(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setQuickPacOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">Salvar paciente</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
