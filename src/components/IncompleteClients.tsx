import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { CheckCircle, Pencil, XCircle } from 'lucide-react' // AlertTriangle removido
import { NewClientModal, ClientData } from './NewClientModal'

export function IncompleteClients() {
  const [clients, setClients] = useState<ClientData[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<ClientData | null>(null)

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

  if (loading) return (
    <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#112240]"></div>
    </div>
  )

  return (
    <>
      {clients.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <CheckCircle className="h-10 w-10 mb-2 text-green-500" />
            <p className="font-medium">Tudo certo! Nenhum cadastro pendente.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
            {clients.map((client: any) => {
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
