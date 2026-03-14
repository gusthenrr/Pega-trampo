import { Search, FileText, ChevronRight, User, Briefcase, Mail, Edit, Trash2 } from 'lucide-react'

import * as logic from '../pegaTrampo.logic'
export default function ResumesPage(props: any) {
    const {
        userProfile,
        resumeSearchTerm,
        setResumeSearchTerm,
        filteredResumes,
        setShowResumeForm,
        setResumeStep,
        companyJobsWithCandidates,
        setCandidatesModalJob,
        setCandidateSearchTerm,
        getResumeProfileImageUrl,
        handleViewResumeDetails,
        handleEditResume,
    } = props

    const getResumeExperiencePreview = (resume: any) => {
        const directExperience = String(resume?.professionalInfo?.experience || '').trim()
        if (directExperience) return directExperience

        const firstWorkExperience = Array.isArray(resume?.workExperience) ? resume.workExperience[0] : null
        if (!firstWorkExperience) return 'Experiencia nao informada'

        const position = String(firstWorkExperience.position || '').trim()
        const company = String(firstWorkExperience.company || '').trim()

        if (position && company) return `${position} - ${company}`
        if (position) return position
        if (company) return company

        return 'Experiencia nao informada'
    }

    return (
        <div className="max-w-6xl mx-auto space-y-4 px-4 sm:px-0">
            {userProfile.userType === 'company' ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3 max-w-3xl mx-auto">
                    <h2 className="text-lg font-bold text-gray-900">Curriculos</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar profissional..."
                            value={resumeSearchTerm}
                            onChange={(e) => setResumeSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder-gray-600 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
            ) : (
                <div className="flex items-center justify-between pt-4 lg:px-1">
                    <h2 className="text-2xl font-bold text-gray-900">Meu Curriculo</h2>
                </div>
            )}

            {filteredResumes.length === 0 ? (
                <div className="text-center py-12 max-w-3xl mx-auto">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum curriculo encontrado</h3>
                    <p className="text-gray-500 mb-4">
                        {resumeSearchTerm
                            ? `Nenhum curriculo encontrado para "${resumeSearchTerm}".`
                            : userProfile.userType === 'professional'
                                ? 'Crie seu curriculo para se candidatar as vagas!'
                                : 'Aqui aparecerao os curriculos de pessoas interessadas nas suas propostas.'}
                    </p>
                    {userProfile.userType === 'professional' && (
                        <button
                            onClick={() => {
                                setShowResumeForm(true)
                                setResumeStep(1)
                            }}
                            className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                        >
                            Cadastrar Curriculo
                        </button>
                    )}
                </div>
            ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                    {userProfile.userType === 'company' ? (
                        companyJobsWithCandidates.length === 0 ? (
                            <div className="text-center py-8 mx-auto">
                                <p className="text-gray-500">Nenhuma vaga postada ainda.</p>
                            </div>
                        ) : (
                            companyJobsWithCandidates.map((job: any) => {
                                const hasCandidates = job.candidates && job.candidates.length > 0

                                return (
                                    <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-w-3xl mx-1 sm:mx-0">
                                        <div
                                            className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex justify-between items-center"
                                            onClick={() => {
                                                if (hasCandidates) {
                                                    setCandidatesModalJob(job)
                                                    setCandidateSearchTerm('')
                                                }
                                            }}
                                        >
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                                                <p className="text-sm text-gray-500">{hasCandidates ? `${job.candidates.length} interessado(s)` : 'Sem interessados ainda'}</p>
                                            </div>
                                            {hasCandidates && (
                                                <div className="text-blue-500">
                                                    <ChevronRight className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )
                    ) : (
                        filteredResumes.map((resume: any) => {
                            const resumePhoto = getResumeProfileImageUrl(resume, userProfile)
                            const visibleSkills = (resume.skills || []).slice(0, 5)

                            return (
                                <div key={resume.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden lg:max-w-none">
                                    <button
                                        type="button"
                                        onClick={() => handleViewResumeDetails(resume)}
                                        className="w-full p-4 lg:p-6 text-left hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="flex items-start gap-4 lg:gap-6">
                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0 lg:w-20 lg:h-20">
                                                {resumePhoto ? (
                                                    <img src={resumePhoto} alt={`Foto de ${resume.personalInfo.name}`} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="h-7 w-7" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div>
                                                        <h3 className="font-bold text-gray-900 text-lg lg:text-xl">{resume.personalInfo.name}</h3>
                                                        <p className="text-sm lg:text-base text-gray-600">
                                                            {logic.getWorkerCategoryLabel({ workerCategory: (resume as any).workerCategory || resume.professionalInfo.category })}
                                                        </p>
                                                    </div>
                                                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${resume.isVisible ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                                                        {resume.isVisible ? 'Visivel' : 'Oculto'}
                                                    </span>
                                                </div>
                                                <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2 lg:gap-3 text-sm text-gray-600">
                                                    <div className="flex items-center gap-2">
                                                        <Briefcase className="h-4 w-4 text-gray-400" />
                                                        <span>{getResumeExperiencePreview(resume)}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="h-4 w-4 text-gray-400" />
                                                        <span className="truncate">{resume.personalInfo.email || 'E-mail nao informado'}</span>
                                                    </div>
                                                </div>
                                                {resume.bio && <p className="mt-3 text-sm lg:text-base text-gray-600 line-clamp-3">{resume.bio}</p>}
                                                {visibleSkills.length > 0 && (
                                                    <div className="mt-3 flex flex-wrap gap-2">
                                                        {visibleSkills.map((skill: string, index: number) => (
                                                            <span key={`${resume.id}-${skill}-${index}`} className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-medium">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {(resume.skills || []).length > 5 && (
                                                            <span className="text-gray-400 text-xs flex items-center">+{(resume.skills || []).length - 5}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </button>

                                    <div className="px-4 pb-3 lg:px-6 lg:pb-5 flex gap-2">
                                        <button
                                            onClick={() => handleEditResume(resume)}
                                            className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors"
                                        >
                                            <Edit className="h-4 w-4" />
                                            <span>Editar</span>
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
