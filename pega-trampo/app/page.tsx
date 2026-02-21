"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Briefcase, Check } from "lucide-react"
import LoginModal from "./components/LoginModal"

export default function WelcomePage() {
  const router = useRouter()
  const [showLoginModal, setShowLoginModal] = useState(false)

  const goToRegister = (type: "company" | "professional") => {
    // salva só pra você já ter isso disponível no cadastro/login, se quiser usar depois
    try {
      localStorage.setItem("pegaTrampo.userType", type)
    } catch { }

    // você vai criar essa rota depois:
    // /register?type=company  ou  /register?type=professional
    router.push(`/register?type=${type}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl max-w-md w-full p-8 text-center border border-white/20">
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Briefcase className="h-12 w-12 text-white" />
          </div>

          <h1 className="text-4xl font-bold mb-3">
            <span className="text-blue-600">Pega</span>
            <span className="text-gray-900">Trampo</span>
          </h1>

          <p className="text-gray-600 text-lg">
            Conectamos profissionais a oportunidades de trabalho
          </p>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center space-x-4 text-left bg-green-50 p-3 rounded-xl">
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="h-5 w-5 text-white" />
            </div>
            <span className="text-gray-700 font-medium">
              Publique suas propostas de trabalho
            </span>
          </div>

          <div className="flex items-center space-x-4 text-left bg-blue-50 p-3 rounded-xl">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="h-5 w-5 text-white" />
            </div>
            <span className="text-gray-700 font-medium">
              Encontre clientes próximos a você
            </span>
          </div>

          <div className="flex items-center space-x-4 text-left bg-purple-50 p-3 rounded-xl">
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check className="h-5 w-5 text-white" />
            </div>
            <span className="text-gray-700 font-medium">
              Receba pagamentos seguros
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => { router.push("/cadastro/empresa"); }}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
          >
            Sou uma Empresa
          </button>

          <button
            onClick={() => { router.push("/cadastro/funcionario"); }}
            className="w-full border-2 border-blue-600 text-blue-600 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition-all duration-300 shadow-md"
          >
            Sou um Funcionário
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <button
            onClick={() => setShowLoginModal(true)}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition-all duration-300"
          >
            Já tenho Login
          </button>
        </div>

        <LoginModal
          isOpen={showLoginModal}
          onClose={() => setShowLoginModal(false)}
        />

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Ao continuar, você concorda com nossos{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Política de Privacidade
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
