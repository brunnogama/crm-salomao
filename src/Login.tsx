import { useState } from 'react'
import { supabase } from './lib/supabase'
import { User, Lock, ArrowRight, Loader2 } from 'lucide-react'

export default function Login() {
  const [emailPrefix, setEmailPrefix] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const email = `${emailPrefix}@salomaoadv.com.br`
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
    } catch (err: any) {
      setError('Credenciais inválidas. Verifique usuário e senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex w-full bg-white">
      
      {/* LADO ESQUERDO - FORMULÁRIO */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-16 animate-fadeIn">
        <div className="w-full max-w-md space-y-8">
          
          {/* Logo Corrigido */}
          <div className="flex flex-col items-center mb-10">
             <img 
               src="/logo-salomao.png" 
               alt="Salomão Advogados" 
               className="h-20 w-auto object-contain mb-4 block" 
               onError={(e) => {
                 // Fallback visual apenas se a imagem falhar mesmo com o nome certo
                 e.currentTarget.style.display = 'none';
                 const parent = e.currentTarget.parentElement;
                 if (parent) {
                    const textNode = document.createElement('h1');
                    textNode.innerText = 'SALOMÃO ADVOGADOS';
                    textNode.className = 'text-3xl font-black text-[#112240] tracking-tighter';
                    parent.appendChild(textNode);
                 }
               }}
             />
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            
            {/* Input Usuário */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                Usuário Corporativo
              </label>
              <div className="flex rounded-lg shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-[#112240] overflow-hidden">
                <div className="flex items-center pl-3 text-gray-400">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  required
                  value={emailPrefix}
                  onChange={(e) => setEmailPrefix(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  className="block flex-1 border-0 bg-transparent py-3 pl-2 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="nome.sobrenome"
                />
                <span className="flex select-none items-center bg-gray-100 px-3 text-gray-500 sm:text-sm font-medium border-l border-gray-200">
                  @salomaoadv.com.br
                </span>
              </div>
            </div>

            {/* Input Senha */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2 tracking-wider">
                Senha
              </label>
              <div className="relative rounded-lg shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-[#112240]">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full border-0 bg-transparent py-3 pl-10 text-gray-900 placeholder:text-gray-400 focus:ring-0 sm:text-sm sm:leading-6"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Mensagem de Erro */}
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium text-center border border-red-100">
                {error}
              </div>
            )}

            {/* Botão Acessar */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#112240] hover:bg-[#1a3a6c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#112240] transition-all disabled:opacity-70 disabled:cursor-not-allowed group"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  ACESSAR SISTEMA 
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-8 pt-8 border-t border-gray-100">
            © 2026 SALOMÃO ADVOGADOS • V1.4
          </p>
        </div>
      </div>

      {/* LADO DIREITO - BANNER E IMAGEM */}
      <div className="hidden lg:flex w-1/2 relative bg-[#112240] items-center justify-center overflow-hidden">
        
        {/* Imagem de Fundo (Escritório Moderno/Jurídico) */}
        <div 
            className="absolute inset-0 z-0 bg-cover bg-center opacity-40 mix-blend-overlay"
            style={{ 
                backgroundImage: "url('https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2301&auto=format&fit=crop')" 
            }}
        ></div>
        
        {/* Gradiente de Sobreposição para garantir leitura */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#112240]/95 via-[#112240]/80 to-[#0a1525]/90 z-10"></div>

        {/* Conteúdo de Texto */}
        <div className="relative z-20 max-w-lg p-12 text-white animate-slideInRight">
          <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-8 border border-blue-400/30 backdrop-blur-sm">
            <ArrowRight className="h-6 w-6 text-blue-300" />
          </div>
          
          <h2 className="text-4xl font-extrabold mb-6 leading-tight tracking-tight">
            Ecossistema de<br/>
            <span className="text-blue-400">Gestão Integrada</span>
          </h2>
          
          <div className="w-16 h-1 bg-blue-500 rounded-full mb-8"></div>
          
          <p className="text-lg text-gray-300 mb-8 leading-relaxed font-light">
            Acesse seus módulos em um único lugar:
          </p>

          <ul className="space-y-4 text-gray-300">
            <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                <strong>CRM Jurídico:</strong> Gestão de clientes e brindes.
            </li>
            <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                <strong>Gestão Familiar:</strong> Administração patrimonial.
            </li>
            <li className="flex items-center gap-3">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                <strong>Colaboradores:</strong> Portal do time e RH.
            </li>
          </ul>
        </div>
      </div>

    </div>
  )
}
