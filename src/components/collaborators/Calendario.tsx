import { useState, useEffect } from 'react'
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Cake, 
  Users, 
  Gift,
  Star,
  Sparkles,
  PartyPopper,
  Clock,
  Filter,
  X
} from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface Colaborador {
  id: number;
  nome: string;
  data_nascimento: string;
  cargo: string;
  foto_url?: string;
}

interface AniversarioData {
  colaborador: Colaborador;
  dia: number;
  mes: number;
  ano: number;
  idade: number;
  diasRestantes: number;
  isHoje: boolean;
  isEstaSemana: boolean;
  isEsteMes: boolean;
}

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

export function Calendario() {
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [viewMode, setViewMode] = useState<'calendario' | 'proximos'>('calendario')
  const [filterMes, setFilterMes] = useState<number | null>(null)

  useEffect(() => {
    fetchColaboradores()
  }, [])

  const fetchColaboradores = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('colaboradores')
      .select('id, nome, data_nascimento, cargo, foto_url')
      .not('data_nascimento', 'is', null)
      .eq('status', 'Ativo')
      .order('nome')
    
    if (data) setColaboradores(data)
    setLoading(false)
  }

  const toTitleCase = (str: string) => {
    if (!str) return ''
    return str.toLowerCase().split(' ').map(word => {
      return (word.length > 2) ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    }).join(' ');
  }

  const calcularIdade = (dataNascimento: string, ano: number): number => {
    const nascimento = new Date(dataNascimento)
    return ano - nascimento.getFullYear()
  }

  const calcularDiasRestantes = (dia: number, mes: number): number => {
    const hoje = new Date()
    const anoAtual = hoje.getFullYear()
    let proximoAniversario = new Date(anoAtual, mes, dia)
    
    if (proximoAniversario < hoje) {
      proximoAniversario = new Date(anoAtual + 1, mes, dia)
    }
    
    const diffTime = proximoAniversario.getTime() - hoje.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }

  const processarAniversarios = (): AniversarioData[] => {
    const hoje = new Date()
    const aniversarios: AniversarioData[] = []

    colaboradores.forEach(colab => {
      if (colab.data_nascimento) {
        const nascimento = new Date(colab.data_nascimento)
        const dia = nascimento.getDate()
        const mes = nascimento.getMonth()
        const ano = nascimento.getFullYear()
        
        const diasRestantes = calcularDiasRestantes(dia, mes)
        const idade = calcularIdade(colab.data_nascimento, hoje.getFullYear())
        
        aniversarios.push({
          colaborador: colab,
          dia,
          mes,
          ano,
          idade,
          diasRestantes,
          isHoje: diasRestantes === 0,
          isEstaSemana: diasRestantes <= 7 && diasRestantes >= 0,
          isEsteMes: mes === hoje.getMonth()
        })
      }
    })

    return aniversarios.sort((a, b) => a.diasRestantes - b.diasRestantes)
  }

  const aniversarios = processarAniversarios()

  const aniversariosDoMes = (mes: number, ano: number): AniversarioData[] => {
    return aniversarios.filter(a => a.mes === mes)
  }

  const getAniversariosHoje = () => aniversarios.filter(a => a.isHoje)
  const getAniversariosEstaSemana = () => aniversarios.filter(a => a.isEstaSemana && !a.isHoje)
  const getProximosAniversarios = () => {
    if (filterMes !== null) {
      return aniversarios.filter(a => a.mes === filterMes)
    }
    return aniversarios.slice(0, 20)
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear)
    const days = []
    const anivMes = aniversariosDoMes(selectedMonth, selectedYear)

    // Dias vazios antes do primeiro dia
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />)
    }

    // Dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      const anivDoDia = anivMes.filter(a => a.dia === day)
      const isToday = 
        day === currentDate.getDate() && 
        selectedMonth === currentDate.getMonth() && 
        selectedYear === currentDate.getFullYear()

      days.push(
        <div
          key={day}
          className={`aspect-square p-2 rounded-xl border transition-all duration-200 ${
            isToday 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400 shadow-lg' 
              : anivDoDia.length > 0
              ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 hover:shadow-md hover:scale-105 cursor-pointer'
              : 'bg-white border-gray-100 hover:border-blue-100 hover:bg-blue-50/30'
          }`}
        >
          <div className={`text-sm font-bold mb-1 ${isToday ? 'text-white' : 'text-gray-700'}`}>
            {day}
          </div>
          {anivDoDia.length > 0 && (
            <div className="space-y-1">
              {anivDoDia.slice(0, 2).map((aniv, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-1.5 py-0.5 rounded-md shadow-sm border border-blue-100"
                  title={`${toTitleCase(aniv.colaborador.nome)} - ${aniv.idade} anos`}
                >
                  <Cake className="h-3 w-3 text-blue-600 flex-shrink-0" />
                  <span className="text-[9px] font-medium text-gray-700 truncate">
                    {toTitleCase(aniv.colaborador.nome).split(' ')[0]}
                  </span>
                </div>
              ))}
              {anivDoDia.length > 2 && (
                <div className="text-[8px] font-bold text-blue-600 text-center bg-white/80 rounded px-1">
                  +{anivDoDia.length - 2}
                </div>
              )}
            </div>
          )}
        </div>
      )
    }

    return days
  }

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear(selectedYear - 1)
    } else {
      setSelectedMonth(selectedMonth - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear(selectedYear + 1)
    } else {
      setSelectedMonth(selectedMonth + 1)
    }
  }

  const aniversariosHoje = getAniversariosHoje()
  const aniversariosEstaSemana = getAniversariosEstaSemana()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando calendário...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-2xl shadow-xl p-8 text-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
              <CalendarIcon className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Calendário de Aniversários</h1>
              <p className="text-blue-100 mt-1">Celebre momentos especiais com a equipe</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('calendario')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                viewMode === 'calendario'
                  ? 'bg-white text-blue-700 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              Calendário
            </button>
            <button
              onClick={() => setViewMode('proximos')}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                viewMode === 'proximos'
                  ? 'bg-white text-blue-700 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              Próximos
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-400/20 rounded-lg">
                <Sparkles className="h-5 w-5 text-yellow-300" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Hoje</p>
                <p className="text-2xl font-bold">{aniversariosHoje.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-400/20 rounded-lg">
                <PartyPopper className="h-5 w-5 text-pink-300" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Esta Semana</p>
                <p className="text-2xl font-bold">{aniversariosEstaSemana.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-400/20 rounded-lg">
                <Users className="h-5 w-5 text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-blue-100">Total Cadastrado</p>
                <p className="text-2xl font-bold">{colaboradores.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ANIVERSÁRIOS DE HOJE */}
      {aniversariosHoje.length > 0 && (
        <div className="bg-gradient-to-r from-yellow-50 via-amber-50 to-orange-50 rounded-2xl shadow-lg border-2 border-yellow-200 p-6 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-400 rounded-xl shadow-lg">
              <Cake className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                🎉 Aniversariantes de Hoje!
              </h2>
              <p className="text-sm text-gray-600">Não esqueça de parabenizar</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {aniversariosHoje.map((aniv) => (
              <div
                key={aniv.colaborador.id}
                className="bg-white rounded-xl p-4 shadow-md border-2 border-yellow-300 hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <div className="flex items-center gap-3">
                  {aniv.colaborador.foto_url ? (
                    <img
                      src={aniv.colaborador.foto_url}
                      alt={aniv.colaborador.nome}
                      className="w-16 h-16 rounded-full object-cover border-4 border-yellow-400 shadow-lg"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-yellow-300 shadow-lg">
                      {aniv.colaborador.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{toTitleCase(aniv.colaborador.nome)}</p>
                    <p className="text-sm text-gray-600">{toTitleCase(aniv.colaborador.cargo)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Gift className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-bold text-yellow-700">{aniv.idade} anos</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CONTEÚDO PRINCIPAL */}
      {viewMode === 'calendario' ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          {/* Navegação do Calendário */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={handlePrevMonth}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-6 w-6 text-blue-600" />
            </button>
            <h2 className="text-2xl font-bold text-gray-900">
              {MESES[selectedMonth]} {selectedYear}
            </h2>
            <button
              onClick={handleNextMonth}
              className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ChevronRight className="h-6 w-6 text-blue-600" />
            </button>
          </div>

          {/* Dias da Semana */}
          <div className="grid grid-cols-7 gap-2 mb-2">
            {DIAS_SEMANA.map(dia => (
              <div key={dia} className="text-center text-sm font-bold text-gray-500 uppercase">
                {dia}
              </div>
            ))}
          </div>

          {/* Grade do Calendário */}
          <div className="grid grid-cols-7 gap-2">
            {renderCalendar()}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Próximos Aniversários</h2>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filterMes ?? ''}
                onChange={(e) => setFilterMes(e.target.value ? parseInt(e.target.value) : null)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Todos os meses</option>
                {MESES.map((mes, idx) => (
                  <option key={idx} value={idx}>{mes}</option>
                ))}
              </select>
              {filterMes !== null && (
                <button
                  onClick={() => setFilterMes(null)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {getProximosAniversarios().map((aniv) => (
              <div
                key={aniv.colaborador.id}
                className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-md ${
                  aniv.isHoje
                    ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
                    : aniv.isEstaSemana
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'
                    : 'bg-gray-50 border-gray-200 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-4">
                  {aniv.colaborador.foto_url ? (
                    <img
                      src={aniv.colaborador.foto_url}
                      alt={aniv.colaborador.nome}
                      className="w-14 h-14 rounded-full object-cover border-2 border-blue-300 shadow"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-xl font-bold border-2 border-blue-300 shadow">
                      {aniv.colaborador.nome.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{toTitleCase(aniv.colaborador.nome)}</p>
                    <p className="text-sm text-gray-600">{toTitleCase(aniv.colaborador.cargo)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Data</p>
                    <p className="font-bold text-gray-900">
                      {aniv.dia} de {MESES[aniv.mes]}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Idade</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <p className="font-bold text-gray-900">{aniv.idade} anos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Faltam</p>
                    <p className={`font-bold text-lg ${
                      aniv.isHoje ? 'text-yellow-600' : aniv.isEstaSemana ? 'text-blue-600' : 'text-gray-900'
                    }`}>
                      {aniv.diasRestantes === 0 ? 'Hoje!' : `${aniv.diasRestantes} dias`}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}