import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './Login'
import { Sidebar } from './components/Sidebar'
import { Clients } from './components/Clients'
import { Settings } from './components/Settings'
import { IncompleteClients } from './components/IncompleteClients'
import { Kanban } from './components/Kanban'
import { Dashboard } from './components/Dashboard'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')

  const moduleDescriptions: Record<string, string> = {
    dashboard: 'Visão geral de performance e indicadores chave.',
    clientes: 'Gerencie a base de prospects e clientes ativos.',
    incompletos: 'Atenção: Cadastros que necessitam de preenchimento.',
    kanban: 'Gerencie suas tarefas de forma visual.',
    configuracoes: 'Preferências do sistema e gestão de acessos.'
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  const getUserDisplayName = () => {
    if (!session?.user?.email) return 'Usuário'
    return session.user.email.split('@')[0].split('.').map((p:any) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
  }

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-[#112240]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
  if (!session) return <Login />

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden w-full">
      <Sidebar activePage={activePage} onNavigate={setActivePage} userName={getUserDisplayName()} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="bg-white border-b border-gray-200 h-20 flex items-center px-8 justify-between flex-shrink-0 z-10">
            <div className="flex flex-col justify-center">
                <h1 className="text-2xl font-bold text-[#112240] capitalize leading-tight">
                    {activePage === 'incompletos' ? 'Cadastros Incompletos' : activePage}
                </h1>
                <span className="text-sm text-gray-500 font-normal">{moduleDescriptions[activePage]}</span>
            </div>
        </header>
        <div className="p-8 flex-1 overflow-hidden h-full">
            {activePage === 'dashboard' && <Dashboard />}
            {activePage === 'clientes' && <Clients />}
            {activePage === 'incompletos' && <IncompleteClients />}
            {activePage === 'kanban' && <Kanban />}
            {activePage === 'configuracoes' && (
                <div className="h-full overflow-y-auto pr-2 custom-scrollbar"><Settings /></div>
            )}
        </div>
      </main>
    </div>
  )
}
