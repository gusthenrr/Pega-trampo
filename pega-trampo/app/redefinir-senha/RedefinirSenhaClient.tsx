"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Lock } from "lucide-react"

export default function RedefinirSenhaClient() {
    const searchParams = useSearchParams()

    const [token, setToken] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [success, setSuccess] = useState(false)

    // Ler token da URL e limpar imediatamente (mitigação de exposição)
    useEffect(() => {
        const t = searchParams.get("token") || ""
        if (t) {
            setToken(t)
            // Limpa o token da URL/histórico do navegador
            if (typeof window !== "undefined") {
                window.history.replaceState(null, "", "/redefinir-senha")
            }
        }
    }, [searchParams])

    const handleSubmit = async () => {
        setError("")

        if (!token) {
            setError("Link inválido. Solicite um novo link de redefinição.")
            return
        }

        if (password.length < 8) {
            setError("A senha deve ter no mínimo 8 caracteres")
            return
        }

        if (password !== confirmPassword) {
            setError("As senhas não coincidem")
            return
        }

        setLoading(true)

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || ""
            const res = await fetch(`${apiUrl}/api/auth/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, password }),
            })

            const data = await res.json()

            if (res.ok && data.success) {
                setSuccess(true)
            } else {
                setError(data.error || "Erro ao redefinir a senha")
            }
        } catch {
            setError("Erro de conexão com o servidor")
        } finally {
            setLoading(false)
        }
    }

    const goToHome = () => {
        window.location.href = "/"
    }

    return (
        <>
            {/* Mitigação: no-referrer impede vazamento do token em headers */}
            <meta name="referrer" content="no-referrer" />

            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center p-4">
                <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-white/90 shadow-2xl backdrop-blur-xl">
                    {/* Decor */}
                    <div className="absolute -top-24 left-1/2 h-48 w-[120%] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-2xl" />

                    <div className="relative p-8">
                        <div className="flex flex-col items-center">
                            {/* Icon */}
                            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
                                {success ? (
                                    <CheckCircle className="h-10 w-10 text-white" />
                                ) : (
                                    <Lock className="h-10 w-10 text-white" />
                                )}
                            </div>

                            {/* ═══════ SUCCESS ═══════ */}
                            {success ? (
                                <>
                                    <h2 className="mb-2 text-2xl font-bold text-gray-900">
                                        Senha redefinida!
                                    </h2>
                                    <p className="mb-8 text-center text-sm text-gray-600 max-w-xs">
                                        Sua senha foi alterada com sucesso. Faça login com sua nova senha.
                                    </p>

                                    <button
                                        onClick={goToHome}
                                        className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-4 font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/40 flex items-center justify-center"
                                    >
                                        Ir para login
                                    </button>
                                </>
                            ) : (
                                /* ═══════ FORM ═══════ */
                                <>
                                    <h2 className="mb-2 text-2xl font-bold text-gray-900">
                                        Nova senha
                                    </h2>
                                    <p className="mb-8 text-center text-sm text-gray-600">
                                        Crie uma nova senha para sua conta
                                    </p>

                                    {error && (
                                        <div className="mb-4 flex w-full items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                                            <AlertCircle size={16} className="flex-shrink-0" />
                                            <span>{error}</span>
                                        </div>
                                    )}

                                    <div className="w-full space-y-4">
                                        {/* Nova senha */}
                                        <div className="space-y-1">
                                            <label className="ml-1 text-sm font-medium text-gray-700">
                                                Nova senha
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showPassword ? "text" : "password"}
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    placeholder="Mínimo 8 caracteres"
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

                                        {/* Confirmar senha */}
                                        <div className="space-y-1">
                                            <label className="ml-1 text-sm font-medium text-gray-700">
                                                Confirmar senha
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirm ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    placeholder="Repita a nova senha"
                                                    className="w-full rounded-xl border border-black/10 bg-white/70 px-4 py-3 pr-12 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-500 text-gray-900"
                                                    disabled={loading}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirm(!showConfirm)}
                                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                    disabled={loading}
                                                >
                                                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleSubmit}
                                            disabled={loading}
                                            className="mt-4 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 py-4 font-bold text-white shadow-lg shadow-blue-500/25 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-500/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                        >
                                            {loading && <Loader2 className="animate-spin" size={20} />}
                                            {loading ? "Redefinindo..." : "Redefinir senha"}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}
