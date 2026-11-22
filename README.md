# Radiologia NR — Sistema de Gestão para Radiologia Veterinária Volante

Sistema web + PWA (instalável no celular) desenvolvido para **Nathalia Rangel (Radiologia NR)** controlar atendimentos/exames, despesas, clínicas parceiras, agenda/rotas, parcela mensal da máquina de raio X e simulação de deslocamento/precificação.

---

## Stack Tecnológica

- **Frontend:** React 19 + Vite + TypeScript
- **Estilização:** Tailwind CSS v4 + componentes estilo shadcn/ui + Lucide Icons + modo claro/escuro
- **Roteamento & Dados:** React Router + TanStack Query + Recharts
- **Validação:** React Hook Form + Zod
- **Backend / Banco:** Supabase (Postgres + Auth + RLS + Realtime) com camada de abstração `src/services/` que funciona **100% em modo local (`localStorage`)** enquanto o Supabase não estiver configurado no `.env`
- **PWA:** `vite-plugin-pwa` (manifest, ícones 192/512, service worker offline-ready)
- **Relatórios:** Exportação PDF (`jsPDF`) e CSV

---

## 1. Como Rodar Localmente (Localhost)

### Pré-requisitos
- Node.js 20+ e npm

### Passo a passo
```bash
# 1. Instalar dependências
npm install

# 2. (Opcional) Copiar o arquivo de variáveis de ambiente
cp .env.example .env

# 3. Iniciar o servidor de desenvolvimento
npm run dev
```

Acesse **http://localhost:5173**.

> **Modo Local automático:** Enquanto `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` estiverem vazios no `.env`, o app roda automaticamente com `LocalRepository` (`localStorage`) populado com dados de exemplo (clínicas, atendimentos, despesas, eventos, veículo e tabela de preços sugeridos). Na tela de login, clique em **"Entrar rápido como Nathalia"** ou use `nathalia@radiologianr.com.br` / `123456`.

---

## 2. Variáveis de Ambiente (`.env`)

Veja `.env.example`:

```env
# Deixe vazio para rodar em modo local (localStorage)
# Preencha para conectar ao Supabase (local CLI ou nuvem)
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui

# Opcional: chave gratuita OpenRouteService para cálculo de rotas
VITE_ORS_API_KEY=
```

A troca entre **Local** e **Supabase** acontece automaticamente em `src/services/index.ts`, sem precisar alterar nenhuma tela.

---

## 3. Checklist de Testes Manuais

Use este roteiro para validar o fluxo completo em `localhost`:

1. **Login:** Acessar `/login` e entrar como Nathalia.
2. **Clínicas:** Ir em **Clínicas → Nova clínica**, cadastrar uma clínica com endereço, distância (km) e pedágio. Abrir a tela de detalhes da clínica e testar os botões **WhatsApp** e **Ir (Maps)**.
3. **Atendimento com especificação manual:** Ir em **Atendimentos → Novo atendimento**, selecionar a clínica, preencher paciente/tutor, digitar um código manual na especificação (ex.: `210` ou `310`), ajustar quantidade e valor unitário e salvar.
4. **Card da Máquina de Raio X em tempo real:** Voltar para a **Home / Dashboard** e confirmar que a barra de progresso de **R$ 3.700,00** e o texto dinâmico ("Faltam R$ X..." ou "Parcela do mês coberta ✅") foram recalculados imediatamente.
5. **Marcar parcela como paga (24 → 23):** Clicar em **"Marcar parcela do mês como paga"** no card da máquina. Confirmar que:
   - O contador muda de **24** para **23** parcelas;
   - O total restante recalcula de **R$ 88.800,00** para **R$ 85.100,00**;
   - A despesa `"Parcela da máquina de raio X"` aparece automaticamente em **Despesas**;
   - O botão impede pagar a mesma parcela duas vezes no mesmo mês.
6. **Despesas:** Ir em **Despesas → Nova despesa**, lançar um abastecimento de combustível e testar o botão **"Gerar recorrentes do mês"**.
7. **Meu Carro:** Ir em **Ajustes → Meu Carro**, preencher o modelo do carro (ex.: HB20), consumo cidade/estrada, preço do combustível e desgaste por km, e salvar.
8. **Simulador de Deslocamento:** Ir em **Simulador**, selecionar uma clínica, alternar perfil (cidade/estrada/misto), conferir o semáforo (verde/amarelo/vermelho), ponto de equilíbrio, salvar a simulação e testar **"Aplicar como preço desta clínica"**.
9. **Agenda & Rota do Dia:** Ir em **Agenda**, agendar uma visita, marcar como **Concluir** (oferece lançar atendimentos) e abrir a aba **Rota do dia**.
10. **Financeiro:** Ir em **Financeiro**, navegar entre meses, verificar o **DRE simples** (Receita − Despesas = Lucro) e exportar relatório em **PDF** e **CSV**.
11. **PWA no celular:** Após build/deploy em HTTPS, abrir no Chrome (Android) ou Safari (iOS) e selecionar **"Adicionar à tela inicial"**.

---

## 4. Como Subir para o Supabase na Nuvem

Quando terminar de validar localmente:

### Passo 1: Criar projeto no Supabase
1. Crie uma conta/projeto em [supabase.com](https://supabase.com).
2. Em **Project Settings → API**, copie a **Project URL** e a **anon public key**.

### Passo 2: Subir as migrations SQL via Supabase CLI
```bash
# Instalar o Supabase CLI (caso ainda não tenha)
npm install -g supabase

# Fazer login na sua conta Supabase
supabase login

# Vincular este repositório ao seu projeto (pegue o Project Ref no painel do Supabase)
supabase link --project-ref SEU_PROJECT_REF

# Enviar as migrations (cria tabelas, triggers, views, índices e RLS)
supabase db push
```

> **Alternativa sem CLI:** Você também pode copiar o conteúdo de `supabase/migrations/20260101000001_initial_schema.sql` e colar diretamente no **SQL Editor** do painel do Supabase.

### Passo 3: Criar a usuária e (opcional) rodar o seed
1. No painel do Supabase, vá em **Authentication → Users → Add user** e crie o e-mail e senha da Nathalia (ou cadastre-se pela tela `/login` do app).
2. (Opcional) Se quiser popular dados de exemplo no banco em nuvem, execute o conteúdo de `supabase/seed.sql` no **SQL Editor**.

### Passo 4: Conectar o frontend
Preencha o `.env` com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` e reinicie `npm run dev`. O indicador na sidebar mudará automaticamente de **Local** para **Supabase**.

---

## 5. Como Fazer Deploy (Vercel ou Netlify)

### Vercel (recomendado)
1. Suba este repositório para o GitHub.
2. Importe o repositório em [vercel.com](https://vercel.com).
3. Configure as variáveis de ambiente (`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`).
4. Build Command: `npm run build` | Output Directory: `dist`.
5. Clique em **Deploy**. O PWA funcionará automaticamente com HTTPS!

### Netlify
1. Importe o repositório em [netlify.com](https://netlify.com).
2. Build Command: `npm run build` | Publish directory: `dist`.
3. Adicione as variáveis de ambiente e publique.
4. Para rotas SPA (`react-router-dom`), crie `public/_redirects` com: `/* /index.html 200`.

---

## Estrutura de Pastas

```text
├── public/
│   ├── logo.png              # Logo Nathalia Rangel Radiologia
│   ├── pwa-192x192.png       # Ícone PWA 192x192
│   └── pwa-512x512.png       # Ícone PWA 512x512
├── supabase/
│   ├── config.toml           # Configuração Supabase CLI
│   ├── seed.sql              # Dados de exemplo SQL
│   └── migrations/
│       └── 20260101000001_initial_schema.sql
├── src/
│   ├── components/
│   │   ├── dashboard/        # Card da Máquina de Raio X
│   │   ├── layout/           # AppLayout responsivo (Sidebar + Bottom Nav + FAB)
│   │   └── ui/               # Componentes UI estilo shadcn/ui
│   ├── contexts/             # AuthContext, ThemeContext
│   ├── hooks/                # Hooks TanStack Query + Realtime
│   ├── lib/                  # Formatação BRL, datas, Maps, WhatsApp
│   ├── pages/                # Login, Dashboard, Clínicas, Atendimentos, Despesas, Simulador, Agenda, Financeiro, Ajustes
│   ├── services/             # IRepository, LocalRepository, SupabaseRepository
│   └── types/                # Tipos TypeScript do domínio
├── .env.example
└── vite.config.ts            # Vite + Tailwind v4 + VitePWA
```
