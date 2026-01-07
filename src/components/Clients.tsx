import { useEffect, useState, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Plus, Search, X, Filter, ArrowUpDown, Check, 
  MessageCircle, Trash2, Pencil, Mail, Phone, 
  Briefcase, User, Gift, Info, MapPin, Printer, FileSpreadsheet,
  Upload, Loader2, AlertTriangle
} from 'lucide-react'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { NewClientModal, ClientData } from './NewClientModal'
import { utils, writeFile, read } from 'xlsx'
import { logAction } from '../lib/logger'

interface ClientsProps {
  initialFilters?: { socio?: string; brinde?: string };
  tableName?: string; // 'clientes' ou 'magistrados'
}

export function Clients({ initialFilters, tableName = 'clientes' }: ClientsProps) {
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<ClientData | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSocio, setFilterSocio] = useState<string>('')
  const [filterBrinde, setFilterBrinde] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'az' | 'za'>('newest')

  const [availableSocios, setAvailableSocios] = useState<string[]>([])
  const [availableBrindes, setAvailableBrindes] = useState<string[]>([])

  const fetchClients = async () => {
    setLoading(true)
    const { data, error } = await supabase.from(tableName).select('*')
    
    if (!error && data) {
        const formattedClients: ClientData[] = data.map((item: any) => ({
            id: item.id,
            nome: item.nome,
            empresa: item.empresa,
            cargo: item.cargo,
            telefone: item.telefone,
            tipo_brinde: item.tipo_brinde, 
            outro_brinde: item.outro_brinde,
            quantidade: item.quantidade,
            cep: item.cep,
            endereco: item.endereco,
            numero: item.numero,
            complemento: item.complemento,
            bairro: item.bairro,
            cidade: item.cidade,
            estado: item.estado,
            email: item.email,
            socio: item.socio,
            observacoes: item.observacoes,
            ignored_fields: item.ignored_fields,
            historico_brindes: item.historico_brindes,
            created_at: item.created_at,
            updated_at: item.updated_at,
            created_by: item.created_by,
            updated_by: item.updated_by
        }))
        setClients(formattedClients)
        
        const socios = Array.from(new Set(formattedClients.map(c => c.socio).filter(Boolean))) as string[]
        const brindes = Array.from(new Set(formattedClients.map(c => c.tipo_brinde).filter(Boolean))) as string[]
        setAvailableSocios(socios.sort())
        setAvailableBrindes(brindes.sort())
    } else if (error) {
        console.error("Erro fetch:", error)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (initialFilters?.socio) setFilterSocio(initialFilters.socio)
    if (initialFilters?.brinde) setFilterBrinde(initialFilters.brinde)
    fetchClients()
  }, [initialFilters, tableName])

  const processedClients = useMemo(() => {
    let result = [...clients]

    if (searchTerm) {
        const lowerTerm = searchTerm.toLowerCase()
        result = result.filter(c => 
            (c.nome?.toLowerCase() || '').includes(lowerTerm) ||
            (c.empresa?.toLowerCase() || '').includes(lowerTerm) ||
            (c.email?.toLowerCase() || '').includes(lowerTerm) ||
            (c.cargo?.toLowerCase() || '').includes(lowerTerm) ||
            (c.cidade?.toLowerCase() || '').includes(lowerTerm)
        )
    }

    if (filterSocio) result = result.filter(c => c.socio === filterSocio)
    if (filterBrinde) result = result.filter(c => c.tipo_brinde === filterBrinde)

    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })
    result.sort((a, b) => {
        if (sortOrder === 'az') return collator.compare(a.nome || '', b.nome || '')
        if (sortOrder === 'za') return collator.compare(b.nome || '', a.nome || '')
        if (sortOrder === 'oldest') return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
    })

    return result
  }, [clients, searchTerm, filterSocio, filterBrinde, sortOrder])

  // ✅ FUNÇÃO DE EXCLUSÃO CORRIGIDA COM CASCATA MANUAL
  const handleDelete = async (client: ClientData) => {
    if (!confirm(`⚠️ Tem certeza que deseja excluir permanentemente: ${client.nome}?\n\nEsta ação não pode ser desfeita.`)) {
        return;
    }

    try {
        console.log(`🗑️ Iniciando exclusão de cliente ID ${client.id} - ${client.nome}...`)

        // PASSO 1: Limpar tarefas vinculadas (se houver)
        console.log('→ Verificando tarefas vinculadas...')
        const { error: errTasks } = await supabase
            .from('tasks')
            .delete()
            .eq('client_id', client.id)
        
        if (errTasks) {
            console.warn('⚠️ Aviso ao limpar tarefas:', errTasks)
            // Não bloqueia se não encontrar tasks ou se houver erro de permissão
            // (pode ser que não existam tasks para esse cliente)
        } else {
            console.log('✅ Tarefas vinculadas removidas (se existiam)')
        }

        // PASSO 2: Excluir o cliente
        console.log(`→ Excluindo cliente da tabela ${tableName}...`)
        const { error: errCliente } = await supabase
            .from(tableName)
            .delete()
            .eq('id', client.id)
        
        if (errCliente) {
            console.error('❌ Erro ao excluir cliente:', errCliente)
            throw new Error(`Falha ao excluir: ${errCliente.message}`)
        }

        // PASSO 3: Atualizar UI e registrar log
        console.log('✅ Cliente excluído com sucesso!')
        setClients(current => current.filter(c => c.id !== client.id))
        await logAction('EXCLUIR', tableName.toUpperCase(), `Excluiu: ${client.nome}`)
        
    } catch (error: any) {
        console.error('❌ Erro na exclusão:', error)
        alert(`Falha ao excluir cliente:\n\n${error.message}\n\nPossíveis causas:\n- Permissões RLS bloqueando DELETE\n- Foreign Keys ativas\n- Conexão com banco perdida`)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if(!confirm(`Importar para: ${tableName.toUpperCase()}?`)) {
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
    }

    setImporting(true)

    try {
      const data = await file.arrayBuffer()
      const workbook = read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) throw new Error('Arquivo vazio.')

      // ✅ CORREÇÃO: Usa getUser() do Supabase v2
      const { data: { user } } = await supabase.auth.getUser()
      const userEmail = user?.email || 'Importação'

      const normalizeKeys = (obj: any) => {
          const newObj: any = {};
          Object.keys(obj).forEach(key => {
              newObj[key.trim().toLowerCase()] = obj[key];
          });
          return newObj;
      }

      const itemsToInsert = jsonData.map((rawRow: any) => {
        const row = normalizeKeys(rawRow);
        if (!row.nome && !row['nome completo']) return null;

        return {
            nome: row.nome || row['nome completo'] || 'Sem Nome',
            empresa: row.empresa || '',
            cargo: row.cargo || '',
            email: row.email || row['e-mail'] || '',
            telefone: row.telefone || row.celular || '',
            socio: row.socio || row['sócio'] || '',
            tipo_brinde: row.tipo_brinde || row['tipo de brinde'] || row.brinde || 'Brinde Médio',
            quantidade: row.quantidade || 1,
            cep: row.cep || '',
            endereco: row.endereco || row['endereço'] || '',
            numero: row.numero || row['número'] || '',
            bairro: row.bairro || '',
            cidade: row.cidade || '',
            estado: row.estado || row.uf || '',
            created_by: userEmail,
            updated_by: userEmail
        }
      }).filter(Boolean)

      if (itemsToInsert.length === 0) throw new Error('Nenhum item válido.')

      const { error } = await supabase.from(tableName).insert(itemsToInsert)

      if (error) throw error

      alert(`✅ ${itemsToInsert.length} registros importados!`)
      await logAction('IMPORTAR', tableName.toUpperCase(), `Importou ${itemsToInsert.length} registros`)
      fetchClients()
      
    } catch (error: any) {
      console.error('Erro na importação:', error)
      alert(`Erro ao importar:\n${error.message}`)
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleExport = () => {
    const dataToExport = processedClients.map(c => ({
      Nome: c.nome,
      Empresa: c.empresa,
      Cargo: c.cargo,
      Email: c.email,
      Telefone: c.telefone,
      Sócio: c.socio,
      'Tipo de Brinde': c.tipo_brinde,
      Quantidade: c.quantidade,
      CEP: c.cep,
      Endereço: c.endereco,
      Número: c.numero,
      Bairro: c.bairro,
      Cidade: c.cidade,
      UF: c.estado,
      'Data Criação': c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : ''
    }))

    const ws = utils.json_to_sheet(dataToExport)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, tableName === 'magistrados' ? 'Magistrados' : 'Clientes')
    writeFile(wb, `${tableName}_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const getBrindeColor = (tipo: string) => {
    if (!tipo) return 'bg-gray-100 text-gray-600'
    if (tipo === 'Brinde VIP') return 'bg-purple-50 text-purple-700 border-purple-100'
    if (tipo === 'Brinde Médio') return 'bg-green-50 text-green-700 border-green-100'
    return 'bg-slate-50 text-slate-600 border-slate-100'
  }

  const handleAddClient = () => {
    setClientToEdit(null)
    setIsModalOpen(true)
  }

  const handleEditClient = (client: ClientData) => {
    setClientToEdit(client)
    setIsModalOpen(true)
  }

  const handleSaveClient = async () => {
    setIsModalOpen(false)
    setClientToEdit(null)
    await fetchClients()
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#112240]"></div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      
      {/* BARRA DE AÇÕES */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Busca */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome, empresa, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#112240]"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtros */}
          <Menu as="div" className="relative">
            <Menu.Button className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50">
              <Filter className="h-4 w-4" />
              Filtros
              {(filterSocio || filterBrinde) && (
                <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {(filterSocio ? 1 : 0) + (filterBrinde ? 1 : 0)}
                </span>
              )}
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-64 origin-top-right bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-20 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Sócio</label>
                  <select 
                    value={filterSocio}
                    onChange={(e) => setFilterSocio(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                  >
                    <option value="">Todos</option>
                    {availableSocios.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Brinde</label>
                  <select 
                    value={filterBrinde}
                    onChange={(e) => setFilterBrinde(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none"
                  >
                    <option value="">Todos</option>
                    {availableBrindes.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                {(filterSocio || filterBrinde) && (
                  <button 
                    onClick={() => { setFilterSocio(''); setFilterBrinde(''); }}
                    className="w-full py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    Limpar Filtros
                  </button>
                )}
              </Menu.Items>
            </Transition>
          </Menu>

          {/* Ordenação */}
          <Menu as="div" className="relative">
            <Menu.Button className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50">
              <ArrowUpDown className="h-4 w-4" />
              Ordenar
            </Menu.Button>
            <Transition
              as={Fragment}
              enter="transition ease-out duration-100"
              enterFrom="transform opacity-0 scale-95"
              enterTo="transform opacity-100 scale-100"
              leave="transition ease-in duration-75"
              leaveFrom="transform opacity-100 scale-100"
              leaveTo="transform opacity-0 scale-95"
            >
              <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-xl shadow-xl border border-gray-100 p-2 z-20">
                {[
                  { value: 'newest', label: 'Mais Recentes' },
                  { value: 'oldest', label: 'Mais Antigos' },
                  { value: 'az', label: 'A → Z' },
                  { value: 'za', label: 'Z → A' },
                ].map(option => (
                  <Menu.Item key={option.value}>
                    {({ active }) => (
                      <button
                        onClick={() => setSortOrder(option.value as any)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between ${
                          active ? 'bg-gray-50' : ''
                        }`}
                      >
                        {option.label}
                        {sortOrder === option.value && <Check className="h-4 w-4 text-blue-600" />}
                      </button>
                    )}
                  </Menu.Item>
                ))}
              </Menu.Items>
            </Transition>
          </Menu>
        </div>

        {/* Ações Principais */}
        <div className="flex gap-2 w-full lg:w-auto">
          <div className="relative flex-1 lg:flex-none">
            <input 
              ref={fileInputRef}
              type="file" 
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              disabled={importing}
            />
            <button 
              disabled={importing}
              className="w-full px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {importing ? 'Importando...' : 'Importar'}
            </button>
          </div>
          
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-50 shadow-sm transition-all flex items-center gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" /> Exportar
          </button>

          <button 
            onClick={handleAddClient}
            className="flex-1 lg:flex-none px-4 py-2 bg-[#112240] hover:bg-[#1a3a6c] text-white rounded-lg text-sm font-bold shadow-sm transition-all flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" /> Novo Cliente
          </button>
        </div>
      </div>

      {/* CONTADOR */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <p className="text-sm text-gray-500">
          Exibindo <strong className="text-[#112240]">{processedClients.length}</strong> de <strong className="text-[#112240]">{clients.length}</strong> registros
        </p>
      </div>

      {/* GRID DE CLIENTES */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {processedClients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <AlertTriangle className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm">Nenhum cliente encontrado com os filtros atuais.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {processedClients.map((client) => (
              <div 
                key={client.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-lg hover:border-blue-200 transition-all group flex flex-col"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <h3 className="font-bold text-[#112240] text-base truncate mb-1">{client.nome}</h3>
                    {client.empresa && (
                      <p className="text-xs text-gray-500 font-medium truncate flex items-center gap-1">
                        <Briefcase className="h-3 w-3 flex-shrink-0" /> {client.empresa}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button 
                      onClick={() => handleEditClient(client)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md"
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(client)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      title="Excluir"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Informações */}
                <div className="space-y-2 flex-1">
                  {client.cargo && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{client.cargo}</span>
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{client.email}</span>
                    </div>
                  )}
                  {client.telefone && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{client.telefone}</span>
                    </div>
                  )}
                  {(client.cidade || client.estado) && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{[client.cidade, client.estado].filter(Boolean).join(' - ')}</span>
                    </div>
                  )}
                </div>

                {/* Footer do Card */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  {client.tipo_brinde ? (
                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase border ${getBrindeColor(client.tipo_brinde)}`}>
                      {client.tipo_brinde.replace('Brinde ', '')}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-400">Sem brinde</span>
                  )}
                  {client.socio && (
                    <span className="text-[10px] text-gray-500 font-medium truncate max-w-[50%]" title={client.socio}>
                      {client.socio}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <NewClientModal 
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setClientToEdit(null)
          }}
          onSave={handleSaveClient}
          clientToEdit={clientToEdit}
          tableName={tableName}
        />
      )}
    </div>
  )
}