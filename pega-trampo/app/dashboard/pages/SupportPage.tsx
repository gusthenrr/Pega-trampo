import { ArrowLeft, HelpCircle, Mail } from 'lucide-react'

export default function SupportPage(props: any) {
    const { showHeader, setShowSupport } = props

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-[60px]">
            <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'} bg-white shadow-sm border-b`}>
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={() => setShowSupport(false)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900">Suporte</h1>
                    <div className="w-10"></div>
                </div>
            </div>

            <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <HelpCircle className="h-8 w-8 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Como podemos ajudar?</h2>
                        <p className="text-gray-600">Estamos aqui para resolver suas duvidas</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <button className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center space-x-4 hover:shadow-md transition-all">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                            <Mail className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="flex-1 text-left">
                            <h3 className="font-bold text-gray-900">E-mail</h3>
                            <p className="text-gray-600 text-sm">suporte@pegatrampo.com</p>
                        </div>
                    </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="font-bold text-gray-900 mb-4">Perguntas Frequentes</h3>
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium text-gray-900 mb-1">Como publico uma proposta de trabalho?</h4>
                            <p className="text-gray-600 text-sm">Apenas empresas cadastradas podem publicar propostas. Faca seu cadastro como empresa para ter acesso a essa funcionalidade.</p>
                        </div>

                        <div>
                            <h4 className="font-medium text-gray-900 mb-1">Posso alterar meu perfil?</h4>
                            <p className="text-gray-600 text-sm">Sim! Acesse "Meu Perfil" no menu inferior e clique no icone de edicao para atualizar suas informacoes.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

