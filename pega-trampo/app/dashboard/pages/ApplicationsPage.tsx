import { Calendar, Clock, ChevronRight, Eye } from 'lucide-react'

export default function ApplicationsPage(props: any) {
    const { userProfile, myApplications, openSessionPanel, handleViewJobDetails } = props
    const sortedApplications = [...myApplications].sort((a: any, b: any) => {
        const aAccepted = ['aprovado', 'accepted'].includes(a.status?.toLowerCase())
        const bAccepted = ['aprovado', 'accepted'].includes(b.status?.toLowerCase())
        if (aAccepted !== bAccepted) return aAccepted ? -1 : 1

        const aApplied = new Date(a.appliedAt || 0).getTime()
        const bApplied = new Date(b.appliedAt || 0).getTime()
        return bApplied - aApplied
    })


    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 pt-4 pb-2">
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 shadow-lg max-w-md md:max-w-none">
                    <h2 className="text-lg font-bold text-white">{userProfile?.userType === 'company' ? 'Candidaturas nas Minhas Vagas' : 'Minhas Candidaturas'}</h2>
                    <p className="text-blue-100 text-sm mt-1">{userProfile?.userType === 'company' ? 'Usuarios que se candidataram nas suas vagas' : 'Trampos que voce ja se candidatou'}</p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 space-y-3">
                {myApplications.length === 0 ? (
                    <div className="bg-white p-4 rounded-xl border max-w-md">
                        <p className="text-gray-700 font-medium">{userProfile?.userType === 'company' ? 'Nenhum usuario se candidatou para suas vagas ainda.' : 'Voce ainda nao se candidatou em nenhum trampo.'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                        {sortedApplications.map((app: any) => {
                            const statusValue = app.status?.toLowerCase()
                            const isAccepted = ['aprovado', 'accepted'].includes(statusValue)
                            const isCancelled = ['cancelado', 'cancelled', 'canceled'].includes(statusValue)
                            const isFinished = ['finalizado', 'finished'].includes(statusValue)
                            return (
                                <div key={app.applicationId} className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all h-full flex flex-col ${isAccepted ? 'border-green-200 shadow-green-100' : isFinished ? 'border-blue-200 shadow-blue-100' : 'border-gray-100'}`}> 
                                    {isAccepted && (
                                        <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-2.5 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">Aceito</span>
                                                <span className="text-white font-bold text-sm">Voce foi aceito!</span>
                                            </div>
                                            <button
                                                onClick={() => openSessionPanel(app.applicationId)}
                                                className="bg-white text-green-700 text-xs font-bold px-3 py-1.5 rounded-full hover:bg-green-50 transition flex items-center gap-1"
                                            >
                                                <span>Ver Controle</span>
                                                <ChevronRight className="h-3 w-3" />
                                            </button>
                                        </div>
                                    )}

                                    <div className="p-4 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <p className="font-bold text-gray-900 break-words">{app.job.title.toUpperCase()}</p>
                                                {!isAccepted && (
                                                    <div className="mt-1 flex justify-end">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isCancelled ? 'bg-red-100 text-red-800' : isFinished ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                            {isCancelled ? 'CANCELADO' : isFinished ? 'FINALIZADO' : 'PENDENTE'}
                                                        </span>
                                                    </div>
                                                )}
                                                <p className="text-sm text-gray-600 mt-0.5">{app.job.address}</p>
                                                <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {app.job.startDate ? new Date(app.job.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'A combinar'}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="h-3 w-3" />
                                                        {app.job.startTime || 'A combinar'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-2 text-xs text-gray-400">
                                            Candidatado em: {new Date(app.appliedAt).toLocaleString()}
                                        </div>

                                        <button
                                            onClick={() => handleViewJobDetails(app.job)}
                                            className="w-full mt-3 border-t border-gray-100 pt-3 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            <span>Mais detalhes</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}





