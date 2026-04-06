import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Mapeamento: nome da conta no Tintim → nome do vendedor no banco
// Usado como fallback caso o nome exato não bata
const NOME_ALIASES: Record<string, string> = {
  'Vania': 'Vania',
  'Vânia': 'Vania',
  'Celia': 'Célia',
  'Célia': 'Célia',
  'Candida': 'Cândida',
  'Cândida': 'Cândida',
  'Jose': 'José',
  'José': 'José',
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Filtra somente eventos de novo lead
    if (body.event_type !== 'lead.create') {
      return NextResponse.json({ message: 'Evento ignorado', event_type: body.event_type })
    }

    const accountName: string = body?.account?.name || ''
    const nomeLead: string = body?.name || ''
    const whatsapp: string = body?.phone_e164 || ''
    const visit = body?.visit

    if (!whatsapp || !accountName) {
      return NextResponse.json(
        { error: 'Campos obrigatórios ausentes: phone_e164, account.name' },
        { status: 400 }
      )
    }

    // Resolve o nome do vendedor (com aliases para acentos)
    const nomeNormalizado = NOME_ALIASES[accountName] || accountName

    // Busca o vendedor pelo nome (case-insensitive)
    const vendedor = await prisma.user.findFirst({
      where: {
        role: 'vendedor',
        ativo: true,
        nome: { equals: nomeNormalizado, mode: 'insensitive' },
      },
    })

    if (!vendedor) {
      console.warn(`[Tintim Webhook] Vendedor não encontrado para conta: "${accountName}"`)
      return NextResponse.json(
        { error: `Vendedor não encontrado para conta Tintim: "${accountName}"` },
        { status: 404 }
      )
    }

    // Evita duplicatas
    const existente = await prisma.lead.findFirst({
      where: {
        whatsapp,
        vendedorId: vendedor.id,
        statusLead: { in: ['ativo', 'geladeira'] },
      },
    })

    if (existente) {
      return NextResponse.json({
        message: 'Lead já existe (ignorado)',
        leadId: existente.id,
        duplicado: true,
      })
    }

    // Cria o lead
    const nomeCliente = nomeLead.trim() !== '' ? nomeLead.trim() : `WhatsApp ${whatsapp}`
    const origemLead = visit && visit !== 'null' ? 'rastreado' : 'nao_rastreado'

    const lead = await prisma.lead.create({
      data: {
        nomeCliente,
        whatsapp,
        vendedorId: vendedor.id,
        etapa: 'fez_contato',
        statusLead: 'ativo',
        origem: origemLead,
      },
    })

    await prisma.leadEtapaHistorico.create({
      data: {
        leadId: lead.id,
        etapaNova: 'fez_contato',
        observacao: `Lead criado via Tintim (conta: ${accountName})`,
      },
    })

    console.log(`[Tintim Webhook] Lead criado: ${lead.id} para ${vendedor.nome} (${whatsapp})`)
    return NextResponse.json({ lead, criado: true }, { status: 201 })
  } catch (error) {
    console.error('[Tintim Webhook] Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
