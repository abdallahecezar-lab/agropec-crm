import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

const SETUP_SECRET = process.env.SETUP_SECRET || 'agropec-setup-2024'
const SENHA_PADRAO = 'Agropec2024'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (secret !== SETUP_SECRET) {
    return NextResponse.json({ error: 'Não autorizado. Informe ?secret=correto' }, { status: 401 })
  }

  const senhaHash = await hash(SENHA_PADRAO, 10)

  // ── 1. Cria/localiza a Gestora Marjorie ──────────────────────────────────
  let marjorie = await prisma.user.findUnique({
    where: { email: 'agropecnacional.vendas@gmail.com' },
  })

  if (!marjorie) {
    marjorie = await prisma.user.create({
      data: {
        nome: 'Marjorie',
        email: 'agropecnacional.vendas@gmail.com',
        senha: senhaHash,
        role: 'gestor',
      },
    })
  }

  // ── 2. Lista de vendedoras da equipe ─────────────────────────────────────
  const equipe = [
    { nome: 'Joana',    email: 'agropecvendasana@gmail.com' },
    { nome: 'Katharine', email: 'kathagropec@gmail.com' },
    { nome: 'Cristine', email: 'belagropec@gmail.com' },
    { nome: 'Tati',     email: 'tatiagropec@gmail.com' },
    { nome: 'Vania',    email: 'margarethagropecvendas@gmail.com' },
    { nome: 'Célia',    email: 'celiaagropecvendas@gmail.com' },
    { nome: 'Vivian',   email: 'vivianagropec@hotmail.com' },
    { nome: 'Helen',    email: 'manuagropecvendas@gmail.com' },
    { nome: 'José',     email: 'marquesagropec@gmail.com' },
    { nome: 'Larissa',  email: 'fabiolaagropec@gmail.com' },
    { nome: 'Cândida',  email: 'candidaagropecvendas@gmail.com' },
  ]

  const criados: { nome: string; email: string; id: string }[] = []
  const jaExistiam: { nome: string; email: string }[] = []

  for (const v of equipe) {
    const existe = await prisma.user.findUnique({ where: { email: v.email } })
    if (!existe) {
      const novo = await prisma.user.create({
        data: {
          nome: v.nome,
          email: v.email,
          senha: senhaHash,
          role: 'vendedor',
          gestorId: marjorie.id,
        },
      })
      criados.push({ nome: novo.nome, email: novo.email, id: novo.id })
    } else {
      // Garante que está vinculada à Marjorie se não tiver gestorId
      if (!existe.gestorId) {
        await prisma.user.update({
          where: { id: existe.id },
          data: { gestorId: marjorie.id },
        })
      }
      jaExistiam.push({ nome: existe.nome, email: existe.email })
    }
  }

  return NextResponse.json({
    sucesso: true,
    mensagem: '✅ Equipe configurada com sucesso!',
    gestora: { nome: marjorie.nome, email: marjorie.email, id: marjorie.id },
    criados,
    ja_existiam: jaExistiam,
    senha_padrao: SENHA_PADRAO,
    aviso: 'Oriente cada vendedora a trocar a senha após o primeiro acesso.',
  })
}
