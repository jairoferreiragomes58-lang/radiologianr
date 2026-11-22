import React, { useEffect, useState } from 'react'
import {
  Plus,
  Save,
  Target,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useCreateMeta,
  useDeleteMeta,
  useMetas,
  useProfile,
  useUpdateMeta,
  useUpdateProfile,
  useUpdateVeiculo,
  useVeiculo,
} from '@/hooks/useData'
import { formatCurrency } from '@/lib/utils'
import { Button, Card, Input, Label, Modal, Select, Skeleton } from '@/components/ui'
import type { TipoCombustivel } from '@/types'

export function AjustesPage() {

  const { data: profile, isLoading: loadingProfile } = useProfile()
  const { data: metas = [], isLoading: loadingMetas } = useMetas()
  const { data: veiculo, isLoading: loadingVeiculo } = useVeiculo()

  const updateProfile = useUpdateProfile()
  const createMeta = useCreateMeta()
  const updateMeta = useUpdateMeta()
  const deleteMeta = useDeleteMeta()
  const updateVeiculo = useUpdateVeiculo()

  // Meta atualmente selecionada para edição
  const [selectedMetaId, setSelectedMetaId] = useState<string>('')
  const [metaTitulo, setMetaTitulo] = useState('Aparelho de Raio X')
  const [parcelaMaquina, setParcelaMaquina] = useState('3700')
  const [parcelasRestantes, setParcelasRestantes] = useState('24')
  const [diaVencimento, setDiaVencimento] = useState('10')
  const [margemPadrao, setMargemPadrao] = useState('35')

  // Modal Nova Meta
  const [novaMetaOpen, setNovaMetaOpen] = useState(false)
  const [nmTitulo, setNmTitulo] = useState('')
  const [nmValor, setNmValor] = useState('')
  const [nmParcelas, setNmParcelas] = useState('1')
  const [nmDia, setNmDia] = useState('10')

  // Meu Carro
  const [modelo, setModelo] = useState('')
  const [ano, setAno] = useState('')
  const [combustivel, setCombustivel] = useState<TipoCombustivel>('flex')
  const [consumoCidade, setConsumoCidade] = useState('10')
  const [consumoEstrada, setConsumoEstrada] = useState('13')
  const [precoCombustivel, setPrecoCombustivel] = useState('6.00')
  const [desgasteKm, setDesgasteKm] = useState('0.30')
  const [custoFixoMensal, setCustoFixoMensal] = useState('0')

  const selectedMeta = metas.find((m) => m.id === selectedMetaId) || metas[0]

  useEffect(() => {
    if (metas.length > 0 && !selectedMetaId) {
      setSelectedMetaId(metas[0].id)
    }
  }, [metas, selectedMetaId])

  useEffect(() => {
    if (selectedMeta) {
      setMetaTitulo(selectedMeta.titulo)
      setParcelaMaquina(String(selectedMeta.valor_parcela))
      setParcelasRestantes(String(selectedMeta.parcelas_restantes))
      setDiaVencimento(String(selectedMeta.dia_vencimento))
    }
  }, [selectedMeta])

  useEffect(() => {
    if (profile) {
      setMargemPadrao(String(profile.margem_padrao))
    }
  }, [profile])

  useEffect(() => {
    if (veiculo) {
      setModelo(veiculo.modelo || '')
      setAno(veiculo.ano ? String(veiculo.ano) : '')
      setCombustivel(veiculo.combustivel || 'flex')
      setConsumoCidade(String(veiculo.consumo_cidade))
      setConsumoEstrada(String(veiculo.consumo_estrada))
      setPrecoCombustivel(String(veiculo.preco_combustivel))
      setDesgasteKm(String(veiculo.desgaste_por_km))
      setCustoFixoMensal(String(veiculo.custo_fixo_mensal))
    }
  }, [veiculo])

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!metaTitulo.trim()) {
      toast.error('Informe o nome da meta.')
      return
    }
    const valorParcela = Math.max(0, Number(parcelaMaquina) || 0)
    const parcelas = Math.max(0, Math.floor(Number(parcelasRestantes) || 0))
    const dia = Math.min(31, Math.max(1, Math.floor(Number(diaVencimento) || 10)))

    if (selectedMeta) {
      await updateMeta.mutateAsync({
        id: selectedMeta.id,
        patch: {
          titulo: metaTitulo.trim(),
          valor_parcela: valorParcela,
          parcelas_restantes: parcelas,
          dia_vencimento: dia,
        },
      })
    }

    // Atualiza margem padrão no perfil se alterada
    if (profile && Number(margemPadrao) !== profile.margem_padrao) {
      await updateProfile.mutateAsync({
        margem_padrao: Math.max(0, Number(margemPadrao) || 0),
      })
    }
  }

  const handleCreateNovaMeta = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nmTitulo.trim()) {
      toast.error('Informe o nome da nova meta (ex: Viagem, Celular novo).')
      return
    }
    createMeta.mutate(
      {
        titulo: nmTitulo.trim(),
        valor_parcela: Math.max(0, Number(nmValor) || 0),
        parcelas_restantes: Math.max(1, Math.floor(Number(nmParcelas) || 1)),
        dia_vencimento: Math.min(31, Math.max(1, Math.floor(Number(nmDia) || 10))),
        principal: false,
      },
      {
        onSuccess: (created) => {
          setSelectedMetaId(created.id)
          setNmTitulo('')
          setNmValor('')
          setNmParcelas('1')
          setNmDia('10')
          setNovaMetaOpen(false)
        },
      }
    )
  }

  const handleDeleteSelectedMeta = () => {
    if (!selectedMeta || selectedMeta.principal) return
    if (!confirm(`Excluir a meta "${selectedMeta.titulo}"?`)) return
    deleteMeta.mutate(selectedMeta.id, {
      onSuccess: () => {
        const next = metas.find((m) => m.id !== selectedMeta.id)
        setSelectedMetaId(next?.id || '')
      },
    })
  }

  const handleSaveVeiculo = (e: React.FormEvent) => {
    e.preventDefault()
    updateVeiculo.mutate({
      modelo: modelo.trim(),
      ano: ano ? Number(ano) : null,
      combustivel,
      consumo_cidade: Math.max(1, Number(consumoCidade) || 10),
      consumo_estrada: Math.max(1, Number(consumoEstrada) || 13),
      preco_combustivel: Math.max(0.1, Number(precoCombustivel) || 6),
      desgaste_por_km: Math.max(0, Number(desgasteKm) || 0),
      custo_fixo_mensal: Math.max(0, Number(custoFixoMensal) || 0),
    })
  }

  if (loadingProfile || loadingVeiculo || loadingMetas) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  const totalRestanteMeta =
    (Number(parcelaMaquina) || 0) * (Number(parcelasRestantes) || 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A3C3F] dark:text-white">Ajustes</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card de Metas */}
        <Card className="p-6">
          <form onSubmit={handleSaveMeta} className="space-y-5">
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F2EEF9] dark:border-[#2E2940]">
              <h2 className="font-bold text-base">Metas</h2>
              <Button size="sm" variant="secondary" onClick={() => setNovaMetaOpen(true)}>
                <Plus className="w-4 h-4" />
                Nova meta
              </Button>
            </div>

            {/* Seletor de metas cadastradas */}
            {metas.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {metas.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMetaId(m.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedMeta?.id === m.id
                        ? 'bg-[#9B7BC7] text-white shadow-sm'
                        : 'bg-[#F6F4FB] dark:bg-[#161320] text-[#4B4D50] dark:text-[#D4CEE5] hover:bg-[#EDE7F6]'
                    }`}
                  >
                    {m.titulo}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="meta-titulo">Nome da meta</Label>
                <div className="relative">
                  <Target className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <Input
                    id="meta-titulo"
                    className="pl-10"
                    placeholder="Ex: Aparelho de Raio X, Viagem, Celular novo..."
                    value={metaTitulo}
                    onChange={(e) => setMetaTitulo(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="parcela-val">Valor mensal / parcela (R$)</Label>
                <Input
                  id="parcela-val"
                  type="number"
                  step="0.01"
                  value={parcelaMaquina}
                  onChange={(e) => setParcelaMaquina(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="parcelas-rest">Parcelas restantes</Label>
                <Input
                  id="parcelas-rest"
                  type="number"
                  min="0"
                  value={parcelasRestantes}
                  onChange={(e) => setParcelasRestantes(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="dia-venc">Dia de vencimento</Label>
                <Input
                  id="dia-venc"
                  type="number"
                  min="1"
                  max="31"
                  value={diaVencimento}
                  onChange={(e) => setDiaVencimento(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="margem-padrao">Margem de lucro padrão (%)</Label>
                <Input
                  id="margem-padrao"
                  type="number"
                  step="1"
                  value={margemPadrao}
                  onChange={(e) => setMargemPadrao(e.target.value)}
                />
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320] flex items-center justify-between text-xs">
              <span className="text-gray-500">Total restante da meta</span>
              <span className="font-extrabold text-[#9B7BC7] text-sm">
                {formatCurrency(totalRestanteMeta)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button type="submit" className="flex-1" disabled={updateMeta.isPending}>
                <Save className="w-4 h-4" />
                Salvar meta
              </Button>
              {selectedMeta && !selectedMeta.principal && (
                <Button
                  type="button"
                  variant="danger"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  aria-label="Excluir meta"
                  onClick={handleDeleteSelectedMeta}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>
        </Card>

        {/* Meu Carro */}
        <Card className="p-6">
          <form onSubmit={handleSaveVeiculo} className="space-y-5">
            <div className="pb-3 border-b border-[#F2EEF9] dark:border-[#2E2940]">
              <h2 className="font-bold text-base">Meu Carro</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="carro-modelo">Modelo do carro</Label>
                <Input
                  id="carro-modelo"
                  placeholder="Ex: HB20, Onix, Tracker..."
                  value={modelo}
                  onChange={(e) => setModelo(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="carro-ano">Ano</Label>
                <Input
                  id="carro-ano"
                  type="number"
                  placeholder="Ex: 2022"
                  value={ano}
                  onChange={(e) => setAno(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="carro-comb">Combustível</Label>
                <Select
                  id="carro-comb"
                  value={combustivel}
                  onChange={(e) => setCombustivel(e.target.value as TipoCombustivel)}
                >
                  <option value="flex">Flex</option>
                  <option value="gasolina">Gasolina</option>
                  <option value="etanol">Etanol</option>
                </Select>
              </div>

              <div>
                <Label htmlFor="carro-preco">Preço combustível (R$/L)</Label>
                <Input
                  id="carro-preco"
                  type="number"
                  step="0.01"
                  value={precoCombustivel}
                  onChange={(e) => setPrecoCombustivel(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="carro-cidade">Consumo cidade (km/L)</Label>
                <Input
                  id="carro-cidade"
                  type="number"
                  step="0.1"
                  value={consumoCidade}
                  onChange={(e) => setConsumoCidade(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="carro-estrada">Consumo estrada (km/L)</Label>
                <Input
                  id="carro-estrada"
                  type="number"
                  step="0.1"
                  value={consumoEstrada}
                  onChange={(e) => setConsumoEstrada(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="carro-desgaste">Desgaste/manutenção (R$/km)</Label>
                <Input
                  id="carro-desgaste"
                  type="number"
                  step="0.01"
                  value={desgasteKm}
                  onChange={(e) => setDesgasteKm(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="carro-fixo">IPVA + Seguro mensal (R$, opcional)</Label>
                <Input
                  id="carro-fixo"
                  type="number"
                  step="0.01"
                  value={custoFixoMensal}
                  onChange={(e) => setCustoFixoMensal(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" variant="success" className="w-full" disabled={updateVeiculo.isPending}>
              <Save className="w-4 h-4" />
              Salvar dados do carro
            </Button>
          </form>
        </Card>
      </div>

      {/* Modal Nova Meta */}
      <Modal
        open={novaMetaOpen}
        onClose={() => setNovaMetaOpen(false)}
        title="Nova meta"
        subtitle="Ex: Viagem, celular novo, curso, equipamento..."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateNovaMeta} className="space-y-4">
          <div>
            <Label htmlFor="nm-tit">Nome da meta *</Label>
            <Input
              id="nm-tit"
              placeholder="Ex: Viagem, iPhone novo..."
              value={nmTitulo}
              onChange={(e) => setNmTitulo(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="nm-val">Valor mensal / parcela (R$) *</Label>
              <Input
                id="nm-val"
                type="number"
                step="0.01"
                placeholder="500,00"
                value={nmValor}
                onChange={(e) => setNmValor(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="nm-parc">Nº de parcelas / meses</Label>
              <Input
                id="nm-parc"
                type="number"
                min="1"
                value={nmParcelas}
                onChange={(e) => setNmParcelas(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="nm-dia">Dia de vencimento</Label>
            <Input
              id="nm-dia"
              type="number"
              min="1"
              max="31"
              value={nmDia}
              onChange={(e) => setNmDia(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setNovaMetaOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createMeta.isPending}>
              Criar meta
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
