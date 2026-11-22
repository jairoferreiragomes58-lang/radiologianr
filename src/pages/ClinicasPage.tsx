import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Building2,
  Calculator,
  ChevronRight,
  Edit2,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import {
  useAtendimentos,
  useClinicas,
  useCreateClinica,
  useDeleteClinica,
  useUpdateClinica,
} from '@/hooks/useData'
import { toast } from 'sonner'
import { MapaEnderecoModal } from '@/components/clinicas/MapaEnderecoModal'
import {
  calculateRouteDistanceKm,
  getSavedOrigin,
  type GeoPoint,
} from '@/lib/geocoding'
import { formatCurrency, formatNumber, getGoogleMapsUrl, getWhatsAppUrl } from '@/lib/utils'
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Skeleton, Textarea } from '@/components/ui'
import type { Clinica } from '@/types'

const clinicaSchema = z.object({
  nome: z.string().min(2, 'Informe o nome da clínica'),
  responsavel: z.string(),
  telefone: z.string(),
  endereco: z.string(),
  distancia_km: z.number().min(0, 'Distância não pode ser negativa'),
  pedagio_padrao: z.number().min(0, 'Pedágio não pode ser negativo'),
  observacoes: z.string(),
})

type ClinicaForm = z.infer<typeof clinicaSchema>

export function ClinicasPage() {
  const navigate = useNavigate()
  const { data: clinicas = [], isLoading } = useClinicas()
  const { data: atendimentos = [] } = useAtendimentos()
  const createClinica = useCreateClinica()
  const updateClinica = useUpdateClinica()
  const deleteClinica = useDeleteClinica()

  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [mapModalOpen, setMapModalOpen] = useState(false)
  const [editing, setEditing] = useState<Clinica | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ClinicaForm>({
    resolver: zodResolver(clinicaSchema),
    defaultValues: {
      nome: '',
      responsavel: '',
      telefone: '',
      endereco: '',
      distancia_km: 0,
      pedagio_padrao: 0,
      observacoes: '',
    },
  })

  const openCreate = () => {
    setEditing(null)
    reset({
      nome: '',
      responsavel: '',
      telefone: '',
      endereco: '',
      distancia_km: 0,
      pedagio_padrao: 0,
      observacoes: '',
    })
    setModalOpen(true)
  }

  const openEdit = (c: Clinica, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditing(c)
    reset({
      nome: c.nome,
      responsavel: c.responsavel,
      telefone: c.telefone,
      endereco: c.endereco,
      distancia_km: c.distancia_km,
      pedagio_padrao: c.pedagio_padrao,
      observacoes: c.observacoes,
    })
    setModalOpen(true)
  }

  const handleMapAddressConfirm = async (point: GeoPoint) => {
    setValue('endereco', point.label, { shouldDirty: true, shouldValidate: true })

    // Se já houver uma origem salva no simulador e a distância estiver zerada, calcula e preenche automaticamente
    const currentKm = Number(getValues('distancia_km')) || 0
    const savedOrigin = getSavedOrigin()
    if (savedOrigin && currentKm === 0) {
      const km = await calculateRouteDistanceKm(savedOrigin, point)
      setValue('distancia_km', km, { shouldDirty: true })
      toast.success(`Endereço e distância (${formatNumber(km, 1)} km) preenchidos pelo mapa!`)
    } else {
      toast.success('Endereço preenchido pelo mapa!')
    }
  }

  const onSubmit = (data: ClinicaForm) => {
    if (editing) {
      updateClinica.mutate(
        { id: editing.id, patch: data },
        { onSuccess: () => setModalOpen(false) }
      )
    } else {
      createClinica.mutate(
        { ...data, ativo: true },
        { onSuccess: () => setModalOpen(false) }
      )
    }
  }

  const statsByClinica = useMemo(() => {
    const map = new Map<string, { faturado: number; aReceber: number; count: number }>()
    for (const a of atendimentos) {
      if (!a.clinica_id) continue
      const cur = map.get(a.clinica_id) ?? { faturado: 0, aReceber: 0, count: 0 }
      cur.faturado += a.total
      if (a.status_pagamento === 'nao_pago') cur.aReceber += a.total
      cur.count += 1
      map.set(a.clinica_id, cur)
    }
    return map
  }, [atendimentos])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return clinicas
    return clinicas.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.responsavel.toLowerCase().includes(q) ||
        c.endereco.toLowerCase().includes(q)
    )
  }, [clinicas, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A3C3F] dark:text-white">Clínicas</h1>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Nova clínica
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <Input
          placeholder="Buscar por nome, responsável ou endereço..."
          className="pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Building2 className="w-7 h-7" />}
            title="Nenhuma clínica encontrada"
            description="Cadastre sua primeira clínica parceira para acompanhar atendimentos, rotas e lucratividade."
            action={
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4" />
                Cadastrar clínica
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((c) => {
            const st = statsByClinica.get(c.id) ?? { faturado: 0, aReceber: 0, count: 0 }
            return (
              <Card
                key={c.id}
                onClick={() => navigate(`/clinicas/${c.id}`)}
                className="p-5 hover:border-[#9B7BC7]/60 transition cursor-pointer flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-[#3A3C3F] dark:text-white truncate">
                        {c.nome}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">
                        {c.responsavel || 'Responsável não informado'}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                  </div>

                  {c.endereco && (
                    <p className="text-xs text-gray-500 flex items-start gap-1.5 line-clamp-2">
                      <MapPin className="w-3.5 h-3.5 text-[#9B7BC7] shrink-0 mt-0.5" />
                      <span>{c.endereco}</span>
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="purple">{formatNumber(c.distancia_km, 1)} km (ida)</Badge>
                    {c.pedagio_padrao > 0 && (
                      <Badge variant="default">Pedágio {formatCurrency(c.pedagio_padrao)}</Badge>
                    )}
                    {st.aReceber > 0 && (
                      <Badge variant="warning">A receber {formatCurrency(st.aReceber)}</Badge>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#F2EEF9] dark:border-[#2E2940] flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-gray-500">Faturado total</p>
                    <p className="text-sm font-extrabold text-[#4B4D50] dark:text-white">
                      {formatCurrency(st.faturado)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    {c.telefone && (
                      <a
                        href={getWhatsAppUrl(c.telefone, `Olá ${c.responsavel || ''}, aqui é a Nathalia da Radiologia NR!`)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="WhatsApp"
                        className="w-9 h-9 rounded-xl bg-[#E6F7EF] text-[#2E855B] hover:bg-[#D2F0E2] flex items-center justify-center transition"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                    )}
                    {c.endereco && (
                      <a
                        href={getGoogleMapsUrl(c.endereco)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Abrir rota no Google Maps"
                        className="w-9 h-9 rounded-xl bg-[#EDE7F6] text-[#7F5DB0] hover:bg-[#DFD5F2] flex items-center justify-center transition"
                      >
                        <Navigation className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => navigate(`/simulador?clinicaId=${c.id}`)}
                      aria-label="Simular deslocamento"
                      className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#282438] text-gray-600 dark:text-gray-300 hover:bg-[#EDE7F6] hover:text-[#7F5DB0] flex items-center justify-center transition cursor-pointer"
                    >
                      <Calculator className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => openEdit(c, e)}
                      aria-label="Editar clínica"
                      className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-[#282438] text-gray-600 dark:text-gray-300 hover:bg-gray-200 flex items-center justify-center transition cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Excluir a clínica "${c.nome}"?`)) {
                          deleteClinica.mutate(c.id)
                        }
                      }}
                      aria-label="Excluir clínica"
                      className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/30 text-rose-500 hover:bg-rose-100 flex items-center justify-center transition cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar clínica' : 'Nova clínica'}
        subtitle="Preencha os dados de contato e deslocamento padrão"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="cli-nome">Nome da clínica *</Label>
            <Input id="cli-nome" placeholder="Ex: Clínica Vet Vida" {...register('nome')} />
            {errors.nome && <p className="text-xs text-rose-500 mt-1">{errors.nome.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cli-resp">Responsável / Veterinário(a)</Label>
              <Input id="cli-resp" placeholder="Ex: Dra. Camila" {...register('responsavel')} />
            </div>
            <div>
              <Label htmlFor="cli-tel">Telefone / WhatsApp</Label>
              <Input id="cli-tel" placeholder="11999999999" {...register('telefone')} />
            </div>
          </div>

          <div>
            <Label htmlFor="cli-end">Endereço completo</Label>
            <div className="flex gap-2">
              <Input
                id="cli-end"
                placeholder="Rua, número, bairro, cidade - UF"
                {...register('endereco')}
              />
              <Button
                variant="secondary"
                onClick={() => setMapModalOpen(true)}
                title="Pesquisar localização no mapa"
                className="shrink-0"
              >
                <MapPin className="w-4 h-4" />
                <span className="hidden sm:inline">Buscar no mapa</span>
                <span className="sm:hidden">Mapa</span>
              </Button>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              Use &ldquo;Buscar no mapa&rdquo; para validar o endereço e garantir a rota correta no Simulador.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cli-km">Distância padrão (km só ida)</Label>
              <Input
                id="cli-km"
                type="number"
                step="0.1"
                {...register('distancia_km', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="cli-ped">Pedágio padrão (R$ ida+volta)</Label>
              <Input
                id="cli-ped"
                type="number"
                step="0.01"
                {...register('pedagio_padrao', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cli-obs">Observações</Label>
            <Textarea
              id="cli-obs"
              placeholder="Horários, estacionamento, dia de fechamento..."
              {...register('observacoes')}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createClinica.isPending || updateClinica.isPending}>
              {editing ? 'Salvar alterações' : 'Cadastrar clínica'}
            </Button>
          </div>
        </form>
      </Modal>

      <MapaEnderecoModal
        open={mapModalOpen}
        initialQuery={getValues('endereco') || ''}
        onClose={() => setMapModalOpen(false)}
        onConfirm={(pt) => void handleMapAddressConfirm(pt)}
      />
    </div>
  )
}
