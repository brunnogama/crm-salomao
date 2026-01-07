import { useState } from 'react'
import { 
  LayoutDashboard, Users, CheckSquare, Settings, LogOut, 
  Menu, X, LayoutGrid, AlertTriangle 
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface CommonProps {
  userEmail?: string;
  activeTab?: string;
  setActiveTab?: (tab: string) => void;
}

// --- COMPONENTE 1: BARRA SUPERIOR (HEADER) ---
export function SidebarHeader({ userEmail }: CommonProps) {
  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  const handleSwitchModule = () => {
    window.location.reload()
  }

  return (
    <div className="h-16 bg-[#112240] text-white flex items-center justify-between px-4 lg:px-6 shadow-md z-20 shrink-0">
        
      {/* LADO ESQUERDO: Título + Botão Trocar */}
      <div className="flex items-center gap-4">
        {/* Logo/Título */}
        <div className="flex flex-col">
          <h1 className="text-lg font-bold leading-none tracking-tight">Salomão Manager</h1>
          <span className="text-[10px] text-gray-400 font-medium tracking-widest uppercase">Módulo Jurídico</span>
        </div>

        <div className="h-6 w-px bg-white/20 mx-2 hidden sm:block"></div>
        
        {/* Botão Trocar Módulo (Ao lado do nome) */}
        <button 
          onClick={handleSwitchModule}
          className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-xs font-bold transition-all"
          title="Voltar para seleção de módulos"
        >
          <LayoutGrid className="h-3.5 w-3.5 text-blue-300" />
          <span className="hidden sm:inline">Trocar Módulo</span>
        </button>
      </div>

      {/* LADO DIREITO: Usuário + Sair */}
      <div className="flex items-center gap-4">
        {userEmail && (
          <span className="hidden md:block text-xs text-gray-400 font-medium">
            {userEmail}
          </span>
        )}
        
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-200 rounded-lg text-xs font-bold transition-colors border border-red-500/20"
        >
          <LogOut className="h-4 w-4" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )
}

// --- COMPONENTE 2: MENU LATERAL (SIDEBAR) ---
export function Sidebar({ activeTab, setActiveTab }: CommonProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'kanban', label: 'Tarefas (Kanban)', icon: CheckSquare },
    { id: 'clientes', label: 'Base de Clientes', icon: Users },
    { id: 'incompletos', label: 'Cadastros Pendentes', icon: AlertTriangle },
    { id: 'config', label: 'Configurações', icon: Settings },
  ]

  return (
    <>
      {/* Botão Mobile Flutuante (Só aparece em telas pequenas) */}
      <button 
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed bottom-4 right-4 z-50 p-3 bg-[#112240] text-white rounded-full shadow-lg"
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar Container */}
      <div className={`
        fixed inset-y-0 left-0 transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        lg:relative lg:translate-x-0 transition duration-200 ease-in-out
        w-64 bg-white border-r border-gray-200 z-10 flex flex-col
        h-full
      `}>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto mt-16 lg:mt-0">
          {menuItems.map((item) => {
             const Icon = item.icon
             const isActive = activeTab === item.id
             return (
               <button
                 key={item.id}
                 onClick={() => { if(setActiveTab) setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                 className={`
                   w-full flex items-center gap-3 px-4 py-3 text-sm font-bold rounded-xl transition-all
                   ${isActive 
                     ? 'bg-[#112240] text-white shadow-md shadow-blue-900/20' 
                     : 'text-gray-500 hover:bg-gray-50 hover:text-[#112240]'}
                 `}
               >
                 <Icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-gray-400'}`} />
                 {item.label}
               </button>
             )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
           <div className="flex items-center gap-3 px-2">
              <div className="h-8 w-8 rounded-full bg-[#112240] flex items-center justify-center text-white text-xs font-bold">SA</div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-gray-900 truncate">Salomão Advogados</p>
                <p className="text-[10px] text-gray-500 truncate">© 2026 Flow Metrics</p>
              </div>
           </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-0 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}