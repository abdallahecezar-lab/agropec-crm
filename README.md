# Agropec Brasil — CRM

Sistema completo de CRM para a Agropec Brasil, especializada em produtos agropecuários.

---

## Requisitos

- **Node.js** 18+ → https://nodejs.org
- **PostgreSQL** 14+ → https://www.postgresql.org/download/windows/
- **npm** ou **yarn**

---

## Instalação rápida

### 1. Entre na pasta do projeto

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

Ou via pgAdmin: botão direito em "Databases" → "Create" → "Database..."

### 4. Configure o arquivo `.env`

```env
DATABASE_URL="postgresql://postgres:SUASENHA@localhost:5432/agropec_crm"
JWT_SECRET="agropec-crm-super-secret-jwt-key-2024"
NEXTAUTH_URL="http://localhost:3000"
```

### 5. Crie as tabelas

```bash
npm run db:push
```

### 6. Popule com dados de exemplo

```bash
npm run db:seed
```

### 7. Inicie o servidor

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

## Perfis de acesso

| Perfil    | Acesso |
|-----------|--------|
| `diretor` | Acesso total — visão de toda a empresa |
| `gestor`  | Gerencia a própria equipe de vendedores |
| `vendedor`| Vê apenas seus próprios leads e clientes |

---

## Produtos cadastrados

1. Promotor de Engorda
2. Vermífugo
3. Vitaminas
4. Cavalo
5. Todos os Produtos

Para redefinir os produtos no banco em produção, chame (logado como gestor/diretor):
```
POST /api/setup/seed-produtos
```

---

## Funil Kanban — 9 etapas

| Etapa | Descrição |
|-------|-----------|
| Fez Contato | Lead chegou, primeiro contato realizado |
| Proposta Enviada | Proposta comercial enviada |
| Negociação | Em negociação ativa |
| Chamar Depois | Agendado para contato futuro (data obrigatória) |
| Correios | Aguardando envio / entrega |
| Comprou | Venda realizada — gera cliente na carteira |
| Voltou | Cliente que retornou ao funil |
| Desqualificado | Lead sem perfil ou interesse |
| Geladeira | Lead frio — cadência de reativação automática |

---

## Funcionalidades

### Funil de Vendas (Kanban)
- 9 colunas com drag and drop
- Texto legível (preto) em todos os cabeçalhos de coluna
- Modais obrigatórios ao mover para Chamar Depois, Desqualificado e Comprou
- Badges visuais de alertas nos cards
- Botão "Importar Lista" disponível para todos os perfis

### Lista de Leads (`/leads`)
- Visualização em tabela disponível para todos os perfis
- Filtros por etapa, status e busca por nome/WhatsApp
- Exportação CSV
- Botão "Novo Lead"

### Importação de Leads
- **Todos os perfis**: importação de leads via CSV do Tintim
  - Vendedor: todos os leads do arquivo vão para sua própria conta
  - Gestor/Diretor: leads são distribuídos pela conta identificada no arquivo
- **Gestor/Diretor**: importação de carteira de clientes via Excel (.xlsx)

### Leads
- Cadastro com produto e origem (rastreado / não rastreado)
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
- Semáforo de contato mensal (🔴 0 / 🟡 1 / 🟢 2+ contatos)
- Histórico de contatos
- Detecção de janela de recompra por produto

### Metas e Comissões
- Cálculo automático sobre faturamento líquido
- Tabela de comissões por faixa (não progressiva)
- Projeção do mês e ranking do time

### Dashboards
- **Vendedor**: métricas individuais, comissão, carteira
- **Gestor/Diretor**: visão geral, rankings, funil, financeiro

### Monitor de Script
- Conformidade por vendedor (gestor/diretor)
- Leads com checklist incompleto

### Templates de Mensagem
- 6 categorias: follow-up, geladeira, promoção, pós-venda, carteira, reativação
- Cópia rápida para WhatsApp

### Configurações (gestor/diretor)
- Janela de trabalho configurável
- Cadência da geladeira configurável
- Cadastro de produtos com ciclo de recompra

---

## Estrutura de pastas

```
agropec-crm/
├── prisma/
│   ├── schema.prisma         # Modelagem do banco
│   └── seed.ts               # Dados de exemplo
├── src/
│   ├── app/
│   │   ├── (auth)/login/     # Tela de login
│   │   └── (app)/
│   │       ├── dashboard/    # Dashboard
│   │       ├── kanban/       # Funil kanban
│   │       ├── leads/        # Lista de leads
│   │       ├── clientes/     # Carteira de clientes
│   │       ├── geladeira/    # Leads frios
│   │       ├── importar/     # Importação de dados
│   │       ├── metas/        # Metas e comissões
│   │       ├── templates/    # Templates de mensagem
│   │       ├── monitor-script/  # Monitor do script
│   │       └── configuracoes/   # Configurações
│   │   └── api/              # API Routes (Next.js)
│   ├── components/
│   │   ├── ui/               # Componentes base
│   │   ├── layout/           # Sidebar, Header
│   │   ├── kanban/           # Kanban e cards
│   │   ├── leads/            # Seções do lead
│   │   └── dashboard/        # Componentes do dashboard
│   ├── lib/
│   │   ├── auth.ts           # JWT utilities
│   │   ├── prisma.ts         # Prisma client
│   │   ├── utils.ts          # Funções utilitárias
│   │   └── constants.ts      # Constantes do sistema
│   └── middleware.ts         # Proteção de rotas
├── .env                      # Variáveis de ambiente
└── package.json
```

---

## Comandos úteis

```bash
npm run dev            # Desenvolvimento
npm run build          # Build de produção
npm start              # Servidor de produção
npm run db:studio      # Visualizar banco de dados (Prisma Studio)
npm run db:push        # Aplicar schema ao banco
npm run db:seed        # Popular banco com dados de exemplo
```

---

## Regras de negócio

- ✅ Primeiro contato NÃO é follow-up
- ✅ Máximo 1 follow-up por dia por lead
- ✅ "Nunca respondeu 8+ tentativas" exige 8+ follow-ups registrados
- ✅ Geladeira ≠ carteira de clientes
- ✅ Comissão calculada apenas sobre faturamento líquido
- ✅ Comissão por faixa plana (não progressiva)
- ✅ Vendedor vê apenas seus próprios dados
- ✅ Chamar Depois exige data/hora obrigatória
- ✅ Todas as rotas validadas no backend

---

## Suporte

Sistema desenvolvido para uso interno da Agropec Brasil.
Para o manual de uso da equipe, consulte `MANUAL_USO.md`.
