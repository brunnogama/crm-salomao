import { useState, useEffect, useMemo } from 'react'
import { LayoutList, LayoutGrid, Pencil, X, RefreshCw, Briefcase, Mail, Gift, Info, ChevronDown, ArrowUpDown, FileSpreadsheet, Filter, EyeOff, Trash2, Ban, Printer } from 'lucide-react'
import { NewClientModal, ClientData } from './NewClientModal'
import { utils, writeFile } from 'xlsx'
import { supabase } from '../lib/supabase'
import { logAction } from '../lib/logger'

interface Client extends ClientData {
  id: number;
  ignored_fields?: string[];
}

export function IncompleteClients() {
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const [socioFilter, setSocioFilter] = useState('')
  const [brindeFilter, setBrindeFilter] = useState('')
  const [sortBy, setSortBy] = useState<'nome' | 'socio' | null>('nome')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const [incompleteClients, setIncompleteClients] = useState<Client[]>([])

  // Lógica rigorosa de pendências (exceto o que foi dispensado)
  const getMissingFields = (client: Client) => {
    const ignored = client.ignored_fields || [];
    const missing: string[] = []

    if (!client.nome) missing.push('Nome')
    if (!client.empresa) missing.push('Empresa')
    if (!client.cargo) missing.push('Cargo')
    // Telefone não é obrigatório para lista de incompletos
    if (!client.tipoBrinde) missing.push('Tipo Brinde')
    if (!client.cep) missing.push('CEP')
    if (!client.endereco) missing.push('Endereço')
    if (!client.numero) missing.push('Número')
    if (!client.bairro) missing.push('Bairro')
    if (!client.cidade) missing.push('Cidade')
    if (!client.estado) missing.push('UF')
    if (!client.email) missing.push('Email')
    if (!client.socio) missing.push('Sócio')
    
    return missing.filter(field => !ignored.includes(field));
  }

  const fetchIncompleteClients = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('clientes').select('*')

    if (error) {
      console.error('Erro ao buscar:', error)
    } else {
      const formatted: Client[] = data.map((item: any) => ({
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
        ignored_fields: item.ignored_fields || []
      }))
      const incomplete = formatted.filter(c => getMissingFields(c).length > 0)
      setIncompleteClients(incomplete)
    }
    setLoading(false)
  }

  useEffect(() => { fetchIncompleteClients() }, [])

  const handleDismissField = async (client: Client, field: string) => {
    if (!confirm(`Deseja dispensar a pendência de "${field}" para este cliente?`)) return;

    const currentIgnored = client.ignored_fields || [];
    const newIgnored = [...currentIgnored, field];

    const { error } = await supabase
      .from('clientes')
      .update({ ignored_fields: newIgnored })
      .eq('id', client.id);

    if (error) {
      alert('Erro ao atualizar. Tente novamente.');
    } else {
      await logAction('EDITAR', 'INCOMPLETOS', `Dispensou campo '${field}' de: ${client.nome}`);
      fetchIncompleteClients();
      if(selectedClient?.id === client.id) setSelectedClient(null);
    }
  }

  const handleDiscardClient = async (client: Client, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!confirm(`Deseja realmente DESCARTAR este cliente da lista de incompletos?\n\nEle continuará salvo no sistema com os dados atuais, mas não será mais cobrado o preenchimento.\n\nEsta ação é definitiva para este módulo.`)) return;

    const missing = getMissingFields(client);
    const currentIgnored = client.ignored_fields || [];
    const newIgnored = Array.from(new Set([...currentIgnored, ...missing]));

    const { error } = await supabase
      .from('clientes')
      .update({ ignored_fields: newIgnored })
      .eq('id', client.id);

    if (error) {
      alert('Erro ao descartar cliente.');
    } else {
      await logAction('EDITAR', 'INCOMPLETOS', `Descartou da lista de pendências: ${client.nome}`);
      fetchIncompleteClients();
      if (selectedClient?.id === client.id) setSelectedClient(null);
    }
  }

  // --- IMPRESSÃO INDIVIDUAL ---
  const handlePrint = (client: Client) => {
    const printWindow = window.open('', '', 'width=900,height=800');
    if (!printWindow) return;

    const missing = getMissingFields(client).join(', ');

    const htmlContent = `
      <html>
        <head>
          <title>Ficha de Pendências - ${client.nome}</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 40px; color: #1f2937; }
            .header { border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: end; }
            .logo { font-size: 28px; font-weight: 800; color: #dc2626; text-transform: uppercase; }
            .subtitle { font-size: 14px; color: #6b7280; font-weight: 500; }
            .alert-box { background: #fef2f2; border: 1px solid #fee2e2; color: #991b1b; padding: 15px; border-radius: 6px; margin-bottom: 20px; font-weight: bold; }
            .section { margin-bottom: 35px; }
            .section-title { font-size: 13px; font-weight: 700; text-transform: uppercase; color: #111; background: #f3f4f6; padding: 8px 12px; border-radius: 4px; margin-bottom: 15px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .label { font-size: 10px; color: #6b7280; font-weight: 700; text-transform: uppercase; display: block; margin-bottom: 4px; }
            .value { font-size: 15px; color: #111827; font-weight: 500; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; display: block; width: 100%; min-height: 24px; }
            @media print { @page { margin: 0; size: A4; } body { margin: 1.6cm; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div><div class="logo">Cadastro Incompleto</div><div class="subtitle">Relatório de Pendências</div></div>
            <div><div class="date">${new Date().toLocaleDateString()}</div></div>
          </div>
          <div class="alert-box">CAMPOS FALTANTES: ${missing}</div>
          <div class="section"><div class="section-title">Dados Atuais</div><div class="grid"><div class="field-box"><span class="label">Nome</span><span class="value">${client.nome}</span></div><div class="field-box"><span class="label">Sócio</span><span class="value">${client.socio || '-'}</span></div><div class="field-box"><span class="label">Empresa</span><span class="value">${client.empresa || '-'}</span></div><div class="field-box"><span class="label">Email</span><span class="value">${client.email || '-'}</span></div></div></div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
        </body>
      </html>`;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  // --- IMPRESSÃO EM LISTA (NOVA) ---
  const handlePrintList = () => {
    if (filteredClients.length === 0) {
        alert("Nenhum cliente na lista para imprimir.");
        return;
    }

    const printWindow = window.open('', '', 'width=900,height=800');
    if (!printWindow) return;

    const clientsHtml = filteredClients.map(client => {
        const missing = getMissingFields(client).join(', ');
        return `
      <div class="card">
        <div class="card-header">
            <span class="name">${client.nome || 'Sem Nome'}</span>
            <span class="socio">${client.socio || '-'}</span>
        </div>
        <div class="card-body">
            <div class="row"><strong>Empresa:</strong> ${client.empresa || '-'}</div>
            <div class="row missing"><strong>Falta:</strong> ${missing}</div>
        </div>
      </div>
    `}).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Lista de Incompletos</title>
          <style>
            body { font-family: 'Segoe UI', sans-serif; padding: 20px; background: #fff; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #dc2626; padding-bottom: 10px; }
            .title { font-size: 20px; font-weight: 800; color: #dc2626; text-transform: uppercase; }
            .meta { font-size: 12px; color: #666; margin-top: 5px; }
            
            .grid-container { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
            .card { border: 1px solid #fee2e2; border-radius: 6px; padding: 10px; page-break-inside: avoid; background: #fff; }
            .card-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #fee2e2; padding-bottom: 5px; margin-bottom: 8px; }
            .name { font-weight: 800; font-size: 14px; color: #991b1b; }
            .socio { font-size: 10px; background: #fee2e2; color: #991b1b; padding: 2px 6px; border-radius: 4px; font-weight: bold; }
            .card-body { font-size: 11px; color: #374151; }
            .row { margin-bottom: 3px; }
            .missing { color: #dc2626; font-weight: bold; margin-top: 5px; }
            
            @media print { @page { margin: 1cm; size: A4; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">Relatório de Incompletos</div>
            <div class="meta">Total: ${filteredClients.length} pendências | Gerado em: ${new Date().toLocaleDateString()}</div>
          </div>
          <div class="grid-container">${clientsHtml}</div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); };</script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    logAction('EXPORTAR', 'INCOMPLETOS', `Imprimiu lista de ${filteredClients.length} incompletos`);
  }

  const handleExportExcel = () => {
    const dataToExport = filteredClients.map(client => ({
      "Nome": client.nome,
      "Empresa": client.empresa,
      "Sócio": client.socio,
      "Pendências": getMissingFields(client).join(', ')
    }))
    const ws = utils.json_to_sheet(dataToExport)
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, "Pendências")
    writeFile(wb, "Relatorio_Incompletos_Salomao.xlsx")
    logAction('EXPORTAR', 'INCOMPLETOS', `Exportou ${dataToExport.length} cadastros incompletos`);
  }

  const handleEdit = (client: Client, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    setSelectedClient(null);
    setClientToEdit(client);
    setTimeout(() => setIsModalOpen(true), 10);
  }

  const handleDelete = async (client: Client, e?: React.MouseEvent) => {
    if(e) e.stopPropagation();
    if (confirm(`Tem certeza que deseja excluir permanentemente o cadastro de ${client.nome}?`)) {
        const { error } = await supabase.from('clientes').delete().eq('id', client.id);
        if (error) {
            alert('Erro ao excluir cliente.');
        } else {
            await logAction('EXCLUIR', 'INCOMPLETOS', `Removeu cliente permanentemente: ${client.nome}`);
            fetchIncompleteClients();
            if(selectedClient?.id === client.id) setSelectedClient(null);
        }
    }
  }

  const uniqueSocios = useMemo(() => Array.from(new Set(incompleteClients.map(c => c.socio).filter(Boolean))).sort(), [incompleteClients]);
  const uniqueBrindes = useMemo(() => Array.from(new Set(incompleteClients.map(c => c.tipoBrinde).filter(Boolean))).sort(), [incompleteClients]);

  const filteredClients = useMemo(() => {
    let result = [...incompleteClients].filter(client => {
      const matchesSocio = socioFilter ? client.socio === socioFilter : true
      const matchesBrinde = brindeFilter ? client.tipoBrinde === brindeFilter : true
      return matchesSocio && matchesBrinde
    })
    if (sortBy) {
      result.sort((a, b) => {
        const valA = (sortBy === 'nome' ? a.nome : a.socio) || ''
        const valB = (sortBy === 'nome' ? b.nome : b.socio) || ''
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      })
    }
    return result
  }, [incompleteClients, socioFilter, brindeFilter, sortBy, sortDirection])

  const toggleSort = (field: 'nome' | 'socio') => {
    if (sortBy === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDirection('asc'); }
  }

  return (
    <div className="h-full flex flex-col relative">
      <NewClientModal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setClientToEdit(null); }} onSave={fetchIncompleteClients} clientToEdit={clientToEdit} />

      {selectedClient && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-red-100 animate-scaleIn">
            <div className="bg-red-600 p-6 text-white flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold">!</div>
                <h2 className="text-xl font-bold">{selectedClient.nome || 'Cadastro Incompleto'}</h2>
              </div>
              <button onClick={() => setSelectedClient(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="h-6 w-6" /></button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-red-400 uppercase border-b pb-2">Pendências</h3>
                <div className="flex flex-col gap-2">
                  {getMissingFields(selectedClient).map(field => (
                    <div key={field} className="flex items-center justify-between p-2 bg-red-50 rounded border border-red-100">
                        <span className="text-xs font-bold text-red-800">{field}</span>
                        <button onClick={() => handleDismissField(selectedClient, field)} className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 bg-white px-2 py-1 rounded border border-gray-200 hover:shadow-sm transition-all" title="Ignorar esta pendência">
                            <EyeOff className="h-3 w-3" /> Dispensar
                        </button>
                    </div>
                  ))}
                </div>
                <p className="text-sm flex items-center gap-3 mt-4"><Briefcase className="h-4 w-4 text-gray-400" /> {selectedClient.empresa || '-'}</p>
                <p className="text-sm flex items-center gap-3"><Mail className="h-4 w-4 text-gray-400" /> {selectedClient.email || '-'}</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase border-b pb-2">Outros Dados</h3>
                <p className="text-sm flex items-center gap-3"><Gift className="h-4 w-4 text-gray-400" /> <strong>Brinde:</strong> {selectedClient.tipoBrinde || '-'}</p>
                <p className="text-sm flex items-center gap-3"><Info className="h-4 w-4 text-gray-400" /> <strong>Sócio:</strong> {selectedClient.socio || '-'}</p>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <button onClick={() => handlePrint(selectedClient)} className="px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-50 transition-all shadow-sm">
                <Printer className="h-4 w-4" /> Imprimir Ficha
              </button>
              <div className="flex gap-3">
                <button onClick={(e) => handleDiscardClient(selectedClient, e)} className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-gray-200 transition-all">
                    <Ban className="h-4 w-4" /> Descartar
                </button>
                <button onClick={(e) => handleDelete(selectedClient, e)} className="px-5 py-2.5 bg-red-100 text-red-700 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-red-200 transition-all">
                    <Trash2 className="h-4 w-4" /> Excluir
                </button>
                <button onClick={(e) => handleEdit(selectedClient, e)} className="px-5 py-2.5 bg-[#112240] text-white rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-black transition-all shadow-md">
                    <Pencil className="h-4 w-4" /> Completar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOOLBAR */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 px-1">
          {/* ... (Filtros e Botões de Visualização) ... */}
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Filter className="h-4 w-4" /></div>
            <select value={socioFilter} onChange={(e) => setSocioFilter(e.target.value)} className="appearance-none pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium min-w-[160px] outline-none">
              <option value="">Sócio: Todos</option>
              {uniqueSocios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronDown className="h-4 w-4" /></div>
          </div>
          <div className="relative group">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Filter className="h-4 w-4" /></div>
            <select value={brindeFilter} onChange={(e) => setBrindeFilter(e.target.value)} className="appearance-none pl-9 pr-10 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium min-w-[160px] outline-none">
              <option value="">Brinde: Todos</option>
              {uniqueBrindes.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><ChevronDown className="h-4 w-4" /></div>
          </div>
          <div className="flex bg-white border border-gray-200 rounded-lg p-1 gap-1 shadow-sm">
            <button onClick={() => toggleSort('nome')} className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${sortBy === 'nome' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}><ArrowUpDown className="h-3 w-3 mr-1" /> Nome</button>
            <button onClick={() => toggleSort('socio')} className={`flex items-center px-3 py-1.5 text-sm rounded-md transition-colors ${sortBy === 'socio' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}><ArrowUpDown className="h-3 w-3 mr-1" /> Sócio</button>
          </div>
          <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm">
            <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-gray-100 text-[#112240]' : 'text-gray-400'}`}><LayoutList className="h-5 w-5" /></button>
            <button onClick={() => setViewMode('card')} className={`p-1.5 rounded-md ${viewMode === 'card' ? 'bg-gray-100 text-[#112240]' : 'text-gray-400'}`}><LayoutGrid className="h-5 w-5" /></button>
          </div>
          <button onClick={fetchIncompleteClients} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 shadow-sm"><RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
        <div className="flex items-center gap-3 w-full xl:w-auto">
          {/* BOTÃO DE IMPRIMIR LISTA (NOVO) */}
          <button onClick={handlePrintList} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50" title="Imprimir Lista"><Printer className="h-5 w-5" /></button>
          <button onClick={handleExportExcel} className="flex-1 xl:flex-none flex items-center justify-center px-4 py-2.5 bg-green-600 text-white rounded-lg gap-2 font-medium text-sm transition-all hover:bg-green-700"><FileSpreadsheet className="h-5 w-5" /> Exportar</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto pb-4">
        {viewMode === 'list' ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-red-50/50 text-red-700 text-xs font-bold uppercase">
                <tr>
                  <th className="px-6 py-4 text-left">Cliente</th>
                  <th className="px-6 py-4 text-left">Empresa</th>
                  <th className="px-6 py-4 text-left">Sócio</th>
                  <th className="px-6 py-4 text-left">Pendências</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredClients.map(client => (
                  <tr key={client.id} onClick={() => setSelectedClient(client)} className="hover:bg-red-50/10 transition-colors cursor-pointer group">
                    <td className="px-6 py-4 font-bold text-gray-900">{client.nome || 'Sem Nome'}</td>
                    <td className="px-6 py-4 text-gray-600">{client.empresa || '-'}</td>
                    <td className="px-6 py-4 text-gray-600">{client.socio || '-'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {getMissingFields(client).map(f => (
                          <span key={f} className="px-2 py-0.5 text-[9px] font-bold bg-red-100 text-red-700 rounded border border-red-200 uppercase">{f}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={(e) => handleDiscardClient(client, e)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md transition-colors" title="Descartar da Lista">
                            <Ban className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => handleEdit(client, e)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar">
                            <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={(e) => handleDelete(client, e)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <div key={client.id} onClick={() => setSelectedClient(client)} className="bg-white rounded-xl shadow-sm border border-red-200 p-6 hover:shadow-md transition-all cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-10 w-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 font-bold border border-red-100">!</div>
                  <div>
                    <h3 className="font-bold text-gray-900 truncate">{client.nome || 'Sem Nome'}</h3>
                    <p className="text-xs text-gray-500">{client.empresa}</p>
                  </div>
                </div>
                <div className="bg-gray-50 p-2 rounded-md mb-3 text-xs">
                  <span className="text-gray-400">Sócio: </span><span className="font-bold text-gray-700">{client.socio}</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {getMissingFields(client).map(f => (
                    <span key={f} className="px-2 py-0.5 text-[10px] font-bold bg-red-50 text-red-700 rounded border border-red-200 uppercase">{f}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={(e) => handleDiscardClient(client, e)} className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-200" title="Descartar">
                        <Ban className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => handleEdit(client, e)} className="flex-1 py-2 bg-[#112240] text-white rounded-lg font-bold text-sm">Completar</button>
                    <button onClick={(e) => handleDelete(client, e)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100" title="Excluir">
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
