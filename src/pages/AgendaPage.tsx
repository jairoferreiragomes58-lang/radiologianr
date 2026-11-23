import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FilePlus2,
  MapPin,
  Navigation,
  Plus,
  Route,
  Trash2,
} from 'lucide-react'
import {
  useClinicas,
  useCreateEvento,
  useDeleteEvento,
  useEventos,
  useUpdateEvento,
} from '@/hooks/useData'
import {
  formatDateBR,
  formatMonthYear,
  formatNumber,
  getGoogleMapsRouteUrl,
  getGoogleMapsUrl,
  getTodayISO,
} from '@/lib/utils'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
} from '@/components/ui'
import type { Evento, StatusEvento } from '@/types'

export function AgendaPage() {
  const navigate = useNavigate()
  const { data: eventos = [] } = useEventos()
  const { data: clinicas = [] } = useClinicas()
  const createEvento = useCreateEvento()
  const updateEvento = useUpdateEvento()
  const deleteEvento = useDeleteEvento()

  const [tab, setTab] = useState<'calendario' | 'rota'>('calendario')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState(getTodayISO())

  // Modal de novo/editar evento
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Evento | null>(null)
  const [clinicaId, setClinicaId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(getTodayISO())
  const [horaInicio, setHoraInicio] = useState('09:00')
  const [horaFim, setHoraFim] = useState('10:30')
  const [status, setStatus] = useState<StatusEvento>('agendado')
  const [observacoes, setObservacoes] = useState('')

  // Modal pós-conclusão: oferecer lançar atendimentos
  const [completedEvent, setCompletedEvent] = useState<Evento | null>(null)

  const clinicaMap = useMemo(() => new Map(clinicas.map((c) => [c.id, c])), [clinicas])

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const eventosByDate = useMemo(() => {
    const map = new Map<string, Evento[]>()
    for (const ev of eventos) {
      const list = map.get(ev.data) ?? []
      list.push(ev)
      map.set(ev.data, list)
    }
    return map
  }, [eventos])

  const dayEvents = useMemo(
    () =>
      (eventosByDate.get(selectedDate) ?? []).sort((a, b) =>
        a.hora_inicio.localeCompare(b.hora_inicio)
      ),
    [eventosByDate, selectedDate]
  )

  // Rota do dia selecionado (apenas visitas não canceladas com clínica)
  const rotaDoDia = useMemo(() => {
    const stops = dayEvents
      .filter((e) => e.status !== 'cancelado')
      .map((e) => {
        const cli = e.clinica_id ? clinicaMap.get(e.clinica_id) : undefined
        return { evento: e, clinica: cli }
      })
    const kmTotal = stops.reduce((acc, s) => acc + (s.clinica?.distancia_km ?? 0), 0) * 1.4 // aproximação de rota encadeada + retorno
    const tempoMin = Math.round((kmTotal / 32) * 60) // ~32 km/h média urbana
    const addresses = stops
      .map((s) => s.clinica?.endereco)
      .filter((a): a is string => Boolean(a && a.trim()))

    return { stops, kmTotal, tempoMin, addresses }
  }, [dayEvents, clinicaMap])

  const openCreate = () => {
    setEditing(null)
    setClinicaId(clinicas[0]?.id || '')
    setTitulo('')
    setData(selectedDate)
    setHoraInicio('09:00')
    setHoraFim('10:30')
    setStatus('agendado')
    setObservacoes('')
    setModalOpen(true)
  }

  const openEdit = (ev: Evento) => {
    setEditing(ev)
    setClinicaId(ev.clinica_id || '')
    setTitulo(ev.titulo)
    setData(ev.data)
    setHoraInicio(ev.hora_inicio)
    setHoraFim(ev.hora_fim)
    setStatus(ev.status)
    setObservacoes(ev.observacoes)
    setModalOpen(true)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const cli = clinicaId ? clinicaMap.get(clinicaId) : undefined
    const payload = {
      clinica_id: clinicaId || null,
      titulo: titulo.trim() || (cli ? `Visita ${cli.nome}` : 'Visita agendada'),
      data,
      hora_inicio: horaInicio,
      hora_fim: horaFim,
      status,
      observacoes: observacoes.trim(),
    }
    if (editing) {
      updateEvento.mutate(
        { id: editing.id, patch: payload },
        { onSuccess: () => setModalOpen(false) }
      )
    } else {
      createEvento.mutate(payload, { onSuccess: () => setModalOpen(false) })
    }
  }

  const handleConcluirVisita = (ev: Evento) => {
    updateEvento.mutate(
      { id: ev.id, patch: { status: 'realizado' } },
      {
        onSuccess: () => {
          setCompletedEvent(ev)
        },
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-[#3A3C3F] dark:text-white">
            Agenda
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex p-1 rounded-2xl bg-white dark:bg-[#1E1B29] border border-[#ECE8F6] dark:border-[#2E2940]">
            <button
              type="button"
              onClick={() => setTab('calendario')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                tab === 'calendario'
                  ? 'bg-[#9B7BC7] text-white'
                  : 'text-gray-500 hover:text-[#4B4D50]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Calendário
            </button>
            <button
              type="button"
              onClick={() => setTab('rota')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition ${
                tab === 'rota'
                  ? 'bg-[#9B7BC7] text-white'
                  : 'text-gray-500 hover:text-[#4B4D50]'
              }`}
            >
              <Route className="w-3.5 h-3.5" />
              Rota do dia
            </button>
          </div>

          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            Agendar
          </Button>
        </div>
      </div>

      {tab === 'calendario' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Calendário Mensal com pontinhos */}
          <Card className="p-5 lg:col-span-5">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
              <h2 className="font-bold text-base">{formatMonthYear(currentMonth)}</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="grid grid-cols-7 text-center text-[11px] font-bold text-gray-400 mb-2">
              {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const iso = format(day, 'yyyy-MM-dd')
                const hasEvents = (eventosByDate.get(iso)?.length ?? 0) > 0
                const isSelected = iso === selectedDate
                const isToday = iso === getTodayISO()
                const inMonth = isSameMonth(day, currentMonth)

                return (
                  <button
                    key={iso}
                    type="button"
                    onClick={() => setSelectedDate(iso)}
                    className={`relative h-11 rounded-2xl flex flex-col items-center justify-center text-sm font-semibold transition cursor-pointer ${
                      isSelected
                        ? 'bg-[#9B7BC7] text-white shadow-sm'
                        : isToday
                          ? 'bg-[#EDE7F6] dark:bg-[#2F2447] text-[#7F5DB0] dark:text-[#D9C9F2]'
                          : inMonth
                            ? 'hover:bg-[#F6F4FB] dark:hover:bg-[#282438]'
                            : 'text-gray-300 dark:text-gray-600'
                    }`}
                  >
                    <span>{format(day, 'd')}</span>
                    {hasEvents && (
                      <span
                        className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                          isSelected ? 'bg-[#9CF2C7]' : 'bg-[#6CC59A]'
                        }`}
                      />
                    )}
                  </button>
                )
              })}
            </div>
          </Card>

          {/* Timeline do Dia Selecionado */}
          <Card className="p-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="font-bold text-base">
                  Eventos de {formatDateBR(selectedDate)}
                </h2>
                <p className="text-xs text-gray-500">
                  {dayEvents.length} visita(s) programada(s)
                </p>
              </div>
              {dayEvents.length > 0 && (
                <Button variant="secondary" size="sm" onClick={() => setTab('rota')}>
                  <Route className="w-4 h-4" />
                  Ver rota do dia
                </Button>
              )}
            </div>

            {dayEvents.length === 0 ? (
              <EmptyState
                icon={<CalendarIcon className="w-7 h-7" />}
                title="Dia livre"
                description="Nenhuma visita agendada para esta data."
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="w-4 h-4" />
                    Agendar visita
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {dayEvents.map((ev) => {
                  const cli = ev.clinica_id ? clinicaMap.get(ev.clinica_id) : undefined
                  return (
                    <div
                      key={ev.id}
                      className="p-4 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320] border border-[#ECE8F6] dark:border-[#2E2940] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#9B7BC7]">
                            <Clock className="w-3.5 h-3.5" />
                            {ev.hora_inicio} – {ev.hora_fim}
                          </span>
                          <Badge
                            variant={
                              ev.status === 'realizado'
                                ? 'success'
                                : ev.status === 'cancelado'
                                  ? 'danger'
                                  : 'purple'
                            }
                          >
                            {ev.status === 'realizado'
                              ? 'Realizado'
                              : ev.status === 'cancelado'
                                ? 'Cancelado'
                                : 'Agendado'}
                          </Badge>
                        </div>
                        <p className="font-extrabold text-sm">
                          {cli?.nome || ev.titulo}
                        </p>
                        {cli?.endereco && (
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#9B7BC7]" />
                            {cli.endereco}
                          </p>
                        )}
                        {ev.observacoes && (
                          <p className="text-xs text-gray-500 italic">{ev.observacoes}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {ev.status === 'agendado' && (
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleConcluirVisita(ev)}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            Concluir
                          </Button>
                        )}
                        {cli?.endereco && (
                          <a
                            href={getGoogleMapsUrl(cli.endereco)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button variant="secondary" size="sm">
                              <Navigation className="w-3.5 h-3.5" />
                              Ir
                            </Button>
                          </a>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(ev)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-rose-500"
                          onClick={() => deleteEvento.mutate(ev.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Aba Rota do Dia */
        <div className="space-y-4">
          <Card className="p-5 flex flex-wrap items-center justify-between gap-4 bg-gradient-to-r from-[#EDE7F6] to-[#E6F7EF] dark:from-[#261E3B] dark:to-[#193026]">
            <div className="space-y-1">
              <p className="text-xs font-bold text-[#7F5DB0] dark:text-[#D5C2F5]">
                Rota de {formatDateBR(selectedDate)}
              </p>
              <div className="flex flex-wrap items-center gap-4">
                <div>
                  <span className="text-2xl font-extrabold">{rotaDoDia.stops.length}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 ml-1">parada(s)</span>
                </div>
                <div>
                  <span className="text-2xl font-extrabold">
                    {formatNumber(rotaDoDia.kmTotal, 1)} km
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 ml-1">estimados</span>
                </div>
                <div>
                  <span className="text-2xl font-extrabold">
                    {rotaDoDia.tempoMin >= 60
                      ? `${Math.floor(rotaDoDia.tempoMin / 60)}h ${rotaDoDia.tempoMin % 60}min`
                      : `${rotaDoDia.tempoMin} min`}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 ml-1">em trânsito</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto bg-white dark:bg-[#1E1B29]"
              />
              {rotaDoDia.addresses.length > 0 && (
                <a
                  href={getGoogleMapsRouteUrl(rotaDoDia.addresses)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button variant="primary">
                    <Navigation className="w-4 h-4" />
                    Iniciar rota no Maps
                  </Button>
                </a>
              )}
            </div>
          </Card>

          {rotaDoDia.stops.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Route className="w-7 h-7" />}
                title="Nenhuma parada para este dia"
                description="Agende visitas no calendário para montar automaticamente sua rota do dia."
              />
            </Card>
          ) : (
            <Card className="p-5">
              <ol className="relative border-l-2 border-[#9B7BC7]/40 ml-3 space-y-5">
                {rotaDoDia.stops.map(({ evento, clinica }, idx) => (
                  <li key={evento.id} className="ml-6">
                    <span className="absolute -left-[13px] w-6 h-6 rounded-full bg-[#9B7BC7] text-white text-xs font-extrabold flex items-center justify-center shadow">
                      {idx + 1}
                    </span>
                    <div className="p-4 rounded-2xl bg-[#F6F4FB] dark:bg-[#161320] flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-[#9B7BC7]">
                          {evento.hora_inicio} – {evento.hora_fim}
                        </p>
                        <p className="font-extrabold text-base">
                          {clinica?.nome || evento.titulo}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {clinica?.endereco || 'Endereço não cadastrado'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {clinica && (
                          <Badge variant="purple">
                            {formatNumber(clinica.distancia_km, 1)} km
                          </Badge>
                        )}
                        {clinica?.endereco && (
                          <a
                            href={getGoogleMapsUrl(clinica.endereco)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button variant="success" size="sm">
                              <Navigation className="w-3.5 h-3.5" />
                              Ir
                            </Button>
                          </a>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      )}

      {/* Modal Agendar / Editar Visita */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar visita' : 'Agendar visita'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="ev-cli">Clínica</Label>
            <Select id="ev-cli" value={clinicaId} onChange={(e) => setClinicaId(e.target.value)}>
              <option value="">Sem clínica específica</option>
              {clinicas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="ev-tit">Título (opcional)</Label>
            <Input
              id="ev-tit"
              placeholder="Ex: Visita matinal Vet Vida"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="col-span-2 sm:col-span-1 min-w-0">
              <Label htmlFor="ev-data">Data</Label>
              <Input
                id="ev-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                required
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="ev-ini">Início</Label>
              <Input
                id="ev-ini"
                type="time"
                value={horaInicio}
                onChange={(e) => setHoraInicio(e.target.value)}
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor="ev-fim">Fim</Label>
              <Input
                id="ev-fim"
                type="time"
                value={horaFim}
                onChange={(e) => setHoraFim(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="ev-st">Status</Label>
            <Select
              id="ev-st"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusEvento)}
            >
              <option value="agendado">Agendado</option>
              <option value="realizado">Realizado</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="ev-obs">Observações</Label>
            <Textarea
              id="ev-obs"
              placeholder="Quantidade de pacientes, preparo, etc."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit">{editing ? 'Salvar' : 'Agendar visita'}</Button>
          </div>
        </form>
      </Modal>

      {/* Modal pós-conclusão: oferecer Lançar atendimentos */}
      <Modal
        open={Boolean(completedEvent)}
        onClose={() => setCompletedEvent(null)}
        title="Visita concluída ✅"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Deseja lançar agora os atendimentos realizados nesta visita?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCompletedEvent(null)}>
              Agora não
            </Button>
            <Button
              onClick={() => {
                if (!completedEvent) return
                const params = new URLSearchParams({ novo: '1', data: completedEvent.data })
                if (completedEvent.clinica_id) params.set('clinicaId', completedEvent.clinica_id)
                setCompletedEvent(null)
                navigate(`/atendimentos?${params.toString()}`)
              }}
            >
              <FilePlus2 className="w-4 h-4" />
              Lançar atendimentos
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
