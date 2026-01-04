import { useState, useRef } from 'react'
import { Download, Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react' // Removido 'FileUp'
import { utils, read, writeFile } from 'xlsx'
import { supabase } from '../lib/supabase'

export function Settings() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error' | null, message: string }>({ type: null, message: '' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 1. GERAR PLANILHA MODELO
  const handleDownloadTemplate = () => {
    // Cabeçalhos e um exemplo de linha
    const templateData = [
      {
        "Nome Completo": "Exemplo Silva",
        "Empresa": "Empresa Teste S.A.",
        "Cargo": "Diretor",
        "Tipo de Brinde": "Brinde Médio",
        "Outro Brinde": "",
        "Quantidade": 1,
        "CEP": "01001-000",
        "Endereço": "Praça da Sé",
        "Número": "100",
        "Complemento": "Sala 1",
        "Bairro": "Centro",
        "Cidade": "São Paulo",
        "Estado": "SP",
        "Email": "exemplo@email.com",
        "Sócio Responsável": "Marcio Gama",
        "Observações": "Cliente importante"
      }
    ]

    const ws = utils.json_to_sheet(templateData)
    
    // Ajustar largura das colunas
    const wscols = [
      { wch: 25 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, 
      { wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 30 }, 
      { wch: 10 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, 
      { wch: 5 }, { wch: 25 }, { wch: 20 }, { wch: 30 }
    ]
    ws['!cols'] = wscols

    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, "Modelo Importação")
    writeFile(wb, "Modelo_Importacao_Clientes_Salomao.xlsx")
  }

  // 2. PROCESSAR O ARQUIVO ENVIADO
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setStatus({ type: null, message: '' })

    try {
      const data = await file.arrayBuffer()
      const workbook = read(data)
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData: any[] = utils.sheet_to_json(worksheet)

      if (jsonData.length === 0) {
        throw new Error("A planilha está vazia.")
      }

      // Mapear as colunas do Excel (Português) para o Banco (snake_case)
      const clientsToInsert = jsonData.map((row) => ({
        nome: row["Nome Completo"],
        empresa: row["Empresa"],
        cargo: row["Cargo"],
        tipo_brinde: row["Tipo de Brinde"] || "Brinde Médio",
        outro_brinde: row["Outro Brinde"],
        quantidade: row["Quantidade"] || 1,
        cep: row["CEP"],
        endereco: row["Endereço"],
        numero: row["Número"] ? String(row["Número"]) : null,
        complemento: row["Complemento"],
        bairro: row["Bairro"],
        cidade: row["Cidade"],
        estado: row["Estado"],
        email: row["Email"],
        socio: row["Sócio Responsável"],
        observacoes: row["Observações"]
      }))

      // Salvar no Supabase
      const { error } = await supabase
        .from('clientes')
        .insert(clientsToInsert)

      if (error) throw error

      setStatus({ type: 'success', message: `${clientsToInsert.length} clientes importados com sucesso!` })
      
      // Limpar o input
      if (fileInputRef.current) fileInputRef.current.value = ''

    } catch (error: any) {
      console.error(error)
      setStatus({ type: 'error', message: `Erro na importação: ${error.message}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-[#112240] mb-6">Configurações do Sistema</h2>

      {/* CARD DE IMPORTAÇÃO */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-blue-50 rounded-lg text-[#112240]">
            <FileSpreadsheet className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Importação em Lote</h3>
            <p className="text-gray-500 mt-1">
              Adicione múltiplos clientes de uma vez utilizando uma planilha Excel (.xlsx).
            </p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Passo 1: Baixar Modelo */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <h4 className="font-medium text-gray-800">1. Baixe a planilha modelo</h4>
              <p className="text-sm text-gray-500">Utilize este arquivo para preencher os dados corretamente.</p>
            </div>
            <button 
              onClick={handleDownloadTemplate}
              className="flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors shadow-sm font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar Modelo
            </button>
          </div>

          {/* Passo 2: Importar */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div>
              <h4 className="font-medium text-gray-800">2. Envie o arquivo preenchido</h4>
              <p className="text-sm text-gray-500">Selecione o arquivo .xlsx do seu computador.</p>
            </div>
            <div className="relative">
              <input 
                type="file" 
                accept=".xlsx, .xls"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden"
                id="file-upload"
                disabled={loading}
              />
              <label 
                htmlFor="file-upload"
                className={`flex items-center px-4 py-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#112240] hover:bg-[#1a3a6c] cursor-pointer'} text-white rounded-lg transition-colors shadow-sm font-medium`}
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full"></div>
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {loading ? 'Processando...' : 'Selecionar Arquivo'}
              </label>
            </div>
          </div>
        </div>

        {/* MENSAGENS DE STATUS */}
        {status.message && (
          <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 animate-fadeIn ${
            status.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {status.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
            <span className="font-medium">{status.message}</span>
          </div>
        )}
      </div>

      {/* DICA DE UTILIZAÇÃO */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 p-4 rounded-lg text-sm text-yellow-800">
        <strong>Atenção:</strong> Certifique-se de que os nomes das colunas na planilha enviada sejam 
        exatamente iguais aos da planilha modelo. O sistema ignora colunas desconhecidas.
      </div>
    </div>
  )
}
