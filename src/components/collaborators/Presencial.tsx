import { useState, useEffect, useRef, useMemo } from 'react'
import { 
  Upload, FileSpreadsheet, RefreshCw, Trash2, 
  BarChart3, Users, Briefcase,
  Pencil, Plus, X, Search, Filter as FilterIcon
} from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

// --- TIPOS ---
interface PresenceRecord {
  id: string;
  nome_colaborador: string;
  data_hora: string;
}

interface SocioRule {
  id: string;
  socio_responsavel: string;
  nome_colaborador: string;
  meta_semanal: number;
}

interface ReportItem {
  nome: string;
  socio: string; 
  diasPresentes: number;
  diasSemana: { [key: string]: number };
  datas: string[];
}

export function Presencial() {
  // --- ESTADOS GERAIS ---
  const [records, setRecords] = useState<PresenceRecord[]>([])
  const [socioRules, setSocioRules] = useState<SocioRule[]>([]) 
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  
  // --- ESTADOS DE FILTRO ---
  const [filterSocio, setFilterSocio] = useState('')
  const [filterColaborador, setFilterColaborador] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [searchText, setSearchText] = useState('')

  // Estado para Edição/Criação de Regra
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<Partial<SocioRule> | null>(null)

  // Refs
  const presenceInputRef = useRef<HTMLInputElement>(null)
  const socioInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // --- NAVEGAÇÃO ---
  const [viewMode, setViewMode] = useState<'report' | 'socios'>('report')
  
  // Inicializa com o mês atual
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  // --- HELPER NORMALIZAÇÃO ---
  const normalizeKey = (text: string) => {
      if (!text) return ""
      return text.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ")
  }

  // --- HELPER FORMATAÇÃO (CAMEL CASE / TITLE CASE) ---
  const toTitleCase = (text: string) => {
      if (!text) return ""
      return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }

  // --- 1. BUSCAR MÊS MAIS RECENTE ---
  const fetchInitialMonth = async () => {
      const { data } = await supabase
          .from('presenca_portaria')
          .select('data_hora')
          .order('data_hora', { ascending: false })
          .limit(1)
      
      if (data && data.length > 0) {
          const lastDate = new Date(data[0].data_hora)
          setSelectedMonth(lastDate.getUTCMonth())
          setSelectedYear(lastDate.getUTCFullYear())
      }
      setIsInitialLoad(false)
  }

  // --- 2. BUSCAR DADOS ---
  const fetchRecords = async () => {
    if (isInitialLoad) return; 

    setLoading(true)
    
    const startObj = new Date(Date.UTC(selectedYear, selectedMonth, 1, 0, 0, 0))
    const endObj = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999))
    
    const startDate = startObj.toISOString()
    const endDate = endObj.toISOString()

    // Busca Presença do Mês Selecionado
    const { data: presenceData } = await supabase
      .from('presenca_portaria')
      .select('*')
      .gte('data_hora', startDate)
      .lte('data_hora', endDate)
      .order('data_hora', { ascending: true }) 
      .limit(100000) 

    // Busca Regras de Sócios
    const { data: rulesData } = await supabase
      .from('socios_regras')
      .select('*')
      .order('nome_colaborador', { ascending: true })
      .limit(3000)

    if (rulesData) setSocioRules(rulesData)

    if (presenceData) {
        setRecords(presenceData)
    } else {
        setRecords([])
    }
    
    setLoading(false)
  }

  useEffect(() => {
      fetchInitialMonth()
  }, [])

  useEffect(() => {
    if (!isInitialLoad) {
        fetchRecords()
    }
  }, [selectedMonth, selectedYear, isInitialLoad])

  useEffect(() => {
      if (showSearch && searchInputRef.current) {
          searchInputRef.current.focus()
      }
  }, [showSearch])

  // --- MAPA E LISTAS PARA FILTROS ---
  const socioMap = useMemo(() => {
      const map = new Map<string, string>()
      socioRules.forEach(rule => {
          map.set(normalizeKey(rule.nome_colaborador), rule.socio_responsavel)
      })
      return map
  }, [socioRules])

  const uniqueSocios = useMemo(() => {
      const socios = new Set(socioRules.map(r => toTitleCase(r.socio_responsavel)).filter(s => s !== 'Não Definido' && s !== ''))
      return Array.from(socios).sort()
  }, [socioRules])

  const uniqueColaboradores = useMemo(() => {
      let rules = socioRules;
      if (filterSocio) {
          rules = rules.filter(r => toTitleCase(r.socio_responsavel) === filterSocio)
      }
      return Array.from(new Set(rules.map(r => toTitleCase(r.nome_colaborador)))).sort()
  }, [socioRules, filterSocio])

  // --- FILTRAGEM CENTRALIZADA ---
  const filteredData = useMemo(() => {
      const filteredRecords = records.filter(record => {
          const dateObj = new Date(record.data_hora)
          const recordMonth = dateObj.getUTCMonth()
          const recordYear = dateObj.getUTCFullYear()
          
          if (recordMonth !== selectedMonth || recordYear !== selectedYear) return false

          const normName = normalizeKey(record.nome_colaborador)
          const socioRaw = socioMap.get(normName) || '-'
          const socioFormatted = toTitleCase(socioRaw)
          const nameFormatted = toTitleCase(record.nome_colaborador)

          if (filterSocio && socioFormatted !== filterSocio) return false
          if (filterColaborador && nameFormatted !== filterColaborador) return false

          if (searchText) {
              const lowerSearch = searchText.toLowerCase()
              const matchesName = record.nome_colaborador.toLowerCase().includes(lowerSearch)
              const matchesSocio = socioRaw.toLowerCase().includes(lowerSearch)
              if (!matchesName && !matchesSocio) return false
          }

          return true
      })

      const filteredRules = socioRules.filter(rule => {
          const socioFormatted = toTitleCase(rule.socio_responsavel)
          const nameFormatted = toTitleCase(rule.nome_colaborador)

          if (filterSocio && socioFormatted !== filterSocio) return false
          if (filterColaborador && nameFormatted !== filterColaborador) return false
          
          if (searchText) {
              const lowerSearch = searchText.toLowerCase()
              return rule.nome_colaborador.toLowerCase().includes(lowerSearch) || 
                     rule.socio_responsavel.toLowerCase().includes(lowerSearch)
          }
          return true
      })

      return { filteredRecords, filteredRules }
  }, [records, socioRules, selectedMonth, selectedYear, filterSocio, filterColaborador, searchText, socioMap])

  // --- 2. LÓGICA DO RELATÓRIO ---
  const reportData = useMemo(() => {
    const grouped: { [key: string]: { originalName: string, uniqueDays: Set<string>, weekDays: { [key: number]: number } } } = {}

    filteredData.filteredRecords.forEach(record => {
      const dateObj = new Date(record.data_hora)
      const normalizedName = normalizeKey(record.nome_colaborador)
      const displayName = toTitleCase(record.nome_colaborador)
      
      // Usa UTC para garantir consistência
      const year = dateObj.getUTCFullYear()
      const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0')
      const day = String(dateObj.getUTCDate()).padStart(2, '0')
      const dayKey = `${year}-${month}-${day}`
      
      const weekDay = dateObj.getUTCDay()

      if (!grouped[normalizedName]) {
          grouped[normalizedName] = { 
              originalName: displayName, 
              uniqueDays: new Set(), 
              weekDays: {} 
          }
      }
      
      // Adiciona o dia apenas se ainda não existe
      if (!grouped[normalizedName].uniqueDays.has(dayKey)) {
        grouped[normalizedName].uniqueDays.add(dayKey)
        grouped[normalizedName].weekDays[weekDay] = (grouped[normalizedName].weekDays[weekDay] || 0) + 1
      }
    })

    const result: ReportItem[] = Object.keys(grouped).map(key => {
      const item = grouped[key]
      const weekDaysMap: { [key: string]: number } = {}
      const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
      Object.entries(item.weekDays).forEach(([i, count]) => weekDaysMap[days[Number(i)]] = count)
      
      const socioRaw = socioMap.get(key) || '-'
      const socioFormatted = toTitleCase(socioRaw)

      // Converte datas de YYYY-MM-DD para apenas o dia (DD)
      const sortedDates = Array.from(item.uniqueDays)
        .sort() // Ordena as strings YYYY-MM-DD
        .map(d => {
          const parts = d.split('-')
          return parts[2] // Retorna apenas o dia
        })

      return { 
          nome: item.originalName, 
          socio: socioFormatted, 
          diasPresentes: item.uniqueDays.size, 
          diasSemana: weekDaysMap,
          datas: sortedDates
      }
    })
    
    return result.sort((a, b) => b.diasPresentes - a.diasPresentes)

  }, [filteredData.filteredRecords, socioMap])

  // --- UTILS EXCEL ---
  const findValue = (row: any, keys: string[]) => {
    const rowKeys = Object.keys(row)
    for (const searchKey of keys) {
        const foundKey = rowKeys.find(k => normalizeKey(k) === normalizeKey(searchKey))
        if (foundKey) return row[foundKey]
    }
    return null
  }

  // --- UPLOAD DE PRESENÇA (ATUALIZADO) ---
  const handlePresenceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; 
    if (!file) return;
    
    setUploading(true); 
    setProgress(0);
    
    const reader = new FileReader();
    
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        
        // ===== PASSO 1: CONVERTER SHEET PARA ARRAY, PULANDO O CABEÇALHO =====
        const allData = XLSX.utils.sheet_to_json(ws, { 
          header: 1,  // Retorna array de arrays (não objetos)
          raw: false  // Mantém strings quando possível
        }) as any[][];
        
        // Encontra a primeira linha de dados (pula cabeçalhos até achar nome válido)
        let startIndex = 0;
        for (let i = 0; i < allData.length; i++) {
          const row = allData[i];
          if (row && row[0] && typeof row[0] === 'string') {
            const firstCol = row[0].trim().toLowerCase();
            // Pula linhas que contenham palavras de cabeçalho
            if (firstCol !== 'nome' && firstCol !== 'colaborador' && firstCol !== '' && !firstCol.includes('departamento')) {
              startIndex = i;
              break;
            }
          }
        }
        
        const dataRows = allData.slice(startIndex);
        console.log(`Linhas puladas: ${startIndex}, Total de dados: ${dataRows.length}`);
        
        console.log(`Total de linhas após pular cabeçalho: ${dataRows.length}`);
        console.log('Primeiras 3 linhas:', dataRows.slice(0, 3));
        
        // ===== PASSO 2: PROCESSAR CADA LINHA =====
        const rawRecords = dataRows
          .map((row: any[], rowIndex: number) => {
            // Assume estrutura: [Nome, Departamento, Tempo]
            // Coluna 0: Nome
            // Coluna 1: Departamento (ignorar)
            // Coluna 2: Tempo (data e hora)
            
            if (!row || row.length < 3) return null;
            
            let nome = row[0];
            const tempoRaw = row[2];
            
            // Debug das primeiras 5 linhas
            if (rowIndex < 5) {
              console.log(`Linha ${rowIndex}:`, { nome, tempoRaw, tipo: typeof tempoRaw });
            }
            
            // Valida nome
            if (!nome || typeof nome !== 'string' || nome.trim() === '') return null;
            nome = nome.trim();
            
            // ===== PASSO 3: PROCESSAR CAMPO TEMPO (data + hora) =====
            let dataFinal: Date | null = null;
            
            if (typeof tempoRaw === 'string') {
              const tempoStr = tempoRaw.trim();
              
              // Formato esperado: "YYYY-MM-DD HH:MM:SS" ou "DD/MM/YYYY HH:MM:SS"
              // Vamos extrair apenas a parte da data (antes do espaço)
              const parts = tempoStr.split(' ');
              const datePart = parts[0];
              
              // Tenta formato YYYY-MM-DD
              if (datePart.includes('-')) {
                const dateParts = datePart.split('-');
                if (dateParts.length === 3) {
                  const year = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]);
                  const day = parseInt(dateParts[2]);
                  
                  if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
                    dataFinal = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                  }
                }
              }
              // Tenta formato DD/MM/YYYY
              else if (datePart.includes('/')) {
                const dateParts = datePart.split('/');
                if (dateParts.length === 3) {
                  const day = parseInt(dateParts[0]);
                  const month = parseInt(dateParts[1]);
                  const year = parseInt(dateParts[2]);
                  
                  if (year && month && day && !isNaN(year) && !isNaN(month) && !isNaN(day)) {
                    dataFinal = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
                  }
                }
              }
            }
            // Se for número (serial do Excel)
            else if (typeof tempoRaw === 'number') {
              const dateObj = new Date((tempoRaw - 25569) * 86400 * 1000);
              dataFinal = new Date(Date.UTC(
                dateObj.getUTCFullYear(), 
                dateObj.getUTCMonth(), 
                dateObj.getUTCDate(), 
                12, 0, 0
              ));
            }
            
            // Valida data
            if (!dataFinal || isNaN(dataFinal.getTime())) {
              console.warn(`Data inválida para ${nome}: ${tempoRaw}`);
              return null;
            }
            
            // Debug das primeiras 5 datas processadas
            if (rowIndex < 5) {
              console.log(`Data processada [${rowIndex}]:`, dataFinal.toISOString(), 'UTC:', {
                dia: dataFinal.getUTCDate(),
                mes: dataFinal.getUTCMonth() + 1,
                ano: dataFinal.getUTCFullYear()
              });
            }
            
            return { 
              nome_colaborador: nome, 
              data_hora: dataFinal, 
              arquivo_origem: file.name 
            };
          })
          .filter((r: any) => r !== null);
        
        console.log(`Registros válidos extraídos: ${rawRecords.length}`);
        console.log('Primeiros 5 registros:', rawRecords.slice(0, 5).map(r => ({
          nome: r.nome_colaborador,
          data: r.data_hora.toISOString()
        })));
        
        // ===== PASSO 4: DEDUPLICAÇÃO =====
        // 4.1 - Buscar registros existentes no banco para este período
        const uniqueSet = new Set<string>();
        
        // Pega todas as datas únicas dos novos registros
        const allDates = rawRecords.map((r: any) => r.data_hora);
        const minDate = new Date(Math.min(...allDates.map((d: Date) => d.getTime())));
        const maxDate = new Date(Math.max(...allDates.map((d: Date) => d.getTime())));
        
        // Busca registros existentes neste intervalo
        const { data: existingRecords } = await supabase
          .from('presenca_portaria')
          .select('nome_colaborador, data_hora')
          .gte('data_hora', minDate.toISOString())
          .lte('data_hora', maxDate.toISOString());
        
        // 4.2 - Criar set com assinaturas existentes (nome_data)
        const existingSignatures = new Set<string>();
        if (existingRecords) {
          existingRecords.forEach(r => {
            const d = new Date(r.data_hora);
            const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
            const key = `${normalizeKey(r.nome_colaborador)}_${dateStr}`;
            existingSignatures.add(key);
          });
        }
        
        console.log(`Registros já existentes no período: ${existingSignatures.size}`);
        
        // 4.3 - Filtrar registros novos (remove duplicatas internas E do banco)
        const recordsToInsert = rawRecords.filter((r: any) => {
          const d = r.data_hora;
          const dateStr = d.toISOString().split('T')[0];
          const key = `${normalizeKey(r.nome_colaborador)}_${dateStr}`;
          
          // Já existe no banco?
          if (existingSignatures.has(key)) return false;
          
          // Já foi processado neste upload?
          if (uniqueSet.has(key)) return false;
          
          // Marca como processado
          uniqueSet.add(key);
          return true;
        });
        
        const duplicatesSkipped = rawRecords.length - recordsToInsert.length;
        console.log(`Registros únicos para inserir: ${recordsToInsert.length}`);
        console.log(`Duplicatas ignoradas: ${duplicatesSkipped}`);
        
        // ===== PASSO 5: INSERÇÃO EM LOTE =====
        if (recordsToInsert.length === 0) {
          alert('Nenhum registro novo para importar. Todos já existem no sistema.');
          setUploading(false);
          if (presenceInputRef.current) presenceInputRef.current.value = '';
          return;
        }
        
        const BATCH_SIZE = 1000;
        const totalBatches = Math.ceil(recordsToInsert.length / BATCH_SIZE);
        
        for (let i = 0; i < recordsToInsert.length; i += BATCH_SIZE) {
          const batch = recordsToInsert.slice(i, i + BATCH_SIZE).map((r: any) => ({
            nome_colaborador: r.nome_colaborador,
            data_hora: r.data_hora.toISOString(), // Converte para ISO string
            arquivo_origem: r.arquivo_origem
          }));
          
          const { error } = await supabase
            .from('presenca_portaria')
            .insert(batch);
          
          if (error) {
            console.error('Erro ao inserir batch:', error);
            throw error;
          }
          
          setProgress(Math.round(((i / BATCH_SIZE) + 1) / totalBatches * 100));
        }
        
        // ===== PASSO 6: FEEDBACK E ATUALIZAÇÃO =====
        alert(
          `✅ Importação concluída!\n\n` +
          `• ${recordsToInsert.length} registros NOVOS importados\n` +
          `• ${duplicatesSkipped} duplicatas ignoradas\n` +
          `• ${rawRecords.length} linhas processadas`
        );
        
        // Atualiza para o mês do primeiro registro importado
        if (recordsToInsert.length > 0) {
          const firstDate = new Date(recordsToInsert[0].data_hora);
          setSelectedMonth(firstDate.getUTCMonth());
          setSelectedYear(firstDate.getUTCFullYear());
        } else {
          fetchRecords();
        }
        
      } catch (err) {
        console.error('Erro ao processar arquivo:', err);
        alert('❌ Erro ao importar arquivo. Verifique o formato da planilha.');
      } finally {
        setUploading(false);
        if (presenceInputRef.current) presenceInputRef.current.value = '';
      }
    };
    
    reader.readAsBinaryString(file);
  };

  const handleSocioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploading(true); setProgress(0);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        const uniqueRules = new Map<string, any>();
        data.forEach((row: any) => {
          let socio = findValue(row, ['socio', 'sócio', 'responsavel', 'gestor', 'partner']) || 'Não Definido'
          let colab = findValue(row, ['nome', 'colaborador', 'funcionario']) || 'Desconhecido'
          if (typeof socio === 'string') socio = socio.trim()
          if (typeof colab === 'string') colab = colab.trim()
          if (colab === 'Desconhecido') return;
          const meta = findValue(row, ['meta', 'dias', 'regra']) || 3 
          const key = normalizeKey(colab);
          uniqueRules.set(key, { socio_responsavel: socio, nome_colaborador: colab, meta_semanal: Number(meta) || 3 })
        });
        const rulesToInsert = Array.from(uniqueRules.values());
        if(confirm(`Substituir base por ${rulesToInsert.length} registros?`)) {
            await supabase.from('socios_regras').delete().neq('id', '00000000-0000-0000-0000-000000000000')
            await supabase.from('socios_regras').insert(rulesToInsert)
            alert("Base atualizada!"); fetchRecords()
        }
      } catch (err) { console.error(err); alert("Erro ao importar.") } 
      finally { setUploading(false); if (socioInputRef.current) socioInputRef.current.value = '' }
    }
    reader.readAsBinaryString(file)
  }

  // --- CRUD ---
  const handleOpenModal = (rule?: SocioRule) => { setEditingRule(rule || { socio_responsavel: '', nome_colaborador: '', meta_semanal: 3 }); setIsModalOpen(true); }
  const handleSaveRule = async () => {
      if (!editingRule?.socio_responsavel || !editingRule?.nome_colaborador) return alert("Preencha campos.")
      setLoading(true)
      try {
          const payload = { socio_responsavel: editingRule.socio_responsavel.trim(), nome_colaborador: editingRule.nome_colaborador.trim(), meta_semanal: editingRule.meta_semanal || 3 }
          if (editingRule.id) await supabase.from('socios_regras').update(payload).eq('id', editingRule.id)
          else await supabase.from('socios_regras').insert(payload)
          setIsModalOpen(false); fetchRecords()
      } catch (err: any) { alert("Erro: " + err.message) } finally { setLoading(false) }
  }
  const handleDeleteRule = async (id: string) => { if (!confirm("Excluir?")) return; setLoading(true); await supabase.from('socios_regras').delete().eq('id', id); fetchRecords() }
  const handleClearData = async () => {
      if (viewMode === 'socios') { if (!confirm("Apagar REGRAS?")) return; await supabase.from('socios_regras').delete().neq('id', '00000000-0000-0000-0000-000000000000') } 
      else { if (!confirm("Apagar PRESENÇA?")) return; await supabase.from('presenca_portaria').delete().neq('id', '00000000-0000-0000-0000-000000000000') }
      fetchRecords()
  }

  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const years = Array.from({length: 5}, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="flex flex-col h-full bg-gray-100 space-y-6 relative">
      
      {/* MODAL */}
      {isModalOpen && editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-fadeIn">
                <div className="bg-[#112240] px-6 py-4 flex justify-between items-center">
                    <h3 className="text-white font-bold">{editingRule.id ? 'Editar Regra' : 'Nova Regra'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white"><X className="h-5 w-5"/></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Colaborador</label>
                        <input type="text" className="w-full border p-2 rounded" value={editingRule.nome_colaborador} onChange={e => setEditingRule({...editingRule, nome_colaborador: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Sócio Responsável</label>
                        <input type="text" className="w-full border p-2 rounded" value={editingRule.socio_responsavel} onChange={e => setEditingRule({...editingRule, socio_responsavel: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Meta Semanal</label>
                        <input type="number" className="w-full border p-2 rounded" value={editingRule.meta_semanal} onChange={e => setEditingRule({...editingRule, meta_semanal: Number(e.target.value)})} />
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 border rounded hover:bg-gray-50">Cancelar</button>
                        <button onClick={handleSaveRule} className="flex-1 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Salvar</button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h2 className="text-xl font-bold text-[#112240]">Controle de Presença</h2>
                <p className="text-sm text-gray-500">Gestão de acessos e regras de sócios.</p>
            </div>
            
            <div className="flex items-center gap-2">
                <input type="file" accept=".xlsx" ref={presenceInputRef} onChange={handlePresenceUpload} className="hidden" />
                <input type="file" accept=".xlsx" ref={socioInputRef} onChange={handleSocioUpload} className="hidden" />
                <button onClick={() => fetchRecords()} className="p-2 text-gray-400 hover:text-blue-600" title="Atualizar"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button>
                <button onClick={handleClearData} className="p-2 text-gray-400 hover:text-red-600" title="Limpar"><Trash2 className="h-5 w-5" /></button>
                
                {viewMode === 'socios' ? (
                    <div className="flex gap-2">
                         <button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> Novo</button>
                         <button onClick={() => socioInputRef.current?.click()} disabled={uploading} className="bg-[#112240] hover:bg-[#1e3a8a] text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">{uploading ? '...' : <><Users className="h-4 w-4" /> Importar</>}</button>
                    </div>
                ) : (
                    <button onClick={() => presenceInputRef.current?.click()} disabled={uploading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">{uploading ? '...' : <><FileSpreadsheet className="h-4 w-4" /> Importar</>}</button>
                )}
            </div>
        </div>

        {/* BARRA DE FERRAMENTAS: FILTROS E VIEW */}
        <div className="flex flex-col lg:flex-row items-center justify-between border-t border-gray-100 pt-4 gap-4">
            
            {/* 1. SELETORES DE VISUALIZAÇÃO */}
            <div className="flex bg-gray-100 p-1 rounded-lg w-full lg:w-auto overflow-x-auto">
                <button onClick={() => setViewMode('report')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'report' ? 'bg-white text-[#112240] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><BarChart3 className="h-4 w-4" /> Relatório</button>
                <button onClick={() => setViewMode('socios')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${viewMode === 'socios' ? 'bg-white text-[#112240] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}><Briefcase className="h-4 w-4" /> Regras</button>
            </div>

            {/* 2. ÁREA DE PESQUISA E FILTROS */}
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
                
                {/* BOTÃO/CAMPO DE PESQUISA */}
                <div className={`flex items-center bg-gray-50 border border-gray-200 rounded-lg transition-all duration-300 ${showSearch ? 'w-full sm:w-64 px-2' : 'w-10 justify-center'}`}>
                    <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-gray-400 hover:text-blue-600">
                        {showSearch ? <X className="h-4 w-4" /> : <Search className="h-4 w-4" />}
                    </button>
                    {showSearch && (
                        <input 
                            ref={searchInputRef}
                            type="text" 
                            placeholder="Buscar nome..." 
                            className="bg-transparent border-none focus:ring-0 text-sm w-full outline-none text-gray-700"
                            value={searchText}
                            onChange={(e) => setSearchText(e.target.value)}
                        />
                    )}
                </div>

                {/* FILTROS DROPDOWN */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative w-full sm:w-40">
                        <FilterIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <select 
                            value={filterSocio} 
                            onChange={(e) => setFilterSocio(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg pl-8 p-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        >
                            <option value="">Todos Sócios</option>
                            {uniqueSocios.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="relative w-full sm:w-40">
                        <Users className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                        <select 
                            value={filterColaborador} 
                            onChange={(e) => setFilterColaborador(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg pl-8 p-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
                        >
                            <option value="">Todos Colab.</option>
                            {uniqueColaboradores.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                </div>

                {/* FILTRO DE MÊS (APARECE APENAS EM REPORT) */}
                {viewMode === 'report' && (
                    <div className="flex items-center gap-2 w-full sm:w-auto border-l pl-2 ml-2 border-gray-200">
                        <select value={selectedMonth} onChange={(e) => setSelectedMonth(Number(e.target.value))} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2">
                            {months.map((m, i) => <option key={i} value={i}>{m}</option>)}
                        </select>
                        <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))} className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg p-2">
                            {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* CONTEÚDO */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        
        {viewMode === 'report' && (
            <div className="flex-1 overflow-auto">
                {reportData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-400"><p>Sem dados correspondentes aos filtros.</p></div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                            <tr>
                                <th className="px-2 py-2 border-b">Colaborador</th>
                                <th className="px-2 py-2 border-b">Sócio</th> 
                                <th className="px-2 py-2 border-b w-24">Freq.</th>
                                <th className="px-2 py-2 border-b">Semana</th>
                                <th className="px-2 py-2 border-b">Datas</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {reportData.map((item, idx) => (
                                <tr key={idx} className="hover:bg-blue-50/50">
                                    <td className="px-2 py-1 font-medium text-[#112240] text-xs whitespace-nowrap">{item.nome}</td>
                                    <td className="px-2 py-1 text-xs text-gray-600 whitespace-nowrap">
                                        {item.socio !== '-' ? <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded border border-gray-200">{item.socio}</span> : <span className="text-red-400 text-xs italic bg-red-50 px-1.5 py-0.5 rounded">Sem Sócio</span>}
                                    </td>
                                    <td className="px-2 py-1">
                                        <div className="flex items-center gap-1">
                                            <span className="text-xs font-bold text-[#112240]">{item.diasPresentes}d</span>
                                            <div className="w-10 h-1 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${item.diasPresentes >= 20 ? 'bg-green-500' : item.diasPresentes >= 10 ? 'bg-blue-500' : 'bg-yellow-500'}`} style={{ width: `${Math.min((item.diasPresentes / 22) * 100, 100)}%` }} /></div>
                                        </div>
                                    </td>
                                    <td className="px-2 py-1">
                                        <div className="flex gap-1">
                                            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map(day => (
                                                <div key={day} className={`text-[10px] px-1 py-0.5 rounded border ${item.diasSemana[day] ? 'bg-green-50 border-green-200 text-green-700 font-bold' : 'bg-gray-50 border-gray-100 text-gray-300'}`}>{day.charAt(0)}{item.diasSemana[day] ? `(${item.diasSemana[day]})` : ''}</div>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-2 py-1 text-[10px] text-gray-500 font-mono tracking-tighter truncate max-w-xs" title={item.datas.join(', ')}>
                                        {item.datas.join(', ')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        )}

        {viewMode === 'socios' && (
             <div className="flex-1 overflow-auto">
                 {filteredData.filteredRules.length === 0 ? (
                     <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                         <Users className="h-12 w-12 mb-3 opacity-20" />
                         <p>Nenhuma regra encontrada com os filtros atuais.</p>
                     </div>
                 ) : (
                    <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 sticky top-0 z-10 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                        <tr>
                            <th className="px-4 py-2 border-b">Colaborador</th>
                            <th className="px-4 py-2 border-b">Sócio Responsável</th>
                            <th className="px-4 py-2 border-b">Meta</th>
                            <th className="px-4 py-2 border-b text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredData.filteredRules.map((rule) => (
                            <tr key={rule.id} className="hover:bg-gray-50 text-sm text-gray-700 group">
                                <td className="px-4 py-2 font-medium text-[#112240]">{toTitleCase(rule.nome_colaborador)}</td>
                                <td className="px-4 py-2">{toTitleCase(rule.socio_responsavel)}</td>
                                <td className="px-4 py-2"><span className="bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-medium">{rule.meta_semanal}x</span></td>
                                <td className="px-4 py-2 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(rule)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="h-4 w-4" /></button>
                                        <button onClick={() => handleDeleteRule(rule.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    </table>
                 )}
             </div>
        )}
      </div>
    </div>
  )
}
