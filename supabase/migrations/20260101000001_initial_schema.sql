-- ============================================================================
-- RADIOLOGIA NR - Schema Inicial (Supabase / Postgres)
-- ============================================================================

-- ============================================================================
-- 1. PROFILES (dados da profissional + configuração da máquina de raio X)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT 'Nathalia Rangel',
  logo_url TEXT DEFAULT '/logo.png',
  whatsapp TEXT DEFAULT '',
  parcela_maquina NUMERIC(10, 2) NOT NULL DEFAULT 3700.00,
  parcelas_restantes INTEGER NOT NULL DEFAULT 24 CHECK (parcelas_restantes >= 0),
  dia_vencimento_parcela INTEGER NOT NULL DEFAULT 10 CHECK (dia_vencimento_parcela BETWEEN 1 AND 31),
  margem_padrao NUMERIC(5, 2) NOT NULL DEFAULT 35.00,
  endereco_base TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 2. PARCELAS DA MÁQUINA DE RAIO X (controle anti-duplicidade mensal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.parcelas_maquina (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes_referencia DATE NOT NULL, -- sempre primeiro dia do mês (ex: 2026-11-01)
  valor NUMERIC(10, 2) NOT NULL,
  paga BOOLEAN NOT NULL DEFAULT FALSE,
  data_pagamento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_parcelas_maquina_user_mes UNIQUE (user_id, mes_referencia)
);

-- ============================================================================
-- 3. VEÍCULOS ("Meu carro")
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modelo TEXT DEFAULT '',
  ano INTEGER,
  combustivel TEXT NOT NULL DEFAULT 'flex' CHECK (combustivel IN ('gasolina', 'etanol', 'flex')),
  consumo_cidade NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  consumo_estrada NUMERIC(5, 2) NOT NULL DEFAULT 13.00,
  preco_combustivel NUMERIC(6, 2) NOT NULL DEFAULT 6.00,
  desgaste_por_km NUMERIC(6, 2) NOT NULL DEFAULT 0.30,
  custo_fixo_mensal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. CLÍNICAS (clientes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.clinicas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  responsavel TEXT DEFAULT '',
  telefone TEXT DEFAULT '',
  endereco TEXT DEFAULT '',
  distancia_km NUMERIC(8, 2) NOT NULL DEFAULT 0,
  pedagio_padrao NUMERIC(8, 2) NOT NULL DEFAULT 0,
  observacoes TEXT DEFAULT '',
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. TUTORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tutores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  telefone TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 6. PACIENTES (animais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  especie TEXT NOT NULL DEFAULT 'Canino',
  raca TEXT DEFAULT '',
  tutor_id UUID REFERENCES public.tutores(id) ON DELETE SET NULL,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. TABELA DE PREÇOS GERAL (sugestões opcionais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tabela_precos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  valor_padrao NUMERIC(10, 2) NOT NULL DEFAULT 0,
  adicional_urgencia NUMERIC(10, 2) NOT NULL DEFAULT 0,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 8. TABELA DE PREÇOS POR CLÍNICA (sobrescreve tabela geral)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tabela_precos_clinica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id UUID NOT NULL REFERENCES public.clinicas(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  valor NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_preco_clinica_codigo UNIQUE (user_id, clinica_id, codigo)
);

-- ============================================================================
-- 9. ATENDIMENTOS / VENDAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.atendimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  tutor_id UUID REFERENCES public.tutores(id) ON DELETE SET NULL,
  paciente_nome TEXT DEFAULT '',
  tutor_nome TEXT DEFAULT '',
  servico TEXT NOT NULL DEFAULT 'Raio X',
  urgente BOOLEAN NOT NULL DEFAULT FALSE,
  status_pagamento TEXT NOT NULL DEFAULT 'nao_pago' CHECK (status_pagamento IN ('pago', 'nao_pago')),
  forma_pagamento TEXT DEFAULT '',
  data_pagamento DATE,
  observacoes TEXT DEFAULT '',
  total NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. ITENS DO ATENDIMENTO (especificação manual + valor praticado)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.atendimento_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atendimento_id UUID NOT NULL REFERENCES public.atendimentos(id) ON DELETE CASCADE,
  especificacao TEXT,
  quantidade NUMERIC(8, 2) NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  valor_unitario NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (valor_unitario >= 0),
  valor_total NUMERIC(10, 2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED
);

-- ============================================================================
-- 11. DESPESAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria TEXT NOT NULL,
  descricao TEXT NOT NULL DEFAULT '',
  valor NUMERIC(10, 2) NOT NULL CHECK (valor >= 0),
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  recorrente BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. AGENDA / EVENTOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.eventos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  titulo TEXT DEFAULT '',
  data DATE NOT NULL,
  hora_inicio TIME NOT NULL DEFAULT '09:00',
  hora_fim TIME DEFAULT '10:00',
  status TEXT NOT NULL DEFAULT 'agendado' CHECK (status IN ('agendado', 'realizado', 'cancelado')),
  observacoes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 13. SIMULAÇÕES DE DESLOCAMENTO
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.simulacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clinica_id UUID REFERENCES public.clinicas(id) ON DELETE SET NULL,
  clinica_nome TEXT DEFAULT '',
  km NUMERIC(8, 2) NOT NULL,
  ida_volta BOOLEAN NOT NULL DEFAULT TRUE,
  preco_combustivel NUMERIC(6, 2) NOT NULL,
  consumo NUMERIC(5, 2) NOT NULL,
  pedagio NUMERIC(8, 2) NOT NULL DEFAULT 0,
  desgaste_km NUMERIC(6, 2) NOT NULL DEFAULT 0.30,
  extras NUMERIC(8, 2) NOT NULL DEFAULT 0,
  n_exames INTEGER NOT NULL DEFAULT 1,
  margem NUMERIC(5, 2) NOT NULL DEFAULT 35,
  custo_total NUMERIC(10, 2) NOT NULL,
  custo_por_exame NUMERIC(10, 2) NOT NULL,
  valor_sugerido NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_parcelas_user_mes ON public.parcelas_maquina(user_id, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_veiculos_user ON public.veiculos(user_id);
CREATE INDEX IF NOT EXISTS idx_clinicas_user ON public.clinicas(user_id);
CREATE INDEX IF NOT EXISTS idx_tutores_user ON public.tutores(user_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_user_clinica ON public.pacientes(user_id, clinica_id);
CREATE INDEX IF NOT EXISTS idx_tabela_precos_user ON public.tabela_precos(user_id);
CREATE INDEX IF NOT EXISTS idx_tabela_precos_clinica_user ON public.tabela_precos_clinica(user_id, clinica_id);
CREATE INDEX IF NOT EXISTS idx_atendimentos_user_data ON public.atendimentos(user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_atendimentos_clinica ON public.atendimentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_atendimento_itens_atendimento ON public.atendimento_itens(atendimento_id);
CREATE INDEX IF NOT EXISTS idx_despesas_user_data ON public.despesas(user_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_despesas_clinica ON public.despesas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_eventos_user_data ON public.eventos(user_id, data);
CREATE INDEX IF NOT EXISTS idx_simulacoes_user_created ON public.simulacoes(user_id, created_at DESC);

-- ============================================================================
-- FUNÇÕES E TRIGGERS
-- ============================================================================

-- Recalcula o total do atendimento automaticamente quando itens mudam
CREATE OR REPLACE FUNCTION public.recalcular_total_atendimento()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_atendimento_id UUID;
BEGIN
  v_atendimento_id := COALESCE(NEW.atendimento_id, OLD.atendimento_id);

  UPDATE public.atendimentos
  SET
    total = COALESCE((
      SELECT SUM(quantidade * valor_unitario)
      FROM public.atendimento_itens
      WHERE atendimento_id = v_atendimento_id
    ), 0),
    updated_at = NOW()
  WHERE id = v_atendimento_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalcular_total_atendimento ON public.atendimento_itens;
CREATE TRIGGER trg_recalcular_total_atendimento
AFTER INSERT OR UPDATE OR DELETE ON public.atendimento_itens
FOR EACH ROW
EXECUTE FUNCTION public.recalcular_total_atendimento();

-- Cria profile e veículo padrão quando um novo usuário se cadastra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, parcela_maquina, parcelas_restantes, dia_vencimento_parcela)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', 'Nathalia Rangel'),
    3700.00,
    24,
    10
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.veiculos (user_id, modelo, combustivel, consumo_cidade, consumo_estrada, preco_combustivel, desgaste_por_km, custo_fixo_mensal)
  VALUES (NEW.id, '', 'flex', 10.00, 13.00, 6.00, 0.30, 0.00);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- VIEWS ANALÍTICAS (respeitam RLS do usuário chamador com security_invoker)
-- ============================================================================

CREATE OR REPLACE VIEW public.vw_resumo_mensal
WITH (security_invoker = true) AS
WITH meses AS (
  SELECT user_id, date_trunc('month', data)::DATE AS mes FROM public.atendimentos
  UNION
  SELECT user_id, date_trunc('month', data)::DATE AS mes FROM public.despesas
),
rec AS (
  SELECT
    user_id,
    date_trunc('month', data)::DATE AS mes,
    COALESCE(SUM(total), 0) AS faturado,
    COALESCE(SUM(CASE WHEN status_pagamento = 'pago' THEN total ELSE 0 END), 0) AS recebido,
    COALESCE(SUM(CASE WHEN status_pagamento = 'nao_pago' THEN total ELSE 0 END), 0) AS a_receber,
    COUNT(*) AS total_atendimentos
  FROM public.atendimentos
  GROUP BY user_id, date_trunc('month', data)::DATE
),
desp AS (
  SELECT
    user_id,
    date_trunc('month', data)::DATE AS mes,
    COALESCE(SUM(valor), 0) AS despesas
  FROM public.despesas
  GROUP BY user_id, date_trunc('month', data)::DATE
)
SELECT
  m.user_id,
  m.mes,
  COALESCE(r.faturado, 0) AS faturado,
  COALESCE(r.recebido, 0) AS recebido,
  COALESCE(r.a_receber, 0) AS a_receber,
  COALESCE(d.despesas, 0) AS despesas,
  COALESCE(r.faturado, 0) - COALESCE(d.despesas, 0) AS lucro_liquido,
  COALESCE(r.total_atendimentos, 0) AS total_atendimentos
FROM meses m
LEFT JOIN rec r ON r.user_id = m.user_id AND r.mes = m.mes
LEFT JOIN desp d ON d.user_id = m.user_id AND d.mes = m.mes
ORDER BY m.mes DESC;

CREATE OR REPLACE VIEW public.vw_lucro_clinicas
WITH (security_invoker = true) AS
SELECT
  c.user_id,
  c.id AS clinica_id,
  c.nome AS clinica_nome,
  COALESCE(SUM(a.total), 0) AS total_faturado,
  COALESCE(SUM(CASE WHEN a.status_pagamento = 'pago' THEN a.total ELSE 0 END), 0) AS total_recebido,
  COALESCE(SUM(CASE WHEN a.status_pagamento = 'nao_pago' THEN a.total ELSE 0 END), 0) AS total_a_receber,
  COUNT(DISTINCT a.id) AS total_atendimentos,
  COALESCE((
    SELECT SUM(d.valor)
    FROM public.despesas d
    WHERE d.clinica_id = c.id AND d.user_id = c.user_id
  ), 0) AS despesas_diretas,
  COALESCE(SUM(a.total), 0) - COALESCE((
    SELECT SUM(d.valor)
    FROM public.despesas d
    WHERE d.clinica_id = c.id AND d.user_id = c.user_id
  ), 0) AS lucro_estimado
FROM public.clinicas c
LEFT JOIN public.atendimentos a ON a.clinica_id = c.id AND a.user_id = c.user_id
GROUP BY c.user_id, c.id, c.nome;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcelas_maquina ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_precos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabela_precos_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atendimento_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulacoes ENABLE ROW LEVEL SECURITY;

-- Policies profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Policies tabelas com user_id
CREATE POLICY "parcelas_maquina_all_own" ON public.parcelas_maquina FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "veiculos_all_own" ON public.veiculos FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "clinicas_all_own" ON public.clinicas FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tutores_all_own" ON public.tutores FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "pacientes_all_own" ON public.pacientes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tabela_precos_all_own" ON public.tabela_precos FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "tabela_precos_clinica_all_own" ON public.tabela_precos_clinica FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "atendimentos_all_own" ON public.atendimentos FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "despesas_all_own" ON public.despesas FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "eventos_all_own" ON public.eventos FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "simulacoes_all_own" ON public.simulacoes FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Policy atendimento_itens (verifica ownership pelo atendimento pai)
CREATE POLICY "atendimento_itens_all_own" ON public.atendimento_itens
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.atendimentos a
    WHERE a.id = atendimento_itens.atendimento_id
      AND a.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.atendimentos a
    WHERE a.id = atendimento_itens.atendimento_id
      AND a.user_id = auth.uid()
  )
);

-- ============================================================================
-- PERMISSÕES (GRANTS) PARA ROLES DO SUPABASE (RLS continua protegendo tudo)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
