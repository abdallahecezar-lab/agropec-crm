import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'agropec-webhook-2024'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Valida secret (enviado pelo n8n no header ou no body)
    const secret = request.headers.get('x-webhook-secret') || body.secret
    if (secret !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Campos esperados (mapeados pelo n8n a partir do payload do Tintim)
    const { nome, whatsapp, vendedorId, origem } = body

    if (!whatsapp || !vendedorId) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: whatsapp, vendedorId' },
        { status: 400 }
      )
    }

    // Verifica se o vendedor existe
    const vendedor = await prisma.user.findUnique({ where: { id: vendedorId } })
    if (!vendedor || !vendedor.ativo) {
      return NextResponse.json({ error: 'Vendedor não encontrado' }, { status: 404 })
    }

    // Evita duplicatas: verifica se já existe lead ativo com esse WhatsApp para esse vendedor
    const existente = await prisma.lead.findFirst({
      where: {
        whatsapp,
        vendedorId,
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
    const nomeCliente = nome && nome.trim() !== '' ? nome.trim() : `WhatsApp ${whatsapp}`
    const origemLead = origem === 'rastreado' ? 'rastreado' : 'nao_rastreado'

    const lead = await prisma.lead.create({
      data: {
        nomeCliente,
        whatsapp,
        vendedorId,
        etapa: 'fez_contato',
        statusLead: 'ativo',
        origem: origemLead,
      },
    })

    // Registra histórico de etapa
    await prisma.leadEtapaHistorico.create({
      data: {
        leadId: lead.id,
        etapaNova: 'fez_contato',
        observacao: 'Lead criado automaticamente via Tintim/WhatsApp',
      },
    })

    return NextResponse.json({ lead, criado: true }, { status: 201 })
  } catch (error) {
    console.error('POST /api/webhook/leads error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
