import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { AlertCircle, ArrowRight, RefreshCcw, X } from 'lucide-react';

export function IncompleteClients() {
  const [pendings, setPendings] = useState<any[]>([]);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const fetchPendings = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .or('tipo_brinde.is.null,socio.is.null,telefone.is.null');
    if (data) setPendings(data);
  };

  useEffect(() => { fetchPendings(); }, []);

  return (
    <div className="h-full flex flex-col space-y-6 animate-fadeIn pb-10">
      <div className="bg-white/70 backdrop-blur-md p-6 rounded-[2rem] border border-white/40 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-2xl text-red-600 shadow-lg shadow-red-100/50">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="font-black text-[#112240] text-lg">Pendências de Cadastro</h3>
        </div>
        <button onClick={fetchPendings} className="flex items-center gap-2 bg-white border border-gray-100 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-gray-50 transition-all">
          <RefreshCcw className="h-4 w-4" /> ATUALIZAR
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-lg rounded-[2.5rem] border border-white/60 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cliente</th>
                <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Campos Faltantes</th>
                <th className="px-8 py-5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pendings.map((client) => (
                <tr key={client.id} onClick={() => setSelectedClient(client)} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                  <td className="px-8 py-5">
                    <p className="text-sm font-bold text-gray-800">{client.nome}</p>
                    <p className="text-[10px] text-gray-400 font-medium">{client.email || 'E-mail ausente'}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-wrap gap-2 justify-center">
                      {!client.tipo_brinde && <span className="bg-red-50 text-red-600 text-[8px] font-black px-2.5 py-1 rounded-full border border-red-100">BRINDE</span>}
                      {!client.telefone && <span className="bg-amber-50 text-amber-600 text-[8px] font-black px-2.5 py-1 rounded-full border border-amber-100">TELEFONE</span>}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right"><ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-blue-600" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClient && (
        <div className="fixed inset-0 bg-[#112240]/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/90 backdrop-blur-xl w-full max-w-md rounded-[3rem] shadow-2xl border border-white overflow-hidden animate-scaleIn">
            <div className="bg-red-600 p-8 text-white flex justify-between items-center">
              <h2 className="text-xl font-black">{selectedClient.nome}</h2>
              <button onClick={() => setSelectedClient(null)}><X className="h-6 w-6" /></button>
            </div>
            <div className="p-10 text-center">
               <p className="text-gray-500 mb-6">Este cadastro possui informações pendentes.</p>
               <button className="bg-[#112240] text-white px-8 py-4 rounded-2xl font-black text-xs shadow-xl hover:bg-black transition-all">CORRIGIR AGORA</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
