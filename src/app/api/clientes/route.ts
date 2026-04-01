import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const vendedorId = searchParams.get('vendedorId')

    const where: any = {}

    if (user.role === 'vendedor') {
      where.vendedorId = user.id
    } else if (vendedorId) {
      where.vendedorId = vendedorId
    }

    const clientes = await prisma.cliente.findMany({
      where,
      include: {
        ultimoProduto: true,
        contatos: {
          orderBy: { dataContato: 'desc' },
        },
      },
      orderBy: { dataUltimaCompra: 'desc' },
    })

    // Calculate carteira status for each client
    const inicio = startOfMonth(new Date())
    const fim = endOfMonth(new Date())

    const clientesComStatus = clientes.map((c) => {
      const contatosMes = c.contatos.filter((contato) => {
        const data = new Date(contato.dataContato)
        return data >= inicio && data <= fim
      })

      let statusCarteira: 'vermelho' | 'amarelo' | 'verde'
      if (contatosMes.length === 0) statusCarteira = 'vermelho'
      else if (contatosMes.length === 1) statusCarteira = 'amarelo'
      else statusCarteira = 'verde'

      // Check recompra window
      let recompraStatus: 'normal' | 'proximo' | 'vencido' = 'normal'
      let recompraRestantes = null

      if (c.ultimoProduto) {
        const diasDesdeCompra = Math.floor(
          (new Date().getTime() - new Date(c.dataUltimaCompra).getTime()) / (1000 * 60 * 60 * 24)
        )
        recompraRestantes = c.ultimoProduto.cicloRecompraDias - diasDesdeCompra
        if (recompraRestantes < 0) recompraStatus = 'vencido'
        else if (recompraRestantes <= c.ultimoProduto.cicloRecompraDias * 0.2) recompraStatus = 'proximo'
      }

      return { ...c, statusCarteira, recompraStatus, recompraRestantes }
    })

    return NextResponse.json({ clientes: clientesComStatus })
  } catch (error) {
    console.error('GET /api/clientes error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
