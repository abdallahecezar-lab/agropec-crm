'use client'

import { useRef, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card } from '@/components/ui/card'

interface Erro {
  linha: number
  motivo: string
}

interface Resultado {
  sucesso: boolean
  total: number
  importados: number
  atualizados: number
  ignorados: number
  erros: Erro[]
}

export default function ImportarPage() {
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [erro, setErro] = useState('')

  if (!user || user.role === 'vendedor') {
    return <div className="p-8 text-center text-gray-500">Acesso negado</div>
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (!f.name.match(/\.(xlsx|xls|csv)$/i)) {
      setErro('Formato inválido. Use .xlsx, .xls ou .csv')
      return
    }
    setArquivo(f)
    setResultado(null)
    setErro('')
  }

  async function handleImportar() {
    if (!arquivo) return
    setCarregando(true)
    setErro('')
    setResultado(null)

    try {
      const form = new FormData()
      form.append('arquivo', arquivo)

      const res = await fetch('/api/importar/clientes', {
        method: 'POST',
        body: form,
      })

      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Erro ao importar')
      } else {
        setResultado(data)
        setArquivo(null)
        if (inputRef.current) inputRef.current.value = ''
      }
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar Carteira de Clientes</h1>
        <p className="text-sm text-gray-500 mt-1">Importe clientes a partir de uma planilha Excel</p>
      </div>

      {/* Instruções */}
      <Card padding="md">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Como preparar a planilha</h2>
        <p className="text-sm text-gray-500 mb-3">
          Peça ao administrador para enviar um arquivo Excel (.xlsx) com as seguintes colunas:
        </p>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                {['nome', 'whatsapp', 'vendedor', 'produto', 'data_primeira_compra', 'data_ultima_compra', 'valor_total'].map((col) => (
                  <th key={col} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              <tr>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">Fazenda Boa Vista</td>
                <td className="px-3 py-2 text-gray-700">65991001001</td>
                <td className="px-3 py-2 text-gray-700">Joana</td>
                <td className="px-3 py-2 text-gray-700 whitespace-nowrap">Sal Proteinado 30kg</td>
                <td className="px-3 py-2 text-gray-700">01/01/2025</td>
                <td className="px-3 py-2 text-gray-700">15/03/2025</td>
                <td className="px-3 py-2 text-gray-700">4500</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="mt-3 space-y-1 text-xs text-gray-500">
          <li>• <strong>nome</strong> — nome do cliente ou fazenda (obrigatório)</li>
          <li>• <strong>whatsapp</strong> — apenas números com DDD, sem espaço (obrigatório)</li>
          <li>• <strong>vendedor</strong> — nome igual ao cadastrado no CRM (obrigatório)</li>
          <li>• <strong>produto</strong>, <strong>datas</strong> e <strong>valor_total</strong> — opcionais</li>
          <li>• Datas no formato DD/MM/AAAA</li>
        </ul>
      </Card>

      {/* Upload */}
      <Card padding="md">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Selecionar arquivo</h2>

        <div
          className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
          onClick={() => inputRef.current?.click()}
        >
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {arquivo ? (
            <div>
              <p className="text-sm font-medium text-green-700">{arquivo.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(arquivo.size / 1024).toFixed(1)} KB — clique para trocar</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-600">Clique para selecionar o arquivo</p>
              <p className="text-xs text-gray-400 mt-1">Formatos aceitos: .xlsx, .xls, .csv</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        {erro && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {erro}
          </div>
        )}

        {arquivo && (
          <button
            onClick={handleImportar}
            disabled={carregando}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {carregando ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Importar Clientes
              </>
            )}
          </button>
        )}
      </Card>

      {/* Resultado */}
      {resultado && (
        <Card padding="md">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Resultado da importação</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900">{resultado.total}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total na planilha</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-700">{resultado.importados}</div>
              <div className="text-xs text-green-600 mt-0.5">Novos clientes</div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-700">{resultado.atualizados}</div>
              <div className="text-xs text-blue-600 mt-0.5">Atualizados</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-orange-700">{resultado.ignorados}</div>
              <div className="text-xs text-orange-600 mt-0.5">Ignorados</div>
            </div>
          </div>

          {resultado.erros.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Linhas com problema:</p>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {resultado.erros.map((e, i) => (
                  <div key={i} className="flex gap-3 text-xs bg-orange-50 border border-orange-100 rounded px-3 py-2">
                    <span className="font-medium text-orange-600 whitespace-nowrap">Linha {e.linha}</span>
                    <span className="text-gray-600">{e.motivo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {resultado.importados + resultado.atualizados > 0 && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
              ✅ Importação concluída! Os clientes já aparecem na seção Carteira de cada vendedor.
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
