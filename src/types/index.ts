export type Role = 'gestor' | 'vendedor' | 'diretor'

export type EtapaLead =
  | 'fez_contato'
  | 'apresentacao'
  | 'proposta_enviada'
  | 'negociacao'
  | 'chamar_depois'
  | 'correios'
  | 'comprou'
  | 'voltou'
  | 'desqualificado'
  | 'geladeira'

export type TipoFollowup = 'ligacao' | 'audio_whatsapp' | 'texto_whatsapp'

export type FormaPagamento = 'pix' | 'cartao' | 'retirada'

export type StatusLead = 'ativo' | 'geladeira' | 'convertido' | 'desqualificado'

export type TipoContato =
  | 'pos_venda'
  | 'recompra'
  | 'promocao'
  | 'ligacao'
  | 'whatsapp_texto'
  | 'whatsapp_audio'
  | 'relacionamento'
  | 'lembrete_reposicao'

export type ResultadoContato =
  | 'respondeu'
  | 'nao_respondeu'
  | 'demonstrou_interesse'
  | 'pediu_retorno'
  | 'comprou'
  | 'sem_interesse'

export type MotivoDesqualificacao =
  | 'sem_interesse'
  | 'gado_pouco'
  | 'achou_caro'
  | 'nao_conhece_produto'
  | 'sem_registro_mapa'
  | 'nunca_respondeu_8_tentativas'
  | 'outro'

export type ObjecaoTratada =
  | 'achou_caro'
  | 'gado_pouco'
  | 'nao_conhece_produto'
  | 'sem_interesse'
  | 'sem_registro_mapa'
  | 'outro'

export type OrigemLead = 'rastreado' | 'nao_rastreado'

export type StatusCarteira = 'vermelho' | 'amarelo' | 'verde'

export interface User {
  id: string
  nome: string
  email: string
  role: Role
  ativo: boolean
  gestorId?: string | null
  criadoEm: string
  atualizadoEm: string
}

export interface Produto {
  id: string
  nome: string
  cicloRecompraDias: number
  ativo: boolean
}

export interface Followup {
  id: string
  leadId: string
  vendedorId: string
  vendedor?: { nome: string }
  numero: number
  tipo?: TipoFollowup | null
  observacao?: string | null
  registradoEm: string
  criadoEm: string
}

export interface ScriptChecklistItem {
  id: string
  leadId: string
  item: number
  concluido: boolean
  objecao?: ObjecaoTratada | null
  objecaoOutro?: string | null
  concluidoEm?: string | null
}

export interface LeadEtapaHistorico {
  id: string
  leadId: string
  etapaAnterior?: EtapaLead | null
  etapaNova: EtapaLead
  mudadoEm: string
  observacao?: string | null
}

export interface Lead {
  id: string
  nomeCliente: string
  whatsapp: string
  produtoId?: string | null
  produto?: Produto | null
  origem: OrigemLead
  observacoes?: string | null
  etapa: EtapaLead
  statusLead: StatusLead
  vendedorId: string
  vendedor?: User | null
  dentroJanela: boolean
  chegouEm: string
  primeiraRespostaEm?: string | null
  agendadoPara?: string | null
  atrasado: boolean
  motivoDesqualificacao?: MotivoDesqualificacao | null
  motivoDesqualificacaoOutro?: string | null
  valorBruto?: number | null
  valorLiquido?: number | null
  formaPagamento?: FormaPagamento | null
  comprouEm?: string | null
  voltouEm?: string | null
  observacaoVenda?: string | null
  clienteId?: string | null
  entadaGeladeira?: string | null
  proximaReativacao?: string | null
  tentativasReativacao: number
  criadoEm: string
  atualizadoEm: string
  followups?: Followup[]
  checklistItems?: ScriptChecklistItem[]
  historicoEtapas?: LeadEtapaHistorico[]
  _count?: {
    followups: number
    checklistItems: number
  }
}

export interface ContatoCliente {
  id: string
  clienteId: string
  vendedorId: string
  vendedor?: User | null
  tipo: TipoContato
  resultado: ResultadoContato
  observacao?: string | null
  dataContato: string
  criadoEm: string
}

export interface Cliente {
  id: string
  nome: string
  whatsapp: string
  vendedorId: string
  vendedor?: User | null
  ultimoProdutoId?: string | null
  ultimoProduto?: Produto | null
  dataPrimeiraCompra: string
  dataUltimaCompra: string
  totalCompras: number
  valorTotalAcumulado: number
  ultimoContato?: string | null
  proximaAcao?: string | null
  statusRelacionamento: string
  criadoEm: string
  atualizadoEm: string
  contatos?: ContatoCliente[]
  statusCarteira?: StatusCarteira
  recompraStatus?: 'normal' | 'proximo' | 'vencido'
  recompraRestantes?: number
}

export interface ReativacaoLead {
  id: string
  leadId: string
  vendedorId: string
  vendedor?: User | null
  resultado?: string | null
  observacao?: string | null
  voltouAoFunil: boolean
  etapaRetorno?: string | null
  realizadaEm: string
}

export interface TemplateMensagem {
  id: string
  nome: string
  categoria: string
  conteudo: string
  ativo: boolean
  criadoEm: string
  atualizadoEm: string
}

export interface Notificacao {
  id: string
  userId: string
  leadId?: string | null
  lead?: Lead | null
  tipo: string
  mensagem: string
  lida: boolean
  criadoEm: string
}

export interface ConfiguracaoSistema {
  id: string
  chave: string
  valor: string
  descricao?: string | null
  atualizadoEm: string
}

// Dashboard types
export interface VendedorDashboardData {
  vendedor: User
  leads: {
    total: number
    ativos: number
    convertidos: number
    desqualificados: number
    geladeira: number
    porEtapa: Record<EtapaLead, number>
  }
  conversao: number
  tempoMedioResposta: number
  followupHoje: number
  clientesSemContatoMes: number
  comissao: ReturnType<(v: number) => { faixa: string; percentual: number; comissao: number; proximaFaixa: number | null; faltaParaProximaFaixa: number | null }>
  faturamentoMes: number
  leadsChamarDepoisAtrasados: Lead[]
  checklistConformidade: number
  reativacoesHoje: Lead[]
}

export interface GestorDashboardData {
  totais: {
    leads: number
    convertidos: number
    faturamento: number
    clientes: number
    leadsAtrasados: number
  }
  vendedores: Array<{
    vendedor: User
    leads: number
    convertidos: number
    faturamento: number
    taxaConversao: number
    checklistConformidade: number
    clientesCuidados: number
  }>
  leadsPorEtapa: Record<EtapaLead, number>
  faturamentoPorDia: Array<{ dia: string; valor: number }>
  rankingFaturamento: Array<{ vendedor: User; faturamento: number }>
}

export interface CommissionResult {
  faixa: string
  percentual: number
  comissao: number
  proximaFaixa: number | null
  faltaParaProximaFaixa: number | null
}
