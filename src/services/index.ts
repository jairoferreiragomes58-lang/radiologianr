import { LocalRepository } from './localRepository'
import { SupabaseRepository } from './supabaseRepository'
import type { IRepository } from './repository'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const repository: IRepository = isSupabaseConfigured
  ? new SupabaseRepository(supabaseUrl!, supabaseAnonKey!)
  : new LocalRepository()

export type { IRepository, AtendimentoInput } from './repository'
