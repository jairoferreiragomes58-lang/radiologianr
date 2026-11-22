import { generateId, getTodayISO } from '@/lib/utils'
import type {
  Atendimento,
  BackupData,
  Clinica,
  Despesa,
  Evento,
  Meta,
  Paciente,
  ParcelaMaquina,
  Profile,
  Simulacao,
  TabelaPreco,
  TabelaPrecoClinica,
  Tutor,
  UserSession,
  Veiculo,
} from '@/types'
import { createInitialSeedState, DEMO_USER_ID, type LocalStoreState } from './localSeed'
import type { AtendimentoInput, IRepository } from './repository'

const STORAGE_KEY = 'radiologia_nr_db_v1'
const SESSION_KEY = 'radiologia_nr_session_v1'

function loadState(): LocalStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      return JSON.parse(raw) as LocalStoreState
    }
  } catch {
    // ignore corrupted storage
  }
  const initial = createInitialSeedState()
  saveState(initial)
  return initial
}

function saveState(state: LocalStoreState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export class LocalRepository implements IRepository {
  readonly mode = 'local' as const

  async getSession(): Promise<UserSession | null> {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? (JSON.parse(raw) as UserSession) : null
    } catch {
      return null
    }
  }

  async signIn(email: string, password: string): Promise<UserSession> {
    if (!email.trim() || password.length < 4) {
      throw new Error('Informe um e-mail válido e senha com pelo menos 4 caracteres.')
    }
    const state = loadState()
    const session: UserSession = {
      id: DEMO_USER_ID,
      email: email.trim().toLowerCase(),
      nome: state.profile.nome || 'Nathalia Rangel',
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  }

  async signUp(email: string, password: string, nome: string): Promise<UserSession> {
    if (!email.trim() || password.length < 6) {
      throw new Error('Informe um e-mail válido e senha com no mínimo 6 caracteres.')
    }
    const state = loadState()
    state.profile.nome = nome.trim() || 'Nathalia Rangel'
    saveState(state)
    const session: UserSession = {
      id: DEMO_USER_ID,
      email: email.trim().toLowerCase(),
      nome: state.profile.nome,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    return session
  }

  async signOut(): Promise<void> {
    localStorage.removeItem(SESSION_KEY)
  }

  async resetPassword(email: string): Promise<void> {
    if (!email.trim()) throw new Error('Informe seu e-mail.')
    // Em modo local, apenas simula o envio
  }

  async updateAccount(patch: { nome?: string; email?: string; password?: string }): Promise<UserSession> {
    if (patch.password && patch.password.length < 4) {
      throw new Error('A nova senha deve ter pelo menos 4 caracteres.')
    }
    const current = (await this.getSession()) ?? {
      id: DEMO_USER_ID,
      email: 'nathalia@radiologianr.com.br',
      nome: 'Nathalia Rangel',
    }
    const updated: UserSession = {
      id: current.id,
      email: patch.email?.trim() ? patch.email.trim().toLowerCase() : current.email,
      nome: patch.nome?.trim() ? patch.nome.trim() : current.nome,
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(updated))
    return updated
  }

  // Profile & Máquina
  async getProfile(): Promise<Profile> {
    return loadState().profile
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const state = loadState()
    state.profile = { ...state.profile, ...patch }
    saveState(state)
    return state.profile
  }

  async listParcelasMaquina(): Promise<ParcelaMaquina[]> {
    return loadState().parcelas_maquina
  }

  async pagarParcelaMes(mesReferencia: string): Promise<{ profile: Profile; parcela: ParcelaMaquina; despesa: Despesa }> {
    const state = loadState()
    if (state.profile.parcelas_restantes <= 0) {
      throw new Error('A máquina de raio X já está quitada!')
    }
    const existing = state.parcelas_maquina.find(
      (p) => p.mes_referencia === mesReferencia && p.paga
    )
    if (existing) {
      throw new Error('A parcela deste mês já foi marcada como paga.')
    }

    const today = getTodayISO()
    const valor = state.profile.parcela_maquina

    const parcela: ParcelaMaquina = {
      id: generateId(),
      user_id: DEMO_USER_ID,
      mes_referencia: mesReferencia,
      valor,
      paga: true,
      data_pagamento: today,
    }

    const remainingAfter = Math.max(0, state.profile.parcelas_restantes - 1)
    state.profile = {
      ...state.profile,
      parcelas_restantes: remainingAfter,
    }

    const [ano, mes] = mesReferencia.split('-')
    const despesa: Despesa = {
      id: generateId(),
      user_id: DEMO_USER_ID,
      data: today,
      categoria: 'Parcela da máquina de raio X',
      descricao: `Parcela da máquina de raio X (${mes}/${ano}) — restam ${remainingAfter}`,
      valor,
      clinica_id: null,
      recorrente: false,
      created_at: new Date().toISOString(),
    }

    state.parcelas_maquina = [
      ...state.parcelas_maquina.filter((p) => p.mes_referencia !== mesReferencia),
      parcela,
    ]
    state.despesas = [despesa, ...state.despesas]
    saveState(state)

    return { profile: state.profile, parcela, despesa }
  }

  // Metas
  async listMetas(): Promise<Meta[]> {
    const state = loadState()
    if (!state.metas || state.metas.length === 0) {
      state.metas = [
        {
          id: 'meta-raiox-1',
          user_id: DEMO_USER_ID,
          titulo: 'Aparelho de Raio X',
          valor_parcela: state.profile.parcela_maquina,
          parcelas_restantes: state.profile.parcelas_restantes,
          dia_vencimento: state.profile.dia_vencimento_parcela,
          principal: true,
          created_at: new Date().toISOString(),
        },
      ]
      saveState(state)
    }
    return state.metas
  }

  async createMeta(data: Omit<Meta, 'id' | 'user_id' | 'created_at'>): Promise<Meta> {
    const state = loadState()
    const current = await this.listMetas()
    const item: Meta = {
      ...data,
      id: generateId(),
      user_id: DEMO_USER_ID,
      created_at: new Date().toISOString(),
    }
    state.metas = [...current, item]
    saveState(state)
    return item
  }

  async updateMeta(id: string, patch: Partial<Meta>): Promise<Meta> {
    const state = loadState()
    const current = await this.listMetas()
    const idx = current.findIndex((m) => m.id === id)
    if (idx === -1) throw new Error('Meta não encontrada.')
    const updated = { ...current[idx], ...patch }
    current[idx] = updated
    state.metas = current
    if (updated.principal) {
      state.profile = {
        ...state.profile,
        parcela_maquina: updated.valor_parcela,
        parcelas_restantes: updated.parcelas_restantes,
        dia_vencimento_parcela: updated.dia_vencimento,
      }
    }
    saveState(state)
    return updated
  }

  async deleteMeta(id: string): Promise<void> {
    const state = loadState()
    state.metas = (state.metas ?? []).filter((m) => m.id !== id)
    saveState(state)
  }

  // Veículo
  async getVeiculo(): Promise<Veiculo> {
    return loadState().veiculo
  }

  async updateVeiculo(patch: Partial<Veiculo>): Promise<Veiculo> {
    const state = loadState()
    state.veiculo = { ...state.veiculo, ...patch }
    saveState(state)
    return state.veiculo
  }

  // Clínicas
  async listClinicas(): Promise<Clinica[]> {
    return loadState().clinicas.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  async createClinica(data: Omit<Clinica, 'id' | 'user_id' | 'created_at'>): Promise<Clinica> {
    const state = loadState()
    const item: Clinica = {
      ...data,
      id: generateId(),
      user_id: DEMO_USER_ID,
      created_at: new Date().toISOString(),
    }
    state.clinicas = [item, ...state.clinicas]
    saveState(state)
    return item
  }

  async updateClinica(id: string, patch: Partial<Clinica>): Promise<Clinica> {
    const state = loadState()
    const idx = state.clinicas.findIndex((c) => c.id === id)
    if (idx === -1) throw new Error('Clínica não encontrada.')
    state.clinicas[idx] = { ...state.clinicas[idx], ...patch }
    saveState(state)
    return state.clinicas[idx]
  }

  async deleteClinica(id: string): Promise<void> {
    const state = loadState()
    state.clinicas = state.clinicas.filter((c) => c.id !== id)
    state.tabela_precos_clinica = state.tabela_precos_clinica.filter((t) => t.clinica_id !== id)
    saveState(state)
  }

  // Tutores & Pacientes
  async listTutores(): Promise<Tutor[]> {
    return loadState().tutores.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  async createTutor(data: Omit<Tutor, 'id' | 'user_id'>): Promise<Tutor> {
    const state = loadState()
    const item: Tutor = { ...data, id: generateId(), user_id: DEMO_USER_ID }
    state.tutores = [item, ...state.tutores]
    saveState(state)
    return item
  }

  async listPacientes(): Promise<Paciente[]> {
    return loadState().pacientes.sort((a, b) => a.nome.localeCompare(b.nome))
  }

  async createPaciente(data: Omit<Paciente, 'id' | 'user_id'>): Promise<Paciente> {
    const state = loadState()
    const item: Paciente = { ...data, id: generateId(), user_id: DEMO_USER_ID }
    state.pacientes = [item, ...state.pacientes]
    saveState(state)
    return item
  }

  async deletePaciente(id: string): Promise<void> {
    const state = loadState()
    state.pacientes = state.pacientes.filter((p) => p.id !== id)
    saveState(state)
  }

  // Tabela de Preços
  async listTabelaPrecos(): Promise<TabelaPreco[]> {
    return loadState().tabela_precos
  }

  async createTabelaPreco(data: Omit<TabelaPreco, 'id' | 'user_id'>): Promise<TabelaPreco> {
    const state = loadState()
    const item: TabelaPreco = { ...data, id: generateId(), user_id: DEMO_USER_ID }
    state.tabela_precos = [...state.tabela_precos, item]
    saveState(state)
    return item
  }

  async updateTabelaPreco(id: string, patch: Partial<TabelaPreco>): Promise<TabelaPreco> {
    const state = loadState()
    const idx = state.tabela_precos.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Item de preço não encontrado.')
    state.tabela_precos[idx] = { ...state.tabela_precos[idx], ...patch }
    saveState(state)
    return state.tabela_precos[idx]
  }

  async deleteTabelaPreco(id: string): Promise<void> {
    const state = loadState()
    state.tabela_precos = state.tabela_precos.filter((t) => t.id !== id)
    saveState(state)
  }

  // Tabela de Preços por Clínica
  async listTabelaPrecosClinica(clinicaId?: string): Promise<TabelaPrecoClinica[]> {
    const list = loadState().tabela_precos_clinica
    return clinicaId ? list.filter((t) => t.clinica_id === clinicaId) : list
  }

  async upsertTabelaPrecoClinica(data: Omit<TabelaPrecoClinica, 'id' | 'user_id'>): Promise<TabelaPrecoClinica> {
    const state = loadState()
    const existingIdx = state.tabela_precos_clinica.findIndex(
      (t) => t.clinica_id === data.clinica_id && t.codigo.toLowerCase() === data.codigo.toLowerCase()
    )
    if (existingIdx >= 0) {
      state.tabela_precos_clinica[existingIdx] = {
        ...state.tabela_precos_clinica[existingIdx],
        valor: data.valor,
        codigo: data.codigo,
      }
      saveState(state)
      return state.tabela_precos_clinica[existingIdx]
    }
    const item: TabelaPrecoClinica = {
      ...data,
      id: generateId(),
      user_id: DEMO_USER_ID,
    }
    state.tabela_precos_clinica = [...state.tabela_precos_clinica, item]
    saveState(state)
    return item
  }

  async deleteTabelaPrecoClinica(id: string): Promise<void> {
    const state = loadState()
    state.tabela_precos_clinica = state.tabela_precos_clinica.filter((t) => t.id !== id)
    saveState(state)
  }

  // Atendimentos
  async listAtendimentos(): Promise<Atendimento[]> {
    return loadState().atendimentos.sort((a, b) => b.data.localeCompare(a.data))
  }

  async createAtendimento(data: AtendimentoInput): Promise<Atendimento> {
    const state = loadState()
    const id = generateId()
    const itens = data.itens.map((it) => ({
      id: generateId(),
      atendimento_id: id,
      especificacao: it.especificacao,
      quantidade: Number(it.quantidade) || 1,
      valor_unitario: Number(it.valor_unitario) || 0,
      valor_total: (Number(it.quantidade) || 1) * (Number(it.valor_unitario) || 0),
    }))
    const total = itens.reduce((acc, i) => acc + i.valor_total, 0)
    const atendimento: Atendimento = {
      ...data,
      id,
      user_id: DEMO_USER_ID,
      total,
      itens,
      created_at: new Date().toISOString(),
    }
    state.atendimentos = [atendimento, ...state.atendimentos]
    saveState(state)
    return atendimento
  }

  async updateAtendimento(id: string, patch: Partial<AtendimentoInput>): Promise<Atendimento> {
    const state = loadState()
    const idx = state.atendimentos.findIndex((a) => a.id === id)
    if (idx === -1) throw new Error('Atendimento não encontrado.')
    const current = state.atendimentos[idx]
    const nextItens = patch.itens
      ? patch.itens.map((it) => ({
          id: generateId(),
          atendimento_id: id,
          especificacao: it.especificacao,
          quantidade: Number(it.quantidade) || 1,
          valor_unitario: Number(it.valor_unitario) || 0,
          valor_total: (Number(it.quantidade) || 1) * (Number(it.valor_unitario) || 0),
        }))
      : current.itens
    const total = nextItens.reduce((acc, i) => acc + i.valor_total, 0)
    const updated: Atendimento = {
      ...current,
      ...patch,
      itens: nextItens,
      total,
    }
    state.atendimentos[idx] = updated
    saveState(state)
    return updated
  }

  async deleteAtendimento(id: string): Promise<void> {
    const state = loadState()
    state.atendimentos = state.atendimentos.filter((a) => a.id !== id)
    saveState(state)
  }

  async marcarAtendimentosPagos(ids: string[], formaPagamento = 'Pix'): Promise<void> {
    const state = loadState()
    const today = getTodayISO()
    const idSet = new Set(ids)
    state.atendimentos = state.atendimentos.map((a) =>
      idSet.has(a.id)
        ? {
            ...a,
            status_pagamento: 'pago',
            forma_pagamento: a.forma_pagamento || formaPagamento,
            data_pagamento: a.data_pagamento || today,
          }
        : a
    )
    saveState(state)
  }

  // Despesas
  async listDespesas(): Promise<Despesa[]> {
    return loadState().despesas.sort((a, b) => b.data.localeCompare(a.data))
  }

  async createDespesa(data: Omit<Despesa, 'id' | 'user_id' | 'created_at'>): Promise<Despesa> {
    const state = loadState()
    const item: Despesa = {
      ...data,
      id: generateId(),
      user_id: DEMO_USER_ID,
      created_at: new Date().toISOString(),
    }
    state.despesas = [item, ...state.despesas]
    saveState(state)
    return item
  }

  async updateDespesa(id: string, patch: Partial<Despesa>): Promise<Despesa> {
    const state = loadState()
    const idx = state.despesas.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error('Despesa não encontrada.')
    state.despesas[idx] = { ...state.despesas[idx], ...patch }
    saveState(state)
    return state.despesas[idx]
  }

  async deleteDespesa(id: string): Promise<void> {
    const state = loadState()
    state.despesas = state.despesas.filter((d) => d.id !== id)
    saveState(state)
  }

  async gerarDespesasRecorrentesMes(mesKey: string): Promise<number> {
    const state = loadState()
    // Pega templates recorrentes distintos por categoria+descrição
    const templates = new Map<string, Despesa>()
    for (const d of state.despesas) {
      if (d.recorrente && d.categoria !== 'Parcela da máquina de raio X') {
        const key = `${d.categoria}::${d.descricao.trim().toLowerCase()}`
        if (!templates.has(key)) templates.set(key, d)
      }
    }

    let created = 0
    for (const [key, tpl] of templates.entries()) {
      const alreadyExists = state.despesas.some(
        (d) =>
          d.data.startsWith(mesKey) &&
          `${d.categoria}::${d.descricao.trim().toLowerCase()}` === key
      )
      if (!alreadyExists) {
        const day = tpl.data.slice(8, 10) || '05'
        state.despesas.unshift({
          id: generateId(),
          user_id: DEMO_USER_ID,
          data: `${mesKey}-${day}`,
          categoria: tpl.categoria,
          descricao: tpl.descricao,
          valor: tpl.valor,
          clinica_id: tpl.clinica_id,
          recorrente: true,
          created_at: new Date().toISOString(),
        })
        created++
      }
    }

    if (created > 0) saveState(state)
    return created
  }

  // Agenda / Eventos
  async listEventos(): Promise<Evento[]> {
    return loadState().eventos.sort((a, b) =>
      `${a.data} ${a.hora_inicio}`.localeCompare(`${b.data} ${b.hora_inicio}`)
    )
  }

  async createEvento(data: Omit<Evento, 'id' | 'user_id'>): Promise<Evento> {
    const state = loadState()
    const item: Evento = { ...data, id: generateId(), user_id: DEMO_USER_ID }
    state.eventos = [...state.eventos, item]
    saveState(state)
    return item
  }

  async updateEvento(id: string, patch: Partial<Evento>): Promise<Evento> {
    const state = loadState()
    const idx = state.eventos.findIndex((e) => e.id === id)
    if (idx === -1) throw new Error('Evento não encontrado.')
    state.eventos[idx] = { ...state.eventos[idx], ...patch }
    saveState(state)
    return state.eventos[idx]
  }

  async deleteEvento(id: string): Promise<void> {
    const state = loadState()
    state.eventos = state.eventos.filter((e) => e.id !== id)
    saveState(state)
  }

  // Simulações
  async listSimulacoes(): Promise<Simulacao[]> {
    return loadState().simulacoes.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }

  async createSimulacao(data: Omit<Simulacao, 'id' | 'user_id' | 'created_at'>): Promise<Simulacao> {
    const state = loadState()
    const item: Simulacao = {
      ...data,
      id: generateId(),
      user_id: DEMO_USER_ID,
      created_at: new Date().toISOString(),
    }
    state.simulacoes = [item, ...state.simulacoes]
    saveState(state)
    return item
  }

  async deleteSimulacao(id: string): Promise<void> {
    const state = loadState()
    state.simulacoes = state.simulacoes.filter((s) => s.id !== id)
    saveState(state)
  }

  async exportBackup(): Promise<BackupData> {
    const state = loadState()
    return {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      ...state,
    }
  }

  async resetDemoData(): Promise<void> {
    const fresh = createInitialSeedState()
    saveState(fresh)
  }
}
