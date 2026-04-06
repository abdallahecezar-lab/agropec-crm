import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

const SETUP_SECRET = 'agropec-setup-2024'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const action = searchParams.get('action')

    if (secret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (action === 'add-diretor') {
      const email = 'luis.alecezar@gmail.com'
      const senhaHash = await hash('Agropec2024', 10)

      // Step 1: Ensure 'diretor' exists in the PostgreSQL "Role" enum
      try {
        await prisma.$executeRawUnsafe(`ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'diretor'`)
      } catch {
        // Ignore if already exists or not supported
      }

      // Step 2: Check if user exists
      const existing = await prisma.$queryRawUnsafe<Array<{id: string, nome: string}>>(
        `SELECT id, nome FROM "User" WHERE email = $1`,
        email
      )

      if (existing.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE "User" SET role = 'diretor'::"Role", "atualizadoEm" = NOW() WHERE email = $1`,
          email
        )
        return NextResponse.json({ message: 'Usuário atualizado para diretor', user: { id: existing[0].id, nome: existing[0].nome, email, role: 'diretor' } })
      }

      // Step 3: Create user with raw SQL
      const cuid = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`
      await prisma.$executeRawUnsafe(
        `INSERT INTO "User" (id, nome, email, senha, role, ativo, "criadoEm", "atualizadoEm")
         VALUES ($1, $2, $3, $4, 'diretor'::"Role", true, NOW(), NOW())`,
        cuid,
        'Luis Cezar',
        email,
        senhaHash
      )

      return NextResponse.json({ message: 'Usuário diretor criado com sucesso', user: { id: cuid, nome: 'Luis Cezar', email, role: 'diretor' } }, { status: 201 })
    }

    if (action === 'deactivate-test-users') {
      const testIds = [
        'cmnffgclu0001ar8cmfymc8wl', // João Vendedor
        'cmnffgcso0002ar8clxihfkr8', // Maria Vendas
        'cmnffgczf0003ar8chklxezxc', // Pedro Silva
        'cmnffgc7p0000ar8csk11mc4g', // Carlos Gestor
      ]
      const results = []
      for (const id of testIds) {
        await prisma.$executeRawUnsafe(`UPDATE "User" SET ativo = false WHERE id = $1`, id)
        results.push(id)
      }
      return NextResponse.json({ message: 'Usuários de teste desativados', ids: results })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('GET /api/webhook/setup error:', error)
    return NextResponse.json({ error: 'Erro interno', detail: String(error) }, { status: 500 })
  }
}
