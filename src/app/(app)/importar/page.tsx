'use client'

import { useRef, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card } from '@/components/ui/card'

interface Erro {
  linha: number
  motivo: string
}

interface ResultadoClientes {
  sucesso: boolean
  total: number
  importados: number
  atualizados: number
  ignorados: number
  erros: Erro[]
}

interface ResultadoLeads {
  sucesso: boolean
  total: number
  importados: number
  duplicados: number
  ignorados: number
  erros: Erro[]
}

type Aba = 'tintim' | 'clientes'

function UploadBox({
  arquivo,
  onChange,
  inputRef,
}: {
  arquivo: File | null
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  inputRef: React.RefObject<HTMLInputElement>
}) {
  return (
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
          <p className="text-xs text-gray-400 mt-1">Formatos aceitos: .csv, .xlsx, .xls</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onChange} />
    </div>
  )
}

export default function ImportarPage() {
  const { user } = useAuth()
  const [aba, setAba] = useState<Aba>('tintim')

  // Tintim leads
  const tintimRef = useRef<HTMLInputElement>(null)
  const [tintimFile, setTintimFile] = useState<File | null>(null)
  const [tintimLoading, setTintimLoading] = useState(false)
  const [tintimResultado, setTintimResultado] = useState<ResultadoLeads | null>(null)
  const [tintimErro, setTintimErro] = useState('')

  // Clientes Excel
  const clientesRef = useRef<HTMLInputElement>(null)
  const [clientesFile, setClientesFile] = useState<File | null>(null)
  const [clientesLoading, setClientesLoading] = useState(false)
  const [clientesResultado, setClientesResultado] = useState<ResultadoClientes | null>(null)
  const [clientesErro, setClientesErro] = useState('')

  if (!user || user.role === 'vendedor') {
    return <div className="p-8 text-center text-gray-500">Acesso negado</div>
  }

  function handleTintimFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setTintimFile(f)
    setTintimResultado(null)
    setTintimErro('')
  }

  function handleClientesFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setClientesFile(f)
    setClientesResultado(null)
    setClientesErro('')
  }

  async function importarTintim() {
    if (!tintimFile) return
    setTintimLoading(true)
    setTintimErro('')
    setTintimResultado(null)
    try {
      const form = new FormData()
      form.append('arquivo', tintimFile)
      const res = await fetch('/api/importar/leads-tintim', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) setTintimErro(data.error || 'Erro ao importar')
      else {
        setTintimResultado(data)
        setTintimFile(null)
        if (tintimRef.current) tintimRef.current.value = ''
      }
    } catch {
      setTintimErro('Erro de conexão. Tente novamente.')
    } finally {
      setTintimLoading(false)
    }
  }

  async function importarClientes() {
    if (!clientesFile) return
    setClientesLoading(true)
    setClientesErro('')
    setClientesResultado(null)
    try {
      const form = new FormData()
      form.append('arquivo', clientesFile)
      const res = await fetch('/api/importar/clientes', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) setClientesErro(data.error || 'Erro ao importar')
      else {
        setClientesResultado(data)
        setClientesFile(null)
        if (clientesRef.current) clientesRef.current.value = ''
      }
    } catch {
      setClientesErro('Erro de conexão. Tente novamente.')
    } finally {
      setClientesLoading(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Importar Dados</h1>
        <p className="text-sm text-gray-500 mt-1">Importe leads do Tintim ou carteira de clientes via Excel</p>
      </div>

      {/* Abas */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setAba('tintim')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            aba === 'tintim'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          📥 Leads do Tintim
        </button>
        <button
          onClick={() => setAba('clientes')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            aba === 'clientes'
              ? 'border-green-600 text-green-700'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          👥 Carteira de Clientes (Excel)
        </button>
      </div>

      {/* ABA: TINTIM */}
      {aba === 'tintim' && (
        <div className="space-y-4">
          <Card padding="md">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Como exportar do Tintim</h2>
            <ol className="text-sm text-gray-500 space-y-1 list-decimal list-inside">
              <li>Acesse a conta da vendedora no Tintim</li>
              <li>Vá em <strong>Relatórios</strong> ou <strong>Exportar contatos</strong></li>
              <li>Exporte no formato <strong>.csv</strong></li>
              <li>Faça isso para cada vendedora e importe um arquivo por vez aqui</li>
            </ol>
            <p className="text-xs text-gray-400 mt-3">
              O sistema identifica automaticamente a qual vendedora os leads pertencem pelo nome da conta no arquivo.
              Leads já existentes são ignorados (sem duplicatas).
            </p>
          </Card>

          <Card padding="md">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Selecionar arquivo CSV do Tintim</h2>
            <UploadBox arquivo={tintimFile} onChange={handleTintimFile} inputRef={tintimRef} />

            {tintimErro && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {tintimErro}
              </div>
            )}

            {tintimFile && (
              <button
                onClick={importarTintim}
                disabled={tintimLoading}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {tintimLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Importando...</>
                ) : (
                  <>📥 Importar Leads do Tintim</>
                )}
              </button>
            )}
          </Card>

          {tintimResultado && (
            <Card padding="md">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Resultado</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900">{tintimResultado.total}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total no arquivo</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{tintimResultado.importados}</div>
                  <div className="text-xs text-green-600 mt-0.5">Leads importados</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{tintimResultado.duplicados}</div>
                  <div className="text-xs text-blue-600 mt-0.5">Já existiam</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-700">{tintimResultado.ignorados}</div>
                  <div className="text-xs text-orange-600 mt-0.5">Ignorados</div>
                </div>
              </div>

              {tintimResultado.erros.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Linhas com problema:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {tintimResultado.erros.map((e, i) => (
                      <div key={i} className="flex gap-3 text-xs bg-orange-50 border border-orange-100 rounded px-3 py-2">
                        <span className="font-medium text-orange-600 whitespace-nowrap">Linha {e.linha}</span>
                        <span className="text-gray-600">{e.motivo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {tintimResultado.importados > 0 && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                  ✅ Leads importados! Aparecem agora no Kanban e na lista de Leads de cada vendedora.
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ABA: CLIENTES */}
      {aba === 'clientes' && (
        <div className="space-y-4">
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
                <tbody className="bg-white">
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
              <li>• <strong>nome</strong> e <strong>whatsapp</strong> — obrigatórios</li>
              <li>• <strong>vendedor</strong> — nome igual ao cadastrado no CRM (obrigatório)</li>
              <li>• Datas no formato DD/MM/AAAA</li>
            </ul>
          </Card>

          <Card padding="md">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Selecionar planilha</h2>
            <UploadBox arquivo={clientesFile} onChange={handleClientesFile} inputRef={clientesRef} />

            {clientesErro && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {clientesErro}
              </div>
            )}

            {clientesFile && (
              <button
                onClick={importarClientes}
                disabled={clientesLoading}
                className="mt-4 w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {clientesLoading ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Importando...</>
                ) : (
                  <>👥 Importar Carteira de Clientes</>
                )}
              </button>
            )}
          </Card>

          {clientesResultado && (
            <Card padding="md">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Resultado</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-900">{clientesResultado.total}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total na planilha</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-green-700">{clientesResultado.importados}</div>
                  <div className="text-xs text-green-600 mt-0.5">Novos clientes</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-blue-700">{clientesResultado.atualizados}</div>
                  <div className="text-xs text-blue-600 mt-0.5">Atualizados</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-orange-700">{clientesResultado.ignorados}</div>
                  <div className="text-xs text-orange-600 mt-0.5">Ignorados</div>
                </div>
              </div>

              {clientesResultado.erros.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">Linhas com problema:</p>
                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {clientesResultado.erros.map((e, i) => (
                      <div key={i} className="flex gap-3 text-xs bg-orange-50 border border-orange-100 rounded px-3 py-2">
                        <span className="font-medium text-orange-600 whitespace-nowrap">Linha {e.linha}</span>
                        <span className="text-gray-600">{e.motivo}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {clientesResultado.importados + clientesResultado.atualizados > 0 && (
                <div className="mt-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
                  ✅ Importação concluída! Os clientes aparecem na Carteira de cada vendedora.
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
