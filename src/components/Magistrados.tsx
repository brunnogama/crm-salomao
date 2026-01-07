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
      <div className="h-full flex flex-col items-center justify-center bg-[#112240] rounded-xl relative overflow-hidden animate-fadeIn">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="relative z-10 bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center">
          <div className="mx-auto bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mb-6"><Lock className="h-8 w-8 text-[#112240]" /></div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Área de Magistrados</h3>
          <p className="text-sm text-gray-500 mb-8">Digite o PIN de segurança.</p>

          <div className="flex justify-center gap-3 mb-6">
            {pinInput.map((digit, idx) => (
              <input key={idx} id={`pin-${idx}`} type="password" maxLength={1} value={digit} onChange={(e) => handlePinChange(idx, e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && idx === 3) verifyPin(); if (e.key === 'Backspace' && !digit && idx > 0) document.getElementById(`pin-${idx - 1}`)?.focus() }} className="w-12 h-14 border-2 border-gray-300 rounded-lg text-center text-2xl font-bold text-[#112240] focus:border-blue-600 outline-none transition-all" />
            ))}
          </div>

          {errorMsg && <p className="text-red-500 text-sm font-bold mb-4 bg-red-50 p-2 rounded-lg">{errorMsg}</p>}

          <button onClick={verifyPin} className="w-full bg-[#112240] text-white py-3 rounded-xl font-bold hover:bg-[#1a3a6c] transition-colors flex items-center justify-center gap-2"><Unlock className="h-4 w-4" /> Liberar Acesso</button>
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