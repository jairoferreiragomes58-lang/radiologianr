import { useEffect, useRef, useState } from 'react'
import { PartyPopper } from 'lucide-react'
import { usePagarParcelaMes } from '@/hooks/useData'
import { formatCurrency, getMonthKey, getMonthRefDate } from '@/lib/utils'
import type { Meta, ParcelaMaquina, Profile } from '@/types'

interface MaquinaRaioXCardProps {
  profile: Profile
  metas: Meta[]
  parcelas: ParcelaMaquina[]
  faturadoMesAtual: number
}

export function MaquinaRaioXCard({
  profile,
  metas,
  parcelas,
  faturadoMesAtual,
}: MaquinaRaioXCardProps) {
  const pagarParcela = usePagarParcelaMes()
  const triggeredMonthRef = useRef<string | null>(null)
  const [activeMetaId, setActiveMetaId] = useState<string>('')

  const mesKey = getMonthKey()
  const mesRef = getMonthRefDate(mesKey)
  const parcelaPagaEsteMes = parcelas.some(
    (p) => p.mes_referencia === mesRef && p.paga
  )

  const principalMeta = metas.find((m) => m.principal) || metas[0]
  const activeMeta = metas.find((m) => m.id === activeMetaId) || principalMeta

  const titulo = activeMeta?.titulo || 'Aparelho de Raio X'
  const isPrincipal = !activeMeta || activeMeta.principal
  const valorParcela = isPrincipal
    ? profile.parcela_maquina || activeMeta?.valor_parcela || 0
    : activeMeta.valor_parcela || 0
  const parcelasRestantes = isPrincipal
    ? profile.parcelas_restantes
    : activeMeta.parcelas_restantes
  const diaVencimento = isPrincipal
    ? profile.dia_vencimento_parcela
    : activeMeta.dia_vencimento

  const totalRestante = valorParcela * parcelasRestantes
  const quitada = parcelasRestantes <= 0

  const progresso =
    valorParcela > 0
      ? Math.min(100, Math.round((faturadoMesAtual / valorParcela) * 100))
      : 100
  const diferenca = faturadoMesAtual - valorParcela
  const metaBatida = valorParcela > 0 && faturadoMesAtual >= valorParcela

  // Desconta automaticamente 1 parcela da meta principal quando o faturamento do mês atinge o valor
  const principalValor = profile.parcela_maquina || 0
  const principalBatida = principalValor > 0 && faturadoMesAtual >= principalValor

  useEffect(() => {
    if (
      profile.parcelas_restantes > 0 &&
      principalBatida &&
      !parcelaPagaEsteMes &&
      !pagarParcela.isPending &&
      triggeredMonthRef.current !== mesRef
    ) {
      triggeredMonthRef.current = mesRef
      pagarParcela.mutate(mesRef)
    }
  }, [profile.parcelas_restantes, principalBatida, parcelaPagaEsteMes, pagarParcela, mesRef])

  const cobertaEsteMes = metaBatida || (isPrincipal && parcelaPagaEsteMes)

  return (
    <div className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#8B68BE] via-[#9B7BC7] to-[#7456A6] text-white p-5 sm:p-6 shadow-[0_14px_34px_-12px_rgba(123,89,176,0.55)]">
      {/* Detalhe decorativo suave */}
      <div className="pointer-events-none absolute -right-10 -top-10 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -left-8 -bottom-12 w-40 h-40 rounded-full bg-[#6CC59A]/25 blur-2xl" />

      <div className="relative z-10 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
              {titulo}
            </p>
            <h2 className="text-lg sm:text-xl font-extrabold leading-tight flex items-center gap-2 mt-0.5">
              {quitada ? (
                <>
                  <PartyPopper className="w-5 h-5 text-[#9CF2C7]" />
                  Meta concluída 🎉
                </>
              ) : (
                `Faltam ${parcelasRestantes} ${parcelasRestantes === 1 ? 'parcela' : 'parcelas'}`
              )}
            </h2>
          </div>

          {/* Seletor de metas quando houver mais de 1 meta criada */}
          {metas.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {metas.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveMetaId(m.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                    activeMeta?.id === m.id
                      ? 'bg-white text-[#7456A6] shadow-sm'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  {m.titulo}
                </button>
              ))}
            </div>
          )}
        </div>

        {quitada ? (
          <div className="p-4 rounded-2xl bg-white/15 backdrop-blur-sm">
            <p className="text-sm font-semibold">
              Parabéns, Nathalia! Todas as parcelas de <strong>{titulo}</strong> foram quitadas.
            </p>
          </div>
        ) : (
          <>
            {/* Valores principais */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-white/12 backdrop-blur-sm">
                <p className="text-[11px] text-white/75">Valor mensal</p>
                <p className="text-base sm:text-lg font-extrabold">
                  {formatCurrency(valorParcela)}
                </p>
                <p className="text-[10px] text-white/70">Venc. dia {diaVencimento}</p>
              </div>
              <div className="p-3 rounded-2xl bg-white/12 backdrop-blur-sm">
                <p className="text-[11px] text-white/75">Faturado no mês</p>
                <p className="text-base sm:text-lg font-extrabold text-[#B8F7D8]">
                  {formatCurrency(faturadoMesAtual)}
                </p>
                <p className="text-[10px] text-white/70">Atualizado em tempo real</p>
              </div>
              <div className="col-span-2 sm:col-span-1 p-3 rounded-2xl bg-white/12 backdrop-blur-sm">
                <p className="text-[11px] text-white/75">Total restante</p>
                <p className="text-base sm:text-lg font-extrabold">
                  {formatCurrency(totalRestante)}
                </p>
                <p className="text-[10px] text-white/70">
                  {parcelasRestantes}x de {formatCurrency(valorParcela)}
                </p>
              </div>
            </div>

            {/* Barra de progresso do mês (só zera no próximo mês) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold gap-2">
                <span>
                  {cobertaEsteMes ? (
                    <>
                      Parabéns! Meta do mês coberta 🎉
                      {diferenca > 0 ? ` (+${formatCurrency(diferenca)} de sobra)` : ''}
                    </>
                  ) : (
                    <>Faltam {formatCurrency(Math.abs(diferenca))} para bater a meta do mês</>
                  )}
                </span>
                <span className="font-extrabold shrink-0">
                  {cobertaEsteMes ? '100%' : `${progresso}%`}
                </span>
              </div>

              <div className="w-full h-3 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    cobertaEsteMes ? 'bg-[#6CC59A]' : 'bg-white'
                  }`}
                  style={{ width: `${cobertaEsteMes ? 100 : progresso}%` }}
                />
              </div>
            </div>

            {/* Mensagem de parabéns quando bater a meta do mês */}
            {cobertaEsteMes && (
              <div className="p-3.5 rounded-2xl bg-[#6CC59A]/25 border border-[#9CF2C7]/40 flex items-center gap-2.5 text-xs sm:text-sm font-bold text-[#E9FFF3]">
                <PartyPopper className="w-5 h-5 text-[#9CF2C7] shrink-0" />
                <span>
                  Parabéns, Nathalia! Você bateu a meta de {titulo} deste mês! No próximo mês a barra reinicia para a nova parcela.
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
