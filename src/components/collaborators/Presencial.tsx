import { useState, useEffect, useRef, useMemo } from 'react'
import { Upload, FileSpreadsheet, RefreshCw, Trash2, LayoutList, BarChart3, Calendar } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

interface PresenceRecord {
  id: string;
  nome_colaborador: string;
  data_hora: string; // ISO String
}

interface ReportItem {
  nome: string;
  diasPresentes: number;
  diasSemana: { [key: string]: number }; // Ex: { 'Seg': 4, 'Ter': 2 }
}

export function Presencial() {
  // Estados Gerais
  const [records, setRecords] = useState<PresenceRecord[]>([])
  const [loading, setLoading] = useState(false)
  
  // Estados de Upload/Exclusão
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [deleting, setDeleting] = useState(false) 
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Estados do Relatório
  const [viewMode, setViewMode] = useState<'list' | 'report'>('report') // Padrão: Relatório
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  // --- BUSCA DE DADOS ---
  const fetchRecords = async () => {
    setLoading(true)
    // Aumentei o limit para garantir que pegue o mês todo na análise
    const { data, error } = await supabase
      .from('presenca_portaria')
      .select('*')
      .order('data_hora', { ascending: false })
      .limit(5000) 

    if (error) {
      console.error('Erro ao buscar registros:', error)
    } else {
      setRecords(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchRecords()
  }, [])

  // --- LÓGICA DO RELATÓRIO (UseMemo para performance) ---
  const reportData = useMemo(() => {
    const grouped: { [key: string]: { uniqueDays: Set<string>, weekDays: { [key: number]: number } } } = {}

    records.forEach(record => {
      const dateObj = new Date(record.data_hora)
      
      // Filtro de Mês e Ano
      if (dateObj.getMonth() !== selectedMonth || dateObj.getFullYear() !== selectedYear) {
        return
      }

      const nome = record.nome_colaborador.toUpperCase() // Normalizar nomes
      const dayKey = dateObj.toLocaleDateString('pt-BR') // Chave para dia único (DD/MM/AAAA)
      const weekDay = dateObj.getDay() // 0 (Dom) a 6 (Sab)

      if (!grouped[nome]) {
        grouped[nome] = { uniqueDays: new Set(), weekDays: {} }
      }

      // Adiciona ao Set (Sets automaticamente ignoram duplicatas, resolvendo entradas repetidas no mesmo dia)
      if (!grouped[nome].uniqueDays.has(dayKey)) {
        grouped[nome].uniqueDays.add(dayKey)
        
        // Contabiliza o dia da semana apenas uma vez por dia
        grouped[nome].weekDays[weekDay] = (grouped[nome].weekDays[weekDay] || 0) + 1
      }
    })

    // Transforma o objeto agrupado em array para a tabela
    const result: ReportItem[] = Object.keys(grouped).map(nome => {
      const weekDaysMap: { [key: string]: number } = {}
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      
      // Mapeia números (0-6) para nomes (Dom-Sáb)
      Object.entries(grouped[nome].weekDays).forEach(([dayIndex, count]) => {
         weekDaysMap[days[Number(dayIndex)]] = count
      })

      return {
        nome: nome,
        diasPresentes: grouped[nome].uniqueDays.size,
        diasSemana: weekDaysMap
      }
    })

    // Ordena por quem veio mais vezes
    return result.sort((a, b) => b.diasPresentes - a.diasPresentes)
  }, [records, selectedMonth, selectedYear])

  // --- UTILS DE IMPORTAÇÃO ---
  const findValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row).map(k => k.trim().toLowerCase())
    const targetKey = keys.find(k => rowKeys.includes(k.toLowerCase()))
    
    if (targetKey) {
        const originalKey = Object.keys(row).find(k => k.trim().toLowerCase() === targetKey.toLowerCase())
        return originalKey ? row[originalKey] : null
    }
    return null
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setProgress(0)
    const reader = new FileReader()
    
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json(ws)

        const recordsToInsert = data.map((row: any) => {
          const nome = findValue(row, ['nome', 'colaborador', 'funcionario']) || 'Desconhecido'
          const tempoRaw = findValue(row, ['tempo', 'data', 'horario'])
          let dataFinal = new Date()

          if (tempoRaw && typeof tempoRaw === 'string') {
             dataFinal = new Date(tempoRaw)
          } else if (typeof tempoRaw === 'number') {
             dataFinal = new Date((tempoRaw - (25567 + 2)) * 86400 * 1000)
          }

          return {
            nome_colaborador: nome,
            data_hora: isNaN(dataFinal.getTime()) ? new Date() : dataFinal,
            arquivo_origem: file.name
          }
        })

        const validRecords = recordsToInsert.filter((r:any) => r.nome_colaborador !== 'Desconhecido')
        if (validRecords.length === 0) { alert('Erro nas colunas.'); setUploading(false); return; }

        const BATCH_SIZE = 100 
        const totalBatches = Math.ceil(validRecords.length / BATCH_SIZE)

        for (let i = 0; i < validRecords.length; i += BATCH_SIZE) {
            const batch = validRecords.slice(i, i + BATCH_SIZE)
            const { error } = await supabase.from('presenca_portaria').insert(batch)
            if (error) throw error
            const currentBatch = Math.floor(i / BATCH_SIZE) + 1
            setProgress(Math.round((currentBatch / totalBatches) * 100))
        }

        alert(`${validRecords.length} registros importados!`)
        fetchRecords()
      } catch (error) { console.error(error); alert("Erro na importação."); } 
      finally { setUploading(false); setProgress(0); if (fileInputRef.current) fileInputRef.current.value = '' }
    }
    reader.readAsBinaryString(file)
  }

  const handleClearHistory = async () => {
      if (!confirm("Isso apagará TODOS os registros. Continuar?")) return;
      setDeleting(true)
      try {
          const { error } = await supabase.from('presenca_portaria').delete().neq('id', '00000000-0000-0000-0000-000000000000') 
          if (error) throw error
          setRecords([]); fetchRecords()
      } catch (error: any) { alert("Erro: " + error.message) } 
      finally { setDeleting(false) }
  }

  // --- RENDER ---
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i) // [2026, 2025, ...]

  return (
    <div className="flex flex-col h-full bg-gray-100 space-y-6">
      
      {/* Header e Controles */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
            <h2 className="text-xl font-bold text-[#112240]">Controle de Presença</h2>
            <p className="text-sm text-gray-500">Gestão de acessos físicos ao escritório.</p>
            </div>
            
            {/* Botões de Ação */}
            <div className="flex items-center gap-2">
                <input type="file" accept=".xlsx, .xls" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fetchRecords()} className="p-2 text-gray-400 hover:text-blue-600 transition-colors" title="Atualizar"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button>
                <button onClick={handleClearHistory} disabled={deleting || records.length === 0} className="p-2 text-gray-400 hover:text-red-600 transition-colors" title="Limpar Tudo"><Trash2 className="h-5 w-5" /></button>
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    {uploading ? `Importando ${progress}%` : <><FileSpreadsheet className="h-4 w-4" /> Importar</>}
                </button>
            </div>
        </div>

        {/* Abas e Filtros */}
        <div className="flex flex-col md:flex-row items-center justify-between border-t border-gray-100 pt-4 gap-4">
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('report')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'report' ? 'bg-white text-[#112240] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <BarChart3 className="h-4 w-4" /> Relatório Mensal
                </button>
                <button 
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${viewMode === 'list' ? 'bg-white text-[#112240] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <LayoutList className="h-4 w-4" /> Registros Brutos
                </button>
            </div>

            {viewMode === 'report' && (
                <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <select 
                        value={selectedMonth} 
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                    >
                        {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2"
                    >
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
            )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        
        {/* VIEW: RELATÓRIO */}
        {viewMode === 'report' && (
            <div className="flex-1 overflow-auto">
                 {reportData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                        <p>Nenhum dado encontrado para {months[selectedMonth]} de {selectedYear}.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                            <tr>
                                <th className="px-6 py-4 border-b">Colaborador</th>
                                <th className="px-6 py-4 border-b text-center">Dias Presenciais</th>
                                <th className="px-6 py-4 border-b">Frequência Semanal</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reportData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/50">
                                    <td className="px-6 py-4 font-medium text-[#112240] text-sm">{item.nome}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                                            {item.diasPresentes} dias
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(day => (
                                                <div key={day} className={`text-xs px-2 py-1 rounded border ${item.diasSemana[day] ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>
                                                    {day}
                                                    {item.diasSemana[day] ? ` (${item.diasSemana[day]})` : ''}
                                                </div>
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        )}

        {/* VIEW: LISTA BRUTA (ANTIGA) */}
        {viewMode === 'list' && (
             <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                    <tr>
                    <th className="px-6 py-4 border-b">Nome</th>
                    <th className="px-6 py-4 border-b">Data</th>
                    <th className="px-6 py-4 border-b">Hora</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {records.map((record) => {
                        const date = new Date(record.data_hora)
                        return (
                            <tr key={record.id} className="hover:bg-gray-50 text-sm text-gray-700">
                                <td className="px-6 py-3 font-medium capitalize">{record.nome_colaborador.toLowerCase()}</td>
                                <td className="px-6 py-3">{date.toLocaleDateString('pt-BR')}</td>
                                <td className="px-6 py-3 text-gray-500 font-mono">{date.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</td>
                            </tr>
                        )
                    })}
                </tbody>
                </table>
             </div>
        )}
      </div>
    </div>
  )
}
