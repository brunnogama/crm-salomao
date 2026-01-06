import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, X, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { NewClientModal, ClientData } from './NewClientModal' // Importando a tipagem correta
import { logAction } from '../lib/logger'

interface Client extends ClientData {
  id: number;
}

export function IncompleteClients() {
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState<Client[]>([])
  
  // Estado para edição
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null)

  const fetchClients = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('clientes').select('*')
    if (error) {
      console.error('Erro ao buscar clientes:', error)
    } else {
      // Mapeamento correto com os novos campos
      const formattedClients: Client[] = data.map((item: any) => ({
        id: item.id,
        nome: item.nome,
        empresa: item.empresa,
        cargo: item.cargo,
        telefone: item.telefone,
        tipoBrinde: item.tipo_brinde,
        outroBrinde: item.outro_brinde,
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
        ignored_fields: item.ignored_fields || [], // Garante array vazio se for null
        historico_brindes: item.historico_brindes || [] // Garante array vazio se for null
      }))

      // Filtra apenas os incompletos
      const incomplete = formattedClients.filter(c => {
        const ignored = c.ignored_fields || []
        const missing = []
        if (!c.nome) missing.push('Nome')
        if (!c.empresa) missing.push('Empresa')
        if (!c.cargo) missing.push('Cargo')
        if (!c.tipoBrinde) missing.push('Tipo Brinde')
        if (!c.cep) missing.push('CEP')
        if (!c.endereco) missing.push('Endereço')
        if (!c.numero) missing.push('Número')
        if (!c.bairro) missing.push('Bairro')
        if (!c.cidade) missing.push('Cidade')
        if (!c.estado) missing.push('UF')
        if (!c.email) missing.push('Email')
        if (!c.socio) missing.push('Sócio')
        
        return missing.filter(f => !ignored.includes(f)).length > 0
      })
      
      setClients(incomplete)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const handleEdit = (client: Client) => {
    setClientToEdit(client)
    setIsModalOpen(true)
  }

  const handleIgnoreField = async (client: Client, field: string) => {
    const newIgnored = [...(client.ignored_fields || []), field]
    
    // Atualiza localmente para feedback instantâneo
    const updatedClient = { ...client, ignored_fields: newIgnored }
    
    // Verifica se ainda está incompleto
    const missing = []
    if (!updatedClient.nome) missing.push('Nome')
    if (!updatedClient.empresa) missing.push('Empresa')
    if (!updatedClient.cargo) missing.push('Cargo')
    if (!updatedClient.tipoBrinde) missing.push('Tipo Brinde')
    if (!updatedClient.cep) missing.push('CEP')
    if (!updatedClient.endereco) missing.push('Endereço')
    if (!updatedClient.numero) missing.push('Número')
    if (!updatedClient.bairro) missing.push('Bairro')
    if (!updatedClient.cidade) missing.push('Cidade')
    if (!updatedClient.estado) missing.push('UF')
    if (!updatedClient.email) missing.push('Email')
    if (!updatedClient.socio) missing.push('Sócio')
    
    const isStillIncomplete = missing.filter(f => !newIgnored.includes(f)).length > 0

    // Se estiver completo agora, remove da lista local
    if (!isStillIncomplete) {
        setClients(prev => prev.filter(c => c.id !== client.id))
    } else {
        // Se não, atualiza a lista local com o novo ignored_fields
        setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c))
    }

    // Salva no banco
    await supabase.from('clientes').update({ ignored_fields: newIgnored }).eq('id', client.id)
  }

  const handleSaveClient = async (clientData: ClientData) => {
    if (!clientToEdit) return

    const dbData = {
      nome: clientData.nome,
      empresa: clientData.empresa,
      cargo: clientData.cargo,
      telefone: clientData.telefone,
      tipo_brinde: clientData.tipoBrinde,
      outro_brinde: clientData.outroBrinde,
      quantidade: clientData.quantidade,
      cep: clientData.cep,
      endereco: clientData.endereco,
      numero: clientData.numero,
      complemento: clientData.complemento,
      bairro: clientData.bairro,
      cidade: clientData.cidade,
      estado: clientData.estado,
      email: clientData.email,
      socio: clientData.socio,
      observacoes: clientData.observacoes,
      ignored_fields: clientData.ignored_fields,
      historico_brindes: clientData.historico_brindes
    }

    try {
      const { error } = await supabase.from('clientes').update(dbData).eq('id', clientToEdit.id)
      if (error) throw error
      await logAction('EDITAR', 'INCOMPLETOS', `Atualizou cadastro incompleto: ${clientData.nome}`)
      await fetchClients() // Recarrega para ver se saiu da lista
      setIsModalOpen(false)
      setClientToEdit(null)
    } catch (error: any) {
      alert(`Erro ao salvar: ${error.message}`)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Tem certeza que deseja excluir este cadastro?')) {
      await supabase.from('clientes').delete().eq('id', id)
      await logAction('EXCLUIR', 'INCOMPLETOS', `Excluiu cadastro ID: ${id}`)
      fetchClients()
    }
  }

  const getMissingFields = (client: Client) => {
    const ignored = client.ignored_fields || []
    const missing = []
    
    if (!client.nome) missing.push('Nome')
    if (!client.empresa) missing.push('Empresa')
    if (!client.cargo) missing.push('Cargo')
    if (!client.tipoBrinde) missing.push('Tipo Brinde')
    if (!client.cep) missing.push('CEP')
    if (!client.endereco) missing.push('Endereço')
    if (!client.numero) missing.push('Número')
    if (!client.bairro) missing.push('Bairro')
    if (!client.cidade) missing.push('Cidade')
    if (!client.estado) missing.push('UF')
    if (!client.email) missing.push('Email')
    if (!client.socio) missing.push('Sócio')
    
    return missing.filter(f => !ignored.includes(f))
  }

  return (
    <div className="h-full flex flex-col">
      <NewClientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSaveClient} 
        clientToEdit={clientToEdit} 
      />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-red-100 rounded-lg text-red-600"><AlertTriangle className="h-6 w-6" /></div>
        <div>
           <h2 className="text-xl font-bold text-[#112240]">Cadastros Incompletos</h2>
           <p className="text-sm text-gray-500">Estes clientes possuem campos obrigatórios vazios.</p>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white rounded-xl border border-gray-200 shadow-sm">
        {loading ? (
           <div className="flex h-full items-center justify-center text-gray-400">Carregando...</div>
        ) : clients.length === 0 ? (
           <div className="flex flex-col h-full items-center justify-center text-gray-400 gap-2">
             <CheckCircle className="h-12 w-12 text-green-500" />
             <p className="font-medium text-gray-600">Tudo certo! Nenhum cadastro incompleto.</p>
           </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Campos Faltantes</th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clients.map(client => (
                <tr key={client.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">{client.nome || 'Sem Nome'}</div>
                    <div className="text-xs text-gray-500">{client.empresa}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      {getMissingFields(client).map(field => (
                        <span key={field} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 border border-red-200">
                          {field}
                          <button 
                            onClick={() => handleIgnoreField(client, field)}
                            className="ml-1.5 text-red-600 hover:text-red-900 focus:outline-none"
                            title="Ignorar este campo"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(client)} className="text-blue-600 hover:text-blue-900 bg-blue-50 p-2 rounded-lg"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:text-red-900 bg-red-50 p-2 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}