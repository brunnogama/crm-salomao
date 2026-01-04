import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './Login'

export default function App() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 1. Verificar sessão atual ao carregar
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // 2. Escutar mudanças (Login ou Logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#112240]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    )
  }

  // SE NÃO TIVER SESSÃO, MOSTRA LOGIN
  if (!session) {
    return <Login />
  }

  // SE TIVER SESSÃO, MOSTRA O DASHBOARD (Futuro Passo)
  return (
    <div className="flex h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#112240]">Bem-vindo ao Portal</h1>
        <p className="mb-4">Você está logado!</p>
        <button 
          onClick={() => supabase.auth.signOut()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Sair
        </button>
      </div>
    </div>
  )
}
