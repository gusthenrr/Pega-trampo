"use client"

import React, { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, HelpCircle, User, Utensils, Sparkles, Lock, Check, Eye, EyeOff } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
const REGISTER_ENDPOINT = "/api/register"

const workerCategories = [
    { name: "Padeiro", icon: Utensils, description: "Pães, massas, fermentação" },
    { name: "Confeiteiro", icon: Utensils, description: "Doces, bolos, sobremesas" },
    { name: "Cozinheiro", icon: Utensils, description: "Culinária, eventos, restaurantes" },
    { name: "Copeiro/Bartender", icon: Utensils, description: "Bebidas, drinks, atendimento" },
    { name: "Atendente/Garçom", icon: User, description: "Atendimento, mesa, eventos" },
    { name: "Churrasqueiro", icon: Utensils, description: "Churrasco, carnes, eventos" },
    { name: "Chapeiro", icon: Utensils, description: "Chapeiro" },
    { name: "Diarista", icon: Sparkles, description: "Limpeza residencial e comercial" },
    { name: "Auxiliar da cozinha", icon: Utensils, description: "Auxiliar da cozinha" },
    { name: "Pizzaiolo", icon: Utensils, description: "Pizzaiolo" },
    { name: "Caixa", icon: Utensils, description: "Caixa" },
    { name: "Repostior/Estoquista", icon: Utensils, description: "Repostior/Estoquista" },
    { name: "Ajudande geral", icon: Utensils, description: "Ajudande geral" },
    { name: "Motoboy/Entregador", icon: Utensils, description: "Motoboy/Entregador" },
] as const

type Step = 1 | 2 | 3

type RegisterForm = {
    email: string
    password: string
    passwordConfirm: string
    category: string[]
    fullName: string
    cpf: string
    phone: string
    username: string
    imagemProfile: string
}

function onlyDigits(v: string) {
    return (v || "").replace(/\D/g, "")
}

function formatCPF(cpf: string): string {
    const clean = onlyDigits(cpf).slice(0, 11)
    const p1 = clean.slice(0, 3)
    const p2 = clean.slice(3, 6)
    const p3 = clean.slice(6, 9)
    const p4 = clean.slice(9, 11)

    let out = p1
    if (p2) out += `.${p2}`
    if (p3) out += `.${p3}`
    if (p4) out += `-${p4}`
    return out
}

function validateCPF(cpf: string): boolean {
    const clean = onlyDigits(cpf)
    if (clean.length !== 11) return false
    if (/^(\d)\1{10}$/.test(clean)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i)
    let remainder = (sum * 10) % 11
    if (remainder === 10) remainder = 0
    if (remainder !== parseInt(clean.charAt(9), 10)) return false

    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i)
    remainder = (sum * 10) % 11
    if (remainder === 10) remainder = 0
    if (remainder !== parseInt(clean.charAt(10), 10)) return false

    return true
}

// ✅ Igual ao verificar-email: se success=false, lança erro
async function postJSON(url: string, body: any) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({} as any))
    if (!res.ok || json?.success === false) {
        throw new Error(json?.error || json?.message || "Erro na requisição")
    }
    return json as any
}

export default function CadastroPage() {
    const router = useRouter()

    const [step, setStep] = useState<Step>(1)
    const [loading, setLoading] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string>("")
    const [successMsg, setSuccessMsg] = useState<string>("")

    const [form, setForm] = useState<RegisterForm>({
        email: "",
        password: "",
        passwordConfirm: "",
        category: [],
        fullName: "",
        cpf: "",
        phone: "",
        username: "",
        imagemProfile: "",
    })

    const [showPassword, setShowPassword] = useState(false)
    const [showPassword2, setShowPassword2] = useState(false)

    const emailOk = useMemo(() => {
        const e = form.email.trim().toLowerCase()
        if (!e) return false
        if (!e.includes("@")) return false
        return true
    }, [form.email])

    const passwordOk = useMemo(() => {
        if (!form.password) return false
        if (form.password.length < 6) return false
        if (form.passwordConfirm !== form.password) return false
        return true
    }, [form.password, form.passwordConfirm])

    const cpfIsValid = useMemo(() => {
        const clean = onlyDigits(form.cpf)
        if (clean.length < 11) return true
        return validateCPF(form.cpf)
    }, [form.cpf])

    const canGoStep2 = emailOk && passwordOk
    const canGoStep3 = form.category.length > 0

    const canSubmit =
        form.fullName.trim().length >= 3 &&
        onlyDigits(form.cpf).length === 11 &&
        cpfIsValid &&
        form.phone.trim().length >= 8 &&
        form.username.trim().length >= 3 &&
        !/\s/.test(form.username.trim())

    function back() {
        setErrorMsg("")
        setSuccessMsg("")
        setStep((s) => (s > 1 ? ((s - 1) as Step) : s))
    }

    function next() {
        setErrorMsg("")
        setSuccessMsg("")
        setStep((s) => (s < 3 ? ((s + 1) as Step) : s))
    }

    async function submit() {
        setErrorMsg("")
        setSuccessMsg("")

        if (!canSubmit) {
            setErrorMsg("Preencha os dados corretamente (CPF, telefone e username) antes de finalizar.")
            return
        }

        setLoading(true)
        try {
            const payload = {
                userType: "professional",
                category: form.category,
                full_name: form.fullName,
                cpf: onlyDigits(form.cpf),
                email: form.email.trim().toLowerCase(),
                phone: form.phone,
                username: form.username.trim(),
                password: form.password,
                imagem_profile: form.imagemProfile || null,
            }

            const data = await postJSON(`${API_URL}${REGISTER_ENDPOINT}`, payload)

            const userId = data?.user_id ?? data?.id
            if (!userId) {
                throw new Error("Conta criada, mas o backend não retornou user_id.")
            }

            await postJSON(`${API_URL}/api/auth/request-email-verification`, { user_id: userId })
            router.replace(`/verificar-email?user_id=${userId}`)
        } catch (err: any) {
            setErrorMsg(err?.message || "Erro ao cadastrar.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={() => (step === 1 ? router.push("/") : back())} className="p-2 hover:bg-gray-100 rounded-full" aria-label="Voltar">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>

                    <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">Cadastro</p>
                        <p className="text-xs text-gray-500">Etapa {step} de 3</p>
                    </div>

                    <button className="p-2 hover:bg-gray-100 rounded-full" aria-label="Ajuda">
                        <HelpCircle className="h-5 w-5 text-gray-400" />
                    </button>
                </div>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 max-w-md mx-auto w-full p-4">
                {errorMsg ? (
                    <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{errorMsg}</div>
                ) : null}

                {successMsg ? (
                    <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{successMsg}</div>
                ) : null}

                {/* STEP 1 */}
                {step === 1 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <Lock className="h-8 w-8 text-purple-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">Criar acesso</h2>
                            <p className="text-gray-600 text-sm">Digite seu e-mail e defina uma senha para continuar</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">E-mail *</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                                placeholder="seu@email.com"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                            />
                            {form.email.length > 0 && !emailOk && <p className="text-red-600 text-xs mt-1">E-mail inválido.</p>}
                        </div>

                        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-2">
                            <div className="flex items-center space-x-2 text-sm text-gray-700">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Mínimo 6 caracteres</span>
                            </div>
                            <div className="flex items-center space-x-2 text-sm text-gray-700">
                                <Check className="h-4 w-4 text-green-600" />
                                <span>Confirmação deve ser igual</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Senha *</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={form.password}
                                    onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                                    placeholder="mínimo 6 caracteres"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100"
                                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-500" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-500" />
                                    )}
                                </button>
                            </div>
                            {form.password && form.password.length < 6 ? <p className="text-red-600 text-xs mt-1">Senha muito curta.</p> : null}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar senha *</label>
                            <div className="relative">
                                <input
                                    type={showPassword2 ? "text" : "password"}
                                    value={form.passwordConfirm}
                                    onChange={(e) => setForm((p) => ({ ...p, passwordConfirm: e.target.value }))}
                                    placeholder="repita a senha"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword2((v) => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-gray-100"
                                    aria-label={showPassword2 ? "Ocultar senha" : "Mostrar senha"}
                                >
                                    {showPassword2 ? (
                                        <EyeOff className="h-5 w-5 text-gray-500" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-500" />
                                    )}
                                </button>
                            </div>
                            {form.passwordConfirm && form.passwordConfirm !== form.password ? (
                                <p className="text-red-600 text-xs mt-1">As senhas não conferem.</p>
                            ) : null}
                        </div>

                        <button
                            onClick={() => {
                                if (!canGoStep2) {
                                    setErrorMsg("Preencha e valide e-mail e senha para continuar.")
                                    return
                                }
                                next()
                            }}
                            disabled={!canGoStep2}
                            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                        >
                            Continuar
                        </button>
                    </div>
                )}

                {/* STEP 2 */}
                {step === 2 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Escolha sua categoria</h2>
                        <p className="text-gray-600 text-sm mb-5">Selecione a categoria do serviço que você realiza.</p>

                        <div className="space-y-3">
                            {workerCategories.map((c) => {
                                const Icon = c.icon
                                const selected = form.category.includes(c.name)
                                return (
                                    <button
                                        key={c.name}
                                        onClick={() => {
                                            setForm((p) => {
                                                const selected = p.category.includes(c.name)

                                                // se já está selecionada -> remove
                                                if (selected) {
                                                    return { ...p, category: p.category.filter((cat) => cat !== c.name) }
                                                }

                                                // se não está e já tem 3 -> não adiciona
                                                if (p.category.length >= 3) {
                                                    return p
                                                }

                                                // se não está -> adiciona
                                                return { ...p, category: [...p.category, c.name] }
                                            })
                                        }}
                                        className={[
                                            "w-full rounded-xl border p-4 flex items-center gap-4 transition-all",
                                            selected ? "bg-blue-50 border-blue-300 shadow-sm" : "bg-white border-gray-200 hover:bg-gray-50",
                                        ].join(" ")}
                                    >
                                        <div className={["w-12 h-12 rounded-full flex items-center justify-center", selected ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700"].join(" ")}>
                                            <Icon className="h-6 w-6" />
                                        </div>

                                        <div className="text-left flex-1">
                                            <p className="font-bold text-gray-900">{c.name}</p>
                                            <p className="text-sm text-gray-600">{c.description}</p>
                                        </div>
                                    </button>
                                )
                            })}
                        </div>

                        <div className="mt-5 space-y-3">
                            <button
                                onClick={() => {
                                    if (!canGoStep3) return
                                    next()
                                }}
                                disabled={!canGoStep3}
                                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                            >
                                Continuar
                            </button>

                            <button
                                onClick={back}
                                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Voltar
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 3 */}
                {step === 3 && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <h2 className="text-xl font-bold text-gray-900 mb-1">Seus dados</h2>
                        <p className="text-gray-600 text-sm mb-5">
                            Categoria: <span className="font-semibold">{form.category}</span>
                        </p>

                        <div className="flex flex-col items-center mb-6">
                            <div className="relative w-24 h-24 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                                {form.imagemProfile ? (
                                    <img src={form.imagemProfile} alt="Perfil" className="w-full h-full object-cover" />
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
                                            setForm(p => ({ ...p, imagemProfile: reader.result as string }));
                                        };
                                        reader.readAsDataURL(file);
                                    }
                                }} />
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome completo *</label>
                                <input
                                    value={form.fullName}
                                    onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                                    placeholder="Digite seu nome completo"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">CPF *</label>
                                <input
                                    value={form.cpf}
                                    onChange={(e) => setForm((p) => ({ ...p, cpf: formatCPF(e.target.value) }))}
                                    placeholder="000.000.000-00"
                                    maxLength={14}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                                />
                                {onlyDigits(form.cpf).length === 11 && !cpfIsValid ? <p className="text-red-600 text-xs mt-1">CPF inválido.</p> : null}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Telefone de contato *</label>
                                <input
                                    value={form.phone}
                                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                                    placeholder="(11) 99999-9999"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Nome da conta (username) *</label>
                                <input
                                    value={form.username}
                                    onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
                                    placeholder="ex: joao.silva"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                                />
                                <p className="text-xs text-gray-500 mt-1">Mínimo 3 caracteres e sem espaços.</p>
                            </div>

                            <button
                                onClick={submit}
                                disabled={!canSubmit || loading}
                                className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
                            >
                                {loading ? "Criando e enviando verificação..." : "Finalizar e verificar e-mail"}
                            </button>

                            <button
                                onClick={back}
                                disabled={loading}
                                className="w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                            >
                                Voltar
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-white border-t p-4">
                <div className="max-w-md mx-auto text-xs text-gray-500">
                    Categoria: <span className="font-semibold text-gray-700">{form.category || "—"}</span>
                </div>
            </div>
        </div>
    )
}
