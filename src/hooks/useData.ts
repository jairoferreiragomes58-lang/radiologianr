import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { repository, type AtendimentoInput } from '@/services'
import type { Clinica, Despesa, Evento, Meta, Paciente, Profile, Simulacao, TabelaPreco, TabelaPrecoClinica, Tutor, Veiculo } from '@/types'

export const queryKeys = {
  profile: ['profile'] as const,
  parcelas: ['parcelas_maquina'] as const,
  metas: ['metas'] as const,
  veiculo: ['veiculo'] as const,
  clinicas: ['clinicas'] as const,
  tutores: ['tutores'] as const,
  pacientes: ['pacientes'] as const,
  tabelaPrecos: ['tabela_precos'] as const,
  tabelaPrecosClinica: (clinicaId?: string) => ['tabela_precos_clinica', clinicaId ?? 'all'] as const,
  atendimentos: ['atendimentos'] as const,
  despesas: ['despesas'] as const,
  eventos: ['eventos'] as const,
  simulacoes: ['simulacoes'] as const,
}

export function useRealtimeSync() {
  const qc = useQueryClient()
  useEffect(() => {
    if (!repository.subscribeChanges) return
    return repository.subscribeChanges(() => {
      qc.invalidateQueries({ queryKey: queryKeys.atendimentos })
      qc.invalidateQueries({ queryKey: queryKeys.despesas })
      qc.invalidateQueries({ queryKey: queryKeys.profile })
      qc.invalidateQueries({ queryKey: queryKeys.parcelas })
      qc.invalidateQueries({ queryKey: queryKeys.metas })
    })
  }, [qc])
}

// Queries
export const useProfile = () =>
  useQuery({ queryKey: queryKeys.profile, queryFn: () => repository.getProfile() })

export const useParcelasMaquina = () =>
  useQuery({ queryKey: queryKeys.parcelas, queryFn: () => repository.listParcelasMaquina() })

export const useMetas = () =>
  useQuery({ queryKey: queryKeys.metas, queryFn: () => repository.listMetas() })

export const useVeiculo = () =>
  useQuery({ queryKey: queryKeys.veiculo, queryFn: () => repository.getVeiculo() })

export const useClinicas = () =>
  useQuery({ queryKey: queryKeys.clinicas, queryFn: () => repository.listClinicas() })

export const useTutores = () =>
  useQuery({ queryKey: queryKeys.tutores, queryFn: () => repository.listTutores() })

export const usePacientes = () =>
  useQuery({ queryKey: queryKeys.pacientes, queryFn: () => repository.listPacientes() })

export const useTabelaPrecos = () =>
  useQuery({ queryKey: queryKeys.tabelaPrecos, queryFn: () => repository.listTabelaPrecos() })

export const useTabelaPrecosClinica = (clinicaId?: string) =>
  useQuery({
    queryKey: queryKeys.tabelaPrecosClinica(clinicaId),
    queryFn: () => repository.listTabelaPrecosClinica(clinicaId),
  })

export const useAtendimentos = () =>
  useQuery({ queryKey: queryKeys.atendimentos, queryFn: () => repository.listAtendimentos() })

export const useDespesas = () =>
  useQuery({ queryKey: queryKeys.despesas, queryFn: () => repository.listDespesas() })

export const useEventos = () =>
  useQuery({ queryKey: queryKeys.eventos, queryFn: () => repository.listEventos() })

export const useSimulacoes = () =>
  useQuery({ queryKey: queryKeys.simulacoes, queryFn: () => repository.listSimulacoes() })

// Mutations
export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Profile>) => repository.updateProfile(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.profile })
      toast.success('Configurações salvas com sucesso!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Meta, 'id' | 'user_id' | 'created_at'>) => repository.createMeta(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.metas })
      toast.success('Nova meta criada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Meta> }) => repository.updateMeta(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.metas })
      qc.invalidateQueries({ queryKey: queryKeys.profile })
      toast.success('Meta atualizada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteMeta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.deleteMeta(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.metas })
      toast.success('Meta removida.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function usePagarParcelaMes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mesReferencia: string) => repository.pagarParcelaMes(mesReferencia),
    onSuccess: ({ profile }) => {
      qc.invalidateQueries({ queryKey: queryKeys.profile })
      qc.invalidateQueries({ queryKey: queryKeys.parcelas })
      qc.invalidateQueries({ queryKey: queryKeys.despesas })
      qc.invalidateQueries({ queryKey: queryKeys.metas })
      if (profile.parcelas_restantes === 0) {
        toast.success('Parabéns! Meta quitada 🎉')
      } else {
        toast.success(`Parcela descontada! Faltam ${profile.parcelas_restantes} parcelas.`)
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateVeiculo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Veiculo>) => repository.updateVeiculo(patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.veiculo })
      toast.success('Dados do veículo atualizados!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateClinica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Clinica, 'id' | 'user_id' | 'created_at'>) => repository.createClinica(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinicas })
      toast.success('Clínica cadastrada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateClinica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Clinica> }) => repository.updateClinica(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinicas })
      toast.success('Clínica atualizada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteClinica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.deleteClinica(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.clinicas })
      toast.success('Clínica removida.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateTutor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Tutor, 'id' | 'user_id'>) => repository.createTutor(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.tutores }),
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreatePaciente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Paciente, 'id' | 'user_id'>) => repository.createPaciente(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.pacientes })
      toast.success('Paciente cadastrado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateTabelaPreco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<TabelaPreco, 'id' | 'user_id'>) => repository.createTabelaPreco(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tabelaPrecos })
      toast.success('Item adicionado à tabela de preços!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateTabelaPreco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TabelaPreco> }) =>
      repository.updateTabelaPreco(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tabelaPrecos })
      toast.success('Preço atualizado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteTabelaPreco() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.deleteTabelaPreco(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tabelaPrecos })
      toast.success('Item removido.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpsertTabelaPrecoClinica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<TabelaPrecoClinica, 'id' | 'user_id'>) => repository.upsertTabelaPrecoClinica(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tabela_precos_clinica'] })
      toast.success('Preço da clínica salvo!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteTabelaPrecoClinica() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.deleteTabelaPrecoClinica(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tabela_precos_clinica'] })
      toast.success('Preço específico removido.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateAtendimento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: AtendimentoInput) => repository.createAtendimento(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.atendimentos })
      toast.success('Atendimento registrado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateAtendimento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AtendimentoInput> }) =>
      repository.updateAtendimento(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.atendimentos })
      toast.success('Atendimento atualizado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteAtendimento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.deleteAtendimento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.atendimentos })
      toast.success('Atendimento excluído.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useMarcarAtendimentosPagos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, formaPagamento }: { ids: string[]; formaPagamento?: string }) =>
      repository.marcarAtendimentosPagos(ids, formaPagamento),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.atendimentos })
      toast.success('Atendimentos marcados como pagos!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateDespesa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Despesa, 'id' | 'user_id' | 'created_at'>) => repository.createDespesa(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.despesas })
      toast.success('Despesa registrada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateDespesa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Despesa> }) => repository.updateDespesa(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.despesas })
      toast.success('Despesa atualizada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteDespesa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.deleteDespesa(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.despesas })
      toast.success('Despesa removida.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useGerarRecorrentes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mesKey: string) => repository.gerarDespesasRecorrentesMes(mesKey),
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: queryKeys.despesas })
      if (count > 0) {
        toast.success(`${count} despesa(s) recorrente(s) lançada(s) neste mês!`)
      } else {
        toast.info('Todas as despesas recorrentes deste mês já foram lançadas.')
      }
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Evento, 'id' | 'user_id'>) => repository.createEvento(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.eventos })
      toast.success('Visita agendada!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Evento> }) => repository.updateEvento(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.eventos })
      toast.success('Evento atualizado!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteEvento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.deleteEvento(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.eventos })
      toast.success('Evento removido.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useCreateSimulacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Simulacao, 'id' | 'user_id' | 'created_at'>) => repository.createSimulacao(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.simulacoes })
      toast.success('Simulação salva no histórico!')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useDeleteSimulacao() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => repository.deleteSimulacao(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.simulacoes })
      toast.success('Simulação removida.')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
