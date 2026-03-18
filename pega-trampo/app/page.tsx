"use client"

import React, { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  ShieldCheck,
  Star,
  TrendingUp,
  User,
  Zap,
} from "lucide-react"
import LoginModal from "@/app/components/LoginModal"

export default function App() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false)
  const [sessionToast, setSessionToast] = useState(() => {
    if (typeof window === "undefined") return ""
    const params = new URLSearchParams(window.location.search)
    return params.get("reason") === "session_changed"
      ? "A sua sessao foi alterada. Faca login novamente."
      : ""
  })

  useEffect(() => {
    if (!sessionToast) return

    window.history.replaceState({}, "", "/")
    const timer = setTimeout(() => setSessionToast(""), 5000)
    return () => clearTimeout(timer)
  }, [sessionToast])

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 font-sans">
      {sessionToast && (
        <div className="fixed left-1/2 top-4 z-50 w-[92vw] max-w-xl -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white shadow-2xl">
          {sessionToast}
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-violet-200/40 blur-[100px]" />
        <div className="absolute -right-[10%] top-[20%] h-[600px] w-[600px] rounded-full bg-blue-200/30 blur-[120px]" />
      </div>

      <header className="relative z-10 px-4 pt-4 md:px-8 md:pt-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-[1.75rem] border border-white/55 bg-white/50 px-4 py-3 shadow-[0_12px_40px_rgba(76,29,149,0.08)] backdrop-blur-xl md:px-5 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-600 shadow-lg shadow-violet-500/25">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold tracking-tight text-slate-900 md:text-xl">
                PegaTrampo
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-5 lg:flex">
            <a href="#vantagens" className="text-sm font-semibold text-slate-600 transition hover:text-violet-700">Vantagens</a>
            <a href="#como-funciona" className="text-sm font-semibold text-slate-600 transition hover:text-violet-700">Como funciona</a>
            <a href="#confiança" className="text-sm font-semibold text-slate-600 transition hover:text-violet-700">Confiança</a>
          </div>

          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="shrink-0 rounded-xl border border-violet-200/80 bg-white/75 px-3.5 py-2 text-sm font-semibold text-violet-700 shadow-sm transition hover:bg-white hover:shadow md:px-4 active:scale-95"
          >
            Login
          </button>
        </div>
      </header>

      <section className="relative z-10 px-4 pb-10 pt-10 md:px-8 md:pb-20 md:pt-16 lg:pb-28">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-5 lg:-mt-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-violet-700">
              <TrendingUp className="h-3.5 w-3.5" />
              A ponte entre talento e oportunidade
            </div>

            <div className="flex items-start gap-3 sm:block">
              <div className="min-w-0 flex-1">
                <h1 className="text-[1.7rem] font-[900] leading-[1.05] tracking-tight text-slate-900 sm:text-4xl md:text-5xl lg:text-6xl">
                  Contrate os melhores.
                  <br />
                  <span className="bg-gradient-to-r from-violet-600 to-blue-600 bg-clip-text text-transparent">
                    Trabalhe com seguranca.
                  </span>
                </h1>

                <p className="mt-3 max-w-xl text-[0.95rem] leading-6 text-slate-600 sm:text-lg sm:leading-relaxed">
                  No PegaTrampo, empresas encontram talentos
                  verificados e profissionais exibem os seus trabalhos.
                </p>
              </div>

              <div className="relative w-[132px] shrink-0 sm:hidden">
                <Image
                  src="/images/joao-confeiteiro-cards.png"
                  alt="Perfil de profissional no PegaTrampo"
                  width={900}
                  height={1200}
                  className="h-auto w-full rounded-[1rem] object-cover shadow-[0_14px_34px_rgba(76,29,149,0.16)]"
                  priority
                />
              </div>
            </div>

            <div className="mt-3 flex max-w-sm flex-col gap-3" id="cadastro">
              <Link
                href="/cadastro/empresa"
                className="group flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 px-8 py-4 text-base font-bold text-white shadow-[0_18px_40px_rgba(99,102,241,0.32)] transition-all hover:scale-[1.02] hover:from-violet-500 hover:via-indigo-500 hover:to-sky-400"
              >
                <Building2 className="h-5 w-5 text-violet-100" />
                Preciso contratar
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>

              <Link
                href="/cadastro/funcionario"
                className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-200 bg-white/95 px-8 py-4 text-base font-bold text-indigo-700 shadow-sm transition-all hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
              >
                <User className="h-5 w-5" />
                Quero trabalhar
              </Link>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-[11px] font-medium text-slate-500 sm:mt-5 sm:flex sm:flex-wrap sm:items-center sm:gap-4 sm:text-sm">
              <span className="flex flex-col items-center justify-start gap-1 text-center sm:flex-row sm:text-left">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Perfis verificados
              </span>
              <span className="flex flex-col items-center justify-start gap-1 text-center sm:flex-row sm:text-left">
                <Star className="h-4 w-4 text-amber-500" />
                Avaliacoes reais
              </span>
              <span className="flex flex-col items-center justify-start gap-1 text-center sm:flex-row sm:text-left">
                <Zap className="h-4 w-4 text-blue-500" />
                Contato direto
              </span>
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-[320px] sm:max-w-[380px] lg:ml-auto lg:block lg:max-w-[450px]">
            <div
              className="absolute -left-6 top-20 z-20 hidden rounded-2xl border border-white/80 bg-white/90 p-4 shadow-xl backdrop-blur-sm md:block"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">Perfil verificado</p>
                  <p className="text-xs text-slate-500">Pronto para fechar negocio</p>
                </div>
              </div>
            </div>

            <div className="relative z-10 overflow-hidden rounded-[2rem] border border-white/60 bg-white/40 p-2 shadow-[0_20px_60px_rgba(76,29,149,0.15)] backdrop-blur-sm">
              <div className="overflow-hidden rounded-[1.5rem] bg-slate-100 shadow-inner">
                <Image
                  src="/images/joao-confeiteiro-cards.png"
                  alt="Perfil de profissional no PegaTrampo"
                  width={900}
                  height={1200}
                  className="h-auto w-full object-cover"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="vantagens"
        className="relative z-10 border-y border-slate-100 bg-white px-4 py-10 md:px-8 md:py-20"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-2xl font-[900] tracking-tight text-slate-900 md:text-4xl">
              Feito para quem nao tem tempo a perder.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600 md:mt-4 md:text-lg">
              Uma plataforma que entende as necessidades de quem procura um
              profissional e de quem entrega o servico.
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 md:mt-16 md:gap-8">
            <div className="rounded-[1.4rem] border border-slate-100 bg-slate-50 p-3 transition-shadow hover:shadow-lg md:rounded-[2.5rem] md:p-8 lg:p-12">
              <div className="mb-3 md:mb-6">
                <div className="flex items-center gap-2 md:block">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 shadow-lg shadow-violet-500/30 md:h-16 md:w-16 md:rounded-2xl">
                    <Building2 className="h-5 w-5 text-white md:h-8 md:w-8" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">
                    Para
                  </span>
                </div>
                <h3 className="mt-2 text-base font-extrabold text-slate-900 md:text-2xl">
                  Empresas
                </h3>
              </div>
              <p className="mt-2 text-[13px] leading-5 text-slate-600 md:mt-3 md:text-lg">
                Encontre a pessoa certa para o seu projeto com rapidez e seguranca.
              </p>

              <ul className="mt-4 space-y-3 md:mt-8 md:space-y-5">
                <li className="flex items-start gap-2 md:gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 md:h-8 md:w-8">
                    <CheckCircle2 className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  </div>
                  <span className="text-[11px] leading-4 text-slate-700 md:text-base md:leading-relaxed">
                    <strong>Busca assertiva</strong>
                    <span className="hidden md:inline">
                      : filtre profissionais por regiao, especialidade e disponibilidade real.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2 md:gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 md:h-8 md:w-8">
                    <CheckCircle2 className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  </div>
                  <span className="text-[11px] leading-4 text-slate-700 md:text-base md:leading-relaxed">
                    <strong>Analise de portfolio</strong>
                    <span className="hidden md:inline">
                      : veja trabalhos anteriores e comprove a qualidade antes de chamar.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2 md:gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600 md:h-8 md:w-8">
                    <CheckCircle2 className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  </div>
                  <span className="text-[11px] leading-4 text-slate-700 md:text-base md:leading-relaxed">
                    <strong>Reputacao clara</strong>
                    <span className="hidden md:inline">
                      : leia avaliacoes de outros contratantes e tome decisoes seguras.
                    </span>
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-[1.4rem] border border-slate-100 bg-slate-50 p-3 transition-shadow hover:shadow-lg md:rounded-[2.5rem] md:p-8 lg:p-12">
              <div className="mb-3 md:mb-6">
                <div className="flex items-center gap-2 md:block">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/30 md:h-16 md:w-16 md:rounded-2xl">
                    <User className="h-5 w-5 text-white md:h-8 md:w-8" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 md:hidden">
                    Para
                  </span>
                </div>
                <h3 className="mt-2 text-base font-extrabold text-slate-900 md:text-2xl">
                  Profissionais
                </h3>
              </div>
              <p className="mt-2 text-[13px] leading-5 text-slate-600 md:mt-3 md:text-lg">
                Poste seus trabalhos para atrair mais propostas e fechar mais
                orcamentos.
              </p>

              <ul className="mt-4 space-y-3 md:mt-8 md:space-y-5">
                <li className="flex items-start gap-2 md:gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 md:h-8 md:w-8">
                    <CheckCircle2 className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  </div>
                  <span className="text-[11px] leading-4 text-slate-700 md:text-base md:leading-relaxed">
                    <strong>Apresentacao premium</strong>
                    <span className="hidden md:inline">
                      : um perfil bonito e organizado que valoriza o seu servico.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2 md:gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 md:h-8 md:w-8">
                    <CheckCircle2 className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  </div>
                  <span className="text-[11px] leading-4 text-slate-700 md:text-base md:leading-relaxed">
                    <strong>Contato facilitado</strong>
                    <span className="hidden md:inline">
                      : receba pedidos de orcamento diretamente no seu WhatsApp ou e-mail.
                    </span>
                  </span>
                </li>
                <li className="flex items-start gap-2 md:gap-4">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 md:h-8 md:w-8">
                    <CheckCircle2 className="h-3.5 w-3.5 md:h-5 md:w-5" />
                  </div>
                  <span className="text-[11px] leading-4 text-slate-700 md:text-base md:leading-relaxed">
                    <strong>Construa autoridade</strong>
                    <span className="hidden md:inline">
                      : acumule boas avaliacoes e destaque-se na sua regiao.
                    </span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="relative z-10 bg-slate-50 px-4 py-12 md:px-8 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center md:mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-violet-600 md:text-sm">
              Passo a passo
            </span>
            <h2 className="mt-2 text-2xl font-[900] tracking-tight text-slate-900 md:text-4xl">
              Como o PegaTrampo funciona?
            </h2>
          </div>

          <div className="relative grid grid-cols-3 gap-2 md:gap-12">
            <div className="absolute left-[15%] top-10 z-0 hidden w-[70%] border-t-2 border-dashed border-slate-300 md:block" />

            <div className="relative z-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-violet-100 bg-white text-sm font-black text-violet-600 shadow-xl md:h-20 md:w-20 md:text-2xl">
                1
              </div>
              <h3 className="mt-3 text-[13px] font-bold leading-4 text-slate-900 md:mt-6 md:text-xl md:leading-normal">Crie a sua conta</h3>
              <p className="mx-auto mt-2 max-w-[110px] text-[11px] leading-4 text-slate-600 md:mt-3 md:max-w-xs md:text-base md:leading-relaxed">
                Registe-se como empresa para procurar talentos, ou como profissional
                para divulgar os seus servicos.
              </p>
            </div>

            <div className="relative z-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-blue-100 bg-white text-sm font-black text-blue-600 shadow-xl md:h-20 md:w-20 md:text-2xl">
                2
              </div>
              <h3 className="mt-3 text-[13px] font-bold leading-4 text-slate-900 md:mt-6 md:text-xl md:leading-normal">Encontre o match</h3>
              <p className="mx-auto mt-2 max-w-[110px] text-[11px] leading-4 text-slate-600 md:mt-3 md:max-w-xs md:text-base md:leading-relaxed">
                Explore perfis, analise portfolios, veja avaliacoes de confianca e
                escolha com seguranca.
              </p>
            </div>

            <div className="relative z-10 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-4 border-emerald-100 bg-white text-sm font-black text-emerald-600 shadow-xl md:h-20 md:w-20 md:text-2xl">
                3
              </div>
              <h3 className="mt-3 text-[13px] font-bold leading-4 text-slate-900 md:mt-6 md:text-xl md:leading-normal">Feche negocio</h3>
              <p className="mx-auto mt-2 max-w-[110px] text-[11px] leading-4 text-slate-600 md:mt-3 md:max-w-xs md:text-base md:leading-relaxed">
                Entre em contato diretamente, acerte os detalhes do servico e
                comece a trabalhar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="relative z-10 px-4 pb-14 pt-8 md:px-8 md:pb-20 md:pt-10">
        <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[3rem] bg-slate-900 text-center shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-900/40 to-blue-900/40" />

          <div className="relative px-6 py-12 backdrop-blur-sm md:px-12 md:py-20">
            <h2 className="mx-auto max-w-3xl text-2xl font-[900] tracking-tight text-white md:text-5xl">
              De o proximo passo na sua jornada profissional.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 md:mt-6 md:text-xl">
              Junte-se a empresas e profissionais que ja estao a fechar negocios
              de forma inteligente, rapida e segura.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row md:mt-12 md:gap-5">
              <Link
                href="/cadastro/empresa"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-8 py-5 text-lg font-bold text-white transition hover:scale-105 hover:bg-violet-500 sm:w-auto"
              >
                Criar conta empresa
              </Link>
              <Link
                href="/cadastro/funcionario"
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-8 py-5 text-lg font-bold text-slate-900 transition hover:scale-105 hover:bg-slate-100 sm:w-auto"
              >
                Criar perfil profissional
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white px-4 py-10 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-900">PegaTrampo</span>
          </div>
          <p className="text-sm font-medium text-slate-500">
            &copy; {new Date().getFullYear()} PegaTrampo. Todos os direitos reservados.
          </p>
          <div className="flex gap-6 text-sm font-semibold text-slate-500">
            <a href="#termos" className="transition hover:text-violet-600">
              Termos de uso
            </a>
            <a href="#privacidade" className="transition hover:text-violet-600">
              Privacidade
            </a>
          </div>
        </div>
      </footer>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  )
}
