import { ArrowLeft, X, Edit, User, FileText, Briefcase, Mail, Building2 } from 'lucide-react'
import * as logic from '../pegaTrampo.logic'

export default function ProfilePage(props: any) {
    const {
        showHeader,
        setShowProfile,
        isEditingProfile,
        setIsEditingProfile,
        userProfile,
        setUserProfile,
        handleSaveProfile,
        userResume,
        setActiveTab,
        setShowResumeForm,
        setResumeStep,
    } = props

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col pt-[60px]">
            <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'} bg-white shadow-sm border-b`}>
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-gray-100 rounded-full">
                        <ArrowLeft className="h-5 w-5 text-gray-600" />
                    </button>
                    <h1 className="text-lg font-semibold text-gray-900">Perfil</h1>
                    <button
                        onClick={() => setIsEditingProfile(!isEditingProfile)}
                        className="p-2 hover:bg-gray-100 rounded-full"
                    >
                        {isEditingProfile ? <X className="h-5 w-5 text-gray-600" /> : <Edit className="h-5 w-5 text-gray-600" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-6">
                {isEditingProfile ? (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Editar Perfil</h2>

                        <div className="flex flex-col items-center mb-4">
                            <div className="relative w-24 h-24 rounded-full border-4 border-gray-200 overflow-hidden bg-gray-100 flex items-center justify-center">
                                {userProfile.imagem_profile ? (
                                    <img src={userProfile.imagem_profile} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="h-12 w-12 text-gray-400" />
                                )}
                            </div>
                            <label className="mt-2 text-sm text-blue-600 font-medium cursor-pointer flex items-center justify-center space-x-1 hover:text-blue-700">
                                <Edit className="h-4 w-4" />
                                <span>Alterar Foto</span>
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        const file = e.target.files[0]
                                        const reader = new FileReader()
                                        reader.onloadend = () => {
                                            setUserProfile({ ...userProfile, imagem_profile: reader.result as string })
                                        }
                                        reader.readAsDataURL(file)
                                    }
                                }} />
                            </label>
                        </div>

                        {userProfile.userType === 'company' ? (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Empresa</label>
                                    <input
                                        type="text"
                                        value={userProfile.companyInfo?.companyName || ''}
                                        onChange={(e) => setUserProfile({
                                            ...userProfile,
                                            companyInfo: { ...userProfile.companyInfo!, companyName: e.target.value }
                                        })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ramo de Atividade</label>
                                    <input
                                        type="text"
                                        value={userProfile.companyInfo?.businessType || ''}
                                        onChange={(e) => setUserProfile({
                                            ...userProfile,
                                            companyInfo: { ...userProfile.companyInfo!, businessType: e.target.value }
                                        })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        value={userProfile.phone}
                                        onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                                    />
                                </div>

                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-2">
                                    <div>
                                        <span className="text-xs text-gray-500 block">CNPJ (Nao editavel)</span>
                                        <span className="font-mono text-sm font-medium text-gray-700">
                                            {userProfile.companyInfo?.cnpj || 'Nao informado'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-gray-500 block">Email (Nao editavel)</span>
                                        <span className="text-sm font-medium text-gray-700">
                                            {userProfile.companyInfo?.email || userProfile.email}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={userProfile.name}
                                        onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                    <input
                                        type="text"
                                        value={userProfile.phone}
                                        onChange={(e) => setUserProfile({ ...userProfile, phone: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                                    />
                                </div>

                                <div className="min-w-0 w-full truncate">
                                    <label className="block text-sm font-medium text-gray-700 mb-1 truncate">Data de Nascimento</label>
                                    <input
                                        type="date"
                                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                                        value={userProfile.birthDate || ''}
                                        onChange={(e) => setUserProfile({ ...userProfile, birthDate: e.target.value })}
                                        className="w-full p-3 text-sm bg-white appearance-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black min-w-0"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            onClick={handleSaveProfile}
                            className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors mt-4"
                        >
                            Salvar Alteracoes
                        </button>
                    </div>
                ) : (
                    <div className="bg-yellow-300 rounded-xl p-6 text-center">
                        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden shadow-sm">
                            {userProfile.imagem_profile ? (
                                <img src={userProfile.imagem_profile} alt="Perfil" className="w-full h-full object-cover" />
                            ) : (
                                <User className="h-10 w-10 text-gray-600" />
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-1">{userProfile.name || userProfile.username || 'Nome do Usuario'}</h2>
                        <div className="mt-2 text-center flex flex-col items-center gap-2">
                            {userProfile.userType === 'company' ? (
                                <span className="inline-block bg-black/10 text-gray-800 font-bold px-4 py-1.5 rounded-full text-sm shadow-sm backdrop-blur-sm">
                                    {userProfile.companyInfo?.companyName || 'Empresa'}
                                </span>
                            ) : (
                                (logic.getWorkerCategoryList({ workerCategory: userProfile.workerCategory || userProfile.profession }).length > 0
                                    ? logic.getWorkerCategoryList({ workerCategory: userProfile.workerCategory || userProfile.profession })
                                    : ['Profissao']).map((cat, idx) => (
                                        <span key={idx} className="inline-block bg-black/10 text-gray-800 font-bold px-4 py-1.5 rounded-full text-sm shadow-sm backdrop-blur-sm">
                                            {cat}
                                        </span>
                                    ))
                            )}
                        </div>
                        <p className="text-gray-700 text-sm mt-1">
                            {userProfile.city && userProfile.state ? `${userProfile.city} - ${userProfile.state}` : 'Localizacao nao definida'}
                        </p>

                        {userProfile.userType === 'professional' && !userResume.id && (
                            <div className="mt-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-800">Complete seu curriculo</span>
                                    <span className="text-sm font-bold text-gray-900">90%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {userProfile.userType === 'professional' && !userResume.id && (
                    <div className="mt-4">
                        <button
                            onClick={() => {
                                setShowProfile(false)
                                setActiveTab('resumes')
                                setShowResumeForm(true)
                                setResumeStep(1)
                            }}
                            className="w-full bg-blue-500 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-600 transition-all shadow-md flex items-center justify-center space-x-2"
                        >
                            <FileText className="h-5 w-5" />
                            <span>Adicionar Curriculo</span>
                        </button>
                    </div>
                )}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-4 overflow-hidden">
                    <div className="p-4 bg-gray-50 border-b border-gray-100">
                        <h3 className="font-bold text-gray-900">Informacoes Detalhadas</h3>
                    </div>

                    <div className="p-4 space-y-4">
                        {userProfile.userType === 'company' ? (
                            <>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Sobre a Empresa</p>
                                    <p className="text-gray-700 text-sm">
                                        {userProfile.companyInfo?.description || 'Nenhuma descricao informada.'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-2">Ramo de Atividade</p>
                                        <div className="bg-gradient-to-r from-teal-500 to-emerald-600 p-4 rounded-xl shadow-sm text-white flex items-center space-x-3 transform transition-transform hover:-translate-y-0.5 hover:shadow-md">
                                            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                                <Briefcase className="h-6 w-6 text-white" />
                                            </div>
                                            <span className="font-bold text-lg capitalize tracking-wide drop-shadow-sm">
                                                {userProfile.companyInfo?.businessType || 'Nao informado'}
                                            </span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">CNPJ</p>
                                        <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 p-2 rounded-lg">
                                            <Building2 className="h-4 w-4 text-gray-500" />
                                            <span className="font-medium font-mono">
                                                {userProfile.companyInfo?.cnpj || 'Nao informado'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-1">Contato</p>
                                    <div className="flex items-center space-x-2 text-gray-700">
                                        <Mail className="h-4 w-4 text-gray-400" />
                                        <span>{userProfile.companyInfo?.email || userProfile.email}</span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold mb-2">Profissao / Categoria</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {(logic.getWorkerCategoryList({ workerCategory: userResume.professionalInfo?.category || userProfile.workerCategory || userProfile.profession }).length > 0
                                            ? logic.getWorkerCategoryList({ workerCategory: userResume.professionalInfo?.category || userProfile.workerCategory || userProfile.profession })
                                            : ['Nao informado']).map((cat, idx) => (
                                                <div key={idx} className="bg-gradient-to-r from-blue-500 to-indigo-600 p-4 rounded-xl shadow-sm text-white flex items-center space-x-3 transform transition-transform hover:-translate-y-0.5 hover:shadow-md">
                                                    <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                                                        <User className="h-6 w-6 text-white" />
                                                    </div>
                                                    <span className="font-bold text-lg capitalize tracking-wide drop-shadow-sm">
                                                        {cat}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                </div>

                                {userProfile.bio && (
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Biografia</p>
                                        <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-lg italic">
                                            "{userProfile.bio}"
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Detalhes</p>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                                                <span className="text-gray-500">Experiencia</span>
                                                <span className="font-medium text-gray-900">{userResume.professionalInfo?.experience || userProfile.experience || 'N/A'}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                                                <span className="text-gray-500">Cidade</span>
                                                <span className="font-medium text-gray-900">{userProfile.city} - {userProfile.state}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

