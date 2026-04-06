import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ETAPA_LABEL: Record<string, string> = {
  fez_contato: 'Fez Contato',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  chamar_depois: 'Chamar Depois',
  correios: 'Correios',
  comprou: 'Comprou',
  voltou: 'Voltou',
  desqualificado: 'Desqualificado',
  geladeira: 'Geladeira',
}

const STATUS_LABEL: Record<string, string> = {
  ativo: 'Ativo',
  convertido: 'Convertido',
  desqualificado: 'Desqualificado',
  geladeira: 'Geladeira',
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return ''
  return new Date(date).toLocaleDateString('pt-BR')
}

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const vendedorId = searchParams.get('vendedorId')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (user.role === 'vendedor') {
      where.vendedorId = user.id
    } else if (vendedorId) {
      where.vendedorId = vendedorId
    }
    // gestor/diretor sem filtro = todos

    const leads = await prisma.lead.findMany({
      where,
      include: {
        vendedor: { select: { nome: true } },
        produto: { select: { nome: true } },
      },
      orderBy: { chegouEm: 'desc' },
      take: 5000,
    })

    // Monta CSV
    const header = [
      'Nome do Cliente',
      'WhatsApp',
      'Vendedor',
      'Etapa',
      'Status',
      'Produto',
      'Origem',
      'Chegou Em',
      'Valor Bruto',
      'Valor Líquido',
      'Forma de Pagamento',
      'Comprou Em',
      'Motivo Desqualificação',
    ].join(',')

    const rows = leads.map((l) =>
      [
        escapeCSV(l.nomeCliente),
        escapeCSV(l.whatsapp),
        escapeCSV(l.vendedor.nome),
        escapeCSV(ETAPA_LABEL[l.etapa] || l.etapa),
        escapeCSV(STATUS_LABEL[l.statusLead] || l.statusLead),
        escapeCSV(l.produto?.nome || ''),
        escapeCSV(l.origem === 'rastreado' ? 'Rastreado' : 'Não Rastreado'),
        escapeCSV(formatDate(l.chegouEm)),
        escapeCSV(l.valorBruto ?? ''),
        escapeCSV(l.valorLiquido ?? ''),
        escapeCSV(l.formaPagamento || ''),
        escapeCSV(formatDate(l.comprouEm)),
        escapeCSV(l.motivoDesqualificacao || ''),
      ].join(',')
    )

    const csv = [header, ...rows].join('\n')
    const filename = `leads-${user.nome.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('GET /api/exportar/leads error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
