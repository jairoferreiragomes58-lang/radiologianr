export interface UserSession {
  id: string
  email: string
  nome: string
}

export interface Profile {
  id: string
  nome: string
  logo_url: string
  whatsapp?: string
  parcela_maquina: number
  parcelas_restantes: number
  dia_vencimento_parcela: number
  margem_padrao: number
  endereco_base: string
}

export interface Meta {
  id: string
  user_id: string
  titulo: string
  valor_parcela: number
  parcelas_restantes: number
  dia_vencimento: number
  principal: boolean
  created_at?: string
}

export interface ParcelaMaquina {
  id: string
  user_id: string
  mes_referencia: string // YYYY-MM-01
  valor: number
  paga: boolean
  data_pagamento: string | null
}

export type TipoCombustivel = 'gasolina' | 'etanol' | 'flex'

export interface Veiculo {
  id: string
  user_id: string
  modelo: string
  ano: number | null
  combustivel: TipoCombustivel
  consumo_cidade: number
  consumo_estrada: number
  preco_combustivel: number
  desgaste_por_km: number
  custo_fixo_mensal: number
}

export interface Clinica {
  id: string
  user_id: string
  nome: string
  responsavel: string
  telefone: string
  endereco: string
  distancia_km: number
  pedagio_padrao: number
  observacoes: string
  ativo: boolean
  created_at?: string
}

export interface Tutor {
  id: string
  user_id: string
  nome: string
  telefone: string
}

export interface Paciente {
  id: string
  user_id: string
  nome: string
  especie: string
  raca: string
  tutor_id: string | null
  clinica_id: string | null
}

export interface TabelaPreco {
  id: string
  user_id: string
  codigo: string
  descricao: string
  valor_padrao: number
  adicional_urgencia: number
  ativo: boolean
}

export interface TabelaPrecoClinica {
  id: string
  user_id: string
  clinica_id: string
  codigo: string
  valor: number
}

export interface AtendimentoItem {
  id: string
  atendimento_id: string
  especificacao: string
  quantidade: number
  valor_unitario: number
  valor_total: number
}

export type StatusPagamento = 'pago' | 'nao_pago'

export interface Atendimento {
  id: string
  user_id: string
  data: string // YYYY-MM-DD
  clinica_id: string | null
  paciente_id: string | null
  tutor_id: string | null
  paciente_nome: string
  tutor_nome: string
  servico: string
  urgente: boolean
  status_pagamento: StatusPagamento
  forma_pagamento: string
  data_pagamento: string | null
  observacoes: string
  total: number
  itens: AtendimentoItem[]
  created_at?: string
}

export type CategoriaDespesa =
  | 'Combustível'
  | 'Pedágio'
  | 'Estacionamento'
  | 'Manutenção do carro'
  | 'Parcela da máquina de raio X'
  | 'Material/insumos'
  | 'EPIs/dosímetro'
  | 'Impostos'
  | 'Seguro'
  | 'Outros'

export const CATEGORIAS_DESPESA: CategoriaDespesa[] = [
  'Combustível',
  'Pedágio',
  'Estacionamento',
  'Manutenção do carro',
  'Parcela da máquina de raio X',
  'Material/insumos',
  'EPIs/dosímetro',
  'Impostos',
  'Seguro',
  'Outros',
]

export const FORMAS_PAGAMENTO = [
  'Pix',
  'Dinheiro',
  'Cartão de Débito',
  'Cartão de Crédito',
  'Transferência / TED',
  'Boleto / Faturado',
]

export interface Despesa {
  id: string
  user_id: string
  data: string // YYYY-MM-DD
  categoria: string
  descricao: string
  valor: number
  clinica_id: string | null
  recorrente: boolean
  created_at?: string
}

export type StatusEvento = 'agendado' | 'realizado' | 'cancelado'

export interface Evento {
  id: string
  user_id: string
  clinica_id: string | null
  titulo: string
  data: string // YYYY-MM-DD
  hora_inicio: string // HH:mm
  hora_fim: string // HH:mm
  status: StatusEvento
  observacoes: string
}

export interface Simulacao {
  id: string
  user_id: string
  clinica_id: string | null
  clinica_nome: string
  km: number
  ida_volta: boolean
  preco_combustivel: number
  consumo: number
  pedagio: number
  desgaste_km: number
  extras: number
  n_exames: number
  margem: number
  custo_total: number
  custo_por_exame: number
  valor_sugerido: number
  created_at: string
}

export interface BackupData {
  exportedAt: string
  version: string
  profile: Profile
  parcelas_maquina: ParcelaMaquina[]
  veiculo: Veiculo
  clinicas: Clinica[]
  tutores: Tutor[]
  pacientes: Paciente[]
  tabela_precos: TabelaPreco[]
  tabela_precos_clinica: TabelaPrecoClinica[]
  atendimentos: Atendimento[]
  despesas: Despesa[]
  eventos: Evento[]
  simulacoes: Simulacao[]
}
