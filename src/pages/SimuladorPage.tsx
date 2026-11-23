import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Fuel,
  History,
  Save,
  Sparkles,
  Trash2,
  TrendingDown,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  useClinicas,
  useCreateSimulacao,
  useDeleteSimulacao,
  useProfile,
  useSimulacoes,
  useUpsertTabelaPrecoClinica,
  useVeiculo,
} from '@/hooks/useData'
import { formatCurrency, formatDateBR, formatNumber } from '@/lib/utils'
import { Badge, Button, Card, Input, Label, Select, Switch } from '@/components/ui'
import { SimuladorMapa } from '@/components/simulador/SimuladorMapa'

type PerfilViagem = 'cidade' | 'estrada' | 'misto'

export function SimuladorPage() {
  const [searchParams] = useSearchParams()
  const { data: clinicas = [] } = useClinicas()
  const { data: veiculo } = useVeiculo()
  const { data: profile } = useProfile()
  const { data: simulacoes = [] } = useSimulacoes()

  const createSimulacao = useCreateSimulacao()
  const deleteSimulacao = useDeleteSimulacao()
  const upsertPrecoClinica = useUpsertTabelaPrecoClinica()

  const [clinicaId, setClinicaId] = useState('')
  const [kmIda, setKmIda] = useState('15')
  const [idaVolta, setIdaVolta] = useState(true)
  const [perfil, setPerfil] = useState<PerfilViagem>('cidade')
  const [precoCombustivel, setPrecoCombustivel] = useState('6.00')
  const [consumo, setConsumo] = useState('10')
  const [pedagio, setPedagio] = useState('0')
  const [desgasteKm, setDesgasteKm] = useState('0.30')
  const [extras, setExtras] = useState('0')
  const [nExames, setNExames] = useState('3')
  const [margem, setMargem] = useState('35')
  const [valorTabela, setValorTabela] = useState('47')

  // Carrega defaults do carro cadastrado
  useEffect(() => {
    if (veiculo) {
      setPrecoCombustivel(String(veiculo.preco_combustivel || 6))
      setDesgasteKm(String(veiculo.desgaste_por_km ?? 0.3))
      if (perfil === 'cidade') setConsumo(String(veiculo.consumo_cidade || 10))
      else if (perfil === 'estrada') setConsumo(String(veiculo.consumo_estrada || 13))
      else {
        const misto = ((veiculo.consumo_cidade || 10) + (veiculo.consumo_estrada || 13)) / 2
        setConsumo(misto.toFixed(1))
      }
    }
  }, [veiculo, perfil])

  useEffect(() => {
    if (profile?.margem_padrao) {
      setMargem(String(profile.margem_padrao))
    }
  }, [profile])

  // Pré-seleciona clínica se vier por URL (?clinicaId=...)
  useEffect(() => {
    const paramId = searchParams.get('clinicaId')
    if (paramId && clinicas.length > 0) {
      handleSelectClinica(paramId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, clinicas])

  const selectedClinica = clinicas.find((c) => c.id === clinicaId)

  const handleSelectClinica = (id: string) => {
    setClinicaId(id)
    const found = clinicas.find((c) => c.id === id)
    if (found) {
      setKmIda(String(found.distancia_km))
      setPedagio(String(found.pedagio_padrao))
    }
  }

  // Cálculos do Simulador
  const calc = useMemo(() => {
    const km = Math.max(0, Number(kmIda) || 0)
    const kmTotal = idaVolta ? km * 2 : km
    const cons = Math.max(1, Number(consumo) || 10)
    const precoL = Math.max(0, Number(precoCombustivel) || 0)
    const ped = Math.max(0, Number(pedagio) || 0)
    const desg = Math.max(0, Number(desgasteKm) || 0)
    const ext = Math.max(0, Number(extras) || 0)
    const exames = Math.max(1, Math.floor(Number(nExames) || 1))
    const marg = Math.max(0, Math.min(95, Number(margem) || 0))
    const valTab = Math.max(0, Number(valorTabela) || 0)

    const litros = kmTotal / cons
    const custoCombustivel = litros * precoL
    const custoDesgaste = kmTotal * desg
    const custoTotal = custoCombustivel + ped + custoDesgaste + ext
    const custoPorExame = custoTotal / exames

    // Valor mínimo por exame para não ter prejuízo considerando o deslocamento
    const valorMinimoPorExame = custoPorExame
    // Valor sugerido com a margem desejada sobre o preço de tabela + custo deslocamento por exame
    const valorSugerido = (valTab + custoPorExame) / (1 - marg / 100)
    // Taxa de deslocamento sugerida para cobrar separado (custo total + margem)
    const taxaDeslocamentoSugerida = custoTotal * (1 + marg / 100)

    // Receita e lucro se cobrar o valor atual da tabela
    const receitaVisita = valTab * exames
    const lucroEstimado = receitaVisita - custoTotal
    const margemReal = receitaVisita > 0 ? (lucroEstimado / receitaVisita) * 100 : -100
    const pontoEquilibrio = valTab > 0 ? Math.ceil(custoTotal / valTab) : 0

    let semaforo: 'verde' | 'amarelo' | 'vermelho' = 'verde'
    if (lucroEstimado <= 0) semaforo = 'vermelho'
    else if (margemReal < marg * 0.7) semaforo = 'amarelo'

    return {
      kmTotal,
      litros,
      custoCombustivel,
      custoDesgaste,
      custoTotal,
      custoPorExame,
      valorMinimoPorExame,
      valorSugerido,
      taxaDeslocamentoSugerida,
      receitaVisita,
      lucroEstimado,
      margemReal,
      pontoEquilibrio,
      semaforo,
    }
  }, [kmIda, idaVolta, consumo, precoCombustivel, pedagio, desgasteKm, extras, nExames, margem, valorTabela])

  const handleSalvarSimulacao = () => {
    createSimulacao.mutate({
      clinica_id: clinicaId || null,
      clinica_nome: selectedClinica?.nome || 'Simulação avulsa',
      km: Number(kmIda) || 0,
      ida_volta: idaVolta,
      preco_combustivel: Number(precoCombustivel) || 0,
      consumo: Number(consumo) || 10,
      pedagio: Number(pedagio) || 0,
      desgaste_km: Number(desgasteKm) || 0,
      extras: Number(extras) || 0,
      n_exames: Math.max(1, Number(nExames) || 1),
      margem: Number(margem) || 0,
      custo_total: Number(calc.custoTotal.toFixed(2)),
      custo_por_exame: Number(calc.custoPorExame.toFixed(2)),
      valor_sugerido: Number(calc.valorSugerido.toFixed(2)),
    })
  }

  const handleAplicarPrecoClinica = () => {
    if (!clinicaId || !selectedClinica) {
      toast.error('Selecione uma clínica primeiro para aplicar o preço sugerido.')
      return
    }
    const codigo = prompt(
      `Qual código/nome deseja salvar na tabela da ${selectedClinica.nome} com o valor sugerido de ${formatCurrency(calc.valorSugerido)}?`,
      'Padrão Simulado'
    )
    if (!codigo?.trim()) return
    upsertPrecoClinica.mutate({
      clinica_id: clinicaId,
      codigo: codigo.trim(),
      valor: Number(calc.valorSugerido.toFixed(2)),
    })
  }

  const semaforoStyles = {
    verde: {
      bg: 'bg-[#E6F7EF] dark:bg-[#193528] border-[#6CC59A]',
      text: 'text-[#1E6E47] dark:text-[#84E1B3]',
      icon: CheckCircle2,
      title: 'Visita lucrativa!',
      desc: 'O valor cobrado cobre o deslocamento e mantém uma margem saudável.',
    },
    amarelo: {
      bg: 'bg-amber-50 dark:bg-amber-950/30 border-amber-400',
      text: 'text-amber-700 dark:text-amber-300',
      icon: AlertTriangle,
      title: 'Margem baixa',
      desc: 'Cobre os custos, mas fica abaixo da margem desejada. Considere cobrar taxa de deslocamento.',
    },
    vermelho: {
      bg: 'bg-rose-50 dark:bg-rose-950/30 border-rose-400',
      text: 'text-rose-700 dark:text-rose-300',
      icon: TrendingDown,
      title: 'Atenção: Prejuízo!',
      desc: 'O custo da viagem supera o faturamento previsto. Aumente o valor ou exija mais exames na visita.',
    },
  }[calc.semaforo]

  const SemaforoIcon = semaforoStyles.icon

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A3C3F] dark:text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-[#9B7BC7]" />
            Simulador
          </h1>
        </div>
        {veiculo?.modelo && (
          <Badge variant="purple">
            Carro: {veiculo.modelo} {veiculo.ano || ''}
          </Badge>
        )}
      </div>

      {/* Mapa Interativo com busca por CEP, endereço, GPS e clique no mapa */}
      <SimuladorMapa
        origemInicial={profile?.endereco_base || ''}
        destinoInicial={selectedClinica?.endereco || ''}
        onDistanceCalculated={(km) => setKmIda(String(km))}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Entradas */}
        <Card className="p-5 lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-base">Parâmetros da visita</h2>
            <span className="text-[11px] text-gray-400">Editável manualmente</span>
          </div>

          <div>
            <Label htmlFor="sim-cli">Clínica (preenche km e pedágio)</Label>
            <Select
              id="sim-cli"
              value={clinicaId}
              onChange={(e) => handleSelectClinica(e.target.value)}
            >
              <option value="">Digitar manualmente</option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome} ({c.distancia_km} km)
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label htmlFor="sim-km">Distância só ida (km)</Label>
              <Input
                id="sim-km"
                type="number"
                step="0.5"
                value={kmIda}
                onChange={(e) => setKmIda(e.target.value)}
              />
            </div>
            <div className="pb-2">
              <Switch checked={idaVolta} onCheckedChange={setIdaVolta} label="Ida e volta" />
            </div>
          </div>

          {/* Perfil do trajeto */}
          <div>
            <Label>Perfil da viagem (puxa do Meu Carro)</Label>
            <div className="grid grid-cols-3 gap-2">
              {(['cidade', 'misto', 'estrada'] as PerfilViagem[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPerfil(p)}
                  className={`py-2 rounded-xl text-xs font-bold capitalize border transition cursor-pointer ${
                    perfil === p
                      ? 'bg-[#9B7BC7] text-white border-[#9B7BC7]'
                      : 'bg-white dark:bg-[#161320] border-[#E4DFF0] dark:border-[#342E49]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sim-comb">Combustível (R$/L)</Label>
              <Input
                id="sim-comb"
                type="number"
                step="0.01"
                value={precoCombustivel}
                onChange={(e) => setPrecoCombustivel(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sim-cons">Consumo médio (km/L)</Label>
              <Input
                id="sim-cons"
                type="number"
                step="0.1"
                value={consumo}
                onChange={(e) => setConsumo(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sim-ped">Pedágio total (R$)</Label>
              <Input
                id="sim-ped"
                type="number"
                step="0.1"
                value={pedagio}
                onChange={(e) => setPedagio(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sim-desg">Desgaste carro (R$/km)</Label>
              <Input
                id="sim-desg"
                type="number"
                step="0.05"
                value={desgasteKm}
                onChange={(e) => setDesgasteKm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sim-ext">Custos extras (estac. R$)</Label>
              <Input
                id="sim-ext"
                type="number"
                step="1"
                value={extras}
                onChange={(e) => setExtras(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sim-nex">Nº de exames na visita</Label>
              <Input
                id="sim-nex"
                type="number"
                min="1"
                value={nExames}
                onChange={(e) => setNExames(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sim-tab">Valor do exame hoje (R$)</Label>
              <Input
                id="sim-tab"
                type="number"
                step="1"
                value={valorTabela}
                onChange={(e) => setValorTabela(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="sim-marg">Margem desejada (%)</Label>
              <Input
                id="sim-marg"
                type="number"
                step="1"
                value={margem}
                onChange={(e) => setMargem(e.target.value)}
              />
            </div>
          </div>
        </Card>

        {/* Resultados + Semáforo */}
        <div className="lg:col-span-7 space-y-4">
          {/* Card Semáforo */}
          <div className={`p-5 rounded-[22px] border-2 flex items-center gap-4 ${semaforoStyles.bg}`}>
            <SemaforoIcon className={`w-8 h-8 shrink-0 ${semaforoStyles.text}`} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className={`text-lg font-extrabold ${semaforoStyles.text}`}>
                  {semaforoStyles.title}
                </h2>
                <span className={`text-xl font-extrabold ${semaforoStyles.text}`}>
                  Lucro est.: {formatCurrency(calc.lucroEstimado)}
                </span>
              </div>
            </div>
          </div>

          {/* Cards de Precificação Sugerida */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="p-4 border-[#9B7BC7]/40 bg-[#F8F4FD] dark:bg-[#251E38]">
              <p className="text-xs font-semibold text-[#7F5DB0] dark:text-[#D5C2F5]">
                Valor sugerido p/ exame
              </p>
              <p className="text-2xl font-extrabold text-[#5A3E8C] dark:text-white mt-1">
                {formatCurrency(calc.valorSugerido)}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Com {margem}% de margem
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-xs font-semibold text-gray-500">
                Taxa deslocamento (separada)
              </p>
              <p className="text-2xl font-extrabold text-[#4EA87E] mt-1">
                {formatCurrency(calc.taxaDeslocamentoSugerida)}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Para cobrar à parte da clínica
              </p>
            </Card>

            <Card className="p-4">
              <p className="text-xs font-semibold text-gray-500">
                Custo desloc. / exame
              </p>
              <p className="text-2xl font-extrabold text-[#3A3C3F] dark:text-white mt-1">
                {formatCurrency(calc.custoPorExame)}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Mínimo p/ não ter prejuízo
              </p>
            </Card>
          </div>

          {/* Detalhamento dos Custos da Viagem */}
          <Card className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Fuel className="w-4 h-4 text-[#9B7BC7]" />
                Detalhamento da viagem ({formatNumber(calc.kmTotal, 1)} km totais)
              </h3>
              <span className="text-base font-extrabold text-rose-500">
                Custo total: {formatCurrency(calc.custoTotal)}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320]">
                <p className="text-gray-500">Combustível</p>
                <p className="font-extrabold text-sm mt-0.5">
                  {formatCurrency(calc.custoCombustivel)}
                </p>
                <p className="text-[11px] text-gray-400">{formatNumber(calc.litros, 1)} litros</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320]">
                <p className="text-gray-500">Desgaste carro</p>
                <p className="font-extrabold text-sm mt-0.5">
                  {formatCurrency(calc.custoDesgaste)}
                </p>
                <p className="text-[11px] text-gray-400">R$ {desgasteKm}/km</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320]">
                <p className="text-gray-500">Pedágio</p>
                <p className="font-extrabold text-sm mt-0.5">
                  {formatCurrency(Number(pedagio) || 0)}
                </p>
                <p className="text-[11px] text-gray-400">Ida + volta</p>
              </div>
              <div className="p-3 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320]">
                <p className="text-gray-500">Extras</p>
                <p className="font-extrabold text-sm mt-0.5">
                  {formatCurrency(Number(extras) || 0)}
                </p>
                <p className="text-[11px] text-gray-400">Estacionamento etc.</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={handleSalvarSimulacao} disabled={createSimulacao.isPending}>
                <Save className="w-4 h-4" />
                Salvar simulação
              </Button>
              <Button
                variant="success"
                onClick={handleAplicarPrecoClinica}
                disabled={!clinicaId}
              >
                <Sparkles className="w-4 h-4" />
                Aplicar como preço desta clínica
              </Button>
            </div>
          </Card>

          {/* Histórico de Simulações */}
          <Card className="p-5">
            <h3 className="font-bold text-sm flex items-center gap-2 mb-3">
              <History className="w-4 h-4 text-[#9B7BC7]" />
              Histórico de simulações salvas
            </h3>
            {simulacoes.length === 0 ? (
              <p className="text-xs text-gray-500 py-4 text-center">
                Nenhuma simulação salva ainda.
              </p>
            ) : (
              <div className="divide-y divide-[#F3EFFA] dark:divide-[#282338]">
                {simulacoes.map((s) => (
                  <div
                    key={s.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="font-bold text-sm">{s.clinica_nome}</p>
                      <p className="text-gray-500">
                        {formatDateBR(s.created_at)} • {s.km} km ({s.ida_volta ? 'ida/volta' : 'só ida'}) •{' '}
                        {s.n_exames} exame(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-gray-500">
                          Custo: <strong>{formatCurrency(s.custo_total)}</strong>
                        </p>
                        <p className="text-[#9B7BC7] font-extrabold">
                          Sugerido: {formatCurrency(s.valor_sugerido)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-rose-500"
                        onClick={() => deleteSimulacao.mutate(s.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
