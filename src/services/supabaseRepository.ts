import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getTodayISO } from '@/lib/utils'
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
import type { AtendimentoInput, IRepository } from './repository'

export class SupabaseRepository implements IRepository {
  readonly mode = 'supabase' as const
  private client: SupabaseClient

  constructor(url: string, anonKey: string) {
    this.client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }

  private async requireUserId(): Promise<string> {
    const { data, error } = await this.client.auth.getUser()
    if (error || !data.user) throw new Error('Sessão expirada. Faça login novamente.')
    return data.user.id
  }

  async getSession(): Promise<UserSession | null> {
    const { data } = await this.client.auth.getSession()
    const user = data.session?.user
    if (!user) return null
    return {
      id: user.id,
      email: user.email ?? '',
      nome: (user.user_metadata?.nome as string) || 'Nathalia Rangel',
    }
  }

  async signIn(email: string, password: string): Promise<UserSession> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error(error?.message || 'Credenciais inválidas.')
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      nome: (data.user.user_metadata?.nome as string) || 'Nathalia Rangel',
    }
  }

  async signUp(email: string, password: string, nome: string): Promise<UserSession> {
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    })
    if (error || !data.user) throw new Error(error?.message || 'Erro ao criar conta.')
    if (!data.session) {
      throw new Error('Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.')
    }
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      nome,
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw new Error(error.message)
  }

  async resetPassword(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) throw new Error(error.message)
  }

  async updateAccount(patch: { nome?: string; email?: string; password?: string }): Promise<UserSession> {
    const payload: { email?: string; password?: string; data?: { nome?: string } } = {}
    if (patch.email?.trim()) payload.email = patch.email.trim()
    if (patch.password?.trim()) payload.password = patch.password.trim()
    if (patch.nome?.trim()) payload.data = { nome: patch.nome.trim() }

    const { data, error } = await this.client.auth.updateUser(payload)
    if (error || !data.user) throw new Error(error?.message || 'Erro ao atualizar dados da conta.')
    return {
      id: data.user.id,
      email: data.user.email ?? '',
      nome: (data.user.user_metadata?.nome as string) || patch.nome || 'Nathalia Rangel',
    }
  }

  // Profile & Máquina
  async getProfile(): Promise<Profile> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      // Cria perfil padrão se ainda não existir
      const fallback: Profile = {
        id: userId,
        nome: 'Nathalia Rangel',
        logo_url: '/logo.png',
        parcela_maquina: 3700,
        parcelas_restantes: 24,
        dia_vencimento_parcela: 10,
        margem_padrao: 35,
        endereco_base: '',
      }
      const { data: inserted, error: insertErr } = await this.client
        .from('profiles')
        .upsert(fallback)
        .select('*')
        .single()
      if (insertErr) throw new Error(insertErr.message)
      return inserted as Profile
    }

    return {
      ...(data as Profile),
      parcela_maquina: Number(data.parcela_maquina),
      parcelas_restantes: Number(data.parcelas_restantes),
      dia_vencimento_parcela: Number(data.dia_vencimento_parcela),
      margem_padrao: Number(data.margem_padrao),
    }
  }

  async updateProfile(patch: Partial<Profile>): Promise<Profile> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('profiles')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Profile
  }

  async listParcelasMaquina(): Promise<ParcelaMaquina[]> {
    const { data, error } = await this.client
      .from('parcelas_maquina')
      .select('*')
      .order('mes_referencia', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((p) => ({ ...p, valor: Number(p.valor) })) as ParcelaMaquina[]
  }

  async pagarParcelaMes(mesReferencia: string): Promise<{ profile: Profile; parcela: ParcelaMaquina; despesa: Despesa }> {
    const userId = await this.requireUserId()
    const profile = await this.getProfile()
    if (profile.parcelas_restantes <= 0) {
      throw new Error('A máquina de raio X já está quitada!')
    }

    const { data: existing } = await this.client
      .from('parcelas_maquina')
      .select('*')
      .eq('user_id', userId)
      .eq('mes_referencia', mesReferencia)
      .maybeSingle()

    if (existing?.paga) {
      throw new Error('A parcela deste mês já foi marcada como paga.')
    }

    const today = getTodayISO()
    const { data: parcela, error: parcelaErr } = await this.client
      .from('parcelas_maquina')
      .upsert(
        {
          user_id: userId,
          mes_referencia: mesReferencia,
          valor: profile.parcela_maquina,
          paga: true,
          data_pagamento: today,
        },
        { onConflict: 'user_id,mes_referencia' }
      )
      .select('*')
      .single()
    if (parcelaErr) throw new Error(parcelaErr.message)

    const remainingAfter = Math.max(0, profile.parcelas_restantes - 1)
    const updatedProfile = await this.updateProfile({ parcelas_restantes: remainingAfter })

    const [ano, mes] = mesReferencia.split('-')
    const despesa = await this.createDespesa({
      data: today,
      categoria: 'Parcela da máquina de raio X',
      descricao: `Parcela da máquina de raio X (${mes}/${ano}) — restam ${remainingAfter}`,
      valor: profile.parcela_maquina,
      clinica_id: null,
      recorrente: false,
    })

    return {
      profile: updatedProfile,
      parcela: parcela as ParcelaMaquina,
      despesa,
    }
  }

  // Metas
  async listMetas(): Promise<Meta[]> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('metas')
      .select('*')
      .order('principal', { ascending: false })
      .order('created_at', { ascending: true })
    if (error) throw new Error(error.message)

    if (!data || data.length === 0) {
      const profile = await this.getProfile()
      const { data: created, error: cErr } = await this.client
        .from('metas')
        .insert({
          user_id: userId,
          titulo: 'Aparelho de Raio X',
          valor_parcela: profile.parcela_maquina,
          parcelas_restantes: profile.parcelas_restantes,
          dia_vencimento: profile.dia_vencimento_parcela,
          principal: true,
        })
        .select('*')
        .single()
      if (cErr) throw new Error(cErr.message)
      return [
        {
          ...(created as Meta),
          valor_parcela: Number(created.valor_parcela),
          parcelas_restantes: Number(created.parcelas_restantes),
          dia_vencimento: Number(created.dia_vencimento),
        },
      ]
    }

    return data.map((m) => ({
      ...(m as Meta),
      valor_parcela: Number(m.valor_parcela),
      parcelas_restantes: Number(m.parcelas_restantes),
      dia_vencimento: Number(m.dia_vencimento),
    }))
  }

  async createMeta(payload: Omit<Meta, 'id' | 'user_id' | 'created_at'>): Promise<Meta> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('metas')
      .insert({ ...payload, user_id: userId })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return {
      ...(data as Meta),
      valor_parcela: Number(data.valor_parcela),
      parcelas_restantes: Number(data.parcelas_restantes),
      dia_vencimento: Number(data.dia_vencimento),
    }
  }

  async updateMeta(id: string, patch: Partial<Meta>): Promise<Meta> {
    const { data, error } = await this.client
      .from('metas')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    const updated: Meta = {
      ...(data as Meta),
      valor_parcela: Number(data.valor_parcela),
      parcelas_restantes: Number(data.parcelas_restantes),
      dia_vencimento: Number(data.dia_vencimento),
    }

    if (updated.principal) {
      await this.updateProfile({
        parcela_maquina: updated.valor_parcela,
        parcelas_restantes: updated.parcelas_restantes,
        dia_vencimento_parcela: updated.dia_vencimento,
      })
    }

    return updated
  }

  async deleteMeta(id: string): Promise<void> {
    const { error } = await this.client.from('metas').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Veículo
  async getVeiculo(): Promise<Veiculo> {
    const userId = await this.requireUserId()
    const { data } = await this.client
      .from('veiculos')
      .select('*')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle()

    if (!data) {
      const { data: created, error } = await this.client
        .from('veiculos')
        .insert({
          user_id: userId,
          modelo: '',
          combustivel: 'flex',
          consumo_cidade: 10,
          consumo_estrada: 13,
          preco_combustivel: 6.0,
          desgaste_por_km: 0.3,
          custo_fixo_mensal: 0,
        })
        .select('*')
        .single()
      if (error) throw new Error(error.message)
      return created as Veiculo
    }

    return {
      ...(data as Veiculo),
      consumo_cidade: Number(data.consumo_cidade),
      consumo_estrada: Number(data.consumo_estrada),
      preco_combustivel: Number(data.preco_combustivel),
      desgaste_por_km: Number(data.desgaste_por_km),
      custo_fixo_mensal: Number(data.custo_fixo_mensal),
    }
  }

  async updateVeiculo(patch: Partial<Veiculo>): Promise<Veiculo> {
    const current = await this.getVeiculo()
    const { data, error } = await this.client
      .from('veiculos')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', current.id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Veiculo
  }

  // Clínicas
  async listClinicas(): Promise<Clinica[]> {
    const { data, error } = await this.client.from('clinicas').select('*').order('nome')
    if (error) throw new Error(error.message)
    return (data ?? []).map((c) => ({
      ...c,
      distancia_km: Number(c.distancia_km),
      pedagio_padrao: Number(c.pedagio_padrao),
    })) as Clinica[]
  }

  async createClinica(payload: Omit<Clinica, 'id' | 'user_id' | 'created_at'>): Promise<Clinica> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('clinicas')
      .insert({ ...payload, user_id: userId })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Clinica
  }

  async updateClinica(id: string, patch: Partial<Clinica>): Promise<Clinica> {
    const { data, error } = await this.client
      .from('clinicas')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Clinica
  }

  async deleteClinica(id: string): Promise<void> {
    const { error } = await this.client.from('clinicas').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Tutores & Pacientes
  async listTutores(): Promise<Tutor[]> {
    const { data, error } = await this.client.from('tutores').select('*').order('nome')
    if (error) throw new Error(error.message)
    return (data ?? []) as Tutor[]
  }

  async createTutor(payload: Omit<Tutor, 'id' | 'user_id'>): Promise<Tutor> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('tutores')
      .insert({ ...payload, user_id: userId })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Tutor
  }

  async listPacientes(): Promise<Paciente[]> {
    const { data, error } = await this.client.from('pacientes').select('*').order('nome')
    if (error) throw new Error(error.message)
    return (data ?? []) as Paciente[]
  }

  async createPaciente(payload: Omit<Paciente, 'id' | 'user_id'>): Promise<Paciente> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('pacientes')
      .insert({ ...payload, user_id: userId })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Paciente
  }

  async deletePaciente(id: string): Promise<void> {
    const { error } = await this.client.from('pacientes').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Tabela de preços
  async listTabelaPrecos(): Promise<TabelaPreco[]> {
    const { data, error } = await this.client.from('tabela_precos').select('*').order('codigo')
    if (error) throw new Error(error.message)
    return (data ?? []).map((t) => ({
      ...t,
      valor_padrao: Number(t.valor_padrao),
      adicional_urgencia: Number(t.adicional_urgencia),
    })) as TabelaPreco[]
  }

  async createTabelaPreco(payload: Omit<TabelaPreco, 'id' | 'user_id'>): Promise<TabelaPreco> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('tabela_precos')
      .insert({ ...payload, user_id: userId })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as TabelaPreco
  }

  async updateTabelaPreco(id: string, patch: Partial<TabelaPreco>): Promise<TabelaPreco> {
    const { data, error } = await this.client
      .from('tabela_precos')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as TabelaPreco
  }

  async deleteTabelaPreco(id: string): Promise<void> {
    const { error } = await this.client.from('tabela_precos').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async listTabelaPrecosClinica(clinicaId?: string): Promise<TabelaPrecoClinica[]> {
    let query = this.client.from('tabela_precos_clinica').select('*')
    if (clinicaId) query = query.eq('clinica_id', clinicaId)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map((t) => ({ ...t, valor: Number(t.valor) })) as TabelaPrecoClinica[]
  }

  async upsertTabelaPrecoClinica(payload: Omit<TabelaPrecoClinica, 'id' | 'user_id'>): Promise<TabelaPrecoClinica> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('tabela_precos_clinica')
      .upsert({ ...payload, user_id: userId }, { onConflict: 'user_id,clinica_id,codigo' })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as TabelaPrecoClinica
  }

  async deleteTabelaPrecoClinica(id: string): Promise<void> {
    const { error } = await this.client.from('tabela_precos_clinica').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Atendimentos
  async listAtendimentos(): Promise<Atendimento[]> {
    const { data, error } = await this.client
      .from('atendimentos')
      .select('*, itens:atendimento_itens(*)')
      .order('data', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((a) => ({
      ...a,
      total: Number(a.total),
      itens: (a.itens ?? []).map((i: Record<string, unknown>) => ({
        ...i,
        especificacao: (i.especificacao as string) ?? '',
        quantidade: Number(i.quantidade),
        valor_unitario: Number(i.valor_unitario),
        valor_total: Number(i.valor_total),
      })),
    })) as Atendimento[]
  }

  async createAtendimento(payload: AtendimentoInput): Promise<Atendimento> {
    const userId = await this.requireUserId()
    const { itens, ...header } = payload
    const total = itens.reduce((acc, i) => acc + i.quantidade * i.valor_unitario, 0)

    const { data: created, error } = await this.client
      .from('atendimentos')
      .insert({ ...header, user_id: userId, total })
      .select('*')
      .single()
    if (error) throw new Error(error.message)

    if (itens.length > 0) {
      const { error: itemsErr } = await this.client.from('atendimento_itens').insert(
        itens.map((it) => ({
          atendimento_id: created.id,
          especificacao: it.especificacao,
          quantidade: it.quantidade,
          valor_unitario: it.valor_unitario,
        }))
      )
      if (itemsErr) throw new Error(itemsErr.message)
    }

    const list = await this.listAtendimentos()
    return list.find((a) => a.id === created.id) ?? ({ ...created, itens: [] } as Atendimento)
  }

  async updateAtendimento(id: string, patch: Partial<AtendimentoInput>): Promise<Atendimento> {
    const { itens, ...header } = patch
    if (Object.keys(header).length > 0) {
      const { error } = await this.client
        .from('atendimentos')
        .update({ ...header, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw new Error(error.message)
    }

    if (itens) {
      await this.client.from('atendimento_itens').delete().eq('atendimento_id', id)
      if (itens.length > 0) {
        const { error: itemsErr } = await this.client.from('atendimento_itens').insert(
          itens.map((it) => ({
            atendimento_id: id,
            especificacao: it.especificacao,
            quantidade: it.quantidade,
            valor_unitario: it.valor_unitario,
          }))
        )
        if (itemsErr) throw new Error(itemsErr.message)
      }
    }

    const list = await this.listAtendimentos()
    const found = list.find((a) => a.id === id)
    if (!found) throw new Error('Atendimento não encontrado.')
    return found
  }

  async deleteAtendimento(id: string): Promise<void> {
    const { error } = await this.client.from('atendimentos').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async marcarAtendimentosPagos(ids: string[], formaPagamento = 'Pix'): Promise<void> {
    const today = getTodayISO()
    const { error } = await this.client
      .from('atendimentos')
      .update({
        status_pagamento: 'pago',
        forma_pagamento: formaPagamento,
        data_pagamento: today,
        updated_at: new Date().toISOString(),
      })
      .in('id', ids)
    if (error) throw new Error(error.message)
  }

  // Despesas
  async listDespesas(): Promise<Despesa[]> {
    const { data, error } = await this.client
      .from('despesas')
      .select('*')
      .order('data', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((d) => ({ ...d, valor: Number(d.valor) })) as Despesa[]
  }

  async createDespesa(payload: Omit<Despesa, 'id' | 'user_id' | 'created_at'>): Promise<Despesa> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('despesas')
      .insert({ ...payload, user_id: userId })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return { ...data, valor: Number(data.valor) } as Despesa
  }

  async updateDespesa(id: string, patch: Partial<Despesa>): Promise<Despesa> {
    const { data, error } = await this.client
      .from('despesas')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return { ...data, valor: Number(data.valor) } as Despesa
  }

  async deleteDespesa(id: string): Promise<void> {
    const { error } = await this.client.from('despesas').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async gerarDespesasRecorrentesMes(mesKey: string): Promise<number> {
    const all = await this.listDespesas()
    const templates = new Map<string, Despesa>()
    for (const d of all) {
      if (d.recorrente && d.categoria !== 'Parcela da máquina de raio X') {
        const key = `${d.categoria}::${d.descricao.trim().toLowerCase()}`
        if (!templates.has(key)) templates.set(key, d)
      }
    }
    let created = 0
    for (const [key, tpl] of templates.entries()) {
      const exists = all.some(
        (d) =>
          d.data.startsWith(mesKey) &&
          `${d.categoria}::${d.descricao.trim().toLowerCase()}` === key
      )
      if (!exists) {
        const day = tpl.data.slice(8, 10) || '05'
        await this.createDespesa({
          data: `${mesKey}-${day}`,
          categoria: tpl.categoria,
          descricao: tpl.descricao,
          valor: tpl.valor,
          clinica_id: tpl.clinica_id,
          recorrente: true,
        })
        created++
      }
    }
    return created
  }

  // Eventos
  async listEventos(): Promise<Evento[]> {
    const { data, error } = await this.client
      .from('eventos')
      .select('*')
      .order('data', { ascending: true })
      .order('hora_inicio', { ascending: true })
    if (error) throw new Error(error.message)
    return (data ?? []) as Evento[]
  }

  async createEvento(payload: Omit<Evento, 'id' | 'user_id'>): Promise<Evento> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('eventos')
      .insert({ ...payload, user_id: userId })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Evento
  }

  async updateEvento(id: string, patch: Partial<Evento>): Promise<Evento> {
    const { data, error } = await this.client
      .from('eventos')
      .update(patch)
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Evento
  }

  async deleteEvento(id: string): Promise<void> {
    const { error } = await this.client.from('eventos').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  // Simulações
  async listSimulacoes(): Promise<Simulacao[]> {
    const { data, error } = await this.client
      .from('simulacoes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    return (data ?? []).map((s) => ({
      ...s,
      km: Number(s.km),
      preco_combustivel: Number(s.preco_combustivel),
      consumo: Number(s.consumo),
      pedagio: Number(s.pedagio),
      desgaste_km: Number(s.desgaste_km),
      extras: Number(s.extras),
      n_exames: Number(s.n_exames),
      margem: Number(s.margem),
      custo_total: Number(s.custo_total),
      custo_por_exame: Number(s.custo_por_exame),
      valor_sugerido: Number(s.valor_sugerido),
    })) as Simulacao[]
  }

  async createSimulacao(payload: Omit<Simulacao, 'id' | 'user_id' | 'created_at'>): Promise<Simulacao> {
    const userId = await this.requireUserId()
    const { data, error } = await this.client
      .from('simulacoes')
      .insert({ ...payload, user_id: userId })
      .select('*')
      .single()
    if (error) throw new Error(error.message)
    return data as Simulacao
  }

  async deleteSimulacao(id: string): Promise<void> {
    const { error } = await this.client.from('simulacoes').delete().eq('id', id)
    if (error) throw new Error(error.message)
  }

  async exportBackup(): Promise<BackupData> {
    const [
      profile,
      parcelas_maquina,
      veiculo,
      clinicas,
      tutores,
      pacientes,
      tabela_precos,
      tabela_precos_clinica,
      atendimentos,
      despesas,
      eventos,
      simulacoes,
    ] = await Promise.all([
      this.getProfile(),
      this.listParcelasMaquina(),
      this.getVeiculo(),
      this.listClinicas(),
      this.listTutores(),
      this.listPacientes(),
      this.listTabelaPrecos(),
      this.listTabelaPrecosClinica(),
      this.listAtendimentos(),
      this.listDespesas(),
      this.listEventos(),
      this.listSimulacoes(),
    ])

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      profile,
      parcelas_maquina,
      veiculo,
      clinicas,
      tutores,
      pacientes,
      tabela_precos,
      tabela_precos_clinica,
      atendimentos,
      despesas,
      eventos,
      simulacoes,
    }
  }

  subscribeChanges(onChange: () => void): () => void {
    const channel = this.client
      .channel('radiologia-nr-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'atendimentos' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'despesas' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'parcelas_maquina' }, onChange)
      .subscribe()

    return () => {
      this.client.removeChannel(channel)
    }
  }
}
