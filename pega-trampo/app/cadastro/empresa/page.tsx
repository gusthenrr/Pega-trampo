"use client"

import { useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, HelpCircle, Check, Lock, User } from "lucide-react"
import { CNPJApiData, CNPJAddress } from "@/app/types/pegatrampo"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

// Tipos de negócio
const businessTypes = [
    { value: "padaria", label: "Padaria" },
    { value: "mercado", label: "Mercado" },
    { value: "restaurante", label: "Restaurante" },
    { value: "bar", label: "Bar" },
    { value: "eventos", label: "Eventos" },
    { value: "postos", label: "Postos" },
    { value: "casa_bolos", label: "Casa de Bolos" },
    { value: "lanchonete", label: "Lanchonete" },
    { value: "pizzaria", label: "Pizzaria" },
    { value: "hamburger", label: "Hamburger" },
] as const

type BusinessTypeValue = (typeof businessTypes)[number]["value"]
type Step = 1 | 2

type ApiOk<T> = { success: true } & T
type ApiErr = { success: false; error?: string }

const toNull = (v: any) => {
    const s = String(v ?? "").trim()
    return s ? s : null
}

const onlyDigits = (s: string) => (s || "").replace(/\D/g, "")

// Formatar CNPJ
const formatCNPJ = (cnpj: string): string => {
    const clean = onlyDigits(cnpj)
    if (clean.length <= 2) return clean
    if (clean.length <= 5) return clean.replace(/(\d{2})(\d)/, "$1.$2")
    if (clean.length <= 8) return clean.replace(/(\d{2})(\d{3})(\d)/, "$1.$2.$3")
    if (clean.length <= 12) return clean.replace(/(\d{2})(\d{3})(\d{3})(\d)/, "$1.$2.$3/$4")
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5")
}

// Validar CNPJ (DV)
export const isValidCNPJ = (cnpjRaw: string) => {
    const cnpj = onlyDigits(cnpjRaw)
    if (cnpj.length !== 14) return false
    if (/^(\d)\1+$/.test(cnpj)) return false

    const calc = (base: string, weights: number[]) => {
        const sum = base.split("").reduce((acc, ch, i) => acc + Number(ch) * weights[i], 0)
        const mod = sum % 11
        return mod < 2 ? 0 : 11 - mod
    }

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    const d1 = calc(cnpj.slice(0, 12), w1)
    const d2 = calc(cnpj.slice(0, 12) + String(d1), w2)

    return cnpj.endsWith(`${d1}${d2}`)
}

// Heurística opcional (se backend devolver cnae_description)
const guessBusinessTypeFromCNAE = (cnaeDesc: string) => {
    const t = (cnaeDesc || "").toLowerCase()
    if (t.includes("padaria") || t.includes("confeitaria")) return "padaria"
    if (t.includes("bolo") || t.includes("doces") || t.includes("confeitaria")) return "casa_bolos"
    if (t.includes("restaurante") || t.includes("lanchonete") || t.includes("alimentacao")) return "restaurante"
    if (t.includes("bar") || t.includes("bebidas") || t.includes("servir bebidas")) return "bar"
    if (t.includes("bufê") || t.includes("buffet") || t.includes("eventos")) return "eventos"
    if (t.includes("combustiveis") || t.includes("posto") || t.includes("gasolina")) return "postos"
    if (t.includes("supermercado") || t.includes("mercearia") || t.includes("comercio varejista")) return "mercado"
    return ""
}

export const fetchCNPJData = async (cnpjFormatted: string): Promise<CNPJApiData> => {
    const cnpj = onlyDigits(cnpjFormatted)
    const res = await fetch(`${API_URL}/api/cnpj/${cnpj}`)
    const json = await res.json().catch(() => ({} as any))

    if (!res.ok || !json?.success) {
        throw new Error(json?.error || "Erro ao consultar CNPJ")
    }

    const d = json.data || {}

    const companyName = d.company_name || d.companyName || ""
    const tradeName = d.trade_name || d.tradeName || ""
    const status = d.status || ""
    const address: CNPJAddress = d.address || {}
    const cnaeDescription = d.cnae_description || d.cnaeDescription || ""

    return { companyName, tradeName, status, cnaeDescription, address }
}

async function fetchJSON<T>(url: string, init: RequestInit): Promise<T> {
    const res = await fetch(url, init)
    const json = (await res.json().catch(() => ({}))) as any

    if (!res.ok) {
        const msg = json?.error || "Erro na requisição"
        throw new Error(msg)
    }

    return json as T
}

export default function CompanySignupPage() {
    const router = useRouter()

    // Step 1 = credenciais | Step 2 = dados empresa
    const [step, setStep] = useState<Step>(1)

    // credenciais
    const [companyEmail, setCompanyEmail] = useState("")
    const [password, setPassword] = useState("")
    const [password2, setPassword2] = useState("")

    // dados empresa
    const [cnpj, setCnpj] = useState("")
    const [companyName, setCompanyName] = useState("")
    const [businessType, setBusinessType] = useState<BusinessTypeValue | "">("")
    const [description, setDescription] = useState("")
    const [username, setUsername] = useState("")
    const [imagemProfile, setImagemProfile] = useState("")

    // cnpj fetch
    const [cnpjLoading, setCnpjLoading] = useState(false)
    const [cnpjError, setCnpjError] = useState("")
    const cnpjReqRef = useRef(0)

    // submit
    const [submitLoading, setSubmitLoading] = useState(false)
    const [submitError, setSubmitError] = useState("")

    const cnpjDigits = useMemo(() => onlyDigits(cnpj), [cnpj])
    const cnpjIsComplete = cnpjDigits.length === 14

    const emailOk = useMemo(() => {
        const e = companyEmail.trim().toLowerCase()
        if (!e) return false
        if (!e.includes("@")) return false
        return true
    }, [companyEmail])

    const passwordOk = useMemo(() => {
        if (!password) return false
        if (password.length < 8) return false
        if (password !== password2) return false
        return true
    }, [password, password2])

    const usernameOk = useMemo(() => {
        const u = username.trim()
        if (!u) return false
        if (u.length < 3) return false
        if (/\s/.test(u)) return false
        return true
    }, [username])

    const step1Ok = useMemo(() => emailOk && passwordOk, [emailOk, passwordOk])

    const step2Ok = useMemo(() => {
        return (
            cnpjIsComplete &&
            isValidCNPJ(cnpj) &&
            !!companyName.trim() &&
            !!String(businessType).trim() &&
            !!description.trim() &&
            usernameOk
        )
    }, [cnpjIsComplete, cnpj, companyName, businessType, description, usernameOk])

    const handleCNPJChange = async (value: string) => {
        const formatted = formatCNPJ(value)
        setCnpj(formatted)
        setCnpjError("")

        if (onlyDigits(formatted).length !== 14) return

        if (!isValidCNPJ(formatted)) {
            setCnpjError("CNPJ inválido.")
            return
        }

        const reqId = ++cnpjReqRef.current
        setCnpjLoading(true)

        try {
            const data = await fetchCNPJData(formatted)
            if (reqId !== cnpjReqRef.current) return

            // preenche nome se vier
            if (data.companyName) setCompanyName(data.companyName)

            // tenta “chutar” business type por CNAE (se vier do backend)
            const guessed = guessBusinessTypeFromCNAE(data.cnaeDescription || "")
            const bt = String(guessed || "") as BusinessTypeValue
            const btIsValid = businessTypes.some((x) => x.value === bt)
            if (btIsValid) setBusinessType(bt)
        } catch (e) {
            if (reqId !== cnpjReqRef.current) return
            setCnpjError("Erro ao buscar dados do CNPJ. Tente novamente.")
        } finally {
            if (reqId === cnpjReqRef.current) setCnpjLoading(false)
        }
    }

    async function saveCompanyProfileWithUser() {
        const payload = {
            // USUÁRIO (admin da empresa)
            username: username.trim(),
            password,
            email: toNull(companyEmail)?.toLowerCase(),

            // EMPRESA
            cnpj: toNull(cnpj),
            company_name: toNull(companyName),
            company_email: toNull(companyEmail)?.toLowerCase(),
            business_type: toNull(businessType),
            company_description: toNull(description),
            imagem_profile: toNull(imagemProfile),

            // FUNCIONÁRIO (vazio)
            full_name: null,
            cpf: null,
            phone: null,

            // ENDEREÇO (vazio)
            address: null,
            number: null,
            complement: null,
            neighborhood: null,
            city: null,
            state: null,
        }

        const json = await fetchJSON<ApiOk<{ user_id?: number; id?: number }> | ApiErr>(`${API_URL}/api/user-profile`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        })

        if (!json?.success) {
            throw new Error((json as ApiErr)?.error || "Erro ao salvar cadastro da empresa")
        }

        const ok = json as ApiOk<{ user_id?: number; id?: number }>
        const userId = ok.user_id ?? ok.id
        if (!userId) throw new Error("Cadastro criado, mas o backend não retornou user_id.")
        return userId
    }

    async function handleFinish() {
        setSubmitError("")

        if (!step1Ok) {
            setSubmitError("Preencha e valide e-mail e senha antes de continuar.")
            setStep(1)
            return
        }
        if (!step2Ok) {
            setSubmitError("Preencha todos os dados da empresa antes de finalizar.")
            setStep(2)
            return
        }

        setSubmitLoading(true)
        try {
            const userId = await saveCompanyProfileWithUser()

            // dispara verificação
            await fetchJSON(`${API_URL}/api/auth/request-email-verification`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId }),
            })

            router.replace(`/verificar-email?user_id=${userId}`)
        } catch (err: any) {
            setSubmitError(err?.message || "Erro inesperado ao finalizar cadastro.")
        } finally {
            setSubmitLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <button
                        onClick={() => {
                            if (step === 2) setStep(1)
                            else router.push("/")
                        }}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>

                    <h1 className="text-lg font-semibold text-gray-900">
                        {step === 1 ? "Criar Acesso (Empresa)" : "Dados da Empresa"}
                    </h1>

                    <button className="p-2 hover:bg-gray-100 rounded-full">
                        <HelpCircle className="h-5 w-5 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 max-w-md mx-auto w-full p-4">
                {/* STEP 1: email + senha */}
                {step === 1 && (
                    <div className="space-y-6">
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Lock className="h-8 w-8 text-purple-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Criar Acesso</h2>
                            <p className="text-gray-600">Coloque seu e-mail e defina uma senha para prosseguir</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">E-mail *</label>
                            <input
                                type="email"
                                value={companyEmail}
                                onChange={(e) => setCompanyEmail(e.target.value)}
                                placeholder="contato@empresa.com.br"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                            />
                            {companyEmail.length > 0 && !emailOk && (
                                <p className="text-red-500 text-sm mt-1">Digite um e-mail válido.</p>
                            )}
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
                            <div className="flex items-center space-x-2 text-sm text-gray-700">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Mínimo de 8 caracteres</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-700">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Confirmação deve ser igual</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Senha *</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="********"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                            />
                            {password && password.length > 0 && password.length < 8 && (
                                <p className="text-red-500 text-sm mt-1">Senha muito curta (mín. 8).</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar senha *</label>
                            <input
                                type="password"
                                value={password2}
                                onChange={(e) => setPassword2(e.target.value)}
                                placeholder="********"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                            />
                            {password2 && password !== password2 && (
                                <p className="text-red-500 text-sm mt-1">As senhas não coincidem.</p>
                            )}
                        </div>
                    </div>
                )}

                {/* STEP 2: dados empresa */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="text-center py-4">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Building2 className="h-8 w-8 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Dados da Empresa</h2>
                            <p className="text-gray-600">Complete o cadastro para enviarmos a verificação de e-mail</p>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="relative w-24 h-24 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                                {imagemProfile ? (
                                    <img src={imagemProfile} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="h-12 w-12 text-gray-400" />
                                )}
                            </div>
                            <label className="mt-2 text-sm text-blue-600 font-medium cursor-pointer flex items-center justify-center space-x-1 hover:text-blue-700">
                                <User className="h-4 w-4" />
                                <span>Adicionar Foto de Perfil</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0];
                                        const reader = new FileReader();
                                        reader.onloadend = () => {
                                            setImagemProfile(reader.result as string);
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                            </label>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">CNPJ *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={cnpj}
                                    onChange={(e) => handleCNPJChange(e.target.value)}
                                    placeholder="00.000.000/0000-00"
                                    maxLength={18}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                                />
                                {cnpjLoading && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500" />
                                    </div>
                                )}
                            </div>
                            {cnpjError && <p className="text-red-500 text-sm mt-1">{cnpjError}</p>}
                            <p className="text-gray-500 text-xs mt-1">Ao completar o CNPJ, tentamos preencher automaticamente alguns dados.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome da Empresa *</label>
                            <input
                                type="text"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                placeholder="Digite o nome da empresa"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Negócio *</label>
                            <select
                                value={businessType}
                                onChange={(e) => setBusinessType(e.target.value as any)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                            >
                                <option value="">Selecione</option>
                                {businessTypes.map((t) => (
                                    <option key={t.value} value={t.value}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Descrição da Empresa *</label>
                            <textarea
                                rows={4}
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descreva sua empresa, área de atuação e experiência..."
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nome de usuário *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Digite seu nome de usuário"
                                    className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                                />
                                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                            </div>
                            {username.length > 0 && !usernameOk && (
                                <p className="text-red-500 text-sm mt-1">Use no mínimo 3 caracteres e não use espaços.</p>
                            )}
                        </div>
                    </div>
                )}

                {submitError && (
                    <div className="mt-6 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
                        {submitError}
                    </div>
                )}
            </div>

            {/* Footer botões */}
            <div className="bg-white border-t p-4">
                <div className="max-w-md mx-auto">
                    {step === 1 ? (
                        <button
                            onClick={() => setStep(2)}
                            disabled={!step1Ok}
                            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                        >
                            Continuar
                        </button>
                    ) : (
                        <button
                            onClick={handleFinish}
                            disabled={!step2Ok || submitLoading || cnpjLoading}
                            className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-purple-700 transition-colors"
                        >
                            {submitLoading ? "Enviando verificação..." : "Finalizar e verificar e-mail"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
