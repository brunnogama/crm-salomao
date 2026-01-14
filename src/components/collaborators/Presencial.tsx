import { useState, useEffect, useRef } from 'react'
import { Upload, FileSpreadsheet, Search, Filter, RefreshCw, Trash2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

interface PresenceRecord {
  id: string;
  nome_colaborador: string;
  data_hora: string; // ISO String do banco
}

export function Presencial() {
  const [records, setRecords] = useState<PresenceRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Função para buscar dados do Supabase
  const fetchRecords = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('presenca_portaria')
      .select('*')
      .order('data_hora', { ascending: false })

    if (error) {
      console.error('Erro ao buscar registros:', error)
    } else {
      setRecords(data || [])
    }
    setLoading(false)
  }

  // Carrega os dados ao abrir a tela
  useEffect(() => {
    fetchRecords()
  }, [])

  // Função auxiliar para achar a chave correta no objeto do Excel (case insensitive)
  const findValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row).map(k => k.trim().toLowerCase())
    const targetKey = keys.find(k => rowKeys.includes(k.toLowerCase()))
    
    if (targetKey) {
        // Encontra a chave original correspondente
        const originalKey = Object.keys(row).find(k => k.trim().toLowerCase() === targetKey.toLowerCase())
        return originalKey ? row[originalKey] : null
    }
    return null
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const reader = new FileReader()
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        console.log("Linha crua do Excel (debug):", data[0]) // Para ver no console o que está vindo

        const recordsToInsert = data.map((row: any) => {
          // Tenta encontrar o nome (aceita: 'Nome', 'NOME', 'Colaborador', etc)
          const nome = findValue(row, ['nome', 'colaborador', 'funcionario']) || 'Desconhecido'
          
          // Tenta encontrar o tempo (aceita: 'Tempo', 'Data', 'Hora')
          const tempoRaw = findValue(row, ['tempo', 'data', 'horario'])
          
          let dataFinal = new Date()

          // Tratamento da Data "2025-11-19 16:54:41"
          if (tempoRaw && typeof tempoRaw === 'string') {
             // Se for string no formato ISO ou parecido
             dataFinal = new Date(tempoRaw)
          } else if (typeof tempoRaw === 'number') {
             // Se o Excel importou como número serial
             // (XLSX converte data serial do Excel para JS Date se necessário, mas aqui assumimos string)
             dataFinal = new Date((tempoRaw - (25567 + 2)) * 86400 * 1000)
          }

          return {
            nome_colaborador: nome,
            data_hora: isNaN(dataFinal.getTime()) ? new Date() : dataFinal, // Fallback para agora se der erro
            arquivo_origem: file.name
          }
        })

        // Filtrar apenas linhas que tenham nome válido (opcional)
        const validRecords = recordsToInsert.filter((r:any) => r.nome_colaborador !== 'Desconhecido')

        if (validRecords.length === 0) {
            alert('Não foi possível identificar as colunas "Nome" ou "Tempo" no arquivo. Verifique o console (F12) para detalhes.')
            setUploading(false)
            return
        }

        // Inserir no Supabase
        const { error } = await supabase.from('presenca_portaria').insert(validRecords)

        if (error) throw error

        alert(`${validRecords.length} registros importados com sucesso!`)
        fetchRecords() // Atualiza a lista

      } catch (error) {
        console.error("Erro na importação:", error)
        alert("Erro ao processar arquivo. Verifique o formato.")
      } finally {
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = '' // Limpa o input
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleClearHistory = async () => {
      if(confirm("Tem certeza que deseja apagar TODO o histórico?")){
          await supabase.from('presenca_portaria').delete().neq('id', '00000000-0000-0000-0000-000000000000') // Deleta tudo
          fetchRecords()
      }
  }

  // Formatadores visuais
  const formatDisplayDate = (isoString: string) => {
      if(!isoString) return '-'
      const date = new Date(isoString)
      return date.toLocaleDateString('pt-BR')
  }

  const formatDisplayTime = (isoString: string) => {
      if(!isoString) return '-'
      const date = new Date(isoString)
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full bg-gray-100 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-[#112240]">Controle de Presença</h2>
          <p className="text-sm text-gray-500">Importe a planilha da portaria para alimentar o banco de dados.</p>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />
          
          <button 
            onClick={() => fetchRecords()}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            {uploading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
            <span>{uploading ? 'Importando...' : 'Importar XLSX'}</span>
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        
        {/* Barra de Status */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
             <span>Total de registros no banco: <strong>{records.length}</strong></span>
          </div>
          <div className="flex gap-2">
             <button onClick={handleClearHistory} className="p-2 text-red-300 hover:text-red-500 transition-colors" title="Limpar Histórico"><Trash2 className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Tabela */}
        <div className="flex-1 overflow-auto">
          {records.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
              <Upload className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">Nenhum registro encontrado</p>
              <p className="text-sm">Importe uma planilha para começar.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4 border-b border-gray-200">Nome do Colaborador</th>
                  <th className="px-6 py-4 border-b border-gray-200 w-48">Data</th>
                  <th className="px-6 py-4 border-b border-gray-200 w-48">Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50/50 transition-colors group text-sm text-gray-700">
                    <td className="px-6 py-3 font-medium text-[#112240] capitalize">
                        {record.nome_colaborador.toLowerCase()}
                    </td>
                    <td className="px-6 py-3">
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs border border-gray-200 font-mono">
                        {formatDisplayDate(record.data_hora)}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                        <span className="text-gray-500 font-mono">
                            {formatDisplayTime(record.data_hora)}
                        </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
