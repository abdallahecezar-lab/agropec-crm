import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import * as XLSX from 'xlsx'

// Mapeamento de etapas do Tintim → etapas do CRM
const ETAPA_MAP: Record<string, string> = {
  'fez contato': 'fez_contato',
  'proposta enviada': 'proposta_enviada',
  'negociação': 'negociacao',
  'negociacao': 'negociacao',
  'chamar depois': 'chamar_depois',
  'correios': 'correios',
  'comprou': 'comprou',
  'voltou': 'voltou',
  'desqualificado': 'desqualificado',
  'geladeira': 'geladeira',
}

const STATUS_MAP: Record<string, string> = {
  'comprou': 'convertido',
  'desqualificado': 'desqualificado',
  'geladeira': 'geladeira',
}

function mapEtapa(etapaTintim: string): { etapa: string; statusLead: string } {
  const key = etapaTintim.toLowerCase().trim()
  const etapa = ETAPA_MAP[key] || 'fez_contato'
  const statusLead = STATUS_MAP[etapa] || 'ativo'
  return { etapa, statusLead }
}

function normalizePhone(phone: unknown): string {
  if (!phone) return ''
  return String(phone).replace(/\D/g, '')
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

    // Parse CSV ou XLSX
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: false })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Arquivo vazio ou sem dados' }, { status: 400 })
    }

    // Busca todos os vendedores para lookup
    const vendedores = await prisma.user.findMany({
      where: { role: 'vendedor', ativo: true },
      select: { id: true, nome: true },
    })

    const resultados = {
      importados: 0,
      duplicados: 0,
      ignorados: [] as { linha: number; motivo: string }[],
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const linha = i + 2

      // Colunas do CSV do Tintim
      const nomeContato = String(
        row['Nome do Contato'] || row['nome do contato'] || ''
      ).trim()
      const whatsapp = normalizePhone(
        row['WhatsApp do Contato'] || row['whatsapp do contato'] || row['WhatsApp'] || ''
      )
      const nomeConta = String(
        row['Nome da Conta'] || row['nome da conta'] || ''
      ).trim()
      const etapaTintim = String(
        row['Etapa da Jornada'] || row['etapa da jornada'] || 'Fez Contato'
      ).trim()
      const dataStr = String(
        row['Data da Primeira Mensagem'] || row['data da primeira mensagem'] || ''
      ).trim()
      const linkRastreavel = String(row['Link Rastreável'] || row['Link Rastreavel'] || '').trim()
      const valorVenda = parseFloat(String(row['Valor da Última Venda'] || row['Valor da Ultima Venda'] || '0').replace(',', '.')) || 0

      if (!whatsapp || whatsapp.length < 10) {
        resultados.ignorados.push({ linha, motivo: `WhatsApp inválido: "${whatsapp}"` })
        continue
      }

      // Match vendedor pelo nome da conta
      const vendedor = vendedores.find(
        (v) =>
          v.nome.toLowerCase() === nomeConta.toLowerCase() ||
          v.nome.toLowerCase().includes(nomeConta.toLowerCase()) ||
          nomeConta.toLowerCase().includes(v.nome.toLowerCase())
      )

      if (!vendedor) {
        resultados.ignorados.push({ linha, motivo: `Vendedor não encontrado: "${nomeConta}"` })
        continue
      }

      // Verifica duplicata
      const existente = await prisma.lead.findFirst({
        where: {
          whatsapp,
          vendedorId: vendedor.id,
          statusLead: { in: ['ativo', 'geladeira'] },
        },
      })

      if (existente) {
        resultados.duplicados++
        continue
      }

      const { etapa, statusLead } = mapEtapa(etapaTintim)
      const nomeCliente = nomeContato || `WhatsApp ${whatsapp}`
      const origem = linkRastreavel ? 'rastreado' : 'nao_rastreado'

      // Data de chegada
      let chegouEm = new Date()
      if (dataStr) {
        const parsed = new Date(dataStr)
        if (!isNaN(parsed.getTime())) chegouEm = parsed
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const leadData: any = {
        nomeCliente,
        whatsapp,
        vendedorId: vendedor.id,
        etapa,
        statusLead,
        origem,
        chegouEm,
      }

      if (valorVenda > 0) {
        leadData.valorBruto = valorVenda
        leadData.valorLiquido = valorVenda
      }

      if (etapa === 'geladeira') {
        leadData.entadaGeladeira = chegouEm
        leadData.proximaReativacao = new Date(chegouEm.getTime() + 7 * 24 * 60 * 60 * 1000)
      }

      const lead = await prisma.lead.create({ data: leadData })

      await prisma.leadEtapaHistorico.create({
        data: {
          leadId: lead.id,
          etapaNova: etapa as never,
          observacao: `Importado do Tintim (conta: ${nomeConta})`,
        },
      })

      resultados.importados++
    }

    return NextResponse.json({
      sucesso: true,
      total: rows.length,
      importados: resultados.importados,
      duplicados: resultados.duplicados,
      ignorados: resultados.ignorados.length,
      erros: resultados.ignorados,
    })
  } catch (error) {
    console.error('POST /api/importar/leads-tintim error:', error)
    return NextResponse.json({ error: 'Erro interno ao processar arquivo' }, { status: 500 })
  }
}
