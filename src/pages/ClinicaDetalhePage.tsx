import React, { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calculator,
  MapPin,
  MessageCircle,
  Navigation,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react'
import {
  useAtendimentos,
  useClinicas,
  useDeleteTabelaPrecoClinica,
  useDespesas,
  useTabelaPrecosClinica,
  useUpsertTabelaPrecoClinica,
  useVeiculo,
} from '@/hooks/useData'
import {
  formatCurrency,
  formatDateBR,
  formatNumber,
  getMapsLinkProps,
  getWhatsAppUrl,
} from '@/lib/utils'
import { Badge, Button, Card, Input, Label, Skeleton } from '@/components/ui'

export function ClinicaDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: clinicas = [], isLoading } = useClinicas()
  const { data: atendimentos = [] } = useAtendimentos()
  const { data: despesas = [] } = useDespesas()
  const { data: veiculo } = useVeiculo()
  const { data: precosClinica = [] } = useTabelaPrecosClinica(id)
  const upsertPreco = useUpsertTabelaPrecoClinica()
  const deletePreco = useDeleteTabelaPrecoClinica()

  const [novoCodigo, setNovoCodigo] = useState('')
  const [novoValor, setNovoValor] = useState('')

  const clinica = clinicas.find((c) => c.id === id)

  const clinicaAtendimentos = useMemo(
    () => atendimentos.filter((a) => a.clinica_id === id),
    [atendimentos, id]
  )

  const stats = useMemo(() => {
    const faturado = clinicaAtendimentos.reduce((acc, a) => acc + a.total, 0)
    const aReceber = clinicaAtendimentos
      .filter((a) => a.status_pagamento === 'nao_pago')
      .reduce((acc, a) => acc + a.total, 0)
    const despesasDiretas = despesas
      .filter((d) => d.clinica_id === id)
      .reduce((acc, d) => acc + d.valor, 0)

    // Custo médio de deslocamento (ida e volta) baseado no carro cadastrado
    const kmTotal = (clinica?.distancia_km ?? 0) * 2
    const consumo = veiculo?.consumo_cidade || 10
    const precoComb = veiculo?.preco_combustivel || 6
    const desgaste = veiculo?.desgaste_por_km || 0.3
    const custoDeslocamento =
      (kmTotal / consumo) * precoComb + kmTotal * desgaste + (clinica?.pedagio_padrao ?? 0)

    // Estima visitas por datas únicas de atendimento
    const diasVisitados = new Set(clinicaAtendimentos.map((a) => a.data)).size
    const custoDeslocamentoTotal = diasVisitados * custoDeslocamento
    const lucroEstimado = faturado - despesasDiretas - custoDeslocamentoTotal

    return {
      faturado,
      aReceber,
      despesasDiretas,
      custoDeslocamento,
      lucroEstimado,
      diasVisitados,
    }
  }, [clinicaAtendimentos, despesas, clinica, veiculo, id])

  const handleAddPreco = (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || !novoCodigo.trim()) return
    upsertPreco.mutate(
      {
        clinica_id: id,
        codigo: novoCodigo.trim(),
        valor: Math.max(0, Number(novoValor) || 0),
      },
      {
        onSuccess: () => {
          setNovoCodigo('')
          setNovoValor('')
        },
      }
    )
  }

  if (isLoading) return <Skeleton className="h-96" />

  if (!clinica) {
    return (
      <Card className="p-8 text-center">
        <p className="font-bold">Clínica não encontrada.</p>
        <Button className="mt-4" onClick={() => navigate('/clinicas')}>
          Voltar para clínicas
        </Button>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => navigate('/clinicas')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-extrabold text-[#3A3C3F] dark:text-white">
              {clinica.nome}
            </h1>
            <p className="text-sm text-gray-500">
              {clinica.responsavel || 'Sem responsável cadastrado'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {clinica.telefone && (
            <a
              href={getWhatsAppUrl(clinica.telefone, `Olá ${clinica.responsavel || ''}, aqui é a Nathalia da Radiologia NR!`)}
              target="_blank"
              rel="noreferrer"
            >
              <Button variant="success" size="sm">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </a>
          )}
          {clinica.endereco && (
            <a {...getMapsLinkProps(clinica.endereco)}>
              <Button variant="secondary" size="sm">
                <Navigation className="w-4 h-4" />
                Ir (Maps)
              </Button>
            </a>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/simulador?clinicaId=${clinica.id}`)}
          >
            <Calculator className="w-4 h-4" />
            Simular preço
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/atendimentos?novo=1&clinicaId=${clinica.id}`)}
          >
            <Plus className="w-4 h-4" />
            Novo atendimento
          </Button>
        </div>
      </div>

      {/* Resumo Financeiro da Clínica */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4">
          <p className="text-xs text-gray-500">Total faturado</p>
          <p className="text-xl font-extrabold mt-1 text-[#3A3C3F] dark:text-white">
            {formatCurrency(stats.faturado)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {clinicaAtendimentos.length} atendimento(s)
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">A receber</p>
          <p className="text-xl font-extrabold mt-1 text-amber-600 dark:text-amber-400">
            {formatCurrency(stats.aReceber)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">Pendentes de pagamento</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Custo médio deslocamento</p>
          <p className="text-xl font-extrabold mt-1 text-[#9B7BC7]">
            {formatCurrency(stats.custoDeslocamento)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            {formatNumber(clinica.distancia_km * 2, 1)} km ida+volta
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-gray-500">Lucro estimado</p>
          <p
            className={`text-xl font-extrabold mt-1 ${
              stats.lucroEstimado >= 0 ? 'text-[#4EA87E]' : 'text-rose-500'
            }`}
          >
            {formatCurrency(stats.lucroEstimado)}
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Após deslocamentos ({stats.diasVisitados} visita(s))
          </p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info + Tabela de Preços Própria */}
        <div className="space-y-6">
          <Card className="p-5 space-y-3">
            <h2 className="font-bold text-base">Informações</h2>
            <div className="text-sm space-y-2 text-gray-600 dark:text-gray-300">
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#9B7BC7] shrink-0 mt-0.5" />
                <span>{clinica.endereco || 'Endereço não cadastrado'}</span>
              </p>
              <p className="text-xs text-gray-500">
                Distância ida: <strong>{formatNumber(clinica.distancia_km, 1)} km</strong> • Pedágio:{' '}
                <strong>{formatCurrency(clinica.pedagio_padrao)}</strong>
              </p>
              {clinica.observacoes && (
                <p className="text-xs bg-[#F6F4FB] dark:bg-[#161320] p-3 rounded-xl">
                  {clinica.observacoes}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-[#9B7BC7]" />
              <h2 className="font-bold text-base">Preços próprios desta clínica</h2>
            </div>
            <p className="text-xs text-gray-500">
              Sobrescrevem a tabela geral quando você lançar atendimentos para esta clínica.
            </p>

            <form onSubmit={handleAddPreco} className="grid grid-cols-5 gap-2">
              <div className="col-span-2">
                <Label htmlFor="pc-cod">Código</Label>
                <Input
                  id="pc-cod"
                  placeholder="Ex: 210"
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="pc-val">Valor (R$)</Label>
                <Input
                  id="pc-val"
                  type="number"
                  step="0.01"
                  placeholder="55.00"
                  value={novoValor}
                  onChange={(e) => setNovoValor(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" size="icon" className="w-full h-11" aria-label="Adicionar">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </form>

            {precosClinica.length > 0 && (
              <div className="divide-y divide-[#F2EEF9] dark:divide-[#2E2940]">
                {precosClinica.map((p) => (
                  <div key={p.id} className="py-2 flex items-center justify-between text-sm">
                    <span className="font-bold">{p.codigo}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#9B7BC7]">
                        {formatCurrency(p.valor)}
                      </span>
                      <button
                        type="button"
                        onClick={() => deletePreco.mutate(p.id)}
                        className="text-rose-500 hover:bg-rose-50 p-1 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Histórico de Atendimentos */}
        <Card className="p-5 lg:col-span-2">
          <h2 className="font-bold text-base mb-4">Histórico de atendimentos</h2>
          {clinicaAtendimentos.length === 0 ? (
            <p className="text-sm text-gray-500 py-8 text-center">
              Nenhum atendimento registrado para esta clínica ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-[#F2EEF9] dark:border-[#2E2940]">
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 px-3">Paciente / Tutor</th>
                    <th className="py-2 px-3">Especificação</th>
                    <th className="py-2 px-3 text-right">Total</th>
                    <th className="py-2 pl-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F5F2FB] dark:divide-[#282338]">
                  {clinicaAtendimentos.map((a) => (
                    <tr key={a.id}>
                      <td className="py-3 pr-3 whitespace-nowrap">{formatDateBR(a.data)}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold">{a.paciente_nome || '—'}</p>
                        <p className="text-xs text-gray-500">{a.tutor_nome || '—'}</p>
                      </td>
                      <td className="py-3 px-3 text-xs">
                        {a.itens.map((i) => `${i.especificacao || 'Raio X'} (${i.quantidade}x)`).join(', ')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">{formatCurrency(a.total)}</td>
                      <td className="py-3 pl-3 text-right">
                        <Badge variant={a.status_pagamento === 'pago' ? 'success' : 'warning'}>
                          {a.status_pagamento === 'pago' ? 'Pago' : 'Não pago'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
