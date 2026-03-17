import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, Briefcase, Building2, Calendar, Wallet } from 'lucide-react'
import type { UserProfile, WalletSummary, WalletTransaction } from '../../types/pegatrampo'

type WalletActionType = 'deposit' | 'withdraw'

export default function WalletPage(props: {
    userProfile: UserProfile
    walletSummary: WalletSummary | null
    walletLoading: boolean
    walletActionLoading: boolean
    onSubmitAction: (params: { requestType: WalletActionType, amount: number, note?: string }) => Promise<void>
}) {
    const { userProfile, walletSummary, walletLoading, walletActionLoading, onSubmitAction } = props
    const [actionType, setActionType] = useState<WalletActionType | null>(null)
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')

    const isCompany = userProfile.userType === 'company'
    const title = isCompany ? 'Carteira da empresa' : 'Carteira do funcionario'
    const subtitle = isCompany ? 'Saldo interno para pagamentos ficticios' : 'Saldo interno simulado dos trabalhos validados'

    const cards = useMemo(() => {
        if (!walletSummary) return []

        if (isCompany) {
            return [
                { label: 'Saldo total', value: walletSummary.balanceTotal },
                { label: 'Saldo reservado', value: walletSummary.balanceReserved },
                { label: 'Saldo disponivel', value: walletSummary.balanceAvailable },
                { label: 'Funcionarios contratados', value: walletSummary.hiredWorkersCount, isMoney: false },
            ]
        }

        return [
            { label: 'Saldo total', value: walletSummary.balanceTotal },
            { label: 'Saldo do mes', value: walletSummary.balanceMonth },
            { label: 'Saldo disponivel', value: walletSummary.balanceAvailable },
            { label: 'Trabalhos feitos', value: walletSummary.completedJobs, isMoney: false },
        ]
    }, [isCompany, walletSummary])

    const closeModal = () => {
        setActionType(null)
        setAmount('')
        setNote('')
    }

    const submit = async () => {
        const parsed = Number(amount.replace(',', '.'))
        if (!Number.isFinite(parsed) || parsed <= 0) {
            alert('Informe um valor valido.')
            return
        }
        await onSubmitAction({ requestType: actionType!, amount: parsed, note })
        closeModal()
    }

    const formatMoney = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

    const renderTransactionIcon = (tx: WalletTransaction) => {
        if (tx.direction === 'credit') return <ArrowDownLeft className="h-4 w-4 text-emerald-600" />
        return <ArrowUpRight className="h-4 w-4 text-rose-600" />
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-white via-sky-50 to-slate-100">
            <div className="max-w-6xl mx-auto p-4 space-y-4">
                <div className="rounded-3xl border border-sky-100 bg-gradient-to-br from-white via-sky-50 to-blue-100 text-slate-900 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-violet-500">Carteira simulada</p>
                            <h2 className="text-xl font-bold mt-1.5">{title}</h2>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-white border border-sky-100 flex items-center justify-center shadow-sm">
                            <Wallet className="h-6 w-6 text-sky-700" />
                        </div>
                    </div>
                </div>

                {walletLoading ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
                        Carregando carteira...
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {cards.map((card) => (
                                <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                    <p className="text-sm text-slate-500">{card.label}</p>
                                    <p className="text-2xl font-bold text-slate-900 mt-2">
                                        {card.isMoney === false ? Number(card.value).toLocaleString('pt-BR') : formatMoney(Number(card.value))}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Acoes da carteira</h3>
                                    <p className="text-sm text-slate-500">Fluxo interno ficticio, sem banco ou Pix nesta versao.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {isCompany && (
                                        <button
                                            onClick={() => setActionType('deposit')}
                                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                                        >
                                            Adicionar saldo
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setActionType('withdraw')}
                                        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                    >
                                        Sacar
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-200">
                                <h3 className="text-lg font-bold text-slate-900">Historico</h3>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {(walletSummary?.transactions || []).length === 0 ? (
                                    <div className="p-6 text-sm text-slate-500">Nenhuma movimentacao registrada ainda.</div>
                                ) : (
                                    (walletSummary?.transactions || []).map((tx) => (
                                        <div key={tx.id} className="p-4 flex items-start justify-between gap-4">
                                            <div className="flex items-start gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                    {renderTransactionIcon(tx)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{tx.description || tx.kind}</p>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                                                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(tx.createdAt).toLocaleString('pt-BR')}</span>
                                                        <span className="capitalize">{tx.status}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <p className={`font-bold ${tx.direction === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                {tx.direction === 'credit' ? '+' : '-'} {formatMoney(tx.amount)}
                                            </p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-blue-100 flex items-center justify-center">
                                        {isCompany ? <Building2 className="h-5 w-5 text-blue-700" /> : <Briefcase className="h-5 w-5 text-blue-700" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">{isCompany ? 'Empresa' : 'Funcionario'}</p>
                                        <p className="text-sm text-slate-500">
                                            {isCompany ? 'Os pagamentos so saem do saldo apos a validacao final.' : 'Os creditos entram apenas quando o servico e validado.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {actionType && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
                    <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl p-6 space-y-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Carteira simulada</p>
                            <h3 className="text-xl font-bold text-slate-900 mt-2">
                                {actionType === 'deposit' ? 'Adicionar saldo ficticio' : 'Sacar saldo ficticio'}
                            </h3>
                        </div>

                        <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Valor</span>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                                placeholder="0,00"
                            />
                        </label>

                        <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Observacao</span>
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 min-h-24"
                                placeholder="Opcional"
                            />
                        </label>

                        <div className="flex gap-3">
                            <button
                                onClick={closeModal}
                                className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={submit}
                                disabled={walletActionLoading}
                                className="flex-1 rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
                            >
                                {walletActionLoading ? 'Processando...' : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
