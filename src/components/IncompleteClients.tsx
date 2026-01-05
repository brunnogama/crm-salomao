import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, ArrowRight, RefreshCcw, ListFilter, SortAsc, Download } from 'lucide-react';

export function IncompleteClients() {
  const [pendings, setPendings] = useState<any[]>([]);

  const fetchPendings = async () => {
    const { data } = await supabase.from('clientes').select('*').or('tipo_brinde.is.null,socio.is.null,telefone.is.null');
    if (data) setPendings(data);
  };

  useEffect(() => { fetchPendings(); }, []);

  return (
    <div className="h-full flex flex-col space-y-6 animate-fadeIn">
      {/* Header com UX Consistente */}
      <div className="bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white/40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-2xl text-red-600 shadow-lg shadow-red-100/50"><AlertCircle className="h-6 w-6" /></div>
          <h3 className="font-black text-[#112240] text-lg">Pendências de Cadastro</h3>
        </div>
        <div className="flex gap-3">
          <button className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 flex items-center gap-2 text-xs font-bold text-gray-500"><ListFilter className="h-4 w-4" /> Brinde: Todos</button>
          <button className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 flex items-center gap-2 text-xs font-bold text-gray-500"><SortAsc className="h-4 w-4" /> Nome</button>
          <button onClick={fetchPendings} className="p-2.5 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition-all"><RefreshCcw className="h-4 w-4 text-gray-500" /></button>
          <button className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-emerald-200 flex items-center gap-2"><Download className="h-4 w-4" /> Exportar Pendentes</button>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-lg rounded-[2.5rem] border border-white/60 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sócio</th>
              <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Pendências</th>
              <th className="px-8 py-5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pendings.map((client) => (
              <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                <td className="px-8 py-5"><p className="text-sm font-bold text-gray-800">{client.nome}</p></td>
                <td className="px-8 py-5"><span className="text-[10px] font-black text-[#112240] bg-white border border-gray-100 px-3 py-1 rounded-lg">{client.socio || 'N/A'}</span></td>
                <td className="px-8 py-5"><div className="flex flex-wrap gap-2 justify-center">{!client.tipo_brinde && <span className="bg-red-50 text-red-600 text-[8px] font-black px-2.5 py-1 rounded-full border border-red-100">ESPEC. BRINDE</span>}</div></td>
                <td className="px-8 py-5 text-right"><ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
