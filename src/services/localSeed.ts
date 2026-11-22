import { format, subDays, subMonths, addDays } from 'date-fns'
import type {
  Atendimento,
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
  Veiculo,
} from '@/types'

export const DEMO_USER_ID = 'demo-nathalia-0001'

export interface LocalStoreState {
  profile: Profile
  parcelas_maquina: ParcelaMaquina[]
  metas?: Meta[]
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

function iso(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function createInitialSeedState(): LocalStoreState {
  const now = new Date()
  const today = iso(now)

  const profile: Profile = {
    id: DEMO_USER_ID,
    nome: 'Nathalia Rangel',
    logo_url: '/logo.png',
    parcela_maquina: 3700,
    parcelas_restantes: 24,
    dia_vencimento_parcela: 10,
    margem_padrao: 35,
    endereco_base: 'Rua Vergueiro, 1000 - Paraíso, São Paulo - SP',
  }

  const veiculo: Veiculo = {
    id: 'veic-1',
    user_id: DEMO_USER_ID,
    modelo: '', // Vazio até a usuária preencher
    ano: null,
    combustivel: 'flex',
    consumo_cidade: 10,
    consumo_estrada: 13,
    preco_combustivel: 6.0,
    desgaste_por_km: 0.3,
    custo_fixo_mensal: 0,
  }

  const clinicas: Clinica[] = [
    {
      id: 'cli-1',
      user_id: DEMO_USER_ID,
      nome: 'Clínica Vet Vida',
      responsavel: 'Dra. Camila Souza',
      telefone: '11998765432',
      endereco: 'Av. Paulista, 1200 - Bela Vista, São Paulo - SP',
      distancia_km: 12.5,
      pedagio_padrao: 0,
      observacoes: 'Atendimento preferencial pela manhã. Pagamento semanal via Pix.',
      ativo: true,
    },
    {
      id: 'cli-2',
      user_id: DEMO_USER_ID,
      nome: 'Hospital Pet Care',
      responsavel: 'Dr. Marcos Lima',
      telefone: '11987654321',
      endereco: 'Rua Augusta, 2450 - Jardins, São Paulo - SP',
      distancia_km: 18.0,
      pedagio_padrao: 11.4,
      observacoes: 'Estacionamento conveniado na entrada lateral.',
      ativo: true,
    },
    {
      id: 'cli-3',
      user_id: DEMO_USER_ID,
      nome: 'Centro Vet Amigo Fiel',
      responsavel: 'Dra. Fernanda Rocha',
      telefone: '11976543210',
      endereco: 'Av. Brig. Faria Lima, 3100 - Itaim Bibi, São Paulo - SP',
      distancia_km: 26.0,
      pedagio_padrao: 16.8,
      observacoes: 'Fecha faturamento todo dia 15 e dia 30.',
      ativo: true,
    },
    {
      id: 'cli-4',
      user_id: DEMO_USER_ID,
      nome: 'Clínica Patas & Focinhos',
      responsavel: 'Dr. Rafael Mendes',
      telefone: '11965432109',
      endereco: 'Rua Domingos de Morais, 1850 - Vila Mariana, São Paulo - SP',
      distancia_km: 8.5,
      pedagio_padrao: 0,
      observacoes: 'Muitos exames ortopédicos.',
      ativo: true,
    },
  ]

  const tutores: Tutor[] = [
    { id: 'tut-1', user_id: DEMO_USER_ID, nome: 'Mariana Costa', telefone: '11991112222' },
    { id: 'tut-2', user_id: DEMO_USER_ID, nome: 'Carlos Eduardo', telefone: '11993334444' },
    { id: 'tut-3', user_id: DEMO_USER_ID, nome: 'Juliana Almeida', telefone: '11995556666' },
    { id: 'tut-4', user_id: DEMO_USER_ID, nome: 'Roberto Ferreira', telefone: '11997778888' },
  ]

  const pacientes: Paciente[] = [
    { id: 'pac-1', user_id: DEMO_USER_ID, nome: 'Thor', especie: 'Canino', raca: 'Golden Retriever', tutor_id: 'tut-1', clinica_id: 'cli-1' },
    { id: 'pac-2', user_id: DEMO_USER_ID, nome: 'Luna', especie: 'Felino', raca: 'SRD', tutor_id: 'tut-2', clinica_id: 'cli-2' },
    { id: 'pac-3', user_id: DEMO_USER_ID, nome: 'Mel', especie: 'Canino', raca: 'Shih Tzu', tutor_id: 'tut-3', clinica_id: 'cli-3' },
    { id: 'pac-4', user_id: DEMO_USER_ID, nome: 'Bob', especie: 'Canino', raca: 'Bulldog Francês', tutor_id: 'tut-4', clinica_id: 'cli-4' },
  ]

  // Seed inicial da tabela de preços: apenas valores de referência do papel, sem atribuir significado aos códigos
  const tabela_precos: TabelaPreco[] = [
    { id: 'tp-1', user_id: DEMO_USER_ID, codigo: 'Sugestão 37', descricao: 'Valor de referência R$ 37,00', valor_padrao: 37, adicional_urgencia: 33, ativo: true },
    { id: 'tp-2', user_id: DEMO_USER_ID, codigo: 'Sugestão 47', descricao: 'Valor de referência R$ 47,00', valor_padrao: 47, adicional_urgencia: 38, ativo: true },
    { id: 'tp-3', user_id: DEMO_USER_ID, codigo: 'Urgência 70', descricao: 'Valor de referência urgência R$ 70,00', valor_padrao: 70, adicional_urgencia: 0, ativo: true },
    { id: 'tp-4', user_id: DEMO_USER_ID, codigo: 'Urgência 85', descricao: 'Valor de referência urgência R$ 85,00', valor_padrao: 85, adicional_urgencia: 0, ativo: true },
  ]

  const tabela_precos_clinica: TabelaPrecoClinica[] = []

  // Atendimentos no mês atual (soma ~R$ 2.345,00 para mostrar progresso realista na barra de R$ 3.700,00)
  const makeAtend = (
    id: string,
    dataStr: string,
    clinica_id: string,
    paciente_id: string | null,
    tutor_id: string | null,
    paciente_nome: string,
    tutor_nome: string,
    urgente: boolean,
    status_pagamento: 'pago' | 'nao_pago',
    forma_pagamento: string,
    itens: Array<{ id: string; especificacao: string; quantidade: number; valor_unitario: number }>,
    observacoes = ''
  ): Atendimento => {
    const mapped = itens.map((it) => ({
      ...it,
      atendimento_id: id,
      valor_total: it.quantidade * it.valor_unitario,
    }))
    const total = mapped.reduce((acc, i) => acc + i.valor_total, 0)
    return {
      id,
      user_id: DEMO_USER_ID,
      data: dataStr,
      clinica_id,
      paciente_id,
      tutor_id,
      paciente_nome,
      tutor_nome,
      servico: 'Raio X',
      urgente,
      status_pagamento,
      forma_pagamento: status_pagamento === 'pago' ? forma_pagamento : '',
      data_pagamento: status_pagamento === 'pago' ? dataStr : null,
      observacoes,
      total,
      itens: mapped,
    }
  }

  const dayOfMonth = now.getDate()
  const safeDay = (offset: number) => iso(subDays(now, Math.min(offset, Math.max(0, dayOfMonth - 1))))

  const atendimentos: Atendimento[] = [
    // Mês atual
    makeAtend('at-1', safeDay(0), 'cli-1', 'pac-1', 'tut-1', 'Thor', 'Mariana Costa', false, 'pago', 'Pix', [
      { id: 'it-1', especificacao: '210', quantidade: 4, valor_unitario: 47 },
      { id: 'it-2', especificacao: '123', quantidade: 2, valor_unitario: 37 },
    ], 'Laudo enviado por WhatsApp'),
    makeAtend('at-2', safeDay(1), 'cli-2', 'pac-2', 'tut-2', 'Luna', 'Carlos Eduardo', true, 'nao_pago', '', [
      { id: 'it-3', especificacao: '310', quantidade: 3, valor_unitario: 85 },
    ], 'Urgência noturna'),
    makeAtend('at-3', safeDay(2), 'cli-3', 'pac-3', 'tut-3', 'Mel', 'Juliana Almeida', false, 'nao_pago', '', [
      { id: 'it-4', especificacao: '410', quantidade: 6, valor_unitario: 47 },
      { id: 'it-5', especificacao: '210', quantidade: 4, valor_unitario: 47 },
    ], 'Faturado quinzenal'),
    makeAtend('at-4', safeDay(4), 'cli-4', 'pac-4', 'tut-4', 'Bob', 'Roberto Ferreira', false, 'pago', 'Pix', [
      { id: 'it-6', especificacao: '210', quantidade: 5, valor_unitario: 47 },
      { id: 'it-7', especificacao: '123', quantidade: 3, valor_unitario: 37 },
    ]),
    makeAtend('at-5', safeDay(6), 'cli-1', null, null, 'Nina', 'Patrícia Silva', true, 'pago', 'Pix', [
      { id: 'it-8', especificacao: '310', quantidade: 4, valor_unitario: 70 },
    ]),
    makeAtend('at-6', safeDay(8), 'cli-2', null, null, 'Rex', 'André Oliveira', false, 'pago', 'Transferência / TED', [
      { id: 'it-9', especificacao: '410', quantidade: 8, valor_unitario: 47 },
      { id: 'it-10', especificacao: '123', quantidade: 5, valor_unitario: 37 },
    ]),

    // Meses anteriores (para gráfico de 6 meses ficar completo)
    makeAtend('at-m1-1', iso(subMonths(now, 1)), 'cli-1', 'pac-1', 'tut-1', 'Thor', 'Mariana Costa', false, 'pago', 'Pix', [
      { id: 'it-m1-1', especificacao: '210', quantidade: 32, valor_unitario: 47 },
    ]),
    makeAtend('at-m1-2', iso(subMonths(now, 1)), 'cli-2', 'pac-2', 'tut-2', 'Luna', 'Carlos Eduardo', true, 'pago', 'Pix', [
      { id: 'it-m1-2', especificacao: '310', quantidade: 24, valor_unitario: 85 },
    ]),
    makeAtend('at-m1-3', iso(subMonths(now, 1)), 'cli-3', 'pac-3', 'tut-3', 'Mel', 'Juliana Almeida', false, 'pago', 'Transferência / TED', [
      { id: 'it-m1-3', especificacao: '410', quantidade: 35, valor_unitario: 47 },
    ]),

    makeAtend('at-m2-1', iso(subMonths(now, 2)), 'cli-1', null, null, 'Pipoca', 'Fernanda Dias', false, 'pago', 'Pix', [
      { id: 'it-m2-1', especificacao: '210', quantidade: 40, valor_unitario: 47 },
    ]),
    makeAtend('at-m2-2', iso(subMonths(now, 2)), 'cli-4', null, null, 'Simba', 'Lucas Rocha', true, 'pago', 'Pix', [
      { id: 'it-m2-2', especificacao: '310', quantidade: 30, valor_unitario: 85 },
    ]),

    makeAtend('at-m3-1', iso(subMonths(now, 3)), 'cli-2', null, null, 'Amora', 'Beatriz Lima', false, 'pago', 'Pix', [
      { id: 'it-m3-1', especificacao: '210', quantidade: 48, valor_unitario: 47 },
    ]),
    makeAtend('at-m3-2', iso(subMonths(now, 3)), 'cli-3', null, null, 'Max', 'Thiago Souza', false, 'pago', 'Pix', [
      { id: 'it-m3-2', especificacao: '123', quantidade: 45, valor_unitario: 37 },
    ]),

    makeAtend('at-m4-1', iso(subMonths(now, 4)), 'cli-1', null, null, 'Lola', 'Camila Prado', false, 'pago', 'Pix', [
      { id: 'it-m4-1', especificacao: '210', quantidade: 52, valor_unitario: 47 },
    ]),
    makeAtend('at-m4-2', iso(subMonths(now, 4)), 'cli-2', null, null, 'Zeus', 'Bruno Costa', true, 'pago', 'Pix', [
      { id: 'it-m4-2', especificacao: '310', quantidade: 28, valor_unitario: 70 },
    ]),

    makeAtend('at-m5-1', iso(subMonths(now, 5)), 'cli-4', null, null, 'Bela', 'Renata Alves', false, 'pago', 'Pix', [
      { id: 'it-m5-1', especificacao: '210', quantidade: 44, valor_unitario: 47 },
    ]),
    makeAtend('at-m5-2', iso(subMonths(now, 5)), 'cli-3', null, null, 'Fred', 'Pedro Nunes', true, 'pago', 'Pix', [
      { id: 'it-m5-2', especificacao: '310', quantidade: 26, valor_unitario: 85 },
    ]),
  ]

  const despesas: Despesa[] = [
    // Mês atual
    { id: 'desp-1', user_id: DEMO_USER_ID, data: safeDay(1), categoria: 'Combustível', descricao: 'Abastecimento gasolina comum', valor: 265.0, clinica_id: null, recorrente: false },
    { id: 'desp-2', user_id: DEMO_USER_ID, data: safeDay(2), categoria: 'Pedágio', descricao: 'Pedágio rota Itaim / Jardins', valor: 28.2, clinica_id: 'cli-3', recorrente: false },
    { id: 'desp-3', user_id: DEMO_USER_ID, data: safeDay(3), categoria: 'Estacionamento', descricao: 'Estacionamento próximo à Vet Vida', valor: 22.0, clinica_id: 'cli-1', recorrente: false },
    { id: 'desp-4', user_id: DEMO_USER_ID, data: safeDay(5), categoria: 'EPIs/dosímetro', descricao: 'Mensalidade dosímetro individual', valor: 65.0, clinica_id: null, recorrente: true },
    { id: 'desp-5', user_id: DEMO_USER_ID, data: safeDay(6), categoria: 'Seguro', descricao: 'Seguro equipamento + veículo', valor: 290.0, clinica_id: null, recorrente: true },

    // Meses anteriores (para histórico do gráfico)
    { id: 'desp-m1-1', user_id: DEMO_USER_ID, data: iso(subMonths(now, 1)), categoria: 'Parcela da máquina de raio X', descricao: 'Parcela mensal máquina de raio X', valor: 3700, clinica_id: null, recorrente: false },
    { id: 'desp-m1-2', user_id: DEMO_USER_ID, data: iso(subMonths(now, 1)), categoria: 'Combustível', descricao: 'Combustível do mês', valor: 720, clinica_id: null, recorrente: false },
    { id: 'desp-m2-1', user_id: DEMO_USER_ID, data: iso(subMonths(now, 2)), categoria: 'Parcela da máquina de raio X', descricao: 'Parcela mensal máquina de raio X', valor: 3700, clinica_id: null, recorrente: false },
    { id: 'desp-m2-2', user_id: DEMO_USER_ID, data: iso(subMonths(now, 2)), categoria: 'Combustível', descricao: 'Combustível do mês', valor: 650, clinica_id: null, recorrente: false },
    { id: 'desp-m3-1', user_id: DEMO_USER_ID, data: iso(subMonths(now, 3)), categoria: 'Parcela da máquina de raio X', descricao: 'Parcela mensal máquina de raio X', valor: 3700, clinica_id: null, recorrente: false },
    { id: 'desp-m3-2', user_id: DEMO_USER_ID, data: iso(subMonths(now, 3)), categoria: 'Manutenção do carro', descricao: 'Troca de óleo e filtros', valor: 480, clinica_id: null, recorrente: false },
    { id: 'desp-m4-1', user_id: DEMO_USER_ID, data: iso(subMonths(now, 4)), categoria: 'Parcela da máquina de raio X', descricao: 'Parcela mensal máquina de raio X', valor: 3700, clinica_id: null, recorrente: false },
    { id: 'desp-m4-2', user_id: DEMO_USER_ID, data: iso(subMonths(now, 4)), categoria: 'Combustível', descricao: 'Combustível do mês', valor: 590, clinica_id: null, recorrente: false },
    { id: 'desp-m5-1', user_id: DEMO_USER_ID, data: iso(subMonths(now, 5)), categoria: 'Parcela da máquina de raio X', descricao: 'Parcela mensal máquina de raio X', valor: 3700, clinica_id: null, recorrente: false },
    { id: 'desp-m5-2', user_id: DEMO_USER_ID, data: iso(subMonths(now, 5)), categoria: 'Combustível', descricao: 'Combustível do mês', valor: 610, clinica_id: null, recorrente: false },
  ]

  const eventos: Evento[] = [
    {
      id: 'ev-1',
      user_id: DEMO_USER_ID,
      clinica_id: 'cli-1',
      titulo: 'Visita Clínica Vet Vida',
      data: today,
      hora_inicio: '09:30',
      hora_fim: '11:00',
      status: 'agendado',
      observacoes: '3 exames agendados (tórax + coluna)',
    },
    {
      id: 'ev-2',
      user_id: DEMO_USER_ID,
      clinica_id: 'cli-2',
      titulo: 'Visita Hospital Pet Care',
      data: today,
      hora_inicio: '14:00',
      hora_fim: '15:30',
      status: 'agendado',
      observacoes: 'Confirmar sala de apoio com Dr. Marcos',
    },
    {
      id: 'ev-3',
      user_id: DEMO_USER_ID,
      clinica_id: 'cli-3',
      titulo: 'Visita Centro Vet Amigo Fiel',
      data: iso(addDays(now, 1)),
      hora_inicio: '10:00',
      hora_fim: '11:30',
      status: 'agendado',
      observacoes: 'Levar avental extra',
    },
    {
      id: 'ev-4',
      user_id: DEMO_USER_ID,
      clinica_id: 'cli-4',
      titulo: 'Visita Patas & Focinhos',
      data: iso(addDays(now, 3)),
      hora_inicio: '15:00',
      hora_fim: '16:30',
      status: 'agendado',
      observacoes: 'Avaliação ortopédica',
    },
  ]

  const simulacoes: Simulacao[] = [
    {
      id: 'sim-1',
      user_id: DEMO_USER_ID,
      clinica_id: 'cli-3',
      clinica_nome: 'Centro Vet Amigo Fiel',
      km: 26,
      ida_volta: true,
      preco_combustivel: 6.0,
      consumo: 10,
      pedagio: 16.8,
      desgaste_km: 0.3,
      extras: 10,
      n_exames: 3,
      margem: 35,
      custo_total: 73.6,
      custo_por_exame: 24.53,
      valor_sugerido: 37.74,
      created_at: new Date().toISOString(),
    },
  ]

  return {
    profile,
    parcelas_maquina: [],
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
