
import { useState } from "react"
import { useRouter } from "next/navigation"
import { User, X, Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, Mail, CheckCircle } from "lucide-react"
import { broadcastSessionChanged } from "../lib/authChannel"

interface LoginModalProps {
    isOpen: boolean
    onClose: () => void
}

type ModalView = "login" | "forgot" | "forgot-sent"

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [view, setView] = useState<ModalView>("login")

    if (!isOpen) return null

    const waitForServerSession = async (apiUrl: string) => {
        const maxAttempts = 8

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const authRes = await fetch(`${apiUrl}/api/auth/me`, {
                method: "GET",
                credentials: "include",
                cache: "no-store",
            })

            console.log("waitForServerSession", {
                attempt,
                status: authRes.status,
            })

            if (authRes.ok) return true

            // Safari can occasionally lag in attaching a just-set cookie.
            if (attempt < maxAttempts) {
                await new Promise((resolve) => setTimeout(resolve, 120 * attempt))
            }
        }

        return false
    }

    const handleCadastrese = () => {
        setEmail("")
        setPassword("")
        setError("")
        setView("login")
        onClose()
    }

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Preencha todos os campos")
            return
        }

        setLoading(true)
        setError("")

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
            const res = await fetch(`${apiUrl}/api/login`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            })

            const data = await res.json()

            if (res.ok && data.success) {
                const sessionReady = await waitForServerSession(apiUrl)
                if (!sessionReady) {
                    setError("Sessão não foi validada. Tente novamente.")
                    return
                }

                if (typeof window !== 'undefined') {
                    sessionStorage.setItem('known_user_id', String(data.user.id))
                }

                // Notify other tabs that session changed
                broadcastSessionChanged('LOGIN')
                // Redirecionar para dashboard
                router.push("/dashboard")
                onClose()
            } else {
                setError(data.error || "Erro ao fazer login")
            }
        } catch (err) {
            console.error("Login error:", err)
            setError("Erro de conexão com o servidor")
        } finally {
            setLoading(false)
        }
    }

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Digite seu e-mail")
            return
        }

        setLoading(true)
        setError("")

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
            await fetch(`${apiUrl}/api/auth/forgot-password`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email })
            })
            // Sempre mostra sucesso (anti-enumeração)
            setView("forgot-sent")
        } catch (err) {
            console.error("Forgot password error:", err)
            setError("Erro de conexão com o servidor")
        } finally {
            setLoading(false)
        }
    }

    const goToForgot = () => {
        setError("")
        setPassword("")
        setView("forgot")
    }

    const goToLogin = () => {
        setError("")
        setPassword("")
        setView("login")
    }

    return (
        // OVERLAY (fundo)
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200 rounded-3xl overflow-hidden"
            role="dialog"
            aria-modal="true"
        >
            {/* Backdrop */}
            <button
                aria-label="Fechar modal"
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-[6px]"
            />

            {/* Card do Modal */}
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/90 shadow-2xl backdrop-blur-xl animate-in zoom-in-95 duration-200">
                {/* Header background decor */}
                <div className="absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-2xl" />

                <div className="relative p-6">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 rounded-full p-2 text-gray-500 hover:bg-black/5 hover:text-gray-700 transition-colors"
                    >
                        <X size={22} />
                    </button>

                    <div className="flex flex-col items-center">
                        {/* User / Mail Icon Circle */}
                        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                            {view === "login" ? (
                                <User className="h-10 w-10 text-white" />
                            ) : (
                                <Mail className="h-10 w-10 text-white" />
                            )}
                        </div>

                        {/* ═══════ LOGIN VIEW ═══════ */}
                        {view === "login" && (
                            <>
                                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                                    Bem vindo de volta!
                                </h2>

                                <p className="mb-8 text-center text-sm text-gray-600">
                                    Digite seu e-mail para acessar sua conta
                                </p>

                                {/* Error Message */}
                                {error && (
                                    <div className="mb-4 flex w-full items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                        <AlertCircle size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Form */}
                                <div className="w-full space-y-4">
                                    <div className="space-y-1">
                                        <label className="ml-1 text-sm font-medium text-gray-700">
                                            E-mail
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-500 text-gray-900"
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="ml-1 text-sm font-medium text-gray-700">
                                            Senha
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 pr-12 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-500 text-gray-900"
                                                disabled={loading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                disabled={loading}
                                            >
                                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Esqueceu a senha? */}
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={goToForgot}
                                            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                                        >
                                            Esqueceu a senha?
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleLogin}
                                        disabled={loading}
                                        className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-4 font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading && <Loader2 className="animate-spin" size={20} />}
                                        {loading ? "Entrando..." : "Entrar"}
                                    </button>
                                </div>

                                {/* Footer */}
                                <div className="mt-6 text-sm text-gray-700">
                                    Não tem uma conta?{" "}
                                    <button
                                        onClick={handleCadastrese}
                                        className="font-bold text-blue-700 hover:underline"
                                    >
                                        Cadastre-se
                                    </button>
                                </div>
                            </>
                        )}

                        {/* ═══════ FORGOT VIEW ═══════ */}
                        {view === "forgot" && (
                            <>
                                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                                    Esqueceu a senha?
                                </h2>

                                <p className="mb-8 text-center text-sm text-gray-600">
                                    Informe seu e-mail e enviaremos um link para redefinir sua senha
                                </p>

                                {error && (
                                    <div className="mb-4 flex w-full items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                        <AlertCircle size={16} />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <div className="w-full space-y-4">
                                    <div className="space-y-1">
                                        <label className="ml-1 text-sm font-medium text-gray-700">
                                            E-mail
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="seu@email.com"
                                            className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-500 text-gray-900"
                                            disabled={loading}
                                        />
                                    </div>

                                    <button
                                        onClick={handleForgotPassword}
                                        disabled={loading}
                                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-4 font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {loading && <Loader2 className="animate-spin" size={20} />}
                                        {loading ? "Enviando..." : "Enviar link"}
                                    </button>
                                </div>

                                <button
                                    onClick={goToLogin}
                                    className="mt-6 flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                                >
                                    <ArrowLeft size={16} />
                                    Voltar ao login
                                </button>
                            </>
                        )}

                        {/* ═══════ FORGOT-SENT VIEW ═══════ */}
                        {view === "forgot-sent" && (
                            <>
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                                    <CheckCircle className="h-7 w-7 text-green-600" />
                                </div>

                                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                                    Verifique seu e-mail
                                </h2>

                                <p className="mb-8 text-center text-sm text-gray-600 max-w-xs">
                                    Se o e-mail estiver cadastrado, enviaremos um link para redefinição de senha.
                                </p>

                                <button
                                    onClick={goToLogin}
                                    className="w-full max-w-xs rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-4 font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/40 flex items-center justify-center gap-2"
                                >
                                    Voltar ao login
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
