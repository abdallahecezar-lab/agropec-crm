import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createContatoSchema = z.object({
  tipo: z.enum(['pos_venda', 'recompra', 'promocao', 'ligacao', 'whatsapp_texto', 'whatsapp_audio', 'relacionamento', 'lembrete_reposicao']),
  resultado: z.enum(['respondeu', 'nao_respondeu', 'demonstrou_interesse', 'pediu_retorno', 'comprou', 'sem_interesse']),
  observacao: z.string().optional(),
  dataContato: z.string().datetime().optional(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const cliente = await prisma.cliente.findUnique({ where: { id: params.id } })
    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && cliente.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const contatos = await prisma.contatoCliente.findMany({
      where: { clienteId: params.id },
      include: { vendedor: { select: { nome: true } } },
      orderBy: { dataContato: 'desc' },
    })

    return NextResponse.json({ contatos })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const cliente = await prisma.cliente.findUnique({ where: { id: params.id } })
    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && cliente.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const result = createContatoSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { tipo, resultado, observacao, dataContato } = result.data

    const contato = await prisma.contatoCliente.create({
      data: {
        clienteId: params.id,
        vendedorId: user.id,
        tipo,
        resultado,
        observacao: observacao || null,
        dataContato: dataContato ? new Date(dataContato) : new Date(),
      },
      include: { vendedor: { select: { nome: true } } },
    })

    // Update client's last contact
    await prisma.cliente.update({
      where: { id: params.id },
      data: { ultimoContato: new Date() },
    })

    // If resultado is 'comprou', update totals
    if (resultado === 'comprou') {
      await prisma.cliente.update({
        where: { id: params.id },
        data: {
          totalCompras: { increment: 1 },
          dataUltimaCompra: new Date(),
        },
      })
    }

    return NextResponse.json({ contato }, { status: 201 })
  } catch (error) {
    console.error('POST contato error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
