import {
    Search,
    Calendar,
    Filter,
    Building2,
    Wallet,
    Clock,
    Briefcase as BriefcaseIcon,
    Plus,
    MapPin,
    DollarSign,
    Utensils,
} from 'lucide-react'

export default function JobsPage(props: any) {
    const {
        userProfile,
        searchTerm,
        setSearchTerm,
        selectedDate,
        setSelectedDate,
        selectedCategory,
        setSelectedCategory,
        categories,
        btnAgendaRef,
        setOpenAgenda,
        filteredJobs,
        handleViewJobDetails,
        setEditingJobId,
        setNewJobPost,
        setShowJobPostForm,
        updateDuration,
        initialJobPostState,
        handleEditJob,
        handleDeleteJob,
        formatRelativeDate,
    } = props

    return (
        <>
            {userProfile.userType === 'professional' && (
                <div className="bg-white border-b p-4 space-y-3">
                    <div className="max-w-6xl mx-auto space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Buscar por: cozinheiro, padeiro, diarista..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder-gray-600 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <button
                                    ref={btnAgendaRef}
                                    onClick={() => setOpenAgenda(true)}
                                    className={`h-9 w-9 rounded-full flex items-center justify-center border transition-all shadow-sm ${selectedDate ? 'bg-blue-600 text-white border-blue-600 shadow-blue-500/30' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
                                >
                                    <Calendar className="h-4 w-4" />
                                </button>

                                <div className="flex items-center border border-gray-300/80 rounded-full bg-gray-50/50 hover:bg-gray-100/50 transition-colors px-1 h-9">
                                    <div className="pl-3 pr-1 flex items-center h-full">
                                        <Filter className="h-3.5 w-3.5 text-gray-500" />
                                    </div>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="pr-2 py-1.5 text-xs font-medium text-gray-700 focus:ring-0 min-w-[100px] border-none outline-none bg-transparent appearance-none cursor-pointer"
                                        style={{ WebkitAppearance: 'none' }}
                                    >
                                        {categories.map((category: string) => (
                                            <option key={category} value={category}>{category}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {(searchTerm || selectedDate || selectedCategory !== 'Recomendado') && (
                                <button
                                    onClick={() => {
                                        setSearchTerm('')
                                        setSelectedDate('')
                                        setSelectedCategory('Recomendado')
                                    }}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 whitespace-nowrap bg-blue-50 px-3 py-1.5 rounded-full"
                                >
                                    Limpar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="p-4">
                <div className="max-w-6xl mx-auto">
                    <div className="space-y-4">
                        <h2 className="text-gray-900 font-bold text-xl mb-4">
                            {userProfile.userType === 'company' ? 'Minhas propostas de trabalho' : 'Propostas de trabalho'}
                        </h2>

                        {userProfile.userType === 'professional' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                                    {filteredJobs.map((job: any) => (
                                        <div key={job.id} className="bg-white rounded-2xl shadow-sm border border-gray-300 overflow-hidden h-full flex flex-col">
                                            <div className="p-4 pb-1 flex-1">
                                                <div className="flex items-start gap-3">
                                                    <div className="w-12 h-12 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                        {(job.companyInfo as any)?.imagem_profile || (job.companyInfo as any)?.profile_image_url || (job.companyInfo as any)?.logo || (job.companyInfo as any)?.profilePhoto ? (
                                                            <img src={(job.companyInfo as any)?.imagem_profile || (job.companyInfo as any)?.profile_image_url || (job.companyInfo as any)?.logo || (job.companyInfo as any)?.profilePhoto} alt={job.companyInfo?.name || 'Empresa'} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Building2 className="h-5 w-5 text-gray-700" />
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h4 className="text-base font-bold text-gray-900 leading-snug truncate">
                                                            {job.companyInfo?.name || job.postedBy || 'Estabelecimento'}
                                                        </h4>
                                                        <p className="text-xs text-gray-600 truncate">{job.title || 'Cargo'}</p>
                                                    </div>
                                                </div>

                                                <div className="my-3 border-t border-gray-300" />

                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <Wallet className="h-4 w-4 text-gray-700" />
                                                            <span className="text-sm">Valor</span>
                                                        </div>
                                                        <span className="text-sm font-bold text-green-600">R$ {job.rate}</span>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <Calendar className="h-4 w-4 text-gray-700" />
                                                            <span className="text-sm">Data</span>
                                                        </div>
                                                        <span className="text-sm text-gray-900">
                                                            {job.startDate ? new Date(job.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'A combinar'}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 text-gray-900">
                                                            <Clock className="h-4 w-4 text-gray-700" />
                                                            <span className="text-sm">Horario</span>
                                                        </div>
                                                        <span className="text-sm font-medium text-gray-900">{job.startTime || 'A combinar'}</span>
                                                    </div>
                                                </div>

                                                <div className="mt-2 border-t border-gray-300" />
                                            </div>

                                            <button
                                                onClick={() => handleViewJobDetails(job)}
                                                className="w-full py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50/50 transition"
                                            >
                                                Detalhes
                                            </button>
                                        </div>
                                    ))}
                                </div>

                                {filteredJobs.length === 0 && (
                                    <div className="text-center py-12">
                                        <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma proposta encontrada</h3>
                                        <p className="text-gray-500">
                                            {searchTerm
                                                ? `Nenhuma proposta encontrada para "${searchTerm}". Tente outras palavras-chave como "cozinheiro", "padeiro" ou "diarista".`
                                                : 'Aguarde novas propostas serem publicadas nessa area de atuacao.'}
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {userProfile.userType === 'company' && (
                            <div className="space-y-4">
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => {
                                            setEditingJobId(null)
                                            setNewJobPost(initialJobPostState)
                                            setShowJobPostForm(true)
                                            updateDuration(1, 'dia')
                                        }}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                    >
                                        <Plus className="h-5 w-5" />
                                        <span>Publicar Nova Vaga</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
                                    {filteredJobs.map((job: any) => (
                                        <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-full flex flex-col">
                                            <div className="flex flex-wrap items-start justify-between mb-3 gap-2">
                                                <div className="flex items-center gap-3 flex-1 min-w-[150px]">
                                                    <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm">
                                                        {(job.companyInfo as any)?.imagem_profile || (job.companyInfo as any)?.profile_image_url || (job.companyInfo as any)?.logo || (job.companyInfo as any)?.profilePhoto ? (
                                                            <img src={(job.companyInfo as any)?.imagem_profile || (job.companyInfo as any)?.profile_image_url || (job.companyInfo as any)?.logo || (job.companyInfo as any)?.profilePhoto} alt={job.companyInfo?.name || 'Empresa'} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <Building2 className="h-4 w-4 text-gray-700" />
                                                        )}
                                                    </div>
                                                    <h3 className="font-bold text-gray-900 text-lg break-words">{job.title.toUpperCase()}</h3>
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 shrink-0">
                                                    {job.isUrgent && <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">URGENTE</div>}
                                                    {job.includesFood && <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">ALIMENTACAO</div>}
                                                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">ATIVA</div>
                                                </div>
                                            </div>

                                            <p className="text-gray-600 text-sm mb-3">{job.description || ''}</p>

                                            <div className="grid grid-cols-1 gap-2 text-sm mb-4 flex-1">
                                                <div className="flex items-center text-gray-600">
                                                    <MapPin className="h-4 w-4 mr-2" />
                                                    <span>{job.address}</span>
                                                </div>
                                                <div className="flex items-center text-gray-600">
                                                    <DollarSign className="h-4 w-4 mr-2" />
                                                    <span className="font-medium text-green-600">
                                                        R$ {job.rate}{job.paymentType === 'hourly' ? '/hora' : job.paymentType === 'daily' ? '/dia' : job.paymentType === 'monthly' ? '/mes' : ' (projeto)'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center text-gray-600">
                                                    <Calendar className="h-4 w-4 mr-2" />
                                                    <span>{job.startDate ? new Date(job.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'} / {job.startTime || 'Sem horario'}</span>
                                                </div>
                                                <div className="flex items-center text-gray-600">
                                                    <Clock className="h-4 w-4 mr-2" />
                                                    <span>{job.workHours} - {job.period}</span>
                                                </div>
                                                {job.includesFood && (
                                                    <div className="flex items-center text-green-600">
                                                        <Utensils className="h-4 w-4 mr-2" />
                                                        <span>Inclui alimentacao</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                                                <div className="flex items-center space-x-2">
                                                    <button onClick={() => handleEditJob(job)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
                                                    <span className="text-gray-300">|</span>
                                                    <button onClick={() => handleDeleteJob(job.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Excluir</button>
                                                    <span className="text-gray-300">|</span>
                                                    <div className="text-sm text-gray-500">{formatRelativeDate(job.postedAt)}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {filteredJobs.length === 0 && (
                                    <div className="text-center py-12">
                                        <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma proposta publicada</h3>
                                        <p className="text-gray-500 mb-4">Publique sua primeira proposta de trabalho para encontrar profissionais qualificados.</p>
                                        <button
                                            onClick={() => {
                                                setEditingJobId(null)
                                                setNewJobPost(initialJobPostState)
                                                setShowJobPostForm(true)
                                                updateDuration(1, 'dia')
                                            }}
                                            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                                        >
                                            Publicar Proposta
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </>
    )
}

