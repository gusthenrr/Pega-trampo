"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.15.77:5000"

async function postJSON(url: string, body: any) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || !json?.success) throw new Error(json?.error || "Erro na requisição")
    return json
}

export default function VerificarEmailPage() {
    const router = useRouter()
    const sp = useSearchParams()

    const userId = sp.get("user_id") || ""
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [msg, setMsg] = useState<string>("")
    const [err, setErr] = useState<string>("")

    const canVerify = useMemo(() => code.replace(/\D/g, "").length === 6 && !!userId, [code, userId])

    const verify = async () => {
        setErr("")
        setMsg("")
        if (!canVerify) return

        setLoading(true)
        try {
            await postJSON(`${API_URL}/api/auth/verify-email`, { user_id: userId, code })
            setMsg("E-mail verificado com sucesso! Redirecionando...")
            setTimeout(() => router.replace("/"), 700)
        } catch (e: any) {
            setErr(e?.message || "Código inválido")
        } finally {
            setLoading(false)
        }
    }

    const resend = async () => {
        setErr("")
        setMsg("")
        setLoading(true)
        try {
            await postJSON(`${API_URL}/api/auth/request-email-verification`, { user_id: userId })
            setMsg("Código reenviado! Verifique seu e-mail.")
        } catch (e: any) {
            setErr(e?.message || "Erro ao reenviar")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-md mx-auto px-4 py-4">
                    <h1 className="text-lg font-semibold text-gray-900">Verificar e-mail</h1>
                    <p className="text-sm text-gray-600">Digite o código de 6 dígitos que enviamos para o seu e-mail.</p>
                </div>
            </div>

            <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-4">
                {err && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{err}</div>}
                {msg && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">{msg}</div>}

                <div className="bg-white rounded-xl border border-gray-100 p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Código</label>
                    <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder:text-gray-700"
                    />

                    <button
                        onClick={verify}
                        disabled={!canVerify || loading}
                        className="mt-4 w-full bg-blue-600 text-white py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors"
                    >
                        {loading ? "Verificando..." : "Verificar"}
                    </button>

                    <button
                        onClick={resend}
                        disabled={!userId || loading}
                        className="mt-3 w-full border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-60"
                    >
                        Reenviar código
                    </button>
                </div>
            </div>
        </div>
    )
}
