# Agropec Brasil — CRM

Sistema completo de CRM para a empresa Agropec Brasil, especializada em produtos agropecuários.

---

## Requisitos

- **Node.js** 18+ → https://nodejs.org
- **PostgreSQL** 14+ → https://www.postgresql.org/download/windows/
- **npm** ou **yarn**

---

## Instalação rápida

### 1. Clone ou extraia o projeto

```bash
cd Documents/agropec-crm
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o banco de dados

Crie um banco PostgreSQL chamado `agropec_crm`:

```sql
CREATE DATABASE agropec_crm;
```

Ou via pgAdmin: clique com botão direito em "Databases" → "Create" → "Database..."

### 4. Configure o arquivo `.env`

O arquivo `.env` já existe na raiz. Verifique se a URL está correta:

```env
DATABASE_URL="postgresql://SEU_USUARIO:SUA_SENHA@localhost:5432/agropec_crm"
JWT_SECRET="agropec-crm-super-secret-jwt-key-2024"
NEXTAUTH_URL="http://localhost:3000"
```

Troque `SEU_USUARIO` e `SUA_SENHA` pelas credenciais do seu PostgreSQL.
Por padrão o PostgreSQL usa: usuário `postgres`, senha definida na instalação.

Exemplo:
```env
DATABASE_URL="postgresql://postgres:minhasenha@localhost:5432/agropec_crm"
```

### 5. Crie as tabelas do banco

```bash
npm run db:push
```

### 6. Popule com dados de exemplo

```bash
npm run db:seed
```

Este comando cria:
- 4 usuários (gestor + 3 vendedores)
- 8 produtos com ciclos de recompra
- 50+ leads em diversas etapas
- Follow-ups e histórico
- 20+ clientes na carteira
- Templates de mensagem
- Configurações padrão

### 7. Inicie o servidor

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## Usuários de teste

| E-mail | Senha | Perfil |
|--------|-------|--------|
| gestor@agropec.com | senha123 | Gestor (acesso total) |
| vendedor1@agropec.com | senha123 | Vendedor |
| vendedor2@agropec.com | senha123 | Vendedor |
| vendedor3@agropec.com | senha123 | Vendedor |

---

## Funcionalidades

### Funil de Vendas (Kanban)
- 7 colunas: Fez Contato, Proposta Enviada, Negociação, Chamar Depois, Comprou, Desqualificado, Geladeira
- Drag and drop entre etapas
- Modais obrigatórios ao mover para Chamar Depois, Desqualificado e Comprou
- Badges visuais de alertas nos cards

### Leads
- Cadastro com origem (rastreado / não rastreado)
- Registro de primeira resposta (NÃO é follow-up)
- Follow-ups controlados: máximo 1 por dia por lead
- Checklist do script de vendas (8 itens)
- Sugestão de geladeira após 8+ follow-ups
- Histórico completo de etapas

### Geladeira
- Leads frios com cadência de reativação (7 → 15 → 30 dias)
- Lista de "para reativar hoje"
- Retorno ao funil com histórico preservado

### Carteira de Clientes
- Criada automaticamente ao mover lead para "Comprou"
- Semáforo de contato mensal (🔴 0 contatos / 🟡 1 contato / 🟢 2+ contatos)
- Histórico completo de contatos
- Detecção de janela de recompra por produto

### Metas e Comissões
- Cálculo automático baseado no faturamento líquido
- Tabela de comissões por faixa (não progressiva)
- Projeção do mês
- Salário fixo em 2 parcelas
- Ranking do time (visão gestor)

### Dashboards
- Vendedor: métricas individuais, comissão, carteira
- Gestor: visão geral, rankings, funil, financeiro

### Monitor de Script
- Conformidade por vendedor
- Leads com checklist incompleto
- Distribuição por passo do script

### Templates de Mensagem
- 6 categorias: follow-up, geladeira, promoção, pós-venda, carteira, reativação
- Cópia rápida para WhatsApp

### Configurações (gestor)
- Janela de trabalho configurável
- Cadência da geladeira configurável
- Cadastro de produtos com ciclo de recompra

---

## Estrutura de pastas

```
agropec-crm/
├── prisma/
│   ├── schema.prisma       # Modelagem do banco
│   └── seed.ts             # Dados de exemplo
├── src/
│   ├── app/
│   │   ├── (auth)/login/   # Tela de login
│   │   ├── (app)/          # Área autenticada
│   │   │   ├── dashboard/  # Dashboard (vendedor ou gestor)
│   │   │   ├── kanban/     # Funil kanban
│   │   │   ├── leads/      # Lista e detalhe de leads
│   │   │   ├── clientes/   # Carteira de clientes
│   │   │   ├── geladeira/  # Leads frios
│   │   │   ├── metas/      # Metas e comissões
│   │   │   ├── templates/  # Templates de mensagem
│   │   │   ├── monitor-script/ # Monitor do script
│   │   │   └── configuracoes/  # Configurações
│   │   └── api/            # API Routes (Next.js)
│   ├── components/
│   │   ├── ui/             # Componentes base
│   │   ├── layout/         # Sidebar, Header
│   │   ├── kanban/         # Kanban e cards
│   │   ├── leads/          # Seções do lead
│   │   └── dashboard/      # Componentes do dashboard
│   ├── hooks/
│   │   └── use-auth.tsx    # Hook de autenticação
│   ├── lib/
│   │   ├── auth.ts         # JWT utilities
│   │   ├── prisma.ts       # Prisma client
│   │   ├── utils.ts        # Funções utilitárias
│   │   └── constants.ts    # Constantes do sistema
│   ├── middleware.ts        # Proteção de rotas
│   └── types/index.ts      # Tipos TypeScript
├── .env                    # Variáveis de ambiente
└── package.json
```

---

## Comandos úteis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build && npm start

# Visualizar banco de dados
npm run db:studio

# Recriar banco (CUIDADO: apaga todos os dados)
npm run db:push -- --force-reset
npm run db:seed
```

---

## Regras de negócio implementadas

- ✅ Primeiro contato NÃO é follow-up
- ✅ Máximo 1 follow-up por dia por lead (bloqueio no backend)
- ✅ Motivo "nunca respondeu 8+ tentativas" exige 8+ follow-ups
- ✅ Geladeira ≠ carteira de clientes
- ✅ Comissão calculada apenas sobre faturamento **líquido**
- ✅ Comissão por faixa plana (não progressiva)
- ✅ Vendedor só vê seus próprios dados
- ✅ Todas as rotas validadas no backend
- ✅ Chamar Depois exige data/hora obrigatória

---

## Suporte

Sistema desenvolvido para uso interno da Agropec Brasil.
