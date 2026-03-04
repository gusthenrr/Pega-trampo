// app/(public)/welcome-03/page.tsx
"use client"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Briefcase, Check, Building2, User, MapPin, Sparkles } from "lucide-react"
import LoginModal from "./components/LoginModal"

export default function Welcome03Page() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [sessionToast, setSessionToast] = useState("")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get("reason") === "session_changed") {
      setSessionToast("Sua sessão foi alterada em outra aba. Faça login novamente.")
      window.history.replaceState({}, "", "/")
      const timer = setTimeout(() => setSessionToast(""), 5000)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
      {/* Session changed toast */}
      {sessionToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-sm font-semibold animate-in fade-in slide-in-from-top duration-300 max-w-[90vw] text-center">
          {sessionToast}
        </div>
      )}
      {/* HERO */}
      <section className="px-4 pt-8 pb-6 md:pt-14 md:pb-10">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center backdrop-blur">
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div className="text-white">
              <p className="font-extrabold text-lg">PegaTrampo</p>
              <p className="text-white/70 text-xs">
                A ponte entre quem precisa e quem faz
              </p>
            </div>
          </div>

          <h1 className="mt-6 text-white text-4xl md:text-6xl font-extrabold leading-tight">
            Conectamos profissionais a oportunidades de trabalho
          </h1>

          <p className="mt-3 text-white/80 text-base md:text-lg max-w-2xl">
            Publique suas propostas de trabalho e funcionarios perto de você.
          </p>

          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-white font-bold">
                <Sparkles className="h-5 w-5" />
                Mais agilidade
              </div>
              <p className="mt-2 text-white/80 text-sm">
                Menos conversa, mais ação — foque no que importa.
              </p>
            </div>

            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-white font-bold">
                <MapPin className="h-5 w-5" />
                Perto de você
              </div>
              <p className="mt-2 text-white/80 text-sm">
                Encontre pessoas e oportunidades próximas.
              </p>
            </div>

            <div className="bg-white/10 border border-white/15 rounded-2xl p-4 backdrop-blur">
              <div className="flex items-center gap-2 text-white font-bold">
                <Briefcase className="h-5 w-5" />
                Para empresas e profissionais
              </div>
              <p className="mt-2 text-white/80 text-sm">
                Um lugar único para publicar e receber propostas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CONTENT CARD */}
      <section className="px-4 pb-10 md:pb-14">
        <div className="mx-auto max-w-5xl bg-white/95 backdrop-blur-sm border border-white/20 rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-6 md:p-10 grid gap-8 md:grid-cols-2 md:items-start">
            {/* CTA FIRST ON MOBILE */}
            <div className="order-1 md:order-2 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 border border-gray-100 rounded-3xl p-6 md:p-8">
              <h3 className="text-xl font-extrabold text-gray-900">
                Escolha seu perfil
              </h3>
              <p className="mt-2 text-gray-600">
                Crie sua conta e comece agora.
              </p>

              <div className="mt-5 space-y-3">
                <Link
                  href="/cadastro/empresa"
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-2xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
                >
                  <Building2 className="h-5 w-5" />
                  Sou uma Empresa
                </Link>

                <Link
                  href="/cadastro/funcionario"
                  className="flex items-center justify-center gap-2 w-full border-2 border-blue-600 text-blue-600 py-4 rounded-2xl font-bold text-lg hover:bg-blue-50 transition shadow-md"
                >
                  <User className="h-5 w-5" />
                  Sou um Funcionário
                </Link>

                <button
                  onClick={() => setIsLoginModalOpen(true)}
                  className="block w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-200 transition text-center"
                >
                  Já tenho Login
                </button>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Ao continuar, você concorda com nossos{" "}
                  <Link href="/termos" className="text-blue-600 hover:underline">
                    Termos de Uso
                  </Link>{" "}
                  e{" "}
                  <Link href="/privacidade" className="text-blue-600 hover:underline">
                    Política de Privacidade
                  </Link>
                  .
                </p>
              </div>
            </div>

            {/* FEATURES SECOND ON MOBILE */}
            <div className="order-2 md:order-1">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">
                Tudo que você precisa para começar
              </h2>
              <p className="mt-2 text-gray-600">
                Simples, direto e feito para funcionar bem no celular.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-center gap-4 bg-green-50 p-3 rounded-2xl">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-gray-700 font-medium">
                    Publique suas propostas de trabalho
                  </p>
                </div>

                <div className="flex items-center gap-4 bg-blue-50 p-3 rounded-2xl">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                    <Check className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-gray-700 font-medium">
                    Encontre funcionários perto de você
                  </p>
                </div>


              </div>
            </div>
          </div>

          {/* Footer simples */}
          <div className="px-6 md:px-10 py-5 border-t border-gray-200 bg-white">
            <p className="text-xs text-gray-500">
              PegaTrampo — Conexões reais, perto de você.
            </p>
          </div>
        </div>
      </section>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  )
}