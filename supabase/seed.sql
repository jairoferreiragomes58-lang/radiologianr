-- ============================================================================
-- RADIOLOGIA NR - Seed de Exemplo
-- ============================================================================
-- Uso: substitua o UUID abaixo pelo ID do usuário criado no Supabase Auth
-- ou execute após criar a primeira conta (o bloco DO busca o primeiro usuário).
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_clinica_1 UUID;
  v_clinica_2 UUID;
  v_clinica_3 UUID;
  v_tutor_1 UUID;
  v_tutor_2 UUID;
  v_pac_1 UUID;
  v_pac_2 UUID;
  v_atend_1 UUID;
  v_atend_2 UUID;
BEGIN
  SELECT id INTO v_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Nenhum usuário encontrado em auth.users. Crie uma conta primeiro e rode o seed novamente.';
    RETURN;
  END IF;

  -- Perfil padrão (R$ 3.700,00 / 24 parcelas)
  INSERT INTO public.profiles (id, nome, parcela_maquina, parcelas_restantes, dia_vencimento_parcela, margem_padrao)
  VALUES (v_user_id, 'Nathalia Rangel', 3700.00, 24, 10, 35.00)
  ON CONFLICT (id) DO NOTHING;

  -- Veículo de exemplo (modelo vazio até a usuária preencher)
  IF NOT EXISTS (SELECT 1 FROM public.veiculos WHERE user_id = v_user_id) THEN
    INSERT INTO public.veiculos (user_id, modelo, ano, combustivel, consumo_cidade, consumo_estrada, preco_combustivel, desgaste_por_km, custo_fixo_mensal)
    VALUES (v_user_id, '', NULL, 'flex', 10.00, 13.00, 6.00, 0.30, 0.00);
  END IF;

  -- Tabela de preços sugeridos (apenas valores de referência, sem atribuir significado aos códigos)
  INSERT INTO public.tabela_precos (user_id, codigo, descricao, valor_padrao, adicional_urgencia, ativo)
  VALUES
    (v_user_id, 'Padrão A', 'Sugestão de valor (edite o código conforme seu uso)', 37.00, 33.00, TRUE),
    (v_user_id, 'Padrão B', 'Sugestão de valor (edite o código conforme seu uso)', 47.00, 38.00, TRUE),
    (v_user_id, 'Urgência A', 'Sugestão de valor urgência', 70.00, 0.00, TRUE),
    (v_user_id, 'Urgência B', 'Sugestão de valor urgência', 85.00, 0.00, TRUE);

  -- Clínicas de exemplo
  INSERT INTO public.clinicas (user_id, nome, responsavel, telefone, endereco, distancia_km, pedagio_padrao, observacoes)
  VALUES (v_user_id, 'Clínica Vet Vida', 'Dra. Camila Souza', '11998765432', 'Av. Paulista, 1200 - Bela Vista, São Paulo - SP', 14.5, 0, 'Atendimento preferencial pela manhã')
  RETURNING id INTO v_clinica_1;

  INSERT INTO public.clinicas (user_id, nome, responsavel, telefone, endereco, distancia_km, pedagio_padrao, observacoes)
  VALUES (v_user_id, 'Hospital Pet Care', 'Dr. Marcos Lima', '11987654321', 'Rua Augusta, 2450 - Jardins, São Paulo - SP', 22.0, 11.40, 'Possui estacionamento conveniado')
  RETURNING id INTO v_clinica_2;

  INSERT INTO public.clinicas (user_id, nome, responsavel, telefone, endereco, distancia_km, pedagio_padrao, observacoes)
  VALUES (v_user_id, 'Centro Veterinário Amigo Fiel', 'Dra. Fernanda Rocha', '11976543210', 'Av. Faria Lima, 3100 - Itaim Bibi, São Paulo - SP', 31.0, 16.80, 'Pagamento quinzenal via Pix')
  RETURNING id INTO v_clinica_3;

  -- Tutores e Pacientes
  INSERT INTO public.tutores (user_id, nome, telefone) VALUES (v_user_id, 'Mariana Costa', '11991112222') RETURNING id INTO v_tutor_1;
  INSERT INTO public.tutores (user_id, nome, telefone) VALUES (v_user_id, 'Carlos Eduardo', '11993334444') RETURNING id INTO v_tutor_2;

  INSERT INTO public.pacientes (user_id, nome, especie, raca, tutor_id, clinica_id)
  VALUES (v_user_id, 'Thor', 'Canino', 'Golden Retriever', v_tutor_1, v_clinica_1)
  RETURNING id INTO v_pac_1;

  INSERT INTO public.pacientes (user_id, nome, especie, raca, tutor_id, clinica_id)
  VALUES (v_user_id, 'Luna', 'Felino', 'SRD', v_tutor_2, v_clinica_2)
  RETURNING id INTO v_pac_2;

  -- Atendimentos de exemplo
  INSERT INTO public.atendimentos (user_id, data, clinica_id, paciente_id, tutor_id, paciente_nome, tutor_nome, servico, urgente, status_pagamento, forma_pagamento, data_pagamento, observacoes)
  VALUES (v_user_id, CURRENT_DATE - INTERVAL '2 days', v_clinica_1, v_pac_1, v_tutor_1, 'Thor', 'Mariana Costa', 'Raio X', FALSE, 'pago', 'Pix', CURRENT_DATE - INTERVAL '2 days', 'Laudo enviado por WhatsApp')
  RETURNING id INTO v_atend_1;

  INSERT INTO public.atendimento_itens (atendimento_id, especificacao, quantidade, valor_unitario)
  VALUES (v_atend_1, '210', 3, 47.00);

  INSERT INTO public.atendimentos (user_id, data, clinica_id, paciente_id, tutor_id, paciente_nome, tutor_nome, servico, urgente, status_pagamento, observacoes)
  VALUES (v_user_id, CURRENT_DATE, v_clinica_2, v_pac_2, v_tutor_2, 'Luna', 'Carlos Eduardo', 'Raio X', TRUE, 'nao_pago', 'Atendimento de urgência')
  RETURNING id INTO v_atend_2;

  INSERT INTO public.atendimento_itens (atendimento_id, especificacao, quantidade, valor_unitario)
  VALUES (v_atend_2, '310', 2, 85.00);

  -- Despesas de exemplo
  INSERT INTO public.despesas (user_id, data, categoria, descricao, valor, clinica_id, recorrente)
  VALUES
    (v_user_id, CURRENT_DATE - INTERVAL '3 days', 'Combustível', 'Abastecimento Posto Shell', 240.00, NULL, FALSE),
    (v_user_id, CURRENT_DATE - INTERVAL '1 day', 'Pedágio', 'Pedágio ida e volta Pet Care', 11.40, v_clinica_2, FALSE),
    (v_user_id, date_trunc('month', CURRENT_DATE)::DATE, 'EPIs/dosímetro', 'Mensalidade dosímetro', 65.00, NULL, TRUE);

  -- Eventos de agenda
  INSERT INTO public.eventos (user_id, clinica_id, titulo, data, hora_inicio, hora_fim, status, observacoes)
  VALUES
    (v_user_id, v_clinica_1, 'Visita Clínica Vet Vida', CURRENT_DATE, '09:30', '11:00', 'agendado', '3 pacientes agendados'),
    (v_user_id, v_clinica_2, 'Visita Hospital Pet Care', CURRENT_DATE, '14:00', '15:30', 'agendado', 'Confirmar estacionamento');

END $$;
