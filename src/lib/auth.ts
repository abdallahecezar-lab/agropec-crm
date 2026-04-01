import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'agropec-crm-super-secret-jwt-key-2024'
)

export interface JWTPayload {
  id: string
  email: string
  nome: string
  role: 'gestor' | 'vendedor'
}

export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET)
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as JWTPayload
  } catch {
    return null
  }
}

export async function getTokenFromCookie(): Promise<string | undefined> {
  const cookieStore = cookies()
  return cookieStore.get('auth_token')?.value
}

export async function getCurrentUser(): Promise<JWTPayload | null> {
  const token = await getTokenFromCookie()
  if (!token) return null
  return verifyToken(token)
}

export async function getTokenFromRequest(request: NextRequest): Promise<string | undefined> {
  return request.cookies.get('auth_token')?.value
}

export async function getUserFromRequest(request: NextRequest): Promise<JWTPayload | null> {
  const token = await getTokenFromRequest(request)
  if (!token) return null
  return verifyToken(token)
}

export function setAuthCookie(token: string): { name: string; value: string; options: object } {
  return {
    name: 'auth_token',
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    },
  }
}
