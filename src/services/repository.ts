import type {
  Atendimento,
  AtendimentoItem,
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

export type AtendimentoInput = Omit<Atendimento, 'id' | 'user_id' | 'total' | 'itens' | 'created_at'> & {
  itens: Array<Omit<AtendimentoItem, 'id' | 'atendimento_id' | 'valor_total'>>
}

export interface IRepository {
  readonly mode: 'local' | 'supabase'

  // Auth
  getSession(): Promise<UserSession | null>
  signIn(email: string, password: string): Promise<UserSession>
  signUp(email: string, password: string, nome: string): Promise<UserSession>
  signOut(): Promise<void>
  resetPassword(email: string): Promise<void>
  updateAccount(patch: { nome?: string; email?: string; password?: string }): Promise<UserSession>

  // Profile & Máquina de Raio X
  getProfile(): Promise<Profile>
  updateProfile(patch: Partial<Profile>): Promise<Profile>
  listParcelasMaquina(): Promise<ParcelaMaquina[]>
  pagarParcelaMes(mesReferencia: string): Promise<{ profile: Profile; parcela: ParcelaMaquina; despesa: Despesa }>

  // Metas
  listMetas(): Promise<Meta[]>
  createMeta(data: Omit<Meta, 'id' | 'user_id' | 'created_at'>): Promise<Meta>
  updateMeta(id: string, patch: Partial<Meta>): Promise<Meta>
  deleteMeta(id: string): Promise<void>

  // Veículo
  getVeiculo(): Promise<Veiculo>
  updateVeiculo(patch: Partial<Veiculo>): Promise<Veiculo>

  // Clínicas
  listClinicas(): Promise<Clinica[]>
  createClinica(data: Omit<Clinica, 'id' | 'user_id' | 'created_at'>): Promise<Clinica>
  updateClinica(id: string, patch: Partial<Clinica>): Promise<Clinica>
  deleteClinica(id: string): Promise<void>

  // Tutores & Pacientes
  listTutores(): Promise<Tutor[]>
  createTutor(data: Omit<Tutor, 'id' | 'user_id'>): Promise<Tutor>
  listPacientes(): Promise<Paciente[]>
  createPaciente(data: Omit<Paciente, 'id' | 'user_id'>): Promise<Paciente>
  deletePaciente(id: string): Promise<void>

  // Tabela de Preços
  listTabelaPrecos(): Promise<TabelaPreco[]>
  createTabelaPreco(data: Omit<TabelaPreco, 'id' | 'user_id'>): Promise<TabelaPreco>
  updateTabelaPreco(id: string, patch: Partial<TabelaPreco>): Promise<TabelaPreco>
  deleteTabelaPreco(id: string): Promise<void>

  // Tabela de Preços por Clínica
  listTabelaPrecosClinica(clinicaId?: string): Promise<TabelaPrecoClinica[]>
  upsertTabelaPrecoClinica(data: Omit<TabelaPrecoClinica, 'id' | 'user_id'>): Promise<TabelaPrecoClinica>
  deleteTabelaPrecoClinica(id: string): Promise<void>

  // Atendimentos
  listAtendimentos(): Promise<Atendimento[]>
  createAtendimento(data: AtendimentoInput): Promise<Atendimento>
  updateAtendimento(id: string, data: Partial<AtendimentoInput>): Promise<Atendimento>
  deleteAtendimento(id: string): Promise<void>
  marcarAtendimentosPagos(ids: string[], formaPagamento?: string): Promise<void>

  // Despesas
  listDespesas(): Promise<Despesa[]>
  createDespesa(data: Omit<Despesa, 'id' | 'user_id' | 'created_at'>): Promise<Despesa>
  updateDespesa(id: string, patch: Partial<Despesa>): Promise<Despesa>
  deleteDespesa(id: string): Promise<void>
  gerarDespesasRecorrentesMes(mesKey: string): Promise<number>

  // Agenda / Eventos
  listEventos(): Promise<Evento[]>
  createEvento(data: Omit<Evento, 'id' | 'user_id'>): Promise<Evento>
  updateEvento(id: string, patch: Partial<Evento>): Promise<Evento>
  deleteEvento(id: string): Promise<void>

  // Simulações
  listSimulacoes(): Promise<Simulacao[]>
  createSimulacao(data: Omit<Simulacao, 'id' | 'user_id' | 'created_at'>): Promise<Simulacao>
  deleteSimulacao(id: string): Promise<void>

  // Backup / Reset
  exportBackup(): Promise<BackupData>
  resetDemoData?(): Promise<void>

  // Realtime (opcional, ativo no Supabase)
  subscribeChanges?(onChange: () => void): () => void
}
