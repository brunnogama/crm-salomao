import { 
  LayoutDashboard, 
  Users, 
  FileWarning, 
  KanbanSquare, 
  BookOpen, 
  History, 
  Settings, 
  LogOut,
  UserCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface SidebarProps {
  activePage: string;
  onNavigate: (page: string) => void;
  userName: string; // Recebe o nome do usuário logado
}

export function Sidebar({ activePage, onNavigate, userName }: SidebarProps) {
  
  const mainItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'contratos', label: 'Contratos', icon: FileWarning }, // Ajustado nome conforme print
    { id: 'propostas', label: 'Propostas', icon: FileWarning }, // Ícone provisório
    { id: 'volumetria', label: 'Volumetria', icon: LayoutDashboard }, // Ícone provisório
    { id: 'compliance', label: 'Compliance', icon: FileWarning }, // Ícone provisório
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'kanban', label: 'Kanban', icon: KanbanSquare },
    { id: 'ged', label: 'GED', icon: FileWarning }, // Ícone provisório
  ]

  const bottomItems = [
    { id: 'manual', label: 'Manual do Sistema', icon: BookOpen },
    { id: 'historico', label: 'Histórico', icon: History },
    { id: 'configuracoes', label: 'Configurações', icon: Settings },
  ]

  return (
    <div className="h-screen w-64 bg-[#112240] text-gray-300 flex flex-col font-sans border-r border-gray-800 flex-shrink-0">
      
      {/* 1. Logo */}
      <div className="h-20 flex items-center px-6 bg-[#112240]">
        <img src="/logo-branca.png" alt="Salomão" className="h-8 object-contain" />
      </div>

      {/* 2. Menu Principal (Topo) */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 custom-scrollbar">
        {mainItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center px-3 py-3 rounded-lg transition-all group ${
              activePage === item.id 
                ? 'bg-[#1e3a8a] text-white font-medium shadow-md border-l-4 border-salomao-gold' 
                : 'hover:bg-white/5 hover:text-white border-l-4 border-transparent'
            }`}
          >
            <item.icon className={`h-5 w-5 mr-3 ${activePage === item.id ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
            <span className="text-sm">{item.label}</span>
          </button>
        ))}
      </div>

      {/* 3. Menu Inferior (Manual, Histórico...) */}
      <div className="pt-4 pb-2 px-3 bg-[#112240]">
        <div className="border-t border-gray-700/50 mb-4 mx-2"></div>
        
        {bottomItems.map((item) => (
           <button
           key={item.id}
           onClick={() => onNavigate(item.id)}
           className={`w-full flex items-center px-3 py-3 rounded-lg transition-colors group ${
               activePage === item.id ? 'bg-[#1e3a8a] text-white' : 'hover:bg-white/5 hover:text-white'
           }`}
         >
           <item.icon className="h-5 w-5 mr-3 text-gray-400 group-hover:text-white" />
           <span className="text-sm">{item.label}</span>
         </button>
        ))}
      </div>

      {/* 4. Rodapé do Usuário */}
      <div className="p-4 bg-[#0d1b33]">
        <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-600 flex items-center justify-center border-2 border-[#112240]">
                <UserCircle className="h-6 w-6 text-gray-300" />
            </div>
            <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-bold text-white truncate capitalize">
                  {userName}
                </span>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="text-[11px] text-gray-400 hover:text-red-400 flex items-center gap-1 mt-0.5 transition-colors w-fit"
                >
                    <LogOut className="h-3 w-3" /> Sair
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}
