import React, { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Edit2, Plus, Receipt, RefreshCw, Trash2 } from 'lucide-react'
import {
  useClinicas,
  useCreateDespesa,
  useDeleteDespesa,
  useDespesas,
  useGerarRecorrentes,
  useUpdateDespesa,
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
} from '@/components/ui'
import { CATEGORIAS_DESPESA, type Despesa } from '@/types'

export function DespesasPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: despesas = [], isLoading } = useDespesas()
  const { data: clinicas = [] } = useClinicas()

  const createDespesa = useCreateDespesa()
  const updateDespesa = useUpdateDespesa()
  const deleteDespesa = useDeleteDespesa()
  const gerarRecorrentes = useGerarRecorrentes()

  const [mesFilter, setMesFilter] = useState(getMonthKey())
  const [categoriaFilter, setCategoriaFilter] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Despesa | null>(null)
  const [data, setData] = useState(getTodayISO())
  const [categoria, setCategoria] = useState<string>('Combustível')
  const [descricao, setDescricao] = useState('')
  const [valor, setValor] = useState('')
  const [clinicaId, setClinicaId] = useState('')
  const [recorrente, setRecorrente] = useState(false)

  useEffect(() => {
    if (searchParams.get('novo') === '1') {
      openCreate()
      setSearchParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const clinicaMap = useMemo(() => new Map(clinicas.map((c) => [c.id, c.nome])), [clinicas])

  const filtered = useMemo(() => {
    return despesas.filter((d) => {
      if (mesFilter !== 'all' && !d.data.startsWith(mesFilter)) return false
      if (categoriaFilter !== 'all' && d.categoria !== categoriaFilter) return false
      return true
    })
  }, [despesas, mesFilter, categoriaFilter])

  const totalFiltrado = filtered.reduce((acc, d) => acc + d.valor, 0)

  const porCategoria = useMemo(() => {
    const map = new Map<string, number>()
    for (const d of filtered) {
      map.set(d.categoria, (map.get(d.categoria) ?? 0) + d.valor)
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const openCreate = () => {
    setEditing(null)
    setData(getTodayISO())
    setCategoria('Combustível')
    setDescricao('')
    setValor('')
    setClinicaId('')
    setRecorrente(false)
    setModalOpen(true)
  }

  const openEdit = (d: Despesa) => {
    setEditing(d)
    setData(d.data)
    setCategoria(d.categoria)
    setDescricao(d.descricao)
    setValor(String(d.valor))
    setClinicaId(d.clinica_id || '')
    setRecorrente(d.recorrente)
    setModalOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      data,
      categoria,
      descricao: descricao.trim() || categoria,
      valor: Math.max(0, Number(valor) || 0),
      clinica_id: clinicaId || null,
      recorrente,
    }
    if (editing) {
      updateDespesa.mutate(
        { id: editing.id, patch: payload },
        { onSuccess: () => setModalOpen(false) }
      )
    } else {
      createDespesa.mutate(payload, { onSuccess: () => setModalOpen(false) })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A3C3F] dark:text-white">Despesas</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => gerarRecorrentes.mutate(mesFilter === 'all' ? getMonthKey() : mesFilter)}
            disabled={gerarRecorrentes.isPending}
          >
            <RefreshCw className="w-4 h-4" />
            Gerar recorrentes do mês
          </Button>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Nova despesa
          </Button>
        </div>
      </div>

      {/* Filtros + Total */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-4 lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <Label htmlFor="desp-mes">Mês</Label>
            <Input
              id="desp-mes"
              type="month"
              value={mesFilter === 'all' ? '' : mesFilter}
              onChange={(e) => setMesFilter(e.target.value || 'all')}
            />
          </div>
          <div>
            <Label htmlFor="desp-cat">Categoria</Label>
            <Select
              id="desp-cat"
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
            >
              <option value="all">Todas as categorias</option>
              {CATEGORIAS_DESPESA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-center bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/70 dark:border-rose-900/40">
          <p className="text-xs font-semibold text-rose-600 dark:text-rose-400">
            Total de despesas no período
          </p>
          <p className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalFiltrado)}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">{filtered.length} lançamento(s)</p>
        </Card>
      </div>

      {/* Resumo por categoria */}
      {porCategoria.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {porCategoria.map(([cat, total]) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoriaFilter(categoriaFilter === cat ? 'all' : cat)}
              className={`px-3 py-1.5 rounded-2xl text-xs font-semibold border transition cursor-pointer ${
                categoriaFilter === cat
                  ? 'bg-[#9B7BC7] text-white border-[#9B7BC7]'
                  : 'bg-white dark:bg-[#1E1B29] border-[#ECE8F6] dark:border-[#2E2940] hover:border-[#9B7BC7]'
              }`}
            >
              {cat}: <strong>{formatCurrency(total)}</strong>
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {isLoading ? (
        <Skeleton className="h-64" />
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt className="w-7 h-7" />}
            title="Nenhuma despesa neste período"
            description="Registre abastecimentos, pedágios ou gere suas despesas recorrentes."
            action={
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Lançar despesa
              </Button>
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-[#F3EFFA] dark:divide-[#282338]">
            {filtered.map((d) => (
              <div
                key={d.id}
                className="p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 hover:bg-[#FAF8FE] dark:hover:bg-[#241F33] transition"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm">{d.descricao}</span>
                    <Badge variant="purple">{d.categoria}</Badge>
                    {d.recorrente && <Badge variant="success">Recorrente</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateBR(d.data)}
                    {d.clinica_id && clinicaMap.get(d.clinica_id)
                      ? ` • Rateio: ${clinicaMap.get(d.clinica_id)}`
                      : ''}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-base font-extrabold text-rose-500 whitespace-nowrap">
                    -{formatCurrency(d.valor)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-rose-500"
                      onClick={() => {
                        if (confirm('Excluir esta despesa?')) deleteDespesa.mutate(d.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Nova / Editar Despesa */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar despesa' : 'Nova despesa'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="d-data">Data *</Label>
              <Input
                id="d-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="d-val">Valor (R$) *</Label>
              <Input
                id="d-val"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="d-cat">Categoria *</Label>
            <Select id="d-cat" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS_DESPESA.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label htmlFor="d-desc">Descrição</Label>
            <Input
              id="d-desc"
              placeholder="Ex: Posto Shell, Pedágio Imigrantes..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="d-cli">Clínica (opcional — para rateio por clínica)</Label>
            <Select id="d-cli" value={clinicaId} onChange={(e) => setClinicaId(e.target.value)}>
              <option value="">Despesa geral (sem clínica específica)</option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>

          <Switch
            checked={recorrente}
            onCheckedChange={setRecorrente}
            label="Despesa fixa recorrente (mensal)"
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createDespesa.isPending || updateDespesa.isPending}>
              {editing ? 'Salvar' : 'Registrar despesa'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
