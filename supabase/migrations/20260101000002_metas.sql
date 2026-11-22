-- ============================================================================
-- RADIOLOGIA NR - Tabela de Metas (Aparelho de Raio X, Viagem, Celular, etc.)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.metas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  valor_parcela NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (valor_parcela >= 0),
  parcelas_restantes INTEGER NOT NULL DEFAULT 1 CHECK (parcelas_restantes >= 0),
  dia_vencimento INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento BETWEEN 1 AND 31),
  principal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metas_user ON public.metas(user_id);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "metas_all_own" ON public.metas
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.metas TO authenticated, service_role;
