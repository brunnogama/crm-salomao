import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, Phone, MapPin, Plus, Search, Download, RefreshCcw, Pencil, Trash2, X, Mail, Gift, Save, Globe } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Client {
  id: string;
  nome: string;
  telefone: string;
  socio: string;
  tipo_brinde: string;
  uf: string;
  cidade: string;
  email: string;
  status: string;
}

export function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    socio: '',
    tipo_brinde: 'Brinde Médio',
    uf: 'SP',
    cidade: '',
    status: 'prospect'
  });

  const fetchClients = async () => {
    const { data } = await supabase.from('clientes').select('*').order('nome');
    if (data) setClients(data as Client[]);
  };

  useEffect(() => { fetchClients(); }, []);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClient) {
      const { error } = await supabase.from('clientes').update(formData).eq('id', editingClient.id);
      if (!error) {
        setIsFormOpen(false);
        setEditingClient(null);
        fetchClients();
      }
    } else {
      const { error } = await supabase.from('clientes').insert([formData]);
      if (!error) {
        setIsFormOpen(false);
        fetchClients();
      }
    }
  };

  const openEditForm = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setFormData({
      nome: client.nome || '',
      email: client.email || '',
      telefone: client.telefone || '',
      socio: client.socio || '',
      tipo_brinde: client.tipo_brinde || 'Brinde Médio',
      uf: client.uf || 'SP',
      cidade: client.cidade || '',
      status: client.status || 'prospect'
    });
    setIsFormOpen(true);
  };

  const openNewForm = () => {
    setEditingClient(null);
    setFormData({ nome: '', email: '', telefone: '', socio: '', tipo_brinde: 'Brinde Médio', uf: 'SP', cidade: '', status: 'prospect' });
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Deseja realmente excluir este cliente?')) {
      await supabase.from('clientes').delete().eq('id', id);
      fetchClients();
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(clients);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Clientes");
    XLSX.writeFile(workbook, "Relatorio_Clientes.xlsx");
  };

  const filteredClients = clients.filter(c => 
    c.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col space-y-6 pb-10">
      {/* Toolbar conforme print image_aaad41.png */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 items-center flex-1 min-w-[300px]">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchClients} className="p-2.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all shadow-sm">
            <RefreshCcw className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={exportToExcel} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-sm">
            <Download className="h-4 w-4" /> EXPORTAR XLS
          </button>
          <button onClick={openNewForm} className="flex items-center gap-2 bg-[#112240] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black shadow-sm">
            <Plus className="h-4 w-4" /> NOVO CLIENTE
          </button>
        </div>
      </div>

      {/* Grid conforme print image_aaad41.png */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {filteredClients.map((client) => (
          <div key={client.id} onClick={() => setSelectedClient(client)} className="group bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="h-10 w-10 bg-gray-50 text-[#112240] flex items-center justify-center rounded-xl font-bold border border-gray-100">{client.nome?.charAt(0)}</div>
              <div className="flex flex-col items-end gap-2">
                <span className={`text-[9px] font-black px-2.5 py-1 rounded-full border tracking-wider ${
                    client.tipo_brinde === 'Brinde VIP' ? 'text-purple-600 bg-purple-50 border-purple-100' : 
                    client.tipo_brinde === 'Brinde Médio' ? 'text-green-600 bg-green-50 border-green-100' : 'text-slate-500 bg-slate-50 border-slate-100'
                }`}>
                  {client.tipo_brinde?.toUpperCase() || 'OUTRO'}
                </span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={(e) => openEditForm(client, e)} className="p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-blue-600 rounded-md shadow-sm"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={(e) => handleDelete(client.id, e)} className="p-1.5 bg-white border border-gray-200 text-gray-400 hover:text-red-600 rounded-md shadow-sm"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
            <h4 className="font-bold text-[#112240] text-sm mb-3 truncate">{client.nome}</h4>
            <div className="space-y-2 text-xs text-gray-500">
              <p className="flex items-center gap-2"><User className="h-3 w-3" /> {client.socio || 'Pendente'}</p>
              <p className="flex items-center gap-2"><Phone className="h-3 w-3" /> {client.telefone || 'Pendente'}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Novo/Editar conforme print image_aaad7b.png */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 animate-scaleIn">
            <div className="bg-[#112240] p-6 text-white flex justify-between items-center">
              <h3 className="font-bold">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="hover:bg-white/10 rounded-lg p-1"><X className="h-5 w-5" /></button>
            </div>
            <form onSubmit={handleSaveClient} className="p-8 space-y-6">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Nome Completo</label>
                <input required type="text" className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500 text-sm" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Telefone</label>
                  <input type="text" className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500 text-sm" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Sócio</label>
                  <input type="text" className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500 text-sm" value={formData.socio} onChange={e => setFormData({...formData, socio: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">E-mail</label>
                <input type="email" className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500 text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Cidade</label>
                  <input type="text" className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500 text-sm" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">UF</label>
                  <input type="text" maxLength={2} className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500 text-sm uppercase" value={formData.uf} onChange={e => setFormData({...formData, uf: e.target.value.toUpperCase()})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Tipo de Brinde</label>
                    <select className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500 text-sm bg-transparent" value={formData.tipo_brinde} onChange={e => setFormData({...formData, tipo_brinde: e.target.value})}>
                    <option value="Brinde VIP">Brinde VIP</option>
                    <option value="Brinde Médio">Brinde Médio</option>
                    <option value="Outro">Outro</option>
                    </select>
                </div>
                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Status</label>
                    <select className="w-full border-b border-gray-200 py-2 outline-none focus:border-blue-500 text-sm bg-transparent" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}>
                    <option value="prospect">Prospect</option>
                    <option value="contatado">Contatado</option>
                    <option value="entregue">Entregue</option>
                    <option value="cancelado">Cancelado</option>
                    </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-xs mt-4 flex items-center justify-center gap-2 hover:bg-blue-700 shadow-lg transition-all">
                <Save className="h-4 w-4" /> SALVAR DADOS
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalhes conforme print image_aaad5d.png */}
      {selectedClient && !isFormOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 animate-scaleIn">
            <div className="bg-[#112240] p-8 text-white flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">{selectedClient.nome}</h2>
              <button onClick={() => setSelectedClient(null)} className="hover:bg-white/10 rounded-lg p-1"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-10 grid grid-cols-2 gap-y-8 gap-x-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700 truncate">{selectedClient.email || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Gift className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{selectedClient.tipo_brinde}</span>
              </div>
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{selectedClient.socio || 'Pendente'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{selectedClient.cidade || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{selectedClient.telefone || 'Não informado'}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-700">{selectedClient.uf || 'UF'}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
