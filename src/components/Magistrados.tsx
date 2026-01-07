import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Lock, ShieldAlert, Unlock, KeyRound } from 'lucide-react'
import { Clients } from './Clients'

export function Magistrados() {
  const [hasAccess, setHasAccess] = useState(false)
  const [isPinCorrect, setIsPinCorrect] = useState(false)
  const [loading, setLoading] = useState(true)
  const [pinInput, setPinInput] = useState(['', '', '', ''])
  const [errorMsg, setErrorMsg] = useState('')
  const [currentUserEmail, setCurrentUserEmail] = useState('')

  useEffect(() => {
    checkPermission()
  }, [])

  const checkPermission = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user?.email) {
      setCurrentUserEmail(user.email)
      const { data } = await supabase.from('config_magistrados').select('emails_permitidos').single()
      const allowedList = data?.emails_permitidos || []
      
      if (allowedList.includes(user.email)) {
        setHasAccess(true)
      } else {
        setHasAccess(false)
      }
    }
    setLoading(false)
  }

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return
    const newPin = [...pinInput]
    newPin[index] = value
    setPinInput(newPin)
    if (value && index < 3) {
      document.getElementById(`pin-${index + 1}`)?.focus()
    }
  }

  const verifyPin = async () => {
    setErrorMsg('')
    const enteredPin = pinInput.join('')
    const { data } = await supabase.from('config_magistrados').select('pin_acesso').single()
    
    if (data && data.pin_acesso === enteredPin) {
      setIsPinCorrect(true)
    } else {
      setErrorMsg('PIN Incorreto.')
      setPinInput(['', '', '', ''])
      document.getElementById('pin-0')?.focus()
    }
  }

  const handleLock = () => {
    // Limpa o PIN antes de bloquear
    setPinInput(['', '', '', ''])
    setErrorMsg('')
    setIsPinCorrect(false)
    // Pequeno delay para garantir que o foco está correto quando a tela aparecer
    setTimeout(() => {
      document.getElementById('pin-0')?.focus()
    }, 100)
  }

  // 1. Acesso Negado
  if (!loading && !hasAccess) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-gray-200 p-8 text-center animate-fadeIn">
        <div className="bg-red-100 p-6 rounded-full mb-6"><ShieldAlert className="h-16 w-16 text-red-600" /></div>
        <h2 className="text-2xl font-bold text-[#112240] mb-2">Acesso Restrito</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-6">Este módulo contém dados sensíveis. Seu usuário (<strong>{currentUserEmail}</strong>) não possui credenciais.</p>
        <div className="bg-white p-4 rounded-lg border border-gray-200 text-xs text-gray-400">Solicite acesso ao Administrador.</div>
      </div>
    )
  }

  // 2. Tela de PIN
  if (!loading && hasAccess && !isPinCorrect) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0a1628] via-[#112240] to-[#1a365d] rounded-xl relative overflow-hidden animate-fadeIn">
        {/* Efeitos de fundo */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-10 left-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        </div>

        {/* Card Principal */}
        <div className="relative z-10 bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full mx-4 border border-gray-100">
          
          {/* Ícone com animação */}
          <div className="mx-auto mb-8 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
            <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto transform hover:scale-110 transition-transform shadow-lg">
              <Lock className="h-10 w-10 text-white" />
            </div>
          </div>

          {/* Título e Subtítulo */}
          <div className="text-center mb-8">
            <h3 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Área de Magistrados</h3>
            <p className="text-sm text-gray-500 font-medium">Digite o PIN de 4 dígitos para acessar</p>
          </div>

          {/* Campos de PIN com estilo moderno */}
          <div className="flex justify-center gap-3 mb-6">
            {pinInput.map((digit, idx) => (
              <div key={idx} className="relative">
                <input 
                  id={`pin-${idx}`} 
                  type="password" 
                  maxLength={1} 
                  value={digit} 
                  onChange={(e) => handlePinChange(idx, e.target.value)} 
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && idx === 3) verifyPin(); 
                    if (e.key === 'Backspace' && !digit && idx > 0) document.getElementById(`pin-${idx - 1}`)?.focus() 
                  }} 
                  className="w-14 h-16 border-2 border-gray-200 rounded-xl text-center text-3xl font-black text-gray-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition-all bg-gray-50 focus:bg-white shadow-sm"
                  style={{ caretColor: 'transparent' }}
                />
                {/* Indicador de preenchimento */}
                {digit && (
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                )}
              </div>
            ))}
          </div>

          {/* Mensagem de Erro com animação */}
          {errorMsg && (
            <div className="mb-6 animate-shake">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-red-100 p-2 rounded-lg">
                    <ShieldAlert className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-red-800 text-sm font-bold">{errorMsg}</p>
                    <p className="text-red-600 text-xs mt-0.5">Tente novamente</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botão Liberar */}
          <button 
            onClick={verifyPin} 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-bold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <Unlock className="h-5 w-5" />
            <span className="text-base">Liberar Acesso</span>
          </button>

          {/* Rodapé com info */}
          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Sistema protegido por PIN</span>
            </div>
          </div>
        </div>

        {/* Logo ou branding no canto */}
        <div className="absolute bottom-6 text-center w-full">
          <p className="text-blue-300/60 text-xs font-medium tracking-wider">SALOMÃO ADVOGADOS • ÁREA RESTRITA</p>
        </div>
      </div>
    )
  }

  // 3. Conteúdo Liberado (Reutiliza Clients.tsx)
  return (
    <div className="h-full flex flex-col">
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-2 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-yellow-800 text-xs font-bold"><KeyRound className="h-4 w-4" /> MODO SEGURO: Magistrados</div>
        <button onClick={handleLock} className="text-xs font-bold underline text-yellow-800 hover:text-yellow-900">Bloquear Tela</button>
      </div>
      <Clients tableName="magistrados" />
    </div>
  )
}