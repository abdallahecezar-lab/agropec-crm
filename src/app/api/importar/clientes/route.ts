import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

function parseDate(value: unknown): Date | null {
  if (!value) return null

  // Excel serial date number
  if (typeof value === 'number') {
    const date = XLSX.SSF.parse_date_code(value)
    if (date) return new Date(date.y, date.m - 1, date.d)
  }

  if (typeof value === 'string') {
    // DD/MM/AAAA
    const parts = value.trim().split('/')
    if (parts.length === 3) {
      const [d, m, y] = parts
      const date = new Date(Number(y), Number(m) - 1, Number(d))
      if (!isNaN(date.getTime())) return date
    }
    // ISO or other parseable formats
    const date = new Date(value)
    if (!isNaN(date.getTime())) return date
  }

  return null
}

function normalizeWhatsapp(value: unknown): string {
  if (!value) return ''
  return String(value).replace(/\D/g, '')
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role === 'vendedor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const formData = await request.formData()
    const file = formData.get('arquivo') as File | null

    if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Planilha vazia ou sem dados' }, { status: 400 })
    }

    // Busca todos os vendedores e produtos para lookup
    const vendedores = await prisma.user.findMany({
      where: { role: 'vendedor', ativo: true },
      select: { id: true, nome: true },
    })
    const produtos = await prisma.produto.findMany({
      where: { ativo: true },
      select: { id: true, nome: true },
    })

    const resultados = {
      importados: 0,
      atualizados: 0,
      ignorados: [] as { linha: number; motivo: string }[],
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const linha = i + 2 // linha real na planilha (1 = header)

      const nomeCliente = String(row['nome'] || row['Nome'] || row['NOME'] || '').trim()
      const whatsapp = normalizeWhatsapp(row['whatsapp'] || row['Whatsapp'] || row['WhatsApp'] || row['WHATSAPP'] || row['telefone'] || row['Telefone'])
      const nomeVendedor = String(row['vendedor'] || row['Vendedor'] || row['VENDEDOR'] || '').trim()
      const nomeProduto = String(row['produto'] || row['Produto'] || row['PRODUTO'] || '').trim()
      const dataPrimeira = parseDate(row['data_primeira_compra'] || row['Data Primeira Compra'] || row['primeira_compra'])
      const dataUltima = parseDate(row['data_ultima_compra'] || row['Data Ultima Compra'] || row['Data Última Compra'] || row['ultima_compra'])
      const valorTotal = parseFloat(String(row['valor_total'] || row['Valor Total'] || row['VALOR_TOTAL'] || '0').replace(',', '.')) || 0

      if (!nomeCliente) {
        resultados.ignorados.push({ linha, motivo: 'Nome do cliente vazio' })
        continue
      }
      if (!whatsapp || whatsapp.length < 10) {
        resultados.ignorados.push({ linha, motivo: `WhatsApp inválido: "${whatsapp}"` })
        continue
      }
      if (!nomeVendedor) {
        resultados.ignorados.push({ linha, motivo: 'Vendedor não informado' })
        continue
      }

      // Match vendedor (case-insensitive, parcial)
      const vendedor = vendedores.find(
        (v) => v.nome.toLowerCase() === nomeVendedor.toLowerCase() ||
               v.nome.toLowerCase().includes(nomeVendedor.toLowerCase()) ||
               nomeVendedor.toLowerCase().includes(v.nome.toLowerCase())
      )
      if (!vendedor) {
        resultados.ignorados.push({ linha, motivo: `Vendedor não encontrado: "${nomeVendedor}"` })
        continue
      }

      // Match produto (opcional)
      let produtoId: string | null = null
      if (nomeProduto) {
        const produto = produtos.find(
          (p) => p.nome.toLowerCase().includes(nomeProduto.toLowerCase()) ||
                 nomeProduto.toLowerCase().includes(p.nome.toLowerCase())
        )
        if (produto) produtoId = produto.id
      }

      const primeiraCompra = dataPrimeira || new Date()
      const ultimaCompra = dataUltima || primeiraCompra

      // Verifica se já existe (mesmo whatsapp + vendedor)
      const existente = await prisma.cliente.findFirst({
        where: { whatsapp, vendedorId: vendedor.id },
      })

      if (existente) {
        await prisma.cliente.update({
          where: { id: existente.id },
          data: {
            nome: nomeCliente,
            ultimoProdutoId: produtoId || existente.ultimoProdutoId,
            dataUltimaCompra: ultimaCompra,
            valorTotalAcumulado: valorTotal || existente.valorTotalAcumulado,
          },
        })
        resultados.atualizados++
      } else {
        await prisma.cliente.create({
          data: {
            nome: nomeCliente,
            whatsapp,
            vendedorId: vendedor.id,
            ultimoProdutoId: produtoId,
            dataPrimeiraCompra: primeiraCompra,
            dataUltimaCompra: ultimaCompra,
            valorTotalAcumulado: valorTotal,
            totalCompras: 1,
          },
        })
        resultados.importados++
      }
    }

    return NextResponse.json({
      sucesso: true,
      total: rows.length,
      importados: resultados.importados,
      atualizados: resultados.atualizados,
      ignorados: resultados.ignorados.length,
      erros: resultados.ignorados,
    })
  } catch (error) {
    console.error('POST /api/importar/clientes error:', error)
    return NextResponse.json({ error: 'Erro interno ao processar arquivo' }, { status: 500 })
  }
}
