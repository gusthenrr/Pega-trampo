'use client'

import type { Dispatch, SetStateAction } from 'react'

import {
    Job,
    UserProfile,
    Notification,
    CompanyJobPost,
    Resume,
    CompanyJobApplications,
} from '../../app/types/pegatrampo'

// =====================
// Types utilitários
// =====================
export type SetState<T> = Dispatch<SetStateAction<T>>

const API_BASE = 'http://192.168.15.77:5000'

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const newOptions: RequestInit = {
        ...options,
        credentials: 'include',
    }
    const res = await fetch(url, newOptions)
    if (res.status === 401) {
        localStorage.removeItem('pegaTrampo.user')
        window.location.href = '/'
    }
    return res
}

// =====================
// Helpers (validação / formatação)
// =====================

// Função para validar CPF com algoritmo real
export const validateCPF = (cpf: string): boolean => {
    const cleanCPF = cpf.replace(/\D/g, '')

    if (cleanCPF.length !== 11) return false
    if (/^(\d)\1{10}$/.test(cleanCPF)) return false

    let sum = 0
    for (let i = 0; i < 9; i++) sum += parseInt(cleanCPF.charAt(i), 10) * (10 - i)
    let remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCPF.charAt(9), 10)) return false

    sum = 0
    for (let i = 0; i < 10; i++) sum += parseInt(cleanCPF.charAt(i), 10) * (11 - i)
    remainder = (sum * 10) % 11
    if (remainder === 10 || remainder === 11) remainder = 0
    if (remainder !== parseInt(cleanCPF.charAt(10), 10)) return false

    return true
}

export const formatCPF = (cpf: string): string => {
    const cleanCPF = cpf.replace(/\D/g, '')
    return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export const formatCNPJ = (cnpj: string): string => {
    const cleanCNPJ = cnpj.replace(/\D/g, '')
    return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export const formatCEP = (cep: string): string => {
    const cleanCEP = cep.replace(/\D/g, '')
    return cleanCEP.replace(/(\d{5})(\d{3})/, '$1-$2')
}



// Função para buscar dados REAIS do CNPJ via backend
export const fetchCNPJData = async (cnpj: string) => {
    const cleanCNPJ = cnpj.replace(/\D/g, '')

    try {
        const res = await fetchWithAuth(`${API_BASE}/api/cnpj/${cleanCNPJ}`)
        if (!res.ok) {
            throw new Error('Erro ao consultar CNPJ')
        }

        const result = await res.json()

        if (!result.success) {
            throw new Error(result.error || 'CNPJ não encontrado')
        }

        const data = result.data
        return {
            companyName: data.company_name || data.trade_name || '',
            businessType: '',
            address: data.address
                ? `${data.address.street || ''}, ${data.address.number || ''} - ${data.address.neighborhood || ''}, ${data.address.city || ''}/${data.address.state || ''}`
                : '',
            phone: '',
            email: '',
        }
    } catch (error) {
        console.error('Erro ao buscar CNPJ:', error)
        throw error
    }
}

// =====================
// Geocoding Helpers
// =====================

export const fetchAddressByCEP = async (cep: string) => {
    try {
        const cleanCEP = cep.replace(/\D/g, '')
        if (cleanCEP.length !== 8) return null

        const res = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCEP}`)
        if (!res.ok) return null

        const data = await res.json()
        return {
            street: data.street,
            neighborhood: data.neighborhood,
            city: data.city,
            state: data.state,
            fullAddress: `${data.street}, ${data.neighborhood}, ${data.city} - ${data.state}`
        }
    } catch (error) {
        console.error("Erro ao buscar CEP:", error)
        return null
    }
}

export const fetchCoordinates = async (address: string) => {
    try {
        const query = encodeURIComponent(address)
        // Nominatim OpenStreetMap (Free, requires User-Agent)
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`, {
            headers: {
                "User-Agent": "PegaTrampoApp/1.0"
            }
        })

        if (!res.ok) return null
        const data = await res.json()

        if (data && data.length > 0) {
            return {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            }
        }
        return null
    } catch (error) {
        console.error("Erro no geocoding:", error)
        return null
    }
}



export const formatRelativeDate = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Hoje'
    if (diffDays === 1) return 'Ontem'
    if (diffDays < 7) return `${diffDays}d`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}sem`
    return `${Math.floor(diffDays / 30)}m`
}

// =====================
// Storage helpers
// =====================
export const getStoredUser = (): any | null => {
    try {
        const stored = localStorage.getItem('pegaTrampo.user')
        if (!stored) return null
        return JSON.parse(stored)
    } catch {
        return null
    }
}

// =====================
// Bootstrap de dados (useEffect principal)
// =====================
export const bootstrapInitialData = async (params: {
    setJobs: SetState<Job[]>
    setLoading: SetState<boolean>
    setApiError: SetState<string>
    setCompanyJobsWithCandidates: SetState<CompanyJobApplications[]>
    setMyApplications: SetState<any[]> // mantém compatível com seu MyApplication local
    setUserProfile: SetState<UserProfile>
    setUserResume: SetState<Resume>
    setResumes: SetState<Resume[]>
}) => {
    const {
        setJobs,
        setLoading,
        setApiError,
        setCompanyJobsWithCandidates,
        setMyApplications,
        setUserProfile,
        setUserResume,
        setResumes,
    } = params

    let currentUserId = ''
    let currentUserType: 'professional' | 'company' = 'professional'

    const storedUser = localStorage.getItem('pegaTrampo.user')
    if (storedUser) {
        try {
            const userData = JSON.parse(storedUser)
            currentUserId = userData.id
            currentUserType = (userData.userType || 'professional') as any

            setUserProfile(prev => ({
                ...prev,
                userType: userData.userType || 'professional',
                email: userData.email || prev.email,
                username: userData.username || prev.username,
                name: userData.fullName || prev.name,
                cpf: userData.cpf || prev.cpf,
                companyInfo:
                    userData.userType === 'company'
                        ? {
                            ...prev.companyInfo!,
                            companyName: userData.companyName || prev.companyInfo?.companyName || '',
                            email: userData.email || prev.companyInfo?.email || '',
                            cnpj: userData.cnpj || prev.companyInfo?.cnpj || '',
                        }
                        : prev.companyInfo,
            }))
        } catch (e) {
            console.error('Erro ao carregar usuário', e)
        }
    }

    try {
        if (currentUserType === 'company') {
            if (currentUserId) {
                const jobsRes = await fetchWithAuth(`${API_BASE}/api/jobs?user_id=${encodeURIComponent(currentUserId)}`)
                if (jobsRes.ok) {
                    const jobsData = await jobsRes.json()
                    setJobs(jobsData)
                }

                console.log('Fetching company applications for user:', currentUserId)
                try {
                    const appsRes = await fetchWithAuth(`${API_BASE}/api/company/applications?user_id=${encodeURIComponent(currentUserId)}`)
                    if (appsRes.ok) {
                        const appsData = await appsRes.json()
                        if (appsData.success && appsData.jobs) setCompanyJobsWithCandidates(appsData.jobs)
                    } else {
                        console.error('Failed to fetch company applications:', appsRes.status, appsRes.statusText)
                    }
                } catch (innerErr) {
                    console.error('Error fetching company applications:', innerErr)
                }
            } else {
                setJobs([])
            }

            // Fetch ALL resumes for company view
            try {
                const resumesRes = await fetchWithAuth(`${API_BASE}/api/resumes`)
                if (resumesRes.ok) {
                    const resumesData = await resumesRes.json()
                    setResumes(resumesData)
                }
            } catch (e) {
                console.error('Erro ao buscar currículos', e)
            }
        } else {
            const jobsRes = await fetchWithAuth(`${API_BASE}/api/jobs?candidate_id=${currentUserId}`)
            if (jobsRes.ok) {
                const jobsData = await jobsRes.json()
                setJobs(jobsData)
            }

            const appsRes = await fetchWithAuth(`${API_BASE}/api/my/applications?user_id=${currentUserId}`)
            if (appsRes.ok) {
                const appsData = await appsRes.json()
                if (appsData.success) setMyApplications(appsData.applications || [])
            }
        }

        if (currentUserId) {
            try {
                const dadosRes = await fetchWithAuth(`${API_BASE}/api/get_dados?user_id=${currentUserId}`)
                if (dadosRes.ok) {
                    const data = await dadosRes.json()
                    if (data.success) {
                        if (data.profile) {
                            setUserProfile(prev => ({
                                ...prev,
                                name: data.profile.full_name || prev.name,
                                cpf: data.profile.cpf || prev.cpf,
                                phone: data.profile.phone || prev.phone,
                                email: data.profile.email || prev.email,
                                username: data.profile.username,
                                address: data.profile.address || prev.address,
                                addressNumber: data.profile.number ? String(data.profile.number) : prev.addressNumber,
                                complement: data.profile.complement || prev.complement,
                                neighborhood: data.profile.neighborhood || prev.neighborhood,
                                city: data.profile.city || prev.city,
                                state: data.profile.state || prev.state,
                                workerCategory: data.profile.business_type || prev.workerCategory,
                                birthDate: data.profile.birth_date || prev.birthDate,
                                lat: data.profile.lat,
                                lng: data.profile.lng,
                                imagem_profile: data.profile.imagem_profile || prev.imagem_profile,
                                companyInfo: currentUserType === 'company' ? {
                                    ...prev.companyInfo!,
                                    companyName: data.profile.company_name || prev.companyInfo?.companyName || '',
                                    cnpj: data.profile.cnpj || prev.companyInfo?.cnpj || '',
                                    businessType: data.profile.business_type || prev.companyInfo?.businessType || '',
                                    description: data.profile.company_description || prev.companyInfo?.description || '',
                                    email: data.profile.company_email || prev.companyInfo?.email || '',
                                } : prev.companyInfo
                            }))
                        }

                        if (data.resume) {
                            setUserResume(data.resume)
                            setResumes([data.resume])
                        } else if (data.profile) {
                            setUserResume((prev: any) => ({
                                ...prev,
                                personalInfo: {
                                    ...prev.personalInfo,
                                    name: data.profile.full_name || prev.personalInfo.name,
                                    phone: data.profile.phone || prev.personalInfo.phone,
                                    email: data.profile.email || prev.personalInfo.email,
                                    address: data.profile.address || prev.personalInfo.address,
                                },
                                professionalInfo: {
                                    ...prev.professionalInfo,
                                    category: data.profile.business_type || prev.professionalInfo.category,
                                },
                            }))
                        }
                    }
                }
            } catch (e) {
                console.error('Erro ao buscar dados do usuário:', e)
            }
        }
    } catch (err) {
        console.error('API error full details:', err)
        setApiError('Erro ao carregar dados')
    } finally {
        setLoading(false)
    }
}



// =====================
// Filtros (jobs / resumes)
// =====================
// pega-trampo/app/dashboard/pegaTrampo.logic.ts

// -------------------------
// Helpers de normalização
// -------------------------
const normalizeText = (s: string) => {
    return (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^a-z0-9\s/_-]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
}

const slugRole = (role: string) => {
    // transforma "Atendente/Garçom" -> "atendente_garcom"
    const n = normalizeText(role)
    return n.replace(/[\/\s-]+/g, "_")
}

// -------------------------
// Matriz de similaridade (match fraco)
// -------------------------
// Você pode ajustar esses pesos com o tempo.
const ROLE_SIMILARITY: Record<string, Record<string, number>> = {
    padeiro: {
        confeiteiro: 0.65,
        auxiliar_da_cozinha: 0.25,
        atendente_garcom: 0.12,
        cozinheiro: 0.20,
        pizzaiolo: 0.35,
        ajudande_geral: 0.15,
    },

    confeiteiro: {
        padeiro: 0.65,
        auxiliar_da_cozinha: 0.20,
        atendente_garcom: 0.10,
        pizzaiolo: 0.15,
        ajudande_geral: 0.10,
    },

    pizzaiolo: {
        cozinheiro: 0.55,
        auxiliar_da_cozinha: 0.45,
        padeiro: 0.35,
        atendente_garcom: 0.15,
        copeiro_bartender: 0.10,
    },

    cozinheiro: {
        churrasqueiro: 0.60,
        auxiliar_da_cozinha: 0.55,
        copeiro_bartender: 0.35,
        atendente_garcom: 0.25,
        pizzaiolo: 0.55,
        ajudande_geral: 0.20,
    },

    churrasqueiro: {
        cozinheiro: 0.60,
        auxiliar_da_cozinha: 0.30,
        ajudande_geral: 0.18,
    },

    copeiro_bartender: {
        atendente_garcom: 0.55,
        cozinheiro: 0.25,
        caixa: 0.15,
        ajudande_geral: 0.10,
    },

    atendente_garcom: {
        copeiro_bartender: 0.55,
        caixa: 0.45,
        repostior_estoquista: 0.25,
        motoboy_entregador: 0.18,
        auxiliar_da_cozinha: 0.12,
        ajudande_geral: 0.15,
    },

    caixa: {
        atendente_garcom: 0.45,
        repostior_estoquista: 0.25,
    },

    repostior_estoquista: {
        caixa: 0.25,
        atendente_garcom: 0.25,
        ajudande_geral: 0.20,
        motoboy_entregador: 0.15,
    },

    ajudande_geral: {
        auxiliar_da_cozinha: 0.25,
        repostior_estoquista: 0.20,
        diarista: 0.15,
        motoboy_entregador: 0.15,
        atendente_garcom: 0.15,
        cozinheiro: 0.20,
    },

    diarista: {
        ajudande_geral: 0.15,
    },

    motoboy_entregador: {
        repostior_estoquista: 0.15,
        atendente_garcom: 0.18,
        ajudande_geral: 0.15,
    },
}


// -------------------------
// Distância (Haversine)
// -------------------------
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const toRad = (v: number) => (v * Math.PI) / 180
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLng = toRad(lng2 - lng1)
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

const distanceScore = (km: number) => {
    // 0km -> 1.0, 2km -> ~0.85, 5km -> ~0.65, 10km -> ~0.45, 20km -> ~0.25, 40km -> ~0.10
    // (curva bem “real” pra cidade)
    if (!isFinite(km) || km < 0) return 0
    return Math.max(0, Math.min(1, Math.exp(-km / 12)))
}

// -------------------------
// Score do job pro profissional
// -------------------------
const computeJobScoreForProfessional = (job: any, userProfile: any) => {
    const workerRole = slugRole(userProfile?.workerCategory || "")
    const jobRole = slugRole(job?.category || "")

    // 1) Match de role
    let roleMatch = 0
    if (workerRole && jobRole) {
        if (workerRole === jobRole) roleMatch = 1
        else roleMatch = ROLE_SIMILARITY[workerRole]?.[jobRole] || 0
    }

    // 2) Match por texto (título/descrição)
    const haystack = normalizeText(`${job?.title || ""} ${job?.description || ""} ${job?.category || ""}`)
    const wcText = normalizeText(userProfile?.workerCategory || "")
    let textMatch = 0
    if (wcText && haystack.includes(wcText)) textMatch = 1
    else if (workerRole && haystack.includes(workerRole.replace(/_/g, " "))) textMatch = 0.75

    // 3) Distância (se tiver coords)
    // Você pode preencher coords do profissional por geolocation ou no profile.
    const uLat = Number(userProfile?.lat)
    const uLng = Number(userProfile?.lng)
    const jLat = Number(job?.lat)
    const jLng = Number(job?.lng)

    let distPart = 0
    if (isFinite(uLat) && isFinite(uLng) && isFinite(jLat) && isFinite(jLng)) {
        const km = haversineKm(uLat, uLng, jLat, jLng)
        distPart = distanceScore(km)
    }

    // 4) Boosts
    const urgentBoost = job?.isUrgent ? 0.15 : 0

    // Pesos (ajustáveis)
    const score01 =
        roleMatch * 0.50 +
        textMatch * 0.20 +
        distPart * 0.30 +
        urgentBoost

    // clamp
    const s = Math.max(0, Math.min(1, score01))
    return Math.round(s * 100)
}

// -------------------------
// SUA FUNÇÃO EXISTENTE (mantém assinatura)
// -------------------------
export const filterJobs = (params: {
    jobs: any[]
    searchTerm: string
    selectedCategory: string
    userProfile: any
}) => {
    const { jobs, searchTerm, selectedCategory, userProfile } = params

    const searchLower = normalizeText(searchTerm || "")
    const selectedSlug = selectedCategory === "Todas" ? "todas" : slugRole(selectedCategory)

    // 1) Filtro básico por busca (se houver)
    const baseFiltered = jobs.filter(job => {
        if (!searchLower) return true
        const text = normalizeText(`${job.title || ""} ${job.description || ""} ${job.category || ""} ${job.address || ""}`)
        return text.includes(searchLower)
    })

    // 2) Profissional: rank + corte + ordenação
    if (userProfile?.userType === "professional") {
        const ranked = baseFiltered
            .map(job => {
                const score = computeJobScoreForProfessional(job, userProfile)
                return { ...job, _score: score }
            })
            .filter(job => {
                // Se usuário escolheu uma categoria específica, respeita forte
                if (selectedSlug !== "todas") return slugRole(job.category) === selectedSlug
                // Caso “Todas”, deixa o ranking decidir, mas aplica um corte mínimo
                return job._score >= 18
            })
            .sort((a, b) => {
                // score desc primeiro
                if (b._score !== a._score) return b._score - a._score
                // fallback por created_at/posted_at se existir
                const da = new Date(a.created_at || a.postedAt || 0).getTime()
                const db = new Date(b.created_at || b.postedAt || 0).getTime()
                return db - da
            })

        return ranked
    }

    // 3) Empresa (mantém comportamento simples)
    const finalFiltered = baseFiltered.filter(job => {
        if (selectedSlug === "todas") return true
        return slugRole(job.category) === selectedSlug
    })

    return finalFiltered
}


export const filterResumes = (params: {
    resumes: Resume[]
    resumeSearchTerm: string
    userProfile: UserProfile
}) => {
    const { resumes, resumeSearchTerm, userProfile } = params
    const stored = getStoredUser()
    const currentUserId = stored?.id || ''

    return resumes.filter(resume => {
        const searchLower = (resumeSearchTerm || '').toLowerCase()

        const matchSearch =
            resume.personalInfo.name.toLowerCase().includes(searchLower) ||
            resume.professionalInfo.category.toLowerCase().includes(searchLower) ||
            resume.professionalInfo.experience.toLowerCase().includes(searchLower)

        if (userProfile.userType === 'professional') {
            return matchSearch && (String(resume.userId) === String(currentUserId) || String(resume.userId) === String(userProfile.cpf))
        }

        return matchSearch
    })
}

// =====================
// Handlers (steps / profile / cpf/cnpj)
// =====================
export const handleNextStep = (params: {
    currentStep: string
    setCurrentStep: SetState<string>
    userProfile: UserProfile
}) => {
    const { currentStep, setCurrentStep, userProfile } = params

    if (currentStep === 'welcome') setCurrentStep('register1')
    else if (currentStep === 'register1') setCurrentStep('register2')
    else if (currentStep === 'register2') setCurrentStep('register3')
    else if (currentStep === 'register3') setCurrentStep('register4')
    else if (currentStep === 'register4') setCurrentStep('register5')
    else if (currentStep === 'register5') setCurrentStep('app')
    else if (currentStep === 'categorySelection') {
        if (userProfile.userType === 'professional') setCurrentStep('personalInfo')
        else setCurrentStep('companyRegistration')
    } else if (currentStep === 'personalInfo') {
        setCurrentStep('app')
    } else if (currentStep === 'companyRegistration') {
        setCurrentStep('app')
    }
}

export const handlePrevStep = (params: { currentStep: string; setCurrentStep: SetState<string> }) => {
    const { currentStep, setCurrentStep } = params

    if (currentStep === 'register1') setCurrentStep('welcome')
    else if (currentStep === 'register2') setCurrentStep('register1')
    else if (currentStep === 'register3') setCurrentStep('register2')
    else if (currentStep === 'register4') setCurrentStep('register3')
    else if (currentStep === 'register5') setCurrentStep('register4')
    else if (currentStep === 'categorySelection') setCurrentStep('welcome')
    else if (currentStep === 'personalInfo') setCurrentStep('categorySelection')
    else if (currentStep === 'companyRegistration') setCurrentStep('categorySelection')
}

export const handleSkillToggle = (params: {
    skill: string
    setUserProfile: SetState<UserProfile>
}) => {
    const { skill, setUserProfile } = params

    setUserProfile(prev => ({
        ...prev,
        skills: prev.skills.includes(skill) ? prev.skills.filter(s => s !== skill) : [...prev.skills, skill],
    }))
}

export const handleAvailabilityToggle = (params: {
    period: string
    setUserProfile: SetState<UserProfile>
}) => {
    const { period, setUserProfile } = params

    setUserProfile(prev => ({
        ...prev,
        availability: prev.availability.includes(period)
            ? prev.availability.filter(a => a !== period)
            : [...prev.availability, period],
    }))
}

export const handleCPFChange = (params: {
    value: string
    userProfile: UserProfile
    setUserProfile: SetState<UserProfile>
    setCpfError: SetState<string>
}) => {
    const { value, userProfile, setUserProfile, setCpfError } = params

    const formattedCPF = formatCPF(value)
    setUserProfile({ ...userProfile, cpf: formattedCPF })

    if (formattedCPF.length === 14) {
        if (!validateCPF(formattedCPF)) setCpfError('CPF inválido. Verifique os números digitados.')
        else setCpfError('')
    } else setCpfError('')
}

export const handleCNPJChange = async (params: {
    value: string
    setUserProfile: SetState<UserProfile>
    setCnpjLoading: SetState<boolean>
    setCnpjError: SetState<string>
}) => {
    const { value, setUserProfile, setCnpjLoading, setCnpjError } = params

    const formattedCNPJ = formatCNPJ(value)

    setUserProfile(prev => ({
        ...prev,
        companyInfo: prev.companyInfo
            ? {
                ...prev.companyInfo,
                cnpj: formattedCNPJ,
            }
            : prev.companyInfo,
    }))

    if (formattedCNPJ.replace(/\D/g, '').length === 14) {
        setCnpjLoading(true)
        setCnpjError('')

        try {
            const cnpjData = await fetchCNPJData(formattedCNPJ)

            setUserProfile(prev => ({
                ...prev,
                companyInfo: prev.companyInfo
                    ? {
                        ...prev.companyInfo,
                        companyName: cnpjData.companyName,
                        businessType: cnpjData.businessType,
                        email: cnpjData.email,
                    }
                    : prev.companyInfo,
            }))

            setCnpjLoading(false)
        } catch (error) {
            setCnpjError('Erro ao buscar dados do CNPJ. Tente novamente.')
            setCnpjLoading(false)
        }
    }
}

// =====================
// Handlers (jobs / publish / details / routes)
// =====================
export const handleApplyToJob = async (params: {
    job: Job
    setJobs: SetState<Job[]>
    setActiveTab: SetState<string>
    setNotifications: SetState<Notification[]>
    setMyApplications: SetState<any[]>
}) => {
    const { job, setJobs, setActiveTab, setNotifications, setMyApplications } = params

    const storedUser = localStorage.getItem('pegaTrampo.user')
    if (!storedUser) {
        alert('Você precisa estar logado para se candidatar.')
        return
    }

    const userData = JSON.parse(storedUser)
    const userId = userData.id

    try {
        const res = await fetchWithAuth(`${API_BASE}/api/jobs/${job.id}/apply`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId }),
        })

        const data = await res.json()

        if (!res.ok || data.success === false) {
            alert(data.error || data.message || 'Erro ao realizar candidatura.')
            return
        }

        setJobs(prev => prev.filter(j => j.id !== job.id))

        const appsRes = await fetchWithAuth(`${API_BASE}/api/my/applications?user_id=${userId}`)
        if (appsRes.ok) {
            const appsData = await appsRes.json()
            if (appsData.success) setMyApplications(appsData.applications || [])
        }

        setActiveTab('applications')

        const successNotification: Notification = {
            id: Date.now().toString(),
            title: 'Candidatura Enviada!',
            message: `Você se candidatou para: ${job.title}`,
            type: 'message',
            timestamp: new Date().toLocaleTimeString(),
            read: false,
        }
        setNotifications(prev => [successNotification, ...prev])
    } catch (error) {
        console.error('Erro ao aplicar:', error)
        alert('Erro de conexão ao tentar se candidatar.')
    }
}

export const handlePublishJob = async (params: {
    newJobPost: CompanyJobPost
    userProfile: UserProfile
    setJobs: SetState<Job[]>
    setShowJobPostForm: SetState<boolean>
}) => {
    const { newJobPost, userProfile, setJobs, setShowJobPostForm } = params

    const storedUser = localStorage.getItem('pegaTrampo.user')
    if (!storedUser) {
        alert('Erro de autenticação. Faça login novamente.')
        return
    }
    const userData = JSON.parse(storedUser)

    // Tenta geocoding se não tiver coordenadas mas tiver endereço
    let finalCoordinates = newJobPost.coordinates
    if (!finalCoordinates && newJobPost.address) {
        const coords = await fetchCoordinates(newJobPost.address)
        if (coords) finalCoordinates = coords
    }

    // Payload final
    const jobPayload = {
        ...newJobPost,
        user_id: userData.id,
        companyInfo: userProfile.companyInfo,
        coordinates: finalCoordinates
    }

    try {
        const res = await fetchWithAuth(`${API_BASE}/api/jobs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobPayload),
        })

        const data = await res.json()

        if (!res.ok || data.success === false) {
            alert(data.error || 'Erro ao publicar vaga')
            return
        }

        // Re-fetch da lista de vagas do servidor para garantir dados atualizados
        const jobsRes = await fetchWithAuth(`${API_BASE}/api/jobs?user_id=${userData.id}`)
        if (jobsRes.ok) {
            const jobsData = await jobsRes.json()
            setJobs(jobsData)
        }

        setShowJobPostForm(false)
        alert('Vaga publicada com sucesso!')

    } catch (e) {
        console.error("Erro ao publicar:", e)
        alert('Erro de conexão ao publicar vaga.')
    }
}

export const handleUpdateJob = async (params: {
    jobId: string
    updatedJobPost: CompanyJobPost
    userProfile: UserProfile
    setJobs: SetState<Job[]>
    setShowJobPostForm: SetState<boolean>
    setEditingJobId: SetState<string | null>
}) => {
    const { jobId, updatedJobPost, userProfile, setJobs, setShowJobPostForm, setEditingJobId } = params

    const storedUser = localStorage.getItem('pegaTrampo.user')
    if (!storedUser) {
        alert('Erro de autenticação. Faça login novamente.')
        return
    }
    const userData = JSON.parse(storedUser)

    // Tenta geocoding se não tiver coordenadas mas tiver endereço
    let finalCoordinates = updatedJobPost.coordinates
    if (!finalCoordinates && updatedJobPost.address) {
        const coords = await fetchCoordinates(updatedJobPost.address)
        if (coords) finalCoordinates = coords
    }

    // Payload final
    const jobPayload = {
        ...updatedJobPost,
        user_id: userData.id,
        companyInfo: userProfile.companyInfo,
        coordinates: finalCoordinates
    }

    try {
        const res = await fetchWithAuth(`${API_BASE}/api/jobs/${jobId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(jobPayload),
        })

        const data = await res.json()

        if (!res.ok || data.success === false) {
            alert(data.error || 'Erro ao atualizar vaga')
            return
        }

        // Atualiza a lista local
        const jobsRes = await fetchWithAuth(`${API_BASE}/api/jobs?user_id=${userData.id}`)
        if (jobsRes.ok) {
            const jobsData = await jobsRes.json()
            setJobs(jobsData)
        }

        setShowJobPostForm(false)
        setEditingJobId(null)
        alert('Vaga atualizada com sucesso!')

    } catch (e) {
        console.error("Erro ao atualizar:", e)
        alert('Erro de conexão ao atualizar vaga.')
    }
}

export const handleDeleteJob = async (params: {
    jobId: string
    setJobs: SetState<Job[]>
}) => {
    const { jobId, setJobs } = params

    if (!confirm('Tem certeza que deseja excluir esta vaga? Esta ação não pode ser desfeita.')) {
        return
    }

    const storedUser = localStorage.getItem('pegaTrampo.user')
    if (!storedUser) {
        alert('Erro de autenticação.')
        return
    }
    const userData = JSON.parse(storedUser)

    try {
        const res = await fetchWithAuth(`${API_BASE}/api/jobs/${jobId}?user_id=${userData.id}`, {
            method: 'DELETE',
        })

        const data = await res.json()

        if (!res.ok || data.success === false) {
            alert(data.error || 'Erro ao excluir vaga')
            return
        }

        // Remove da lista local
        setJobs(prev => prev.filter(j => j.id !== jobId))
        alert('Vaga excluída com sucesso!')

    } catch (e) {
        console.error("Erro ao excluir:", e)
        alert('Erro de conexão ao excluir vaga.')
    }
}


export const handleViewJobDetails = (params: {
    job: Job
    setSelectedJob: SetState<Job | null>
    setShowJobDetails: SetState<boolean>
}) => {
    const { job, setSelectedJob, setShowJobDetails } = params
    setSelectedJob(job)
    setShowJobDetails(true)
}

export const handleViewRoutes = (params: { setShowRouteModal: SetState<boolean> }) => {
    params.setShowRouteModal(true)
}

// =====================
// Handlers (resume)
// =====================
export const handleSaveResume = async (params: {
    userResume: Resume
    userProfile: UserProfile
    setUserResume: SetState<Resume>
    setResumes: SetState<Resume[]>
    setShowResumeForm: SetState<boolean>
    setResumeStep: SetState<number>
    setNotifications: SetState<Notification[]>
}) => {
    const {
        userResume,
        userProfile,
        setUserResume,
        setResumes,
        setShowResumeForm,
        setResumeStep,
        setNotifications,
    } = params

    const storedUser = getStoredUser()
    const realUserId = storedUser?.id

    if (!realUserId) {
        alert("Erro: Usuário não autenticado.")
        return
    }

    const newResume: Resume = {
        ...userResume,
        id: userResume.id || `resume_${Date.now()}`,
        userId: realUserId,
        createdAt: userResume.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }

    try {
        const res = await fetchWithAuth(`${API_BASE}/api/resumes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newResume),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
            alert(data.error || 'Erro ao salvar currículo')
            return
        }

        setUserResume(newResume)
        setResumes(prev => {
            const exists = prev.find(r => r.id === newResume.id)
            if (exists) return prev.map(r => r.id === newResume.id ? newResume : r)
            return [newResume, ...prev]
        })

        setShowResumeForm(false)
        setResumeStep(1)

        const successNotification: Notification = {
            id: Date.now().toString(),
            title: 'Currículo Salvo!',
            message: 'Seu currículo foi salvo com sucesso.',
            type: 'message',
            timestamp: new Date().toLocaleTimeString(),
            read: false,
        }

        setNotifications(prev => [successNotification, ...prev])

    } catch (error) {
        console.error("Erro ao salvar currículo:", error)
        alert('Erro de conexão ao salvar currículo.')
    }
}

export const handleViewResumeDetails = (params: {
    resume: Resume
    setSelectedResume: SetState<Resume | null>
    setShowResumeDetails: SetState<boolean>
}) => {
    const { resume, setSelectedResume, setShowResumeDetails } = params
    setSelectedResume(resume)
    setShowResumeDetails(true)
}

export const handleEditResume = (params: {
    resume: Resume
    setUserResume: SetState<Resume>
    setShowResumeForm: SetState<boolean>
    setResumeStep: SetState<number>
}) => {
    const { resume, setUserResume, setShowResumeForm, setResumeStep } = params
    setUserResume(resume)
    setShowResumeForm(true)
    setResumeStep(1)
}

export const handleDeleteResume = async (params: {
    resumeId: string
    setResumes: SetState<Resume[]>
}) => {
    const { resumeId, setResumes } = params

    if (!confirm('Tem certeza que deseja excluir este currículo?')) {
        return
    }

    try {
        const res = await fetchWithAuth(`${API_BASE}/api/resumes/${resumeId}`, {
            method: 'DELETE',
        })

        if (!res.ok) {
            const data = await res.json()
            alert(data.error || 'Erro ao excluir currículo')
            return
        }

        setResumes(prev => prev.filter(r => r.id !== resumeId))
        alert('Currículo excluído com sucesso!')

    } catch (e) {
        console.error("Erro ao excluir currículo:", e)
        alert('Erro de conexão ao excluir currículo.')
    }
}

export const normalizeBRPhoneToWa = (raw?: string | null): string | null => {
    if (!raw) return null
    const digits = String(raw).replace(/\D/g, '')
    if (!digits) return null

    // já está com DDI 55
    if (digits.startsWith('55') && digits.length >= 12) return digits

    // se veio com 0 na frente (tipo 0DDDNúmero)
    const noZero = digits.startsWith('0') ? digits.slice(1) : digits

    // número BR comum (10/11 dígitos sem DDI)
    if (noZero.length === 10 || noZero.length === 11) return `55${noZero}`

    // qualquer outro formato: tenta usar como está
    return noZero.length >= 10 ? noZero : null
}

export const handleCallPerson = (params: { resume: Resume }) => {
    const { resume } = params
    const wa = normalizeBRPhoneToWa(resume.personalInfo.phone)
    if (!wa) {
        alert('Número de WhatsApp inválido ou não cadastrado.')
        return
    }
    const message = encodeURIComponent(
        `Olá ${resume.personalInfo.name}! Vi seu currículo no PegaTrampo e gostaria de conversar sobre uma oportunidade de trabalho.`,
    )
    window.open(`https://wa.me/${wa}?text=${message}`, '_blank')
}

export const handleSaveProfile = async (params: {
    userProfile: UserProfile
    setUserProfile: SetState<UserProfile>
    setIsEditingProfile: SetState<boolean>
    setLoading: SetState<boolean>
}) => {
    const { userProfile, setUserProfile, setIsEditingProfile, setLoading } = params
    setLoading(true)

    try {
        if (userProfile.birthDate) {
            const today = new Date();
            const bDate = new Date(userProfile.birthDate);
            let age = today.getFullYear() - bDate.getFullYear();
            const m = today.getMonth() - bDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
                age--;
            }
            if (age < 18) {
                alert('Você precisa ter pelo menos 18 anos de idade.');
                setLoading(false);
                return;
            }
        }

        // Get user_id from localStorage - this is critical to avoid the backend
        // trying to create a new user (which requires password)
        const storedUser = getStoredUser()
        if (!storedUser?.id) {
            throw new Error('Usuário não autenticado. Faça login novamente.')
        }

        // Map frontend UserProfile fields to the backend's expected field names
        const payload: Record<string, any> = {
            user_id: storedUser.id,
            username: userProfile.username || storedUser.username,
            email: userProfile.email || storedUser.email,

            // Profile fields
            full_name: userProfile.name,
            cpf: userProfile.cpf,
            phone: userProfile.phone,
            birthDate: userProfile.birthDate,

            // Address fields
            address: userProfile.address,
            number: userProfile.addressNumber ? Number(userProfile.addressNumber) : null,
            complement: userProfile.complement,
            neighborhood: userProfile.neighborhood,
            city: userProfile.city,
            state: userProfile.state,
            cep: userProfile.cep,
            lat: userProfile.lat,
            lng: userProfile.lng,
            imagem_profile: userProfile.imagem_profile,
        }

        // Company-specific fields
        if (userProfile.userType === 'company' && userProfile.companyInfo) {
            payload.cnpj = userProfile.companyInfo.cnpj
            payload.company_name = userProfile.companyInfo.companyName
            payload.company_email = userProfile.companyInfo.email || userProfile.email
            payload.business_type = userProfile.companyInfo.businessType
            payload.company_description = userProfile.companyInfo.description
        }

        const res = await fetchWithAuth(`${API_BASE}/api/user-profile`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Erro ao atualizar perfil')
        }

        alert('Perfil atualizado com sucesso!')
        setIsEditingProfile(false)

    } catch (e: any) {
        console.error("Erro ao salvar perfil:", e)
        alert(e.message || 'Erro ao salvar perfil.')
    } finally {
        setLoading(false)
    }
}
