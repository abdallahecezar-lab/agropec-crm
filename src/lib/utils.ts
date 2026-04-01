import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInDays, differenceInMinutes, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { COMMISSION_TABLE } from './constants'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatDate(date: Date | string, pattern = 'dd/MM/yyyy'): string {
  return format(new Date(date), pattern, { locale: ptBR })
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatRelativeDate(date: Date | string): string {
  const days = differenceInDays(new Date(), new Date(date))
  if (days === 0) return 'Hoje'
  if (days === 1) return 'Ontem'
  if (days < 7) return `${days} dias atrás`
  if (days < 30) return `${Math.floor(days / 7)} semanas atrás`
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })
}

export function calcularComissao(valorLiquido: number): {
  faixa: string
  percentual: number
  comissao: number
  proximaFaixa: number | null
  faltaParaProximaFaixa: number | null
} {
  const faixa = COMMISSION_TABLE.find(
    (f) => valorLiquido >= f.min && valorLiquido <= f.max
  ) || COMMISSION_TABLE[0]

  const nextIndex = COMMISSION_TABLE.findIndex((f) => f === faixa) + 1
  const proximaFaixaObj = nextIndex < COMMISSION_TABLE.length ? COMMISSION_TABLE[nextIndex] : null

  return {
    faixa: faixa.label,
    percentual: faixa.pct,
    comissao: (valorLiquido * faixa.pct) / 100,
    proximaFaixa: proximaFaixaObj ? proximaFaixaObj.min : null,
    faltaParaProximaFaixa: proximaFaixaObj ? proximaFaixaObj.min - valorLiquido : null,
  }
}

export function getStatusCarteira(
  contatos: Array<{ dataContato: Date | string }>,
  mesAtual: Date = new Date()
): 'vermelho' | 'amarelo' | 'verde' {
  const inicio = startOfMonth(mesAtual)
  const fim = endOfMonth(mesAtual)

  const contatosMes = contatos.filter((c) =>
    isWithinInterval(new Date(c.dataContato), { start: inicio, end: fim })
  )

  if (contatosMes.length === 0) return 'vermelho'
  if (contatosMes.length === 1) return 'amarelo'
  return 'verde'
}

export function isWithinWorkWindow(
  hora: Date = new Date(),
  inicio = '08:00',
  fim = '15:00'
): boolean {
  const [hInicio, mInicio] = inicio.split(':').map(Number)
  const [hFim, mFim] = fim.split(':').map(Number)

  const totalMinutos = hora.getHours() * 60 + hora.getMinutes()
  const inicioMinutos = hInicio * 60 + mInicio
  const fimMinutos = hFim * 60 + mFim

  return totalMinutos >= inicioMinutos && totalMinutos <= fimMinutos
}

export function calcularProximaReativacao(
  tentativas: number,
  ultimaReativacao: Date
): Date {
  const cadencia = [7, 15, 30]
  const dias = cadencia[tentativas] || 30
  const proxima = new Date(ultimaReativacao)
  proxima.setDate(proxima.getDate() + dias)
  return proxima
}

export function calcularTempoResposta(chegouEm: Date | string, primeiraRespostaEm: Date | string | null): string {
  if (!primeiraRespostaEm) return 'Sem resposta'
  const minutos = differenceInMinutes(new Date(primeiraRespostaEm), new Date(chegouEm))
  if (minutos < 60) return `${minutos}min`
  return `${Math.floor(minutos / 60)}h${minutos % 60 > 0 ? ` ${minutos % 60}min` : ''}`
}

export function percentualChecklist(totalItems: number, concluidosItems: number): number {
  if (totalItems === 0) return 0
  return Math.round((concluidosItems / totalItems) * 100)
}

export function getEtapaLabel(etapa: string): string {
  const map: Record<string, string> = {
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
  return map[etapa] || etapa
}

export function getEtapaColor(etapa: string): string {
  const map: Record<string, string> = {
    fez_contato: 'bg-blue-100 text-blue-800',
    proposta_enviada: 'bg-yellow-100 text-yellow-800',
    negociacao: 'bg-orange-100 text-orange-800',
    chamar_depois: 'bg-purple-100 text-purple-800',
    correios: 'bg-sky-100 text-sky-800',
    comprou: 'bg-green-100 text-green-800',
    voltou: 'bg-rose-100 text-rose-800',
    desqualificado: 'bg-red-100 text-red-800',
    geladeira: 'bg-slate-100 text-slate-800',
  }
  return map[etapa] || 'bg-gray-100 text-gray-800'
}

export function getRoleLabel(role: string): string {
  return role === 'gestor' ? 'Gestor' : 'Vendedor'
}

export function isSameDay(date1: Date | string, date2: Date | string): boolean {
  const d1 = new Date(date1)
  const d2 = new Date(date2)
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  )
}

export function getRecompraStatus(
  dataUltimaCompra: Date | string,
  cicloRecompraDias: number
): { status: 'normal' | 'proximo' | 'vencido'; diasRestantes: number } {
  const dias = differenceInDays(new Date(), new Date(dataUltimaCompra))
  const diasRestantes = cicloRecompraDias - dias

  if (diasRestantes < 0) return { status: 'vencido', diasRestantes }
  if (diasRestantes <= cicloRecompraDias * 0.2) return { status: 'proximo', diasRestantes }
  return { status: 'normal', diasRestantes }
}

export function formatWhatsApp(numero: string): string {
  const clean = numero.replace(/\D/g, '')
  if (clean.length === 11) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 7)}-${clean.slice(7)}`
  }
  if (clean.length === 10) {
    return `(${clean.slice(0, 2)}) ${clean.slice(2, 6)}-${clean.slice(6)}`
  }
  return numero
}

export function getWhatsAppLink(numero: string, mensagem?: string): string {
  const clean = numero.replace(/\D/g, '')
  const base = `https://wa.me/55${clean}`
  if (mensagem) return `${base}?text=${encodeURIComponent(mensagem)}`
  return base
}
