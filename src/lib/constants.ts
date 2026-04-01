export const ETAPAS_LEAD = [
  { id: 'fez_contato', label: 'Fez Contato', color: 'bg-blue-100 border-blue-300', headerColor: 'bg-blue-500' },
  { id: 'proposta_enviada', label: 'Proposta Enviada', color: 'bg-yellow-100 border-yellow-300', headerColor: 'bg-yellow-500' },
  { id: 'negociacao', label: 'Negociação', color: 'bg-orange-100 border-orange-300', headerColor: 'bg-orange-500' },
  { id: 'chamar_depois', label: 'Chamar Depois', color: 'bg-purple-100 border-purple-300', headerColor: 'bg-purple-500' },
  { id: 'comprou', label: 'Comprou', color: 'bg-green-100 border-green-300', headerColor: 'bg-green-500' },
  { id: 'desqualificado', label: 'Desqualificado', color: 'bg-red-100 border-red-300', headerColor: 'bg-red-500' },
  { id: 'geladeira', label: 'Geladeira', color: 'bg-slate-100 border-slate-300', headerColor: 'bg-slate-500' },
] as const

export const SCRIPT_ITEMS = [
  { id: 1, label: 'Se apresentou e perguntou o nome', hasObjecao: false },
  { id: 2, label: 'Enviou áudio inicial', hasObjecao: false },
  { id: 3, label: 'Enviou foto + forma de utilização', hasObjecao: false },
  { id: 4, label: 'Enviou combos promocionais', hasObjecao: false },
  { id: 5, label: 'Explicou frete grátis e pagamento na retirada/correios', hasObjecao: false },
  { id: 6, label: 'Perguntou se os combos atendem a necessidade', hasObjecao: false },
  { id: 7, label: 'Tratou objeções', hasObjecao: true },
  { id: 8, label: 'Registrou follow-up', hasObjecao: false },
] as const

export const OBJECOES = [
  { id: 'achou_caro', label: 'Achou caro' },
  { id: 'gado_pouco', label: 'Gado pouco' },
  { id: 'nao_conhece_produto', label: 'Não conhece o produto' },
  { id: 'sem_interesse', label: 'Sem interesse' },
  { id: 'sem_registro_mapa', label: 'Sem registro MAPA' },
  { id: 'outro', label: 'Outro' },
] as const

export const MOTIVOS_DESQUALIFICACAO = [
  { id: 'sem_interesse', label: 'Sem interesse', minFollowups: 0 },
  { id: 'gado_pouco', label: 'Gado pouco', minFollowups: 0 },
  { id: 'achou_caro', label: 'Achou caro', minFollowups: 0 },
  { id: 'nao_conhece_produto', label: 'Não conhece o produto', minFollowups: 0 },
  { id: 'sem_registro_mapa', label: 'Sem registro MAPA', minFollowups: 0 },
  { id: 'nunca_respondeu_8_tentativas', label: 'Nunca respondeu após 8+ tentativas', minFollowups: 8 },
  { id: 'outro', label: 'Outro', minFollowups: 0 },
] as const

export const TIPOS_CONTATO = [
  { id: 'pos_venda', label: 'Pós-venda' },
  { id: 'recompra', label: 'Recompra' },
  { id: 'promocao', label: 'Promoção' },
  { id: 'ligacao', label: 'Ligação' },
  { id: 'whatsapp_texto', label: 'WhatsApp Texto' },
  { id: 'whatsapp_audio', label: 'WhatsApp Áudio' },
  { id: 'relacionamento', label: 'Relacionamento' },
  { id: 'lembrete_reposicao', label: 'Lembrete de Reposição' },
] as const

export const RESULTADOS_CONTATO = [
  { id: 'respondeu', label: 'Respondeu' },
  { id: 'nao_respondeu', label: 'Não respondeu' },
  { id: 'demonstrou_interesse', label: 'Demonstrou interesse' },
  { id: 'pediu_retorno', label: 'Pediu retorno' },
  { id: 'comprou', label: 'Comprou' },
  { id: 'sem_interesse', label: 'Sem interesse' },
] as const

export const COMMISSION_TABLE = [
  { min: 0,      max: 16000,    pct: 0,  label: 'Abaixo de R$ 16.000' },
  { min: 16001,  max: 19000,    pct: 3,  label: 'R$ 16.001 – R$ 19.000' },
  { min: 19001,  max: 21000,    pct: 6,  label: 'R$ 19.001 – R$ 21.000' },
  { min: 21001,  max: 26000,    pct: 8,  label: 'R$ 21.001 – R$ 26.000' },
  { min: 26001,  max: 31000,    pct: 12, label: 'R$ 26.001 – R$ 31.000' },
  { min: 31001,  max: 35000,    pct: 16, label: 'R$ 31.001 – R$ 35.000' },
  { min: 35001,  max: 40000,    pct: 18, label: 'R$ 35.001 – R$ 40.000' },
  { min: 40001,  max: 50000,    pct: 20, label: 'R$ 40.001 – R$ 50.000' },
  { min: 50001,  max: 61000,    pct: 22, label: 'R$ 50.001 – R$ 61.000' },
  { min: 61001,  max: 80000,    pct: 24, label: 'R$ 61.001 – R$ 80.000' },
  { min: 80001,  max: 90000,    pct: 26, label: 'R$ 80.001 – R$ 90.000' },
  { min: 90001,  max: 100000,   pct: 28, label: 'R$ 90.001 – R$ 100.000' },
  { min: 100001, max: 110000,   pct: 29, label: 'R$ 100.001 – R$ 110.000' },
  { min: 110001, max: 125000,   pct: 30, label: 'R$ 110.001 – R$ 125.000' },
  { min: 125001, max: 145000,   pct: 31, label: 'R$ 125.001 – R$ 145.000' },
  { min: 145001, max: Infinity, pct: 32, label: 'Acima de R$ 145.001' },
] as const

export const STATUS_CARTEIRA = {
  vermelho: { label: 'Urgente', color: 'text-red-600 bg-red-50 border-red-200', description: '0 contatos este mês' },
  amarelo: { label: 'Mínimo', color: 'text-yellow-600 bg-yellow-50 border-yellow-200', description: '1 contato este mês' },
  verde: { label: 'Ideal', color: 'text-green-600 bg-green-50 border-green-200', description: '2+ contatos este mês' },
} as const

export const CATEGORIAS_TEMPLATE = [
  'follow-up',
  'geladeira',
  'promoção',
  'pós-venda',
  'carteira',
  'reativação',
] as const

export const REATIVACAO_CADENCIA = [7, 15, 30] as const
