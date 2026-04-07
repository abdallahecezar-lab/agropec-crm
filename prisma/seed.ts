import { PrismaClient, Role, EtapaLead, StatusLead, TipoContato, ResultadoContato, OrigemLead } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { addDays, subDays, subHours } from 'date-fns'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Clean up
  await prisma.notificacao.deleteMany()
  await prisma.reativacaoLead.deleteMany()
  await prisma.contatoCliente.deleteMany()
  await prisma.leadEtapaHistorico.deleteMany()
  await prisma.scriptChecklistItem.deleteMany()
  await prisma.followup.deleteMany()
  await prisma.lead.deleteMany()
  await prisma.cliente.deleteMany()
  await prisma.produto.deleteMany()
  // await prisma.templatMensagem.deleteMany().catch(() => {})
  await prisma.templateMensagem.deleteMany()
  await prisma.configuracaoSistema.deleteMany()
  await prisma.user.deleteMany()

  // Users
  const senhaHash = await bcrypt.hash('senha123', 10)

  const gestor = await prisma.user.create({
    data: { nome: 'Carlos Gestor', email: 'gestor@agropec.com', senha: senhaHash, role: Role.gestor },
  })
  const v1 = await prisma.user.create({
    data: { nome: 'João Vendedor', email: 'vendedor1@agropec.com', senha: senhaHash, role: Role.vendedor },
  })
  const v2 = await prisma.user.create({
    data: { nome: 'Maria Vendas', email: 'vendedor2@agropec.com', senha: senhaHash, role: Role.vendedor },
  })
  const v3 = await prisma.user.create({
    data: { nome: 'Pedro Silva', email: 'vendedor3@agropec.com', senha: senhaHash, role: Role.vendedor },
  })

  console.log('✅ Usuários criados')

  // Products
  const produtos = await Promise.all([
    prisma.produto.create({ data: { nome: 'Promotor de Engorda', cicloRecompraDias: 30 } }),
    prisma.produto.create({ data: { nome: 'Vermífugo', cicloRecompraDias: 30 } }),
    prisma.produto.create({ data: { nome: 'Vitaminas', cicloRecompraDias: 30 } }),
    prisma.produto.create({ data: { nome: 'Cavalo', cicloRecompraDias: 30 } }),
    prisma.produto.create({ data: { nome: 'Todos os Produtos', cicloRecompraDias: 30 } }),
  ])

  console.log('✅ Produtos criados')

  // Clients in carteira
  const clientes = await Promise.all([
    prisma.cliente.create({
      data: {
        nome: 'Fazenda Santa Clara',
        whatsapp: '65999001001',
        vendedorId: v1.id,
        ultimoProdutoId: produtos[0].id,
        dataPrimeiraCompra: subDays(new Date(), 90),
        dataUltimaCompra: subDays(new Date(), 28),
        totalCompras: 3,
        valorTotalAcumulado: 72000,
        ultimoContato: subDays(new Date(), 5),
        statusRelacionamento: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        nome: 'Rancho Bom Futuro',
        whatsapp: '65999002002',
        vendedorId: v1.id,
        ultimoProdutoId: produtos[1].id,
        dataPrimeiraCompra: subDays(new Date(), 120),
        dataUltimaCompra: subDays(new Date(), 5),
        totalCompras: 4,
        valorTotalAcumulado: 96000,
        ultimoContato: subDays(new Date(), 2),
        statusRelacionamento: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        nome: 'Fazenda Esperança',
        whatsapp: '65999003003',
        vendedorId: v2.id,
        ultimoProdutoId: produtos[2].id,
        dataPrimeiraCompra: subDays(new Date(), 60),
        dataUltimaCompra: subDays(new Date(), 32),
        totalCompras: 2,
        valorTotalAcumulado: 48000,
        ultimoContato: subDays(new Date(), 35),
        statusRelacionamento: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        nome: 'Agropecuária Irmãos Santos',
        whatsapp: '65999004004',
        vendedorId: v2.id,
        ultimoProdutoId: produtos[3].id,
        dataPrimeiraCompra: subDays(new Date(), 180),
        dataUltimaCompra: subDays(new Date(), 10),
        totalCompras: 6,
        valorTotalAcumulado: 144000,
        ultimoContato: subDays(new Date(), 10),
        statusRelacionamento: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        nome: 'Fazenda Três Corações',
        whatsapp: '65999005005',
        vendedorId: v3.id,
        ultimoProdutoId: produtos[4].id,
        dataPrimeiraCompra: subDays(new Date(), 200),
        dataUltimaCompra: subDays(new Date(), 45),
        totalCompras: 5,
        valorTotalAcumulado: 120000,
        ultimoContato: subDays(new Date(), 40),
        statusRelacionamento: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        nome: 'Confinamento São João',
        whatsapp: '65999006006',
        vendedorId: v3.id,
        ultimoProdutoId: produtos[5].id,
        dataPrimeiraCompra: subDays(new Date(), 300),
        dataUltimaCompra: subDays(new Date(), 3),
        totalCompras: 10,
        valorTotalAcumulado: 240000,
        ultimoContato: subDays(new Date(), 1),
        statusRelacionamento: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        nome: 'Fazenda Beira Rio',
        whatsapp: '65999007007',
        vendedorId: v1.id,
        ultimoProdutoId: produtos[0].id,
        dataPrimeiraCompra: subDays(new Date(), 150),
        dataUltimaCompra: subDays(new Date(), 38),
        totalCompras: 4,
        valorTotalAcumulado: 88000,
        ultimoContato: subDays(new Date(), 38),
        statusRelacionamento: 'ativo',
      },
    }),
    prisma.cliente.create({
      data: {
        nome: 'Pecuária Central Ltda',
        whatsapp: '65999008008',
        vendedorId: v2.id,
        ultimoProdutoId: produtos[6].id,
        dataPrimeiraCompra: subDays(new Date(), 400),
        dataUltimaCompra: subDays(new Date(), 15),
        totalCompras: 14,
        valorTotalAcumulado: 340000,
        ultimoContato: subDays(new Date(), 7),
        statusRelacionamento: 'ativo',
      },
    }),
  ])

  console.log('✅ Clientes criados')

  // Contact history for clients
  await Promise.all([
    prisma.contatoCliente.create({
      data: {
        clienteId: clientes[0].id,
        vendedorId: v1.id,
        tipo: TipoContato.pos_venda,
        resultado: ResultadoContato.respondeu,
        observacao: 'Cliente satisfeito com o produto',
        dataContato: subDays(new Date(), 5),
      },
    }),
    prisma.contatoCliente.create({
      data: {
        clienteId: clientes[0].id,
        vendedorId: v1.id,
        tipo: TipoContato.recompra,
        resultado: ResultadoContato.demonstrou_interesse,
        observacao: 'Vai comprar na próxima semana',
        dataContato: subDays(new Date(), 15),
      },
    }),
    prisma.contatoCliente.create({
      data: {
        clienteId: clientes[1].id,
        vendedorId: v1.id,
        tipo: TipoContato.whatsapp_texto,
        resultado: ResultadoContato.comprou,
        observacao: 'Fechou pedido de 5 sacas',
        dataContato: subDays(new Date(), 2),
      },
    }),
    prisma.contatoCliente.create({
      data: {
        clienteId: clientes[2].id,
        vendedorId: v2.id,
        tipo: TipoContato.ligacao,
        resultado: ResultadoContato.nao_respondeu,
        observacao: 'Tentativa sem sucesso',
        dataContato: subDays(new Date(), 35),
      },
    }),
    prisma.contatoCliente.create({
      data: {
        clienteId: clientes[3].id,
        vendedorId: v2.id,
        tipo: TipoContato.recompra,
        resultado: ResultadoContato.pediu_retorno,
        observacao: 'Retornar em 5 dias',
        dataContato: subDays(new Date(), 10),
      },
    }),
    prisma.contatoCliente.create({
      data: {
        clienteId: clientes[5].id,
        vendedorId: v3.id,
        tipo: TipoContato.relacionamento,
        resultado: ResultadoContato.respondeu,
        observacao: 'Ótimo relacionamento',
        dataContato: subDays(new Date(), 1),
      },
    }),
  ])

  console.log('✅ Contatos de clientes criados')

  // Leads in various stages
  const vendedores = [v1, v2, v3]
  const leadData = [
    // Fez contato leads
    { nome: 'Fazenda Boa Vista', whatsapp: '65991001001', etapa: EtapaLead.fez_contato, vendedor: v1, produto: produtos[0], followups: 0 },
    { nome: 'Sítio São Pedro', whatsapp: '65991002002', etapa: EtapaLead.fez_contato, vendedor: v1, produto: produtos[1], followups: 1 },
    { nome: 'Haras Pantaneiro', whatsapp: '65991003003', etapa: EtapaLead.fez_contato, vendedor: v2, produto: produtos[2], followups: 2 },
    { nome: 'Fazenda Nova Aurora', whatsapp: '65991004004', etapa: EtapaLead.fez_contato, vendedor: v2, produto: produtos[0], followups: 0 },
    { nome: 'Pecuária do Vale', whatsapp: '65991005005', etapa: EtapaLead.fez_contato, vendedor: v3, produto: produtos[3], followups: 3 },
    // Proposta enviada
    { nome: 'Fazenda Horizonte', whatsapp: '65992001001', etapa: EtapaLead.proposta_enviada, vendedor: v1, produto: produtos[1], followups: 2 },
    { nome: 'Rancho das Palmeiras', whatsapp: '65992002002', etapa: EtapaLead.proposta_enviada, vendedor: v1, produto: produtos[4], followups: 3 },
    { nome: 'Agro Mato Grosso', whatsapp: '65992003003', etapa: EtapaLead.proposta_enviada, vendedor: v2, produto: produtos[5], followups: 4 },
    { nome: 'Sítio Primavera', whatsapp: '65992004004', etapa: EtapaLead.proposta_enviada, vendedor: v3, produto: produtos[0], followups: 2 },
    // Negociacao
    { nome: 'Fazenda Ouro Verde', whatsapp: '65993001001', etapa: EtapaLead.negociacao, vendedor: v1, produto: produtos[6], followups: 5 },
    { nome: 'Confinamento Araras', whatsapp: '65993002002', etapa: EtapaLead.negociacao, vendedor: v2, produto: produtos[1], followups: 4 },
    { nome: 'Pecuária Moderna', whatsapp: '65993003003', etapa: EtapaLead.negociacao, vendedor: v3, produto: produtos[7], followups: 6 },
    // Chamar depois
    { nome: 'Fazenda Santa Lúcia', whatsapp: '65994001001', etapa: EtapaLead.chamar_depois, vendedor: v1, produto: produtos[2], followups: 3, agendado: subDays(new Date(), 1) },
    { nome: 'Sítio Boa Esperança', whatsapp: '65994002002', etapa: EtapaLead.chamar_depois, vendedor: v2, produto: produtos[3], followups: 2, agendado: addDays(new Date(), 2) },
    { nome: 'Fazenda Recanto', whatsapp: '65994003003', etapa: EtapaLead.chamar_depois, vendedor: v3, produto: produtos[0], followups: 5, agendado: addDays(new Date(), 1) },
    // Geladeira leads
    { nome: 'Fazenda Cerrado', whatsapp: '65995001001', etapa: EtapaLead.geladeira, vendedor: v1, produto: produtos[1], followups: 8, status: StatusLead.geladeira },
    { nome: 'Sítio Candeias', whatsapp: '65995002002', etapa: EtapaLead.geladeira, vendedor: v2, produto: produtos[2], followups: 9, status: StatusLead.geladeira },
    { nome: 'Haras Bela Vista', whatsapp: '65995003003', etapa: EtapaLead.geladeira, vendedor: v3, produto: produtos[4], followups: 8, status: StatusLead.geladeira },
    // Comprou leads
    { nome: 'Fazenda Serra Dourada', whatsapp: '65996001001', etapa: EtapaLead.comprou, vendedor: v1, produto: produtos[0], followups: 4, status: StatusLead.convertido, valorBruto: 28000, valorLiquido: 25000 },
    { nome: 'Rancho Mineiro', whatsapp: '65996002002', etapa: EtapaLead.comprou, vendedor: v2, produto: produtos[5], followups: 3, status: StatusLead.convertido, valorBruto: 42000, valorLiquido: 38000 },
    { nome: 'Pecuária Flor do Campo', whatsapp: '65996003003', etapa: EtapaLead.comprou, vendedor: v3, produto: produtos[6], followups: 5, status: StatusLead.convertido, valorBruto: 65000, valorLiquido: 60000 },
    // Desqualificado
    { nome: 'Pequeno Sítio ABC', whatsapp: '65997001001', etapa: EtapaLead.desqualificado, vendedor: v1, produto: produtos[0], followups: 3, status: StatusLead.desqualificado },
    { nome: 'Fazenda Sem Interesse', whatsapp: '65997002002', etapa: EtapaLead.desqualificado, vendedor: v2, produto: produtos[1], followups: 8, status: StatusLead.desqualificado },
    // More active leads
    { nome: 'Bovinocultura Sul', whatsapp: '65998001001', etapa: EtapaLead.fez_contato, vendedor: v1, produto: produtos[3], followups: 7 },
    { nome: 'Fazenda Alto da Serra', whatsapp: '65998002002', etapa: EtapaLead.proposta_enviada, vendedor: v2, produto: produtos[7], followups: 6 },
    { nome: 'Rancho Feliz', whatsapp: '65998003003', etapa: EtapaLead.negociacao, vendedor: v3, produto: produtos[2], followups: 8 },
  ]

  const createdLeads = []
  for (const ld of leadData) {
    const chegouEm = subDays(new Date(), Math.floor(Math.random() * 30) + 1)
    const lead = await prisma.lead.create({
      data: {
        nomeCliente: ld.nome,
        whatsapp: ld.whatsapp,
        produtoId: ld.produto.id,
        origem: Math.random() > 0.5 ? OrigemLead.rastreado : OrigemLead.nao_rastreado,
        etapa: ld.etapa,
        statusLead: (ld as any).status || StatusLead.ativo,
        vendedorId: ld.vendedor.id,
        chegouEm,
        primeiraRespostaEm: ld.followups > 0 ? subHours(chegouEm, -2) : null,
        agendadoPara: (ld as any).agendado || null,
        atrasado: (ld as any).agendado ? new Date() > (ld as any).agendado : false,
        valorBruto: (ld as any).valorBruto || null,
        valorLiquido: (ld as any).valorLiquido || null,
        motivoDesqualificacao: ld.etapa === EtapaLead.desqualificado
          ? (ld.followups >= 8 ? 'nunca_respondeu_8_tentativas' : 'sem_interesse') as any
          : null,
        entadaGeladeira: ld.etapa === EtapaLead.geladeira ? subDays(new Date(), 7) : null,
        proximaReativacao: ld.etapa === EtapaLead.geladeira ? addDays(new Date(), 3) : null,
        tentativasReativacao: ld.etapa === EtapaLead.geladeira ? 1 : 0,
      },
    })

    // Create followups
    for (let i = 1; i <= ld.followups; i++) {
      await prisma.followup.create({
        data: {
          leadId: lead.id,
          vendedorId: ld.vendedor.id,
          numero: i,
          observacao: i === 1 ? 'Primeiro contato realizado' : `Follow-up ${i} realizado com sucesso`,
          registradoEm: subDays(new Date(), ld.followups - i + 1),
        },
      })
    }

    // Create checklist items
    const numItems = Math.floor(Math.random() * 6) + 1
    for (let item = 1; item <= numItems; item++) {
      await prisma.scriptChecklistItem.create({
        data: {
          leadId: lead.id,
          item,
          concluido: true,
          objecao: item === 7 ? 'achou_caro' as any : null,
          concluidoEm: subDays(new Date(), numItems - item),
        },
      })
    }

    // Create stage history
    await prisma.leadEtapaHistorico.create({
      data: {
        leadId: lead.id,
        etapaAnterior: null,
        etapaNova: EtapaLead.fez_contato,
        mudadoEm: chegouEm,
      },
    })

    if (ld.etapa !== EtapaLead.fez_contato) {
      await prisma.leadEtapaHistorico.create({
        data: {
          leadId: lead.id,
          etapaAnterior: EtapaLead.fez_contato,
          etapaNova: ld.etapa,
          mudadoEm: subDays(new Date(), 2),
        },
      })
    }

    createdLeads.push(lead)
  }

  console.log('✅ Leads criados')

  // Message templates
  await Promise.all([
    prisma.templateMensagem.create({
      data: {
        nome: 'Apresentação inicial',
        categoria: 'follow-up',
        conteudo: 'Olá [NOME]! 👋 Aqui é [VENDEDOR] da Agropec Brasil. Vi que você tem interesse em nossos suplementos para bovinos. Poderia me contar um pouco sobre seu rebanho?',
      },
    }),
    prisma.templateMensagem.create({
      data: {
        nome: 'Envio de combo',
        categoria: 'follow-up',
        conteudo: 'Olá [NOME]! Como vai? Hoje tenho uma oferta especial para você: [COMBO]. Frete grátis e pagamento na retirada ou pelos Correios. O que acha?',
      },
    }),
    prisma.templateMensagem.create({
      data: {
        nome: 'Follow-up geladeira',
        categoria: 'geladeira',
        conteudo: 'Oi [NOME], tudo bem? Passando para saber se você ainda tem interesse nos nossos suplementos. Temos novidades que podem te interessar! 🐄',
      },
    }),
    prisma.templateMensagem.create({
      data: {
        nome: 'Reativação 7 dias',
        categoria: 'reativação',
        conteudo: 'Olá [NOME]! Faz uma semana que conversamos. Queria saber se você teve tempo de pensar na nossa proposta. Estou à disposição!',
      },
    }),
    prisma.templateMensagem.create({
      data: {
        nome: 'Reativação 15 dias',
        categoria: 'reativação',
        conteudo: 'Oi [NOME], [VENDEDOR] aqui! Han faz 2 semanas que falamos. Temos condições especiais esta semana. Quer dar uma olhada?',
      },
    }),
    prisma.templateMensagem.create({
      data: {
        nome: 'Pós-venda boas-vindas',
        categoria: 'pós-venda',
        conteudo: 'Olá [NOME]! Parabéns pela decisão de investir na qualidade do seu rebanho com a Agropec Brasil! 🎉 Em caso de dúvidas sobre o uso do produto, estou aqui!',
      },
    }),
    prisma.templateMensagem.create({
      data: {
        nome: 'Lembrete recompra',
        categoria: 'carteira',
        conteudo: 'Oi [NOME]! Como está o estoque de [PRODUTO]? Já deve estar quase acabando! Posso preparar um novo pedido para você?',
      },
    }),
    prisma.templateMensagem.create({
      data: {
        nome: 'Promoção mensal',
        categoria: 'promoção',
        conteudo: 'Olá [NOME]! Temos uma promoção especial este mês: [OFERTA]. Condições imperdíveis para quem já é nosso cliente! 🌟',
      },
    }),
    prisma.templateMensagem.create({
      data: {
        nome: 'Objeção preço alto',
        categoria: 'follow-up',
        conteudo: 'Entendo sua preocupação com o investimento, [NOME]. Mas vamos calcular juntos: com [PRODUTO], o custo por cabeça/dia é apenas R$[CUSTO]. Em 30 dias você já vê a diferença na produção! Vale a pena, não é?',
      },
    }),
    prisma.templateMensagem.create({
      data: {
        nome: 'Relacionamento mensal',
        categoria: 'carteira',
        conteudo: 'Olá [NOME]! Como está o [PRODUTO] no rebanho? Qualquer dúvida ou precisar de mais informações sobre uso, me chame! 😊',
      },
    }),
  ])

  console.log('✅ Templates criados')

  // System configurations
  await Promise.all([
    prisma.configuracaoSistema.create({ data: { chave: 'janela_inicio', valor: '08:00', descricao: 'Horário de início da janela de trabalho' } }),
    prisma.configuracaoSistema.create({ data: { chave: 'janela_fim', valor: '15:00', descricao: 'Horário de fim da janela de trabalho' } }),
    prisma.configuracaoSistema.create({ data: { chave: 'max_followups_geladeira', valor: '8', descricao: 'Número de follow-ups para sugerir geladeira' } }),
    prisma.configuracaoSistema.create({ data: { chave: 'reativacao_7dias', valor: '7', descricao: 'Dias para primeira reativação geladeira' } }),
    prisma.configuracaoSistema.create({ data: { chave: 'reativacao_15dias', valor: '15', descricao: 'Dias para segunda reativação geladeira' } }),
    prisma.configuracaoSistema.create({ data: { chave: 'reativacao_30dias', valor: '30', descricao: 'Dias para terceira reativação geladeira' } }),
    prisma.configuracaoSistema.create({ data: { chave: 'meta_contatos_mes', valor: '2', descricao: 'Meta de contatos por cliente por mês' } }),
    prisma.configuracaoSistema.create({ data: { chave: 'salario_fixo_dia20', valor: '1000', descricao: 'Salário fixo pago no dia 20' } }),
    prisma.configuracaoSistema.create({ data: { chave: 'salario_fixo_dia5', valor: '1000', descricao: 'Salário fixo pago no 5° dia útil do mês' } }),
  ])

  console.log('✅ Configurações criadas')

  // Notifications
  const activeUsers = [v1, v2, v3]
  for (const user of activeUsers) {
    await prisma.notificacao.create({
      data: {
        userId: user.id,
        tipo: 'carteira_sem_contato',
        mensagem: 'Você tem clientes sem contato este mês. Verifique sua carteira!',
        lida: false,
      },
    })
  }

  console.log('✅ Notificações criadas')
  console.log('🎉 Seed concluído com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
