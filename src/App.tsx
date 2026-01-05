import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './Login'
import { Sidebar } from './components/Sidebar'
import { Clients } from './components/Clients'
import { Settings } from './components/Settings'
import { IncompleteClients } from './components/IncompleteClients'
import { Kanban } from './components/Kanban'
import { Dashboard } from './components/Dashboard' // Importação do novo componente

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activePage, setActivePage] = useState('dashboard')

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

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-[#112240]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div></div>
  if (!session) return <Login />

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden w-full">
      <Sidebar activePage={activePage} onNavigate={setActivePage} userName={session?.user?.email?.split('@')[0]} />
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="bg-white border-b border-gray-200 h-20 flex items-center px-8 justify-between flex-shrink-0 z-10">
          <h1 className="text-2xl font-bold text-[#112240] capitalize">{activePage === 'incompletos' ? 'Cadastros Incompletos' : activePage}</h1>
        </header>

        <div className="p-8 flex-1 overflow-hidden h-full">
            {activePage === 'dashboard' && <Dashboard />}
            {activePage === 'clientes' && <Clients />}
            {activePage === 'incompletos' && <IncompleteClients />}
            {activePage === 'kanban' && <Kanban />}
            {activePage === 'configuracoes' && <div className="h-full overflow-y-auto"><Settings /></div>}
        </div>
      </main>
    </div>
  )
}
