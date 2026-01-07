import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { 
  MoreHorizontal, Plus, Search, X, Filter, 
  MapPin, Building, Mail, Phone, Gift 
} from 'lucide-react'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { NewClientModal, ClientData } from './NewClientModal'

interface ClientsProps {
  initialFilters?: { socio?: string; brinde?: string };
}

export function Clients({ initialFilters }: ClientsProps) {
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<ClientData | null>(null)
  
  // --- ESTADOS DE BUSCA ---
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchClients = async () => {
    setLoading(true)
    let query = supabase.from('clientes').select('*').order('created_at', { ascending: false })
    
    // Aplica filtros vindos do Dashboard (se houver)
    if (initialFilters?.socio) query = query.eq('socio', initialFilters.socio)
    if (initialFilters?.brinde) query = query.eq('tipo_brinde', initialFilters.brinde)

    const { data, error } = await query
    if (!error && data) {
        setClients(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [initialFilters])

  const handleSave = async (client: ClientData) => {
    try {
        if (clientToEdit) {
            // Edição
            const { error } = await supabase
                .from('clientes')
                .update(client)
                .eq('email', clientToEdit.email) // Usando email como chave por enquanto (ideal seria ID)
            if (error) throw error
        } else {
            // Criação
            const { error } = await supabase.from('clientes').insert([client])
            if (error) throw error
        }
        setIsModalOpen(false)
        setClientToEdit(null)
        fetchClients()
    } catch (error) {
        console.error('Erro ao salvar:', error)
        alert('Erro ao salvar cliente.')
    }
  }

  const handleDelete = async (client: ClientData) => {
    if (confirm(`Tem certeza que deseja excluir ${client.nome}?`)) {
        const { error } = await supabase.from('clientes').delete().eq('email', client.email)
        if (!error) fetchClients()
    }
  }

  const openEditModal = (client: ClientData) => {
    setClientToEdit(client)
    setIsModalOpen(true)
  }

  const openNewModal = () => {
    setClientToEdit(null)
    setIsModalOpen(true)
  }

  // --- LÓGICA DE FILTRAGEM (SEARCH ANYTHING) ---
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    return (
        (client.nome?.toLowerCase() || '').includes(searchLower) ||
        (client.empresa?.toLowerCase() || '').includes(searchLower) ||
        (client.email?.toLowerCase() || '').includes(searchLower) ||
        (client.cargo?.toLowerCase() || '').includes(searchLower) ||
        (client.cidade?.toLowerCase() || '').includes(searchLower) ||
        (client.socio?.toLowerCase() || '').includes(searchLower)
    );
  });

  if (loading) return (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#112240]"></div>
    </div>
  )

  return (
    <div className="space-y-6">
      
      {/* HEADER DA PÁGINA COM BUSCA */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold text-[#112240]">Base de Clientes</h2>
                <p className="text-sm text-gray-500">
                    {filteredClients.length} registros encontrados
                    {initialFilters?.socio && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">Filtro: {initialFilters.socio}</span>}
                    {initialFilters?.brinde && <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">Filtro: {initialFilters.brinde}</span>}
                </p>
            </div>
            
            <div className="flex items-center gap-2">
                {/* Botão de Busca */}
                <button 
                    onClick={() => {
                        setIsSearchOpen(!isSearchOpen);
                        if(isSearchOpen) setSearchTerm(''); // Limpa ao fechar
                    }}
                    className={`p-2 rounded-lg transition-colors ${isSearchOpen ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 hover:text-[#112240] hover:bg-gray-50 border border-gray-200'}`}
                    title="Buscar na lista"
                >
                    {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
                </button>

                <button 
                    onClick={openNewModal}
                    className="flex items-center gap-2 bg-[#112240] hover:bg-[#1a3a6c] text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"
                >
                    <Plus className="h-4 w-4" /> 
                    <span className="hidden sm:inline">Novo Cliente</span>
                </button>
            </div>
        </div>

        {/* INPUT DESLIZANTE DE BUSCA */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSearchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Busque por nome, empresa, cidade, cargo ou sócio..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-blue-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#112240] placeholder:text-gray-400 shadow-sm"
                    autoFocus={isSearchOpen}
                />
            </div>
        </div>
      </div>

      {/* LISTA DE CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredClients.map((client) => (
            <div key={client.id || client.email} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group relative">
                
                {/* Cabeçalho do Card */}
                <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-[#112240] font-bold text-sm shrink-0 uppercase">
                            {client.nome?.substring(0,2) || 'CL'}
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-[#112240] truncate" title={client.nome}>{client.nome}</h3>
                            <p className="text-xs text-gray-500 truncate">{client.cargo} @ {client.empresa}</p>
                        </div>
                    </div>
                    
                    {/* Menu de Ações */}
                    <Menu as="div" className="relative ml-2">
                        <Menu.Button className="p-1 rounded-md text-gray-400 hover:text-[#112240] hover:bg-gray-50">
                            <MoreHorizontal className="h-5 w-5" />
                        </Menu.Button>
                        <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                            <Menu.Items className="absolute right-0 mt-1 w-32 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                                <div className="py-1">
                                    <Menu.Item>{({ active }) => (<button onClick={() => openEditModal(client)} className={`${active ? 'bg-gray-50' : ''} group flex w-full items-center px-4 py-2 text-sm text-gray-700`}>Editar</button>)}</Menu.Item>
                                    <Menu.Item>{({ active }) => (<button onClick={() => handleDelete(client)} className={`${active ? 'bg-red-50 text-red-600' : ''} group flex w-full items-center px-4 py-2 text-sm text-red-600`}>Excluir</button>)}</Menu.Item>
                                </div>
                            </Menu.Items>
                        </Transition>
                    </Menu>
                </div>

                {/* Tags e Info */}
                <div className="space-y-2 mb-4">
                    <div className="flex flex-wrap gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide
                            ${client.tipoBrinde === 'Brinde VIP' ? 'bg-purple-100 text-purple-700' : 
                              client.tipoBrinde === 'Não Recebe' ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-700'}`}>
                            {client.tipoBrinde || 'Brinde Médio'}
                        </span>
                        {client.socio && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-orange-50 text-orange-700 border border-orange-100 uppercase tracking-wide">
                                Sócio: {client.socio}
                            </span>
                        )}
                    </div>
                </div>

                {/* Detalhes de Contato */}
                <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs text-gray-600">
                    {client.cidade && (
                        <div className="flex items-center gap-2">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{client.cidade}/{client.estado}</span>
                        </div>
                    )}
                    {client.email && (
                        <div className="flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            <span className="truncate">{client.email}</span>
                        </div>
                    )}
                    {client.telefone && (
                        <div className="flex items-center gap-2">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            <span>{client.telefone}</span>
                        </div>
                    )}
                </div>

            </div>
        ))}
      </div>

      {/* Empty State da Busca */}
      {filteredClients.length === 0 && (
          <div className="text-center py-12 text-gray-400">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>Nenhum cliente encontrado com os termos atuais.</p>
          </div>
      )}

      <NewClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave}
        clientToEdit={clientToEdit}
      />
    </div>
  )
}
