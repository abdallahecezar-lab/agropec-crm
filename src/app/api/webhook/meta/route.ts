import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Token de verificação definido nas configs do sistema (chave: meta_verify_token)
// Padrão fixo se não estiver no banco ainda
const DEFAULT_VERIFY_TOKEN = 'agropec-meta-2024'

// GET — verificação do webhook pelo Meta
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    // Busca o token salvo nas configurações
    const config = await prisma.configuracaoSistema.findUnique({
      where: { chave: 'meta_verify_token' },
    })
    const verifyToken = config?.valor || DEFAULT_VERIFY_TOKEN

    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Meta Webhook] Verificação OK')
      return new NextResponse(challenge, { status: 200 })
    }

    return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
  } catch (error) {
    console.error('[Meta Webhook] Erro na verificação:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// POST — recebe novos leads do Meta Lead Ads
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Estrutura do payload Meta Lead Ads:
    // { object: 'page', entry: [{ changes: [{ field: 'leadgen', value: { leadgen_id, form_id, page_id, ... } }] }] }
    if (body.object !== 'page') {
      return NextResponse.json({ message: 'Ignorado (não é evento de página)' })
    }

    const resultados = []

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'leadgen') continue

        const leadgenData = change.value
        const formId: string = leadgenData?.form_id || ''
        const leadgenId: string = leadgenData?.leadgen_id || ''
        const adId: string = leadgenData?.ad_id || ''

        if (!leadgenId) continue

        // Busca dados completos do lead via Graph API
        const metaToken = await getMetaToken()
        let nomeLead = ''
        let whatsappLead = ''

        if (metaToken) {
          const leadData = await fetchLeadFromMeta(leadgenId, metaToken)
          nomeLead = leadData.nome || ''
          whatsappLead = leadData.whatsapp || ''
        }

        // Sem WhatsApp não dá para criar o lead
        if (!whatsappLead) {
          console.warn(`[Meta Webhook] Lead ${leadgenId} sem WhatsApp — ignorado`)
          resultados.push({ leadgenId, status: 'sem_whatsapp' })
          continue
        }

        // Determina a vendedora: tenta pelo formId, depois round-robin
        const vendedor = await resolverVendedora(formId)
        if (!vendedor) {
          console.warn(`[Meta Webhook] Nenhuma vendedora ativa disponível para o lead ${leadgenId}`)
          resultados.push({ leadgenId, status: 'sem_vendedora' })
          continue
        }

        // Evita duplicata
        const existente = await prisma.lead.findFirst({
          where: {
            whatsapp: whatsappLead,
            vendedorId: vendedor.id,
            statusLead: { in: ['ativo', 'geladeira'] },
          },
        })

        if (existente) {
          resultados.push({ leadgenId, status: 'duplicado', leadId: existente.id })
          continue
        }

        // Cria o lead
        const lead = await prisma.lead.create({
          data: {
            nomeCliente: nomeLead || `Meta Lead ${leadgenId.slice(-6)}`,
            whatsapp: whatsappLead,
            vendedorId: vendedor.id,
            etapa: 'fez_contato',
            statusLead: 'ativo',
            origem: 'rastreado',
          },
        })

        await prisma.leadEtapaHistorico.create({
          data: {
            leadId: lead.id,
            etapaNova: 'fez_contato',
            observacao: `Lead criado automaticamente via Meta Lead Ads (form: ${formId}, ad: ${adId})`,
          },
        })

        console.log(`[Meta Webhook] Lead criado: ${lead.id} → ${vendedor.nome} (${whatsappLead})`)
        resultados.push({ leadgenId, status: 'criado', leadId: lead.id, vendedora: vendedor.nome })
      }
    }

    return NextResponse.json({ resultados }, { status: 200 })
  } catch (error) {
    console.error('[Meta Webhook] Erro:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Busca o token do Meta salvo nas configurações
async function getMetaToken(): Promise<string | null> {
  const config = await prisma.configuracaoSistema.findUnique({
    where: { chave: 'meta_access_token' },
  })
  return config?.valor || null
}

// Busca dados do lead no Meta Graph API
async function fetchLeadFromMeta(leadgenId: string, token: string) {
  try {
    const url = `https://graph.facebook.com/v19.0/${leadgenId}?fields=field_data&access_token=${token}`
    const res = await fetch(url)
    if (!res.ok) return {}

    const data = await res.json()
    const fields: Array<{ name: string; values: string[] }> = data.field_data || []

    let nome = ''
    let whatsapp = ''

    for (const field of fields) {
      const key = field.name.toLowerCase()
      const val = field.values?.[0] || ''

      if (key.includes('name') || key === 'full_name' || key === 'nome') {
        nome = val
      }
      if (
        key.includes('phone') ||
        key.includes('whatsapp') ||
        key === 'telefone' ||
        key === 'celular'
      ) {
        // Normaliza: remove espaços, traços, parênteses; mantém só dígitos
        whatsapp = val.replace(/\D/g, '')
        // Se começar com 55 e tiver 13 dígitos, mantém. Se não, adiciona 55
        if (whatsapp.length === 11) whatsapp = '55' + whatsapp
        if (whatsapp.length === 10) whatsapp = '55' + whatsapp
      }
    }

    return { nome, whatsapp }
  } catch {
    return {}
  }
}

// Resolve qual vendedora vai receber o lead:
// 1. Se houver mapeamento formId → vendedorId salvo nas configs, usa esse
// 2. Senão, distribui round-robin entre vendedoras ativas
async function resolverVendedora(formId: string) {
  // Tenta mapeamento direto
  if (formId) {
    const mapeamento = await prisma.configuracaoSistema.findUnique({
      where: { chave: `meta_form_${formId}` },
    })
    if (mapeamento?.valor) {
      const vendedor = await prisma.user.findUnique({
        where: { id: mapeamento.valor, ativo: true },
      })
      if (vendedor) return vendedor
    }
  }

  // Round-robin: pega a vendedora com menos leads ativos
  const vendedoras = await prisma.user.findMany({
    where: { role: 'vendedor', ativo: true },
    include: {
      _count: {
        select: { leads: { where: { statusLead: 'ativo' } } },
      },
    },
    orderBy: { criadoEm: 'asc' },
  })

  if (vendedoras.length === 0) return null

  // Escolhe a que tem menos leads ativos
  vendedoras.sort((a, b) => a._count.leads - b._count.leads)
  return vendedoras[0]
}
