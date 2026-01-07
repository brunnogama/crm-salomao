import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, Pencil, XCircle, Search, X } from 'lucide-react'
import { NewClientModal, ClientData } from './NewClientModal'

export function IncompleteClients() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<ClientData | null>(null)
  
  // --- ESTADOS DE BUSCA ---
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Campos obrigatórios
  const REQUIRED_FIELDS = [
    { key: 'nome', label: 'Nome' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'tipo_brinde', label: 'Tipo Brinde' },
    { key: 'cep', label: 'CEP' },
    { key: 'endereco', label: 'Endereço' },
    { key: 'numero', label: 'Número' },
    { key: 'bairro', label: 'Bairro' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'estado', label: 'UF' },
    { key: 'email', label: 'Email' },
    { key: 'socio', label: 'Sócio' }
  ]

  const fetchIncompleteClients = async () => {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*')
    
    if (data) {
      const incomplete = data.filter((c: any) => {
        const ignored = c.ignored_fields || []
        
        // Verifica se tem campos vazios que NÃO estão na lista de ignorados
        const hasMissing = REQUIRED_FIELDS.some(field => {
           const value = c[field.key]
           const isEmpty = !value || value.toString().trim() === ''
           const isIgnored = ignored.includes(field.label)
           return isEmpty && !isIgnored
        })

        return hasMissing
      })
      setClients(incomplete)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchIncompleteClients()
  }, [])

  const handleEdit = (client: ClientData) => {
    setClientToEdit(client)
    setIsModalOpen(true)
  }

  const handleSave = async (updatedClient: ClientData) => {
    try {
        const { error } = await supabase
            .from('clientes')
            .update(updatedClient)
            .eq('email', clientToEdit?.email || updatedClient.email)
        
        if (error) throw error
        
        setIsModalOpen(false)
        setClientToEdit(null)
        fetchIncompleteClients()
    } catch (err) {
        console.error("Erro ao atualizar:", err)
    }
  }

  const handleIgnore = async (client: any) => {
    if(!confirm("Deseja marcar este cadastro como 'Completo' ignorando os campos vazios atuais?")) return;

    const missingFields = REQUIRED_FIELDS
        .filter(field => !client[field.key])
        .map(field => field.label);
    
    const currentIgnored = client.ignored_fields || [];
    const newIgnored = [...new Set([...currentIgnored, ...missingFields])];

    const { error } = await supabase
        .from('clientes')
        .update({ ignored_fields: newIgnored })
        .eq('id', client.id);

    if (!error) fetchIncompleteClients();
  }

  // --- LÓGICA DE FILTRAGEM (SEARCH ANYTHING) ---
  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    
    return (
        (client.nome?.toLowerCase() || '').includes(searchLower) ||
        (client.empresa?.toLowerCase() || '').includes(searchLower) ||
        (client.email?.toLowerCase() || '').includes(searchLower) ||
        (client.socio?.toLowerCase() || '').includes(searchLower)
    );
  });

  if (loading) return (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#112240]"></div>
    </div>
  )

  return (
    <>
      {/* HEADER E BUSCA */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#112240] flex items-center gap-2">
                Cadastros Incompletos
                <span className="bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">{filteredClients.length}</span>
            </h2>
            
            <button 
                onClick={() => {
                    setIsSearchOpen(!isSearchOpen);
                    if(isSearchOpen) setSearchTerm(''); 
                }}
                className={`p-2 rounded-lg transition-colors ${isSearchOpen ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 hover:text-[#112240] hover:bg-gray-50 border border-gray-200'}`}
                title="Buscar na lista"
            >
                {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
            </button>
        </div>

        {/* INPUT DESLIZANTE */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isSearchOpen ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input 
                    type="text" 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar pendências por nome, empresa..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-red-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 text-[#112240] placeholder:text-gray-400 shadow-sm"
                    autoFocus={isSearchOpen}
                />
            </div>
        </div>
      </div>

      {/* LISTAGEM */}
      {filteredClients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <CheckCircle className="h-10 w-10 mb-2 text-green-500" />
            <p className="font-medium">
                {searchTerm ? 'Nenhuma pendência encontrada com este termo.' : 'Tudo certo! Nenhum cadastro pendente.'}
            </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
            {filteredClients.map((client: any) => {
                const missing = REQUIRED_FIELDS
                    .filter(f => (!client[f.key] && !(client.ignored_fields || []).includes(f.label)))
                    .map(f => f.label)

                return (
                    <div key={client.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 group border-l-4 border-l-red-400">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-bold text-[#112240] text-lg">{client.nome || 'Sem Nome'}</h3>
                                {client.empresa && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{client.empresa}</span>}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {missing.map(field => (
                                    <span key={field} className="text-[10px] font-bold uppercase tracking-wider text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100">
                                        Falta: {field}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-gray-100">
                            <button 
                                onClick={() => handleIgnore(client)}
                                className="px-3 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-colors"
                                title="Ignorar pendências deste cliente"
                            >
                                <XCircle className="h-4 w-4" />
                                <span className="hidden md:inline">Ignorar</span>
                            </button>
                            <button 
                                onClick={() => handleEdit(client)}
                                className="px-4 py-2 bg-[#112240] text-white text-sm font-bold rounded-lg hover:bg-[#1a3a6c] flex items-center gap-2 shadow-sm transition-all"
                            >
                                <Pencil className="h-4 w-4" />
                                Resolver
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
      )}

      <NewClientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        clientToEdit={clientToEdit}
      />
    </>
  )
}