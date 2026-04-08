import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ETAPA_LABEL: Record<string, string> = {
  fez_contato: 'Fez Contato',
  apresentacao: 'Apresentação',
  proposta_enviada: 'Proposta Enviada',
  negociacao: 'Negociação',
  chamar_depois: 'Chamar Depois',
  correios: 'Correios',
  comprou: 'Comprou',
  voltou: 'Voltou',
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
    const etapa = searchParams.get('etapa')
    const origem = searchParams.get('origem')
    const vendedorId = searchParams.get('vendedorId')
    const busca = searchParams.get('busca')
    const chegouEmInicio = searchParams.get('chegouEmInicio')
    const chegouEmFim = searchParams.get('chegouEmFim')
    const ultimoContatoInicio = searchParams.get('ultimoContatoInicio')
    const ultimoContatoFim = searchParams.get('ultimoContatoFim')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {}

    if (user.role === 'vendedor') {
      where.vendedorId = user.id
    } else if (user.role === 'gestor') {
      const equipe = await prisma.user.findMany({
        where: { gestorId: user.id, role: 'vendedor' },
        select: { id: true },
      })
      const ids = [...equipe.map((v) => v.id), user.id]
      if (vendedorId && ids.includes(vendedorId)) {
        where.vendedorId = vendedorId
      } else {
        where.vendedorId = { in: ids }
      }
    } else if (user.role === 'diretor' && vendedorId) {
      where.vendedorId = vendedorId
    }

    if (etapa) where.etapa = etapa
    if (origem) where.origem = origem

    if (chegouEmInicio || chegouEmFim) {
      where.chegouEm = {}
      if (chegouEmInicio) where.chegouEm.gte = new Date(chegouEmInicio)
      if (chegouEmFim) {
        const fim = new Date(chegouEmFim)
        fim.setHours(23, 59, 59, 999)
        where.chegouEm.lte = fim
      }
    }

    if (ultimoContatoInicio || ultimoContatoFim) {
      const fw: any = {}
      if (ultimoContatoInicio) fw.gte = new Date(ultimoContatoInicio)
      if (ultimoContatoFim) {
        const fim = new Date(ultimoContatoFim)
        fim.setHours(23, 59, 59, 999)
        fw.lte = fim
      }
      where.followups = { some: { criadoEm: fw } }
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        vendedor: { select: { nome: true } },
        followups: { orderBy: { criadoEm: 'desc' }, take: 1, select: { criadoEm: true } },
      },
      orderBy: { chegouEm: 'desc' },
      take: 5000,
    })

    // Filtro local de busca por nome/whatsapp
    const resultado = busca
      ? leads.filter(
          (l) =>
            l.nomeCliente.toLowerCase().includes(busca.toLowerCase()) ||
            l.whatsapp.includes(busca)
        )
      : leads

    const header = ['Nome', 'Telefone', 'Data de Entrada', 'Último Contato', 'Origem', 'Status no Kanban', 'Vendedor'].join(',')

    const rows = resultado.map((l) =>
      [
        escapeCSV(l.nomeCliente),
        escapeCSV(l.whatsapp),
        escapeCSV(formatDate(l.chegouEm)),
        escapeCSV(formatDate(l.followups?.[0]?.criadoEm)),
        escapeCSV(l.origem === 'rastreado' ? 'Meta Ads' : 'Direto'),
        escapeCSV(ETAPA_LABEL[l.etapa] || l.etapa),
        escapeCSV(l.vendedor?.nome || ''),
      ].join(',')
    )

    const csv = [header, ...rows].join('\n')
    const filename = `leads-${new Date().toISOString().slice(0, 10)}.csv`

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
