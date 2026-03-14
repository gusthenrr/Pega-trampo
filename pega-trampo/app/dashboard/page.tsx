"use client"

import { useState, useEffect } from 'react'
import {
    Search, MapPin, Clock, DollarSign, User, Briefcase, Filter, Plus, Heart,
    MessageCircle, Share2, Calendar, Star, MoreVertical, Bell, ChevronLeft, ChevronRight,
    ArrowLeft, HelpCircle, Check, Home, Bookmark, Settings, Menu, Send, Eye, Users, Award,
    Zap, Hammer, Scissors, Car, Baby, Utensils, Paintbrush, Wrench, GraduationCap, Camera,
    Music, Shirt, TreePine, Laptop, Phone, Shield, Truck, Sparkles, Flower2, Palette, Edit,
    FileText, LogOut, MapPinIcon, Mail, Building2, UserCheck, Loader2, Briefcase as
        BriefcaseIcon, Navigation, Route, ExternalLink, Upload, X, Trash2, Wallet, ChevronUp, ChevronDown
} from 'lucide-react'

import type {
    Job,
    UserProfile,
    Notification,
    CompanyJobPost,
    Resume,
    CompanyJobApplications,
    MyApplication,
    Candidate,
    JobSession,
    CandidateEvaluationsPayload,
} from '../types/pegatrampo'

import * as logic from './pegaTrampo.logic'
import AgendaFilterPopover, { AgendaFilterValue } from '../components/AgendaFilterPopover'
import { useRef } from 'react'
import { broadcastSessionChanged } from '../lib/authChannel'
import ProfilePage from './pages/ProfilePage'
import SupportPage from './pages/SupportPage'
import JobsPage from './pages/JobsPage'
import ApplicationsPage from './pages/ApplicationsPage'
import ResumesPage from './pages/ResumesPage'

const categoryData = logic.catagory_work


const categories = ['Recomendado', ...categoryData.map(cat => cat.name), 'Todas']


// Helpers para normalizar imagens de perfil vindas da API
const getFirstValidImageUrl = (sources: Array<string | null | undefined>) => {
    for (const src of sources) {
        if (typeof src === 'string' && src.trim().length > 0) {
            return src
        }
    }
    return null
}

const getUserProfileImageUrl = (profile?: UserProfile | null) => {
    if (!profile) return null
    return getFirstValidImageUrl([
        profile.imagem_profile,
        profile.profilePhoto,
    ])
}

const getResumeProfileImageUrl = (resume?: Resume | null, ownerProfile?: UserProfile | null) => {
    if (!resume) return ownerProfile ? getUserProfileImageUrl(ownerProfile) : null
    const isOwner = ownerProfile && (
        (resume.userId && ownerProfile.id && String(resume.userId) === String(ownerProfile.id)) ||
        ownerProfile.userType === 'professional'
    )
    const ownerPhoto = isOwner
        ? getUserProfileImageUrl(ownerProfile)
        : null
    const resumeAny = resume as unknown as Record<string, any>
    return getFirstValidImageUrl([
        resume.profilePhoto,
        resume.personalInfo?.profilePhoto,
        resume.personalInfo?.photo,
        resume.personalInfo?.image,
        resumeAny?.personalInfo?.avatar,
        ownerPhoto,
    ])
}

const getCandidateProfileImageUrl = (candidate?: Candidate | null) => {
    if (!candidate) return null
    const candidateAny = candidate as unknown as Record<string, any>
    const resumeAny = candidate.resume as unknown as Record<string, any> | undefined
    return getFirstValidImageUrl([
        candidate.profilePhoto,
        candidateAny?.profile_photo,
        candidateAny?.photoUrl,
        candidateAny?.photo_url,
        candidateAny?.avatar,
        candidateAny?.imagem_profile,
        candidateAny?.profile_image_url,
        resumeAny?.profilePhoto,
        resumeAny?.personalInfo?.profilePhoto,
        resumeAny?.personalInfo?.photo,
        resumeAny?.personalInfo?.image,
    ])
}

const buildResumeFromCandidate = (candidate: Candidate): Resume => {
    const preview = candidate.resume as Partial<Resume> | undefined

    return {
        id: preview?.id || candidate.applicationId || candidate.candidateId,
        userId: candidate.candidateId,
        personalInfo: {
            name: candidate.name,
            email: candidate.email || '',
            phone: candidate.phone || '',
            cep: preview?.personalInfo?.cep || '',
            address: preview?.personalInfo?.address || '',
            neighborhood: preview?.personalInfo?.neighborhood || '',
            city: preview?.personalInfo?.city || '',
            state: preview?.personalInfo?.state || '',
            birthDate: preview?.personalInfo?.birthDate || '',
            maritalStatus: preview?.personalInfo?.maritalStatus || '',
            profilePhoto: getCandidateProfileImageUrl(candidate) || undefined,
        },
        professionalInfo: preview?.professionalInfo || {
            category: candidate.category || '',
            experience: '',
            contractTypes: [],
            workSchedule: '',
            salary: {
                value: 0,
                type: 'daily',
                hideSalary: false,
            },
            benefits: [],
        },
        workExperience: preview?.workExperience || [],
        education: preview?.education || [],
        skills: preview?.skills || [],
        bio: preview?.bio || '',
        availability: preview?.availability || [],
        createdAt: preview?.createdAt || candidate.appliedAt || '',
        updatedAt: preview?.updatedAt || '',
        isVisible: preview?.isVisible ?? true,
        profilePhoto: getCandidateProfileImageUrl(candidate) || undefined,
        imageJob: candidate.imageJob || preview?.imageJob || [],
    }
}

const formatSessionTimestamp = (value?: string | null) => {
    if (!value) return ''
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return ''
    return parsed.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

const emptyCandidateEvaluations: CandidateEvaluationsPayload = {
    averageRating: 0,
    reviewsCount: 0,
    evaluations: [],
}

// Função para formatar data relativa 

export default function PegaTrampoApp() {
    const [currentStep, setCurrentStep] = useState('welcome')
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [apiError, setApiError] = useState('')
    const [companyJobsWithCandidates, setCompanyJobsWithCandidates] = useState<CompanyJobApplications[]>([])

    // States
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedDate, setSelectedDate] = useState('')
    const [openAgenda, setOpenAgenda] = useState(false)
    const btnAgendaRef = useRef<HTMLElement>(null)
    const [selectedCategory, setSelectedCategory] = useState('Recomendado')
    const [showPostModal, setShowPostModal] = useState(false)
    const [activeTab, setActiveTab] = useState('jobs')
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [showCategorySelection, setShowCategorySelection] = useState(false)
    const [cpfError, setCpfError] = useState('')
    const [cnpjError, setCnpjError] = useState('')
    const [cnpjLoading, setCnpjLoading] = useState(false)
    const [showProfile, setShowProfile] = useState(false)
    const [showSupport, setShowSupport] = useState(false)
    const [showHeader, setShowHeader] = useState(true)

    // Lógica para esconder/mostrar header no scroll
    useEffect(() => {
        let lastScrollY = window.scrollY
        const handleScroll = () => {
            const currentScrollY = window.scrollY
            // Se rolar mais de 10px pra baixo, esconde. Se rolar pra cima, mostra.
            if (currentScrollY > lastScrollY && currentScrollY > 60) {
                setShowHeader(false)
            } else {
                setShowHeader(true)
            }
            lastScrollY = currentScrollY
        }

        window.addEventListener('scroll', handleScroll, { passive: true })
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Restaura o estado da UI ao recarregar a página
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const savedTab = sessionStorage.getItem('pt_activeTab')
            if (savedTab) setActiveTab(savedTab)

            const savedProfile = sessionStorage.getItem('pt_showProfile')
            if (savedProfile === 'true') setShowProfile(true)

            const savedSupport = sessionStorage.getItem('pt_showSupport')
            if (savedSupport === 'true') setShowSupport(true)

            const savedPostForm = sessionStorage.getItem('pt_showJobPostForm')
            if (savedPostForm === 'true') setShowJobPostForm(true)

            const savedResumeForm = sessionStorage.getItem('pt_showResumeForm')
            if (savedResumeForm === 'true') setShowResumeForm(true)
        }
    }, [])

    // Salva o estado da UI quando ele muda
    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('pt_activeTab', activeTab)
            sessionStorage.setItem('pt_showProfile', showProfile.toString())
            sessionStorage.setItem('pt_showSupport', showSupport.toString())
        }
    }, [activeTab, showProfile, showSupport])

    // Cross-tab session invalidation is now handled globally by SessionWatcher in layout.tsx
    const [showChat, setShowChat] = useState(false)
    const [selectedJobForChat, setSelectedJobForChat] = useState<Job | null>(null)
    const [newMessage, setNewMessage] = useState('')
    const [showCompanyRegistration, setShowCompanyRegistration] = useState(false)
    const [showJobPostForm, setShowJobPostForm] = useState(false)
    const [editingJobId, setEditingJobId] = useState<string | null>(null)

    const [showJobDetails, setShowJobDetails] = useState(false)
    const [selectedJob, setSelectedJob] = useState<Job | null>(null)
    const [showRouteModal, setShowRouteModal] = useState(false)
    const [showResumeForm, setShowResumeForm] = useState(false)

    useEffect(() => {
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('pt_showJobPostForm', showJobPostForm.toString())
            sessionStorage.setItem('pt_showResumeForm', showResumeForm.toString())
        }
    }, [showJobPostForm, showResumeForm])
    const [resumeStep, setResumeStep] = useState(1)
    const [resumeSearchTerm, setResumeSearchTerm] = useState('')
    const [candidatesModalJob, setCandidatesModalJob] = useState<CompanyJobApplications | null>(null)
    const [candidateSearchTerm, setCandidateSearchTerm] = useState('')
    const [acceptingApplicationId, setAcceptingApplicationId] = useState<string | null>(null)
    const [resumes, setResumes] = useState<Resume[]>([])
    const [isSavingResume, setIsSavingResume] = useState(false)
    const resumeSaveLockedRef = useRef(false)
    const [isPublishingJob, setIsPublishingJob] = useState(false)
    const publishJobLockedRef = useRef(false)
    const [showResumeDetails, setShowResumeDetails] = useState(false)
    const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
    const selectedResumeAddress = (() => {
        const parts = [
            selectedResume?.personalInfo?.address,
            selectedResume?.personalInfo?.neighborhood,
            selectedResume?.personalInfo?.city && selectedResume?.personalInfo?.state
                ? `${selectedResume.personalInfo.city} - ${selectedResume.personalInfo.state}`
                : selectedResume?.personalInfo?.city || selectedResume?.personalInfo?.state,
        ].filter((value): value is string => Boolean(value && value.trim()))

        return parts.length > 0 ? parts.join(', ') : 'Endereco nao informado'
    })()
    const initialJobPostState: CompanyJobPost = {
        title: '',
        description: '',
        category: '',
        paymentType: 'daily',
        rate: 0,
        location: '',
        area: '',
        address: '',
        workHours: '8 horas',
        period: '',
        duration: '',
        isUrgent: false,
        includesFood: false,
        cep: '',
        coordinates: undefined,
        startDate: '',
    }

    const [showMenu, setShowMenu] = useState(false)
    const [enlargedPhoto, setEnlargedPhoto] = useState<string | null>(null)
    const [newJobPost, setNewJobPost] = useState<CompanyJobPost>(initialJobPostState)

    // -- Work Session states --
    const [activeSession, setActiveSession] = useState<JobSession | null>(null)
    const [sessionApplicationId, setSessionApplicationId] = useState<string | null>(null)
    const [sessionLoading, setSessionLoading] = useState(false)
    const [sessionPhotoPreview, setSessionPhotoPreview] = useState<string | null>(null)
    const [sessionPhotoFile, setSessionPhotoFile] = useState<File | null>(null)
    const [companySessionView, setCompanySessionView] = useState<{ session: JobSession, candidateName: string } | null>(null)
    const [showEvaluationModal, setShowEvaluationModal] = useState(false)
    const [evaluationData, setEvaluationData] = useState<{ candidateId: string | number, jobId: string, candidateName: string } | null>(null)
    const [evaluationRating, setEvaluationRating] = useState(0)
    const [evaluationSubmitting, setEvaluationSubmitting] = useState(false)
    const [candidateEvaluationsData, setCandidateEvaluationsData] = useState<CandidateEvaluationsPayload>(emptyCandidateEvaluations)
    const overlayHistorySkipPushRef = useRef(false)
    const previousOverlayKeyRef = useRef<string | null>(null)
    const closeTopOverlayRef = useRef<() => boolean>(() => false)

    const activeOverlayKey = (() => {
        if (enlargedPhoto) return 'enlarged-photo'
        if (showEvaluationModal) return 'evaluation-modal'
        if (companySessionView) return 'company-session-view'
        if (sessionApplicationId) return 'candidate-session-view'
        if (candidatesModalJob) return 'candidates-modal'
        if (openAgenda) return 'agenda'
        if (showMenu) return 'menu'
        if (showNotifications) return 'notifications'
        if (showRouteModal) return 'route-modal'
        if (showResumeDetails) return 'resume-details'
        if (showJobDetails) return 'job-details'
        if (showResumeForm) return `resume-form-step-${resumeStep}`
        if (showJobPostForm) return 'job-post-form'
        if (showSupport) return 'support'
        if (showProfile) return 'profile'
        if (showChat) return 'chat'
        if (showPostModal) return 'post-modal'
        if (showCategorySelection) return 'category-selection'
        if (showCompanyRegistration) return 'company-registration'
        return null
    })()

    closeTopOverlayRef.current = () => {
        if (enlargedPhoto) {
            setEnlargedPhoto(null)
            return true
        }
        if (showEvaluationModal) {
            setShowEvaluationModal(false)
            return true
        }
        if (companySessionView) {
            setCompanySessionView(null)
            return true
        }
        if (sessionApplicationId) {
            setSessionApplicationId(null)
            setActiveSession(null)
            setSessionPhotoPreview(null)
            setSessionPhotoFile(null)
            return true
        }
        if (candidatesModalJob) {
            setCandidatesModalJob(null)
            return true
        }
        if (openAgenda) {
            setOpenAgenda(false)
            return true
        }
        if (showMenu) {
            setShowMenu(false)
            return true
        }
        if (showNotifications) {
            setShowNotifications(false)
            return true
        }
        if (showRouteModal) {
            setShowRouteModal(false)
            return true
        }
        if (showResumeDetails) {
            setShowResumeDetails(false)
            setSelectedResume(null)
            return true
        }
        if (showJobDetails) {
            setShowJobDetails(false)
            setSelectedJob(null)
            return true
        }
        if (showResumeForm) {
            setShowResumeForm(false)
            return true
        }
        if (showJobPostForm) {
            setShowJobPostForm(false)
            return true
        }
        if (showSupport) {
            setShowSupport(false)
            return true
        }
        if (showProfile) {
            setShowProfile(false)
            return true
        }
        if (showChat) {
            setShowChat(false)
            setSelectedJobForChat(null)
            return true
        }
        if (showPostModal) {
            setShowPostModal(false)
            return true
        }
        if (showCategorySelection) {
            setShowCategorySelection(false)
            return true
        }
        if (showCompanyRegistration) {
            setShowCompanyRegistration(false)
            return true
        }
        return false
    }

    useEffect(() => {
        if (typeof window === 'undefined') return

        const previousOverlayKey = previousOverlayKeyRef.current

        if (overlayHistorySkipPushRef.current) {
            overlayHistorySkipPushRef.current = false
            previousOverlayKeyRef.current = activeOverlayKey
            return
        }

        if (activeOverlayKey && activeOverlayKey !== previousOverlayKey) {
            window.history.pushState(
                {
                    ...(window.history.state || {}),
                    pegaTrampoOverlay: activeOverlayKey,
                },
                '',
            )
        }

        previousOverlayKeyRef.current = activeOverlayKey
    }, [activeOverlayKey])

    useEffect(() => {
        if (typeof window === 'undefined') return

        const handlePopState = () => {
            const closedOverlay = closeTopOverlayRef.current()
            if (closedOverlay) {
                overlayHistorySkipPushRef.current = true
            }
        }

        window.addEventListener('popstate', handlePopState)
        return () => window.removeEventListener('popstate', handlePopState)
    }, [])

    const handleLogout = async () => {
        if (!confirm('Tem certeza que deseja sair da sua conta?')) return

        // Notify other tabs BEFORE clearing the cookie
        broadcastSessionChanged('LOGOUT')

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || ''
            await fetch(`${apiUrl}/api/logout`, {
                method: 'POST',
                credentials: 'include',
            })
        } catch (e) {
            console.error('Erro ao fazer logout no servidor:', e)
        }

        // Clear local UI state
        sessionStorage.clear()
        window.location.href = '/'
    }

    const handleCepBlur = async () => {
        if (!newJobPost.cep || newJobPost.cep.replace(/\D/g, '').length < 8) return;

        const addressData = await logic.fetchAddressByCEP(newJobPost.cep);
        if (addressData) {
            setNewJobPost(prev => ({
                ...prev,
                address: addressData.fullAddress,
                area: addressData.neighborhood,
                location: `${addressData.city}, ${addressData.state}`
            }));

            // Já tenta pegar coordenadas
            const coords = await logic.fetchCoordinates(addressData.fullAddress);
            if (coords) {
                setNewJobPost(prev => ({ ...prev, coordinates: coords }));
            }
        }
    }

    const handleResumeCepBlur = async () => {
        const cleanCep = (userResume.personalInfo.cep || '').replace(/\D/g, '')
        if (cleanCep.length !== 8) return

        const addressData = await logic.fetchAddressByCEP(cleanCep)
        if (!addressData) return

        setUserResume(prev => ({
            ...prev,
            personalInfo: {
                ...prev.personalInfo,
                cep: cleanCep,
                address: addressData.fullAddress || prev.personalInfo.address,
                neighborhood: addressData.neighborhood || prev.personalInfo.neighborhood,
                city: addressData.city || prev.personalInfo.city,
                state: addressData.state || prev.personalInfo.state,
            }
        }))
    }

    interface MyApplication {
        applicationId: string
        status: string
        appliedAt: string
        job: Job
    }

    const [myApplications, setMyApplications] = useState<MyApplication[]>([])
    const [isEditingProfile, setIsEditingProfile] = useState(false)


    const [userProfile, setUserProfile] = useState<UserProfile>({
        name: '',
        cpf: '',
        birthDate: '',
        gender: '',
        phone: '',
        email: '',
        cep: '',
        address: '',
        addressNumber: '',
        complement: '',
        neighborhood: '',
        city: '',
        state: '',
        profession: '',
        experience: '',
        skills: [],
        bio: '',
        portfolio: [],
        certifications: [],
        languages: [],
        availability: [],
        workRadius: 15,
        hourlyRate: 0,
        dailyRate: 0,
        acceptedTerms: true,
        userType: 'professional',
        rating: 0,
        reviews: 0,
        completedJobs: 0,
        profilePhoto: '',
        documents: {
            rg: '',
            cpf: '',
            comprovante: ''
        },
        bankInfo: {
            bank: '',
            agency: '',
            account: '',
            accountType: ''
        },
        preferences: {
            notifications: true,
            emailMarketing: false,
            smsMarketing: false
        },
        companyInfo: {
            cnpj: '',
            companyName: '',
            businessType: '',
            description: '',
            publishedJobs: 0,
            rating: 0,
            reviews: 0,
            email: ''
        },
        workerCategory: [],
        evaluationData: {
            totalEvaluations: 0,
            attendanceCount: 0,
            absenceCount: 0,
            divisionScore: 0,
            profileCompleteness: 0
        }
    })

    const [userResume, setUserResume] = useState<Resume>({
        id: '',
        userId: '',
        personalInfo: {
            name: '',
            phone: '',
            email: '',
            cep: '',
            address: '',
            neighborhood: '',
            city: '',
            state: '',
            birthDate: '',
            maritalStatus: ''
        },
        professionalInfo: {
            category: '',
            experience: '',
            contractTypes: [],
            workSchedule: '',
            salary: {
                value: 0,
                type: 'daily',
                hideSalary: false
            },
            benefits: []
        },
        workExperience: [],
        education: [],
        skills: [],
        bio: '',
        availability: [],
        createdAt: '',
        updatedAt: '',
        isVisible: true
    })
    // Data Fetching Effect
    // Data Fetching Effect REMOVED (Redundant with logic.bootstrapInitialData)


    // ========= WRAPPERS (mesmos nomes, zero lógica aqui) =========

    // useEffect 1 (bootstrap)
    useEffect(() => {
        logic.bootstrapInitialData({
            setJobs,
            setLoading,
            setApiError,
            setCompanyJobsWithCandidates,
            setMyApplications,
            setUserProfile,
            setUserResume,
            setResumes,
        })
    }, [])

    useEffect(() => {
        // Carrega notificações independente das outras infos se já logado
        const fetchNotifications = async () => {
            if (typeof window !== 'undefined') {
                const prefetched = (window as typeof window & { __PT_NOTIFICATIONS__?: Notification[] }).__PT_NOTIFICATIONS__
                if (Array.isArray(prefetched)) {
                    setNotifications(prefetched)
                    delete (window as typeof window & { __PT_NOTIFICATIONS__?: Notification[] }).__PT_NOTIFICATIONS__
                    return
                }
            }

            try {
                const res = await logic.fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/notifications`)
                if (res.ok) {
                    const data = await res.json()
                    if (data.notifications) {
                        setNotifications(data.notifications)
                    }
                }
            } catch (err) {
                console.error("Erro ao buscar notificações", err)
            }
        }
        fetchNotifications()
    }, [userProfile.userType])



    // filtros
    const filteredJobs = logic.filterJobs({ jobs, searchTerm, selectedCategory, userProfile, selectedDate })
    const filteredResumes = logic.filterResumes({ resumes, resumeSearchTerm, userProfile })

    type DurationUnit = "dia" | "semana" | "mes"

    const formatDuration = (qty: number, unit: DurationUnit) => {
        const n = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1

        if (unit === "dia") return `${n} ${n === 1 ? "dia" : "dias"}`
        if (unit === "semana") return `${n} ${n === 1 ? "semana" : "semanas"}`
        return `${n} ${n === 1 ? "mes" : "meses"}`
    }

    // estados só pra controlar o input/select (UI)
    const [durationQty, setDurationQty] = useState<number>(1)
    const [durationUnit, setDurationUnit] = useState<DurationUnit>("dia")

    const updateDuration = (qty: number, unit: DurationUnit) => {
        const safeQty = qty > 0 ? qty : 1
        setDurationQty(safeQty)
        setDurationUnit(unit)

        setNewJobPost((prev: any) => ({
            ...prev,
            duration: formatDuration(safeQty, unit),
        }))
    }

    const handleApplyToJob = (job: Job) =>
        logic.handleApplyToJob({
            job,
            setJobs,
            setActiveTab,
            setNotifications,
            setMyApplications,
        })

    const handlePublishJob = async () => {
        if (publishJobLockedRef.current) return

        publishJobLockedRef.current = true
        setIsPublishingJob(true)

        try {
            if (editingJobId) {
                await logic.handleUpdateJob({
                    jobId: editingJobId,
                    updatedJobPost: newJobPost,
                    userProfile,
                    setJobs,
                    setShowJobPostForm,
                    setEditingJobId
                })
            } else {
                await logic.handlePublishJob({ newJobPost, userProfile, setJobs, setShowJobPostForm })
            }
        } finally {
            publishJobLockedRef.current = false
            setIsPublishingJob(false)
        }
    }

    const handleEditJob = (job: Job) => {
        setNewJobPost({
            title: job.title,
            description: job.description,
            category: job.category || '',
            paymentType: job.paymentType,
            rate: job.rate,
            location: job.location || '',
            area: job.area || '',
            address: job.address || '',
            workHours: job.workHours || '',
            period: job.period || '',
            duration: job.duration || '',
            isUrgent: job.isUrgent || false,
            includesFood: job.includesFood || false,
            cep: (job as any).cep || '',
            coordinates: (job as any).coordinates,
            startDate: job.startDate || '',
            startTime: job.startTime || ''
        })
        setEditingJobId(job.id)
        setShowJobPostForm(true)
    }

    const handleDeleteJob = (jobId: string) => {
        logic.handleDeleteJob({ jobId, setJobs })
    }

    const handleViewJobDetails = (job: Job) =>
        logic.handleViewJobDetails({ job, setSelectedJob, setShowJobDetails })

    const handleViewRoutes = () => logic.handleViewRoutes({ setShowRouteModal })

    const handleSaveResume = async () => {
        if (resumeSaveLockedRef.current) return

        resumeSaveLockedRef.current = true
        setIsSavingResume(true)

        try {
            await logic.handleSaveResume({
                userResume,
                userProfile,
                setUserResume,
                setResumes,
                setShowResumeForm,
                setResumeStep,
                setNotifications,
            })
        } finally {
            resumeSaveLockedRef.current = false
            setIsSavingResume(false)
        }
    }

    const handleViewResumeDetails = async (resume: Resume) => {
        logic.handleViewResumeDetails({ resume, setSelectedResume, setShowResumeDetails })
        if (resume.userId) {
            const evaluationPayload = await logic.fetchCandidateEvaluations(resume.userId)
            setCandidateEvaluationsData(evaluationPayload)
        } else {
            setCandidateEvaluationsData(emptyCandidateEvaluations)
        }
    }

    // -- Work session handlers --
    const fetchSession = async (applicationId: string) => {
        setSessionLoading(true)
        try {
            const res = await logic.fetchWithAuth(`${logic.API_BASE}/api/sessions/${applicationId}`)
            if (res.ok) {
                const d = await res.json()
                setActiveSession(d.session || null)
            }
        } catch (e) { console.error(e) }
        setSessionLoading(false)
    }

    const openSessionPanel = async (applicationId: string) => {
        setSessionApplicationId(applicationId)
        setSessionPhotoPreview(null)
        setSessionPhotoFile(null)
        await fetchSession(applicationId)
    }

    const handleSessionPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setSessionPhotoFile(file)
        setSessionPhotoPreview(URL.createObjectURL(file))
        e.target.value = ''
    }

    const handleSessionUpload = async (phase: 'checkin' | 'checkout') => {
        if (!sessionPhotoFile || !sessionApplicationId) return
        setSessionLoading(true)
        try {
            const form = new FormData()
            form.append('application_id', sessionApplicationId)
            form.append('photo', sessionPhotoFile)
            const endpoint = phase === 'checkin' ? 'checkin' : 'checkout'
            const res = await logic.fetchWithAuth(`${logic.API_BASE}/api/sessions/${endpoint}`, {
                method: 'POST',
                body: form,
            })
            const d = await res.json()
            if (res.ok) {
                setSessionPhotoPreview(null)
                setSessionPhotoFile(null)
                await fetchSession(sessionApplicationId)
            } else {
                alert(d.error || 'Erro ao enviar foto')
            }
        } catch (e) { console.error(e) }
        setSessionLoading(false)
    }

    const openEvaluationModalForSession = (session: JobSession, candidateName: string) => {
        if (session.evaluationSubmitted) {
            alert('Esta sessao ja foi avaliada.')
            return
        }
        if (!session.candidate_id || !session.job_id) {
            alert('Nao foi possivel abrir a avaliacao porque os dados da sessao estao incompletos.')
            return
        }

        setEvaluationData({
            candidateId: session.candidate_id,
            jobId: String(session.job_id),
            candidateName,
        })
        setEvaluationRating(0)
        setShowEvaluationModal(true)
    }

    const handleValidateSession = async (sessionId: string, completed: boolean) => {
        if (!confirm(completed ? 'Confirmar que o servico foi realizado com sucesso?' : 'Confirmar que o funcionario nao concluiu o servico?')) return
        setSessionLoading(true)
        try {
            const res = await logic.fetchWithAuth(`${logic.API_BASE}/api/sessions/${sessionId}/validate`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ completed }),
            })
            const d = await res.json()
            if (res.ok) {
                if (companySessionView) {
                    const nextStatus: JobSession['status'] = d.status === 'cancelled' ? 'cancelled' : 'validated'
                    const updatedSession: JobSession = {
                        ...companySessionView.session,
                        status: nextStatus,
                        evaluationSubmitted: ['validated', 'cancelled'].includes(nextStatus) ? false : companySessionView.session.evaluationSubmitted,
                    }
                    setCompanySessionView(prev => prev ? { ...prev, session: updatedSession } : null)
                    const appsRes = await logic.fetchWithAuth(`${logic.API_BASE}/api/company/applications`)
                    if (appsRes.ok) {
                        const appsData = await appsRes.json()
                        if (appsData.success && Array.isArray(appsData.jobs)) {
                            setCompanyJobsWithCandidates(appsData.jobs)
                        }
                    }
                    if (nextStatus === 'validated' || nextStatus === 'cancelled') {
                        openEvaluationModalForSession(updatedSession, companySessionView.candidateName)
                    }
                }
            } else {
                alert(d.error || 'Erro ao validar')
            }
        } catch (e) { console.error(e) }
        setSessionLoading(false)
    }

    const handleSubmitEvaluation = async () => {
        if (evaluationRating === 0) {
            alert('Por favor, selecione uma nota de 1 a 5 estrelas.')
            return
        }
        if (!evaluationData) return

        setEvaluationSubmitting(true)
        try {
            await logic.submitEvaluation({
                evaluatedId: evaluationData.candidateId,
                jobId: evaluationData.jobId,
                rating: evaluationRating,
                comment: ''
            })
            if (selectedResume?.userId && String(selectedResume.userId) === String(evaluationData.candidateId)) {
                const refreshedEvaluations = await logic.fetchCandidateEvaluations(selectedResume.userId)
                setCandidateEvaluationsData(refreshedEvaluations)
            }
            setCompanySessionView(prev => prev ? {
                ...prev,
                session: {
                    ...prev.session,
                    status: 'validated',
                    evaluationSubmitted: true,
                },
            } : null)
            alert('Avaliacao enviada com sucesso!')
            setShowEvaluationModal(false)
            setEvaluationData(null)
        } catch (err: any) {
            alert(err.message || 'Erro ao enviar avaliacao')
        } finally {
            setEvaluationSubmitting(false)
        }
    }

    const handleNotificationClick = async (notif: Notification) => {
        if (!notif.read) {
            try {
                const res = await logic.fetchWithAuth(`${process.env.NEXT_PUBLIC_API_URL || ''}/api/notifications/${notif.id}/read`, { method: 'PUT' })
                if (res.ok) {
                    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n))
                }
            } catch (e) {
                console.error("Erro ao marcar como lida:", e)
            }
        }

        const notificationType = String(notif.type || '').toLowerCase()
        const notificationMessage = String(notif.message || '').toLowerCase()

        if (userProfile.userType === 'company' && notificationType === 'application') {
            setActiveTab('resumes')

            const foundResume = resumes.find(r => String(r.id) === String(notif.reference_id || ''))
            if (foundResume) {
                await handleViewResumeDetails(foundResume)
                setShowNotifications(false);
                return
            }

            const relatedCandidate = companyJobsWithCandidates
                .flatMap(job => job.candidates || [])
                .find(candidate => String(candidate.resume?.id || '') === String(notif.reference_id || ''))

            if (relatedCandidate?.resume) {
                await handleViewResumeDetails(buildResumeFromCandidate(relatedCandidate))
                setShowNotifications(false);
                return
            }

            if (notif.reference_id) {
                try {
                    const resumesRes = await logic.fetchWithAuth(`${logic.API_BASE}/api/resumes`)
                    if (resumesRes.ok) {
                        const resumesData = await resumesRes.json()
                        if (Array.isArray(resumesData)) {
                            const fetchedResume = resumesData.find((resume: Resume) => String(resume.id) === String(notif.reference_id))
                            if (fetchedResume) {
                                await handleViewResumeDetails(fetchedResume)
                            }
                        }
                    }
                } catch (e) {
                    console.error("Erro ao abrir curriculo pela notificacao:", e)
                }
            }
        } else if (
            notificationType === 'application_status' ||
            notificationType === 'session_validated' ||
            notificationType === 'session_cancelled' ||
            notificationMessage.includes('chamado para')
        ) {
            setActiveTab('applications');
        }

        setShowNotifications(false);
    }

    const handleEditResume = (resume: Resume) =>
        logic.handleEditResume({ resume, setUserResume, setShowResumeForm, setResumeStep })

    const handleSaveProfile = () => {
        logic.handleSaveProfile({
            userProfile,
            setUserProfile,
            setIsEditingProfile,
            setLoading
        })
    }

    const handleDeleteResume = (resumeId: string) =>
        logic.handleDeleteResume({ resumeId, setResumes })

    const handleCallPerson = (resume: Resume) => logic.handleCallPerson({ resume })

    // helpers usados no JSX
    const formatRelativeDate = logic.formatRelativeDate

    // ========= WhatsApp helpers =========
    const getCompanyWhatsappNumber = (job: Job): string | null => {
        const company: any = (job as any).companyInfo || {}
        const raw =
            company?.whatsapp ||
            company?.phone ||
            company?.contactPhone ||
            (job as any).companyPhone ||
            (job as any).contactPhone ||
            ''

        return logic.normalizeBRPhoneToWa(raw)
    }

    const handleContactCompanyWhatsapp = (job: Job) => {
        const wa = getCompanyWhatsappNumber(job)
        if (!wa) {
            alert('WhatsApp indisponível. Cadastre o número da empresa em companyInfo.whatsapp ou companyInfo.phone.')
            return
        }

        const text = `Olá! Vi a vaga "${job.title}" no PegaTrampo e quero mais detalhes.`
        const url = `https://wa.me/${wa}?text=${encodeURIComponent(text)}`
        window.open(url, '_blank')
    }

    const unreadNotifications = notifications.filter(n => !n.read).length

    // Funcao para visualizar curriculo completo

    // Modal de Detalhes do Curriculo Completo - MELHORADO COM BOTO DE CHAMAR 
    if (showResumeDetails && selectedResume) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col pt-[60px]">
                {/* Header com gradiente */}
                <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'} bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg`}>
                    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                        <button onClick={() => setShowResumeDetails(false)} className="p-2 
hover:bg-white/20 rounded-full transition-all">
                            <ArrowLeft className="h-5 w-5 text-white" />
                        </button>
                        <h1 className="text-lg font-bold text-white">Currículo Completo</h1>
                        <div className="w-10"></div>
                    </div>
                </div>

                {/* Perfil em destaque */}
                <div className="max-w-md mx-auto w-full mt-4 px-4">
                    <div className="bg-white rounded-2xl shadow-xl border-2 border-purple-200 p-6 
text-center">
                        <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 
rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg overflow-hidden border-2 border-white">
                            {(() => {
                                const photoUrl = getResumeProfileImageUrl(selectedResume, userProfile);
                                return photoUrl ? (
                                    <img src={photoUrl} alt="Foto de Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="h-12 w-12 text-white" />
                                );
                            })()}
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 
mb-1">{selectedResume.personalInfo.name}</h2>
                        {(userProfile.userType === 'professional' || userProfile.userType === 'company') && (
                            <div className="flex items-center justify-center gap-1.5 text-amber-500 mb-2">
                                <div className="flex items-center gap-1">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            className={`h-4 w-4 ${star <= Math.round(userProfile.userType === 'company' ? candidateEvaluationsData.averageRating : (userProfile.rating || 0)) ? 'fill-amber-500 text-amber-500' : 'text-amber-200'}`}
                                        />
                                    ))}
                                </div>
                                <span className="text-sm font-semibold text-gray-600">({userProfile.userType === 'company' ? candidateEvaluationsData.reviewsCount : (userProfile.reviews || 0)})</span>
                            </div>
                        )}
                        <p className="text-lg text-blue-600 font-semibold 
mb-3">{logic.getWorkerCategoryLabel({ workerCategory: (selectedResume as any).workerCategory || selectedResume.professionalInfo.category })}</p>
                        <div className="flex items-center justify-center space-x-2 text-gray-600 mb-4">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">{selectedResume.professionalInfo.experience} de
                                experiência</span>
                        </div>

                        {/* Botão de Chamar em DESTAQUE */}
                        <button
                            onClick={() => handleCallPerson(selectedResume)}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 
rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all 
shadow-lg flex items-center justify-center space-x-3 transform hover:scale-105"
                        >
                            <Phone className="h-6 w-6" />
                            <span>Chamar no WhatsApp</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-4 mt-4">
                    {/* Trabalhos ja feitos */}
                    {selectedResume.imageJob && selectedResume.imageJob.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5 mb-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Trabalhos já feitos:</h3>
                            <div className="grid grid-cols-3 gap-2">
                                {selectedResume.imageJob.map((imgUrl, index) => (
                                    <div key={index} className="aspect-square bg-gray-100 overflow-hidden cursor-pointer rounded-lg border shadow-sm group" onClick={() => setEnlargedPhoto(imgUrl)}>
                                        <img src={imgUrl} alt={`Trabalho ${index + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center 
justify-center">
                                <Phone className="h-5 w-5 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Contato</h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Phone className="h-5 w-5 text-gray-600" />
                                <div>
                                    <p className="text-xs text-gray-600">Telefone</p>
                                    <p className="font-semibold 
text-gray-900">{selectedResume.personalInfo.phone}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <Mail className="h-5 w-5 text-gray-600" />
                                <div>
                                    <p className="text-xs text-gray-600">E-mail</p>
                                    <p className="font-semibold 
text-gray-900">{selectedResume.personalInfo.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                <MapPin className="h-5 w-5 text-gray-600" />
                                <div>
                                    <p className="text-xs text-gray-600">Endereço</p>
                                    <p className="font-semibold 
text-gray-900">{selectedResumeAddress}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Experiência Profissional */}
                    {selectedResume.workExperience && selectedResume.workExperience.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center 
justify-center">
                                    <Award className="h-5 w-5 text-green-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Experiência Profissional</h3>
                            </div>
                            <div className="space-y-4">
                                {selectedResume.workExperience.map((exp, index) => (
                                    <div key={index} className="border-l-4 border-green-500 pl-4 py-2">
                                        <h4 className="font-bold text-gray-900 text-lg">{exp.position}</h4>
                                        <p className="text-gray-700 font-medium">{exp.company}</p>
                                        <p className="text-sm text-gray-600 mb-2">
                                            {exp.startDate} - {exp.isCurrentJob ? 'Atual' : exp.endDate}
                                        </p>
                                        <p className="text-sm text-gray-600">{exp.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Escolaridade */}
                    {selectedResume.education && selectedResume.education.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center 
justify-center">
                                    <GraduationCap className="h-5 w-5 text-yellow-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Escolaridade</h3>
                            </div>
                            <div className="space-y-4">
                                {selectedResume.education.map((edu, index) => (
                                    <div key={index} className="border-l-4 border-yellow-500 pl-4 py-2">
                                        <h4 className="font-bold text-gray-900">{edu.course}</h4>
                                        <p className="text-gray-700">{edu.institution}</p>
                                        <p className="text-sm text-gray-600">
                                            {edu.level.charAt(0).toUpperCase() + edu.level.slice(1)} -
                                            {edu.status.charAt(0).toUpperCase() + edu.status.slice(1)} ({edu.year})
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Habilidades */}
                    {selectedResume.skills && selectedResume.skills.length > 0 && (
                        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center 
justify-center">
                                    <Star className="h-5 w-5 text-pink-600" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Habilidades</h3>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedResume.skills.map((skill, index) => (
                                    <span key={index} className="bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                                        {skill}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                    {/* Botão fixo no final */}
                    <div className="sticky bottom-0 bg-white border-t p-4 -mx-4">
                        <button
                            onClick={() => handleCallPerson(selectedResume)}
                            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 
rounded-xl font-bold text-lg hover:from-green-600 hover:to-green-700 transition-all 
shadow-lg flex items-center justify-center space-x-3"
                        >
                            <Phone className="h-6 w-6" />
                            <span>Chamar no WhatsApp</span>
                        </button>
                    </div>
                </div>

                {/* Modal Enlarge Photo */}
                {enlargedPhoto && (
                    <div
                        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                        onClick={() => setEnlargedPhoto(null)}
                    >
                        <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2">
                            <X className="w-8 h-8" />
                        </button>
                        <div className="max-w-[90%] max-h-[90vh] flex items-center justify-center cursor-auto" onClick={(e) => e.stopPropagation()}>
                            <img src={enlargedPhoto} alt="Trabalho ampliado" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                        </div>
                    </div>
                )}
            </div>
        )
    }

    // Modal de Detalhes da Proposta (organizado + CTA fixo)
    if (showJobDetails && selectedJob) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col pt-[60px]">
                {/* Header */}
                <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'} bg-white shadow-sm border-b`}>
                    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                        <button
                            onClick={() => setShowJobDetails(false)}
                            className="p-2 hover:bg-gray-100 rounded-full"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-700" />
                        </button>

                        <div className="flex items-center gap-2 min-w-0">
                            <Building2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <h1 className="text-sm font-semibold text-gray-900 truncate">
                                {selectedJob.companyInfo?.name || selectedJob.postedBy || 'Empresa'}
                            </h1>
                            {selectedJob.companyInfo?.verified && (
                                <UserCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                            )}
                        </div>

                        <div className="w-10" />
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-4">
                    {/* Título + chips */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-xl font-bold text-gray-900 leading-snug">
                                {selectedJob.title.toUpperCase()}
                            </h2>

                            <div className="flex flex-col items-end gap-2">
                                {selectedJob.isUrgent && (
                                    <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                        URGENTE
                                    </span>
                                )}
                                {selectedJob.includesFood && (
                                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                        ALIMENTAÇÃO
                                    </span>
                                )}
                            </div>
                        </div>

                        <p className="text-sm text-gray-500 mt-2">
                            Publicado: {formatRelativeDate(selectedJob.postedAt)}
                        </p>
                    </div>

                    {/* Resumo (bem organizado) */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                        <h3 className="font-bold text-gray-900">Resumo</h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                    <span>Local</span>
                                </div>
                                <span className="font-medium text-gray-900 text-right">
                                    {selectedJob.address || 'A combinar'}
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <DollarSign className="h-4 w-4 text-gray-400" />
                                    <span>Valor</span>
                                </div>
                                <span className="font-semibold text-green-600 text-right">
                                    R$ {selectedJob.rate}
                                    {selectedJob.paymentType === 'hourly'
                                        ? '/hora'
                                        : selectedJob.paymentType === 'daily'
                                            ? '/dia'
                                            : selectedJob.paymentType === 'monthly'
                                                ? '/mês'
                                                : ' (projeto)'}
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>Início</span>
                                </div>
                                <span className="font-medium text-gray-900 text-right">
                                    {selectedJob.startDate
                                        ? new Date(selectedJob.startDate + 'T00:00:00').toLocaleDateString('pt-BR')
                                        : 'A combinar'}
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span>Horário de início</span>
                                </div>
                                <span className="font-medium text-gray-900 text-right">
                                    {selectedJob.startTime || 'A combinar'}
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Calendar className="h-4 w-4 text-gray-400" />
                                    <span>Duração</span>
                                </div>
                                <span className="font-medium text-gray-900 text-right">
                                    {selectedJob.duration || 'A combinar'}
                                </span>
                            </div>

                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-2 text-gray-700">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span>Carga horária</span>
                                </div>
                                <span className="font-medium text-gray-900 text-right">
                                    {selectedJob.workHours ? selectedJob.workHours : 'A combinar'}
                                    {selectedJob.period ? `  ${selectedJob.period}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Descrio completa */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <h3 className="font-bold text-gray-900 mb-2">Descrição</h3>
                        <p className="text-gray-700 text-sm leading-relaxed">
                            {selectedJob.description || 'Sem descrição.'}
                        </p>
                    </div>

                    {/* Localização + trajetos */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-4">
                        <h3 className="font-bold text-gray-900 mb-3">Localização</h3>

                        <div className="bg-gray-100 rounded-xl p-4 text-sm text-gray-700">
                            <div className="flex items-start gap-2">
                                <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                                <span>{selectedJob.address || 'A combinar'}</span>
                            </div>

                        </div>

                        <button
                            onClick={handleViewRoutes}
                            className="w-full mt-3 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Route className="h-5 w-5" />
                            <span>Ver trajetos</span>
                        </button>
                    </div>
                </div>

                {/* CTA fixo (as 2 ações principais) */}
                <div className="sticky bottom-0 bg-white border-t p-4">
                    <div className="max-w-md mx-auto flex gap-3">
                        {!myApplications.some(app => app.job.id === selectedJob.id) ? (
                            !userResume.id ? (
                                <button
                                    onClick={() => {
                                        setShowJobDetails(false)
                                        setActiveTab('resumes')
                                        setShowResumeForm(true)
                                        setResumeStep(1)
                                    }}
                                    className="flex-1 bg-blue-400 text-white py-3 rounded-xl font-bold hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                                >
                                    <FileText className="h-5 w-5" />
                                    <span>Criar Currículo</span>
                                </button>
                            ) : (
                                <button
                                    onClick={() => {
                                        handleApplyToJob(selectedJob)
                                        setShowJobDetails(false)
                                    }}
                                    className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <UserCheck className="h-5 w-5" />
                                    <span>Candidatar-se</span>
                                </button>
                            )
                        ) : (
                            <div className="flex-1 bg-green-50 text-green-700 border border-green-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                                <Check className="h-5 w-5" />
                                <span>Já candidatado</span>
                            </div>
                        )}

                    </div>
                </div>
                {showRouteModal && (
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl max-w-md w-full p-6">
                            <div className="text-center mb-6">
                                <h2 className="text-xl font-bold text-gray-900 mb-2">Escolha o app de navegação</h2>
                                <p className="text-gray-600 text-sm">Selecione como deseja ver o trajeto para:</p>
                                <p className="text-gray-900 font-medium">{selectedJob.address}</p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => {
                                        window.open(`https://maps.google.com/?q=${encodeURIComponent(selectedJob.address)}`, '_blank')
                                        setShowRouteModal(false)
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-4 hover:bg-gray-50 transition-all"
                                >
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Navigation className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-gray-900">Google Maps</h3>
                                        <p className="text-gray-600 text-sm">Navegação completa com trânsito</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-gray-400" />
                                </button>

                                <button
                                    onClick={() => {
                                        window.open(`https://waze.com/ul?q=${encodeURIComponent(selectedJob.address)}`, '_blank')
                                        setShowRouteModal(false)
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-4 hover:bg-gray-50 transition-all"
                                >
                                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                        <Route className="h-6 w-6 text-purple-600" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-gray-900">Waze</h3>
                                        <p className="text-gray-600 text-sm">Rotas inteligentes e alertas</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-gray-400" />
                                </button>

                                <button
                                    onClick={() => {
                                        window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[formatted_address]=${encodeURIComponent(selectedJob.address)}`, '_blank')
                                        setShowRouteModal(false)
                                    }}
                                    className="w-full bg-white border border-gray-200 rounded-xl p-4 flex items-center space-x-4 hover:bg-gray-50 transition-all"
                                >
                                    <div className="w-12 h-12 bg-black rounded-full flex items-center justify-center">
                                        <Car className="h-6 w-6 text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <h3 className="font-bold text-gray-900">Uber</h3>
                                        <p className="text-gray-600 text-sm">Solicitar corrida para o local</p>
                                    </div>
                                    <ExternalLink className="h-4 w-4 text-gray-400" />
                                </button>
                            </div>

                            <button
                                onClick={() => setShowRouteModal(false)}
                                className="w-full mt-4 border border-gray-300 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )
    }



    // Formulário de Cadastro de Currículo - Passo 1: Informações Pessoais MELHORADO 
    if (showResumeForm && resumeStep === 1) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col pt-[70px]">
                <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'} bg-blue-500 shadow-sm border-b`}>
                    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                        <button onClick={() => setShowResumeForm(false)} className="p-2 
hover:bg-blue-600 rounded-full">
                            <ArrowLeft className="h-5 w-5 text-white" />
                        </button>
                        <div className="text-center">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center 
mx-auto mb-1">
                                <span className="text-blue-500 font-bold text-sm">1</span>
                            </div>
                            <p className="text-white text-xs">de 2</p>
                        </div>
                        <div className="w-10"></div>
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-auto w-full p-4">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-bold text-blue-600 mb-6">Dados Pessoais</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    value={userResume.personalInfo.name}
                                    onChange={(e) => setUserResume(prev => ({
                                        ...prev,
                                        personalInfo: { ...prev.personalInfo, name: e.target.value }
                                    }))}
                                    placeholder="Ex: Maria da Silva"
                                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                                <input
                                    type="tel"
                                    value={userResume.personalInfo.phone}
                                    onChange={(e) => setUserResume(prev => ({
                                        ...prev,
                                        personalInfo: { ...prev.personalInfo, phone: e.target.value }
                                    }))}
                                    placeholder="Ex: (11) 91234-5678"
                                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
                                <input
                                    type="email"
                                    value={userResume.personalInfo.email}
                                    onChange={(e) => setUserResume(prev => ({
                                        ...prev,
                                        personalInfo: { ...prev.personalInfo, email: e.target.value }
                                    }))}
                                    placeholder="Ex: maria@email.com"
                                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                                <input
                                    type="text"
                                    value={logic.formatCEP(userResume.personalInfo.cep || '')}
                                    onChange={(e) => setUserResume(prev => ({
                                        ...prev,
                                        personalInfo: {
                                            ...prev.personalInfo,
                                            cep: e.target.value.replace(/\D/g, '').slice(0, 8)
                                        }
                                    }))}
                                    onBlur={handleResumeCepBlur}
                                    placeholder="Ex: 01310-000"
                                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Endereço Completo</label>
                                <input
                                    type="text"
                                    value={userResume.personalInfo.address}
                                    onChange={(e) => setUserResume(prev => ({
                                        ...prev,
                                        personalInfo: { ...prev.personalInfo, address: e.target.value }
                                    }))}
                                    placeholder="Ex: Rua das Flores, 123 - Centro, São Paulo"
                                    className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="min-w-0 w-full truncate">
                                    <label className="block text-sm font-medium text-gray-700 mb-1 truncate">Data de Nascimento</label>
                                    <input
                                        type="date"
                                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                                        value={userResume.personalInfo.birthDate}
                                        onChange={(e) => setUserResume(prev => ({
                                            ...prev,
                                            personalInfo: { ...prev.personalInfo, birthDate: e.target.value }
                                        }))}
                                        className="w-full px-3 py-4 text-sm bg-white appearance-none border-2 border-gray-200 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent min-w-0"
                                    />
                                </div>

                                <div className="min-w-0 w-full truncate">
                                    <label className="block text-sm font-medium text-gray-700 mb-1 truncate">Estado Civil</label>
                                    <select
                                        value={userResume.personalInfo.maritalStatus}
                                        onChange={(e) => setUserResume(prev => ({
                                            ...prev,
                                            personalInfo: { ...prev.personalInfo, maritalStatus: e.target.value }
                                        }))}
                                        className="w-full px-3 py-4 text-sm bg-white border-2 border-gray-200 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent min-w-0"
                                    >
                                        <option value="">Estado civil</option>
                                        <option value="solteiro">Solteiro(a)</option>
                                        <option value="casado">Casado(a)</option>
                                        <option value="divorciado">Divorciado(a)</option>
                                        <option value="viuvo">Viúvo(a)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-t p-4">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={() => {
                                if (!userResume.personalInfo.name?.trim()) {
                                    logic.showToastMessage('Campo obrigatorio nao preenchido: Nome Completo.')
                                    return
                                }
                                if (!userResume.personalInfo.phone?.trim()) {
                                    logic.showToastMessage('Campo obrigatorio nao preenchido: Telefone.')
                                    return
                                }
                                if (!userResume.personalInfo.email?.trim()) {
                                    logic.showToastMessage('Campo obrigatorio nao preenchido: E-mail.')
                                    return
                                }
                                if (!userResume.personalInfo.birthDate?.trim()) {
                                    logic.showToastMessage('Campo obrigatorio nao preenchido: Data de Nascimento.')
                                    return
                                }

                                // Age Validation
                                const today = new Date();
                                const birthDate = new Date(userResume.personalInfo.birthDate);
                                let age = today.getFullYear() - birthDate.getFullYear();
                                const m = today.getMonth() - birthDate.getMonth();
                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                    age--;
                                }

                                if (age < 18) {
                                    logic.showToastMessage('Voce precisa ter pelo menos 18 anos para se cadastrar.')
                                    return;
                                }

                                // Initialize workExperience if empty to avoid errors in Step 2
                                if (userResume.workExperience.length === 0) {
                                    setUserResume(prev => ({
                                        ...prev,
                                        workExperience: [{
                                            company: '',
                                            position: '',
                                            startDate: '',
                                            endDate: '',
                                            description: '',
                                            isCurrentJob: false
                                        }]
                                    }));
                                }

                                setResumeStep(2)
                            }}
                            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold 
hover:bg-blue-600 transition-colors"
                        >
                            Continuar
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Formulário de Cadastro de Currículo - Passo 2: Experiência Profissional NOVO 
    if (showResumeForm && resumeStep === 2) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col pt-[70px]">
                <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'} bg-blue-500 shadow-sm border-b`}>
                    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                        <button onClick={() => setResumeStep(1)} className="p-2 hover:bg-blue-600 
rounded-full">
                            <ArrowLeft className="h-5 w-5 text-white" />
                        </button>
                        <div className="text-center">
                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center 
mx-auto mb-1">
                                <span className="text-blue-500 font-bold text-sm">2</span>
                            </div>
                            <p className="text-white text-xs">de 2</p>
                        </div>
                        <div className="w-10"></div>
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-6">
                    {/* Experiência Profissional */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h2 className="text-xl font-bold text-blue-600 mb-4">Experiência Profissional</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
                                <input
                                    type="text"
                                    value={userResume.workExperience[0]?.company || ''}
                                    placeholder="Ex: Padaria Pão Quente"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                    onChange={(e) => {
                                        const newExperience = [...userResume.workExperience]
                                        if (newExperience.length > 0) {
                                            newExperience[0].company = e.target.value
                                        }
                                        setUserResume(prev => ({ ...prev, workExperience: newExperience }))
                                    }}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cargo/Função</label>
                                <input
                                    type="text"
                                    value={userResume.workExperience[0]?.position || ''}
                                    placeholder="Ex: Atendente de balcão"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                    onChange={(e) => {
                                        const newExperience = [...userResume.workExperience]
                                        if (newExperience.length > 0) {
                                            newExperience[0].position = e.target.value
                                        }
                                        setUserResume(prev => ({ ...prev, workExperience: newExperience }))
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Data de início</label>
                                    <input
                                        type="month"
                                        value={userResume.workExperience[0]?.startDate || ''}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                        onChange={(e) => {
                                            const newExperience = [...userResume.workExperience]
                                            if (newExperience.length > 0) {
                                                newExperience[0].startDate = e.target.value
                                            }
                                            setUserResume(prev => ({ ...prev, workExperience: newExperience }))
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-600 mb-1">Data de saída</label>
                                    <input
                                        type="month"
                                        value={userResume.workExperience[0]?.endDate || ''}
                                        disabled={userResume.workExperience[0]?.isCurrentJob}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                                        onChange={(e) => {
                                            const newExperience = [...userResume.workExperience]
                                            if (newExperience.length > 0) {
                                                newExperience[0].endDate = e.target.value
                                            }
                                            setUserResume(prev => ({ ...prev, workExperience: newExperience }))
                                        }}
                                    />
                                </div>
                            </div>

                            <label className="flex items-center space-x-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={userResume.workExperience[0]?.isCurrentJob || false}
                                    onChange={(e) => {
                                        const newExperience = [...userResume.workExperience]
                                        if (newExperience.length > 0) {
                                            newExperience[0].isCurrentJob = e.target.checked
                                            if (e.target.checked) {
                                                newExperience[0].endDate = ''
                                            }
                                        }
                                        setUserResume(prev => ({ ...prev, workExperience: newExperience }))
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700">Trabalho atual</span>
                            </label>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição das Atividades</label>
                                <textarea
                                    rows={3}
                                    value={userResume.workExperience[0]?.description || ''}
                                    placeholder="Ex: Atendimento ao cliente, organização do balcão e reposição de produtos"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                    onChange={(e) => {
                                        const newExperience = [...userResume.workExperience]
                                        if (newExperience.length === 0) {
                                            newExperience.push({
                                                company: '',
                                                position: '',
                                                startDate: '',
                                                endDate: '',
                                                description: e.target.value,
                                                isCurrentJob: false
                                            })
                                        } else {
                                            newExperience[0].description = e.target.value
                                        }
                                        setUserResume(prev => ({ ...prev, workExperience: newExperience }))
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Escolaridade */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Escolaridade</h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nível de Escolaridade</label>
                                <select
                                    value={userResume.education[0]?.level || ''}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                    onChange={(e) => {
                                        const newEducation = [...userResume.education]
                                        if (newEducation.length === 0) {
                                            newEducation.push({
                                                institution: '',
                                                course: '',
                                                level: e.target.value as any,
                                                status: 'completo',
                                                year: ''
                                            })
                                        } else {
                                            newEducation[0].level = e.target.value as any
                                        }
                                        setUserResume(prev => ({ ...prev, education: newEducation }))
                                    }}
                                >
                                    <option value="">Selecione o nível</option>
                                    <option value="fundamental">Ensino Fundamental</option>
                                    <option value="medio">Ensino Médio</option>
                                    <option value="tecnico">Técnico</option>
                                    <option value="superior">Superior</option>
                                    <option value="pos">Pós-graduação</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Instituição de Ensino</label>
                                <input
                                    type="text"
                                    value={userResume.education[0]?.institution || ''}
                                    placeholder="Ex: SENAI São Paulo"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                    onChange={(e) => {
                                        const newEducation = [...userResume.education]
                                        if (newEducation.length === 0) {
                                            newEducation.push({
                                                institution: e.target.value,
                                                course: '',
                                                level: 'medio',
                                                status: 'completo',
                                                year: ''
                                            })
                                        } else {
                                            newEducation[0].institution = e.target.value
                                        }
                                        setUserResume(prev => ({ ...prev, education: newEducation }))
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                                    <select
                                        value={userResume.education[0]?.status || 'completo'}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                        onChange={(e) => {
                                            const newEducation = [...userResume.education]
                                            if (newEducation.length > 0) {
                                                newEducation[0].status = e.target.value as any
                                            }
                                            setUserResume(prev => ({ ...prev, education: newEducation }))
                                        }}
                                    >
                                        <option value="completo">Completo</option>
                                        <option value="incompleto">Incompleto</option>
                                        <option value="cursando">Cursando</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Ano de Conclusão</label>
                                    <input
                                        type="number"
                                        value={userResume.education[0]?.year || ''}
                                        placeholder="Ex: 2024"
                                        min="1950"
                                        max="2024"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                        onChange={(e) => {
                                            const newEducation = [...userResume.education]
                                            if (newEducation.length > 0) {
                                                newEducation[0].year = e.target.value
                                            }
                                            setUserResume(prev => ({ ...prev, education: newEducation }))
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* SEÇÃO PORTFÓLIO (até 6 fotos) no currículo */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mt-6">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Fotos do seu trabalho (Opcional)</label>
                        <p className="text-xs text-gray-500 mb-3">Adicione até 6 fotos para mostrar seu trabalho (portfólio).</p>

                        <div className="grid grid-cols-3 gap-3 mb-2">
                            {(userResume.imageJob || []).map((img, idx) => (
                                <div key={idx} className="relative aspect-square rounded-lg border overflow-hidden bg-gray-50 group">
                                    <img src={img} alt={`Trabalho ${idx + 1}`} className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setUserResume(p => ({ ...p, imageJob: (p.imageJob || []).filter((_, i) => i !== idx) }))}
                                        className="absolute top-1.5 right-1.5 bg-red-500 text-white rounded-full p-1.5 shadow-md opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                        title="Remover foto"
                                    >
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                    </button>
                                </div>
                            ))}
                            {(userResume.imageJob || []).length < 6 && (
                                <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 flex flex-col items-center justify-center cursor-pointer transition-colors text-gray-400 hover:text-gray-600">
                                    <svg className="w-6 h-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    <span className="text-[10px] font-medium uppercase text-center leading-tight">Adicionar</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        multiple
                                        onChange={(e) => {
                                            if (e.target.files) {
                                                const validFiles = Array.from(e.target.files).slice(0, 6 - (userResume.imageJob || []).length);
                                                validFiles.forEach(file => {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setUserResume(p => {
                                                            const currentImages = p.imageJob || [];
                                                            if (currentImages.length >= 6) return p;
                                                            return { ...p, imageJob: [...currentImages, reader.result as string] };
                                                        });
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                            }
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                        <p className="text-[10px] text-gray-400 text-right">{(userResume.imageJob || []).length}/6 adicionadas</p>
                    </div>

                </div>

                <div className="bg-white border-t p-4">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleSaveResume}
                            disabled={isSavingResume}
                            className={`w-full py-3 rounded-lg font-semibold transition-colors ${isSavingResume ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                        >
                            {isSavingResume ? 'Salvando...' : 'Finalizar Cadastro'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }


    // Formulário de Publicação de Trabalho (Empresas) - MELHORADO COM HORAS DIRETAS 
    if (showJobPostForm && userProfile.userType === 'company') {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                        <button onClick={() => {
                            setShowJobPostForm(false)
                            setEditingJobId(null)
                            setNewJobPost(initialJobPostState)
                        }} className="p-2 
hover:bg-gray-100 rounded-full">
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900">{editingJobId ? 'Editar Proposta' : 'Publicar Proposta'}</h1>
                        <button className="p-2 hover:bg-gray-100 rounded-full">
                            <HelpCircle className="h-5 w-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-auto w-full p-4">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Título da Proposta *
                            </label>
                            <input
                                type="text"
                                value={newJobPost.title}
                                onChange={(e) => setNewJobPost({ ...newJobPost, title: e.target.value })}
                                placeholder="Ex: Preciso de confeiteiro para festa infantil"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-gray-500 text-xs mt-1">
                                O título aparecerá em MAIÚSCULO nas propostas
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Descrição *
                            </label>
                            <textarea
                                rows={4}
                                value={newJobPost.description}
                                onChange={(e) => setNewJobPost({ ...newJobPost, description: e.target.value })}
                                placeholder="Descreva tarefas, horário, local e requisitos da proposta"
                                maxLength={70}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                            />
                            <p className="text-gray-500 text-xs mt-1">
                                Máximo 70 caracteres ({newJobPost.description.length}/70)
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Categoria *
                            </label>
                            <select
                                value={newJobPost.category}
                                onChange={(e) => setNewJobPost({ ...newJobPost, category: e.target.value })}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">Selecione a categoria</option>
                                {categoryData.map(cat => (
                                    <option key={cat.name} value={cat.name}>{cat.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Pagamento *
                                </label>
                                <select
                                    value="daily"
                                    onChange={() => setNewJobPost({ ...newJobPost, paymentType: 'daily' })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="daily">Por Dia</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Valor (R$) *
                                </label>
                                <input
                                    type="number"
                                    value={newJobPost.rate || ''}
                                    onChange={(e) => setNewJobPost({
                                        ...newJobPost, rate:
                                            Number(e.target.value)
                                    })}
                                    placeholder="Ex: 150,00"
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                CEP
                            </label>
                            <input
                                type="text"
                                value={newJobPost.cep || ''}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 8);
                                    setNewJobPost({ ...newJobPost, cep: val })
                                }}
                                onBlur={handleCepBlur}
                                placeholder="Ex: 01310-000"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>



                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Endereço Completo *
                            </label>
                            <input
                                type="text"
                                value={newJobPost.address}
                                onChange={(e) => setNewJobPost({ ...newJobPost, address: e.target.value })}
                                placeholder="Ex: Rua das Flores, 123 - Vila Madalena"
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* MELHORADA: Seo de Horas com entrada direta */}
                        <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="font-medium text-blue-900 mb-3">Informações de Horário e
                                Duração</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Horas de Trabalho *
                                    </label>
                                    <input
                                        type="text"
                                        value={newJobPost.workHours}
                                        onChange={(e) => setNewJobPost({ ...newJobPost, workHours: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-400 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="text-gray-600 text-xs mt-1">
                                        Digite diretamente (ex: 8 horas, 6,5 horas)
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Período do Dia *
                                        </label>
                                        <select
                                            value={newJobPost.period}
                                            onChange={(e) => setNewJobPost({ ...newJobPost, period: e.target.value })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                        >
                                            <option value="">Selecione</option>
                                            <option value="Manhã">Manhã</option>
                                            <option value="Tarde">Tarde</option>
                                            <option value="Noite">Noite</option>
                                            <option value="Integral">Integral</option>
                                            <option value="Manhã/Tarde">Manhã/Tarde</option>
                                        </select>
                                        <p className="text-gray-600 text-xs mt-1">
                                            Em que período do dia
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Duração da Vaga *
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="number"
                                                min={1}
                                                value={durationQty}
                                                onChange={(e) => updateDuration(Number(e.target.value || 1), durationUnit)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-transparent"
                                            />

                                            <select
                                                value={durationUnit}
                                                onChange={(e) => updateDuration(durationQty, e.target.value as DurationUnit)}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black focus:ring-blue-500 focus:border-transparent"
                                            >
                                                <option value="dia">dia(s)</option>
                                                <option value="semana">semana(s)</option>
                                                <option value="mes">mês(es)</option>
                                            </select>
                                        </div>

                                        <p className="text-gray-600 text-xs mt-1">
                                            Por quanto tempo (será salvo como: <span className="font-medium">{formatDuration(durationQty, durationUnit)}</span>)
                                        </p>

                                        <p className="text-gray-600 text-xs mt-1">
                                            Por quanto tempo
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Data e Hora de Início */}
                        <div className="space-y-3">
                            <h3 className="font-semibold text-gray-900">Data e Hora de Início</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de início</label>
                                    <input
                                        type="date"
                                        value={newJobPost.startDate || ''}
                                        onChange={(e) => setNewJobPost({ ...newJobPost, startDate: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder-gray-600 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="text-gray-600 text-xs mt-1">Quando o trabalho começa</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Hora de início</label>
                                    <input
                                        type="time"
                                        value={newJobPost.startTime || ''}
                                        onChange={(e) => setNewJobPost({ ...newJobPost, startTime: e.target.value })}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder-gray-600 focus:ring-blue-500 focus:border-transparent"
                                    />
                                    <p className="text-gray-600 text-xs mt-1">Horário para se apresentar</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={newJobPost.isUrgent}
                                    onChange={(e) => setNewJobPost({ ...newJobPost, isUrgent: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Trabalho urgente</span>
                            </label>

                            <label className="flex items-center space-x-3">
                                <input
                                    type="checkbox"
                                    checked={newJobPost.includesFood}
                                    onChange={(e) => setNewJobPost({
                                        ...newJobPost, includesFood:
                                            e.target.checked
                                    })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">Inclui
                                    alimentação</span>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="bg-white border-t p-4">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handlePublishJob}
                            disabled={isPublishingJob}
                            className={`w-full py-3 rounded-lg font-semibold transition-colors ${isPublishingJob ? 'bg-blue-300 text-white cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                        >
                            {isPublishingJob ? (editingJobId ? 'Salvando...' : 'Publicando...') : (editingJobId ? 'Salvar Alterações' : 'Publicar Proposta')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Tela de Perfil Completo com Sistema de Avaliação - REMOVIDO PEGACOINS 
    if (showProfile) {
        return (
            <ProfilePage
                showHeader={showHeader}
                setShowProfile={setShowProfile}
                isEditingProfile={isEditingProfile}
                setIsEditingProfile={setIsEditingProfile}
                userProfile={userProfile}
                setUserProfile={setUserProfile}
                handleSaveProfile={handleSaveProfile}
                userResume={userResume}
                setActiveTab={setActiveTab}
                setShowResumeForm={setShowResumeForm}
                setResumeStep={setResumeStep}
            />
        )
    }
    // Tela de Suporte com Chat Funcional 
    if (showSupport) {
        return (
            <SupportPage
                showHeader={showHeader}
                setShowSupport={setShowSupport}
            />
        )
    }

    // App Principal - PegaTrampo Style 
    return (
        <div className="min-h-screen bg-gray-50 pt-[60px]">
            <div className={`fixed top-0 left-0 right-0 z-50 transition-transform duration-300 ${showHeader ? 'translate-y-0' : '-translate-y-full'} bg-blue-600 shadow-sm border-b px-4 py-3`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Briefcase className="h-6 w-6 text-white" />
                        <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                            <h1 className="text-xl font-bold text-white leading-tight">PegaTrampo</h1>
                            <p className="text-blue-100 text-sm md:text-base font-medium leading-tight">
                                Ola, {userProfile.userType === 'company'
                                    ? (userProfile.companyInfo?.companyName || 'Empresa')
                                    : (userProfile.name || 'Usuario')}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={() => setShowNotifications(!showNotifications)}
                            className="p-2 hover:bg-blue-700 rounded-full relative"
                        >
                            <Bell className="h-5 w-5 text-white" />
                            {unreadNotifications > 0 && (
                                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                                    {unreadNotifications}
                                </div>
                            )}
                        </button>
                        <button
                            className="p-2 hover:bg-blue-700 rounded-full"
                            onClick={() => setShowMenu(true)}
                        >
                            <Menu className="h-5 w-5 text-white" />
                        </button>
                    </div>
                </div>
            </div>

            {showNotifications && (
                <div className="bg-white border-b shadow-lg">
                    <div className="max-w-md mx-auto">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900">Notificacoes</h2>
                                <button
                                    onClick={() => setShowNotifications(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ?
                                </button>
                            </div>
                        </div>
                        <div className="max-h-[220px] overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    Nenhuma notificacao ainda
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-4 border-b cursor-pointer transition-colors hover:bg-gray-50 ${!notification.read ? 'bg-blue-50/60 font-semibold' : ''}`}
                                    >
                                        <div className="flex items-start space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${!notification.read ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'}`}>
                                                <Bell className="h-4 w-4" />
                                            </div>
                                            <div className="flex-1">
                                                {notification.title && <h3 className="text-gray-900 text-sm mb-0.5">{notification.title}</h3>}
                                                <p className={`text-xs ${!notification.read ? 'text-gray-800' : 'text-gray-600'}`}>{notification.message}</p>
                                                <p className="text-gray-400 text-xs mt-1">
                                                    {new Date(notification.timestamp).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'jobs' && (
                <JobsPage
                    userProfile={userProfile}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    selectedCategory={selectedCategory}
                    setSelectedCategory={setSelectedCategory}
                    categories={categories}
                    btnAgendaRef={btnAgendaRef}
                    setOpenAgenda={setOpenAgenda}
                    filteredJobs={filteredJobs}
                    handleViewJobDetails={handleViewJobDetails}
                    setEditingJobId={setEditingJobId}
                    setNewJobPost={setNewJobPost}
                    setShowJobPostForm={setShowJobPostForm}
                    updateDuration={updateDuration}
                    initialJobPostState={initialJobPostState}
                    handleEditJob={handleEditJob}
                    handleDeleteJob={handleDeleteJob}
                    formatRelativeDate={formatRelativeDate}
                />
            )}
                {/* ===================== SESSION PANEL (Candidate) ===================== */}
                {sessionApplicationId && (
                    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-in slide-in-from-right duration-300">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-5 flex items-center gap-3 shadow-lg">
                            <button onClick={() => { setSessionApplicationId(null); setActiveSession(null) }} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h2 className="font-bold text-lg">Controle do Serviço</h2>
                                <p className="text-blue-100 text-xs">Acompanhe sua jornada de trabalho</p>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full">
                            {sessionLoading ? (
                                <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-500 border-t-transparent" /></div>
                            ) : (
                                <>
                                    {/* Timeline */}
                                    <div className="bg-white rounded-2xl shadow-md p-5 mb-4">
                                        <h3 className="font-bold text-gray-800 mb-6 text-sm uppercase tracking-wide">Progresso do Serviço</h3>
                                        <div className="relative">
                                            {/* Vertical line */}
                                            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

                                            {[ 
                                                { key: 'accepted', label: 'Aceito pela empresa', icon: '🎉', doneStatuses: ['accepted','checked_in','checked_out','validated'] },
                                                { key: 'checked_in', label: 'Check-in feito', icon: '📍', doneStatuses: ['checked_in','checked_out','validated'] },
                                                { key: 'checked_out', label: 'Check-out feito', icon: '🏁', doneStatuses: ['checked_out','validated'] },
                                                { key: 'validated', label: 'Validado pela empresa', icon: '⭐', doneStatuses: ['validated'] },
                                            ].map((step, idx) => {
                                                const done = activeSession ? step.doneStatuses.includes(activeSession.status) : false
                                                const isCurrent = activeSession?.status === step.key
                                                return (
                                                    <div key={idx} className="relative flex items-start gap-4 mb-6 last:mb-0">
                                                        <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-md transition-all duration-500 ${
                                                            done ? 'bg-gradient-to-br from-green-400 to-emerald-500 scale-110' : isCurrent ? 'bg-gradient-to-br from-blue-400 to-purple-500 animate-pulse' : 'bg-gray-100'
                                                        }`}>
                                                            {step.icon}
                                                        </div>
                                                        <div className="pt-1.5">
                                                            <p className={`font-semibold text-sm ${done ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-400'}`}>{step.label}</p>
                                                            {step.key === 'checked_in' && activeSession?.checkinAt && (
                                                                <p className="text-xs text-gray-400 mt-0.5">{formatSessionTimestamp(activeSession.checkinAt)}</p>
                                                            )}
                                                            {step.key === 'checked_out' && activeSession?.checkoutAt && (
                                                                <p className="text-xs text-gray-400 mt-0.5">{formatSessionTimestamp(activeSession.checkoutAt)}</p>
                                                            )}
                                                            {step.key === 'validated' && activeSession?.validatedAt && (
                                                                <p className="text-xs text-gray-400 mt-0.5">{formatSessionTimestamp(activeSession.validatedAt)}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>

                                    {/* Photo preview already sent */}
                                    {(activeSession?.checkinPhotoUrl || activeSession?.checkoutPhotoUrl) && (
                                        <div className="bg-white rounded-2xl shadow-md p-5 mb-4">
                                            <h3 className="font-bold text-gray-800 mb-3 text-sm uppercase tracking-wide">Fotos Enviadas</h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {activeSession?.checkinPhotoUrl && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1 font-medium">📍 Check-in</p>
                                                        <img src={activeSession.checkinPhotoUrl} onClick={() => setEnlargedPhoto(activeSession.checkinPhotoUrl!)} className="w-full h-28 object-cover rounded-xl cursor-pointer shadow" alt="Check-in" />
                                                    </div>
                                                )}
                                                {activeSession?.checkoutPhotoUrl && (
                                                    <div>
                                                        <p className="text-xs text-gray-500 mb-1 font-medium">🏁 Check-out</p>
                                                        <img src={activeSession.checkoutPhotoUrl} onClick={() => setEnlargedPhoto(activeSession.checkoutPhotoUrl!)} className="w-full h-28 object-cover rounded-xl cursor-pointer shadow" alt="Check-out" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                        {/* Photo upload area - only show when action needed */}
                                        {activeSession && ['accepted', 'checked_in'].includes(activeSession.status) && (
                                            <div className="bg-white rounded-2xl shadow-md p-5">
                                                <h3 className="font-bold text-gray-800 mb-1 text-sm uppercase tracking-wide">
                                                    {activeSession.status === 'accepted' ? '📍 Fazer Check-in' : '🏁 Fazer Check-out'}
                                                </h3>
                                                <p className="text-xs text-gray-500 mb-4">
                                                    {activeSession.status === 'accepted'
                                                        ? 'Tire uma foto ao chegar no local de trabalho'
                                                        : 'Tire uma foto ao concluir o serviço'}
                                                </p>

                                                {/* Preview */}
                                                {sessionPhotoPreview ? (
                                                    <div className="relative mb-4">
                                                        <img src={sessionPhotoPreview} className="w-full h-52 object-cover rounded-xl shadow" alt="Preview" />
                                                        <button onClick={() => { setSessionPhotoPreview(null); setSessionPhotoFile(null) }} className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1">
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-blue-300 rounded-xl bg-blue-50 cursor-pointer hover:bg-blue-100 transition">
                                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleSessionPhotoSelect} />
                                                        <div className="text-4xl mb-2">📷</div>
                                                        <p className="text-blue-600 font-semibold text-sm">Toque para tirar foto</p>
                                                        <p className="text-gray-400 text-xs mt-1">ou escolha da galeria</p>
                                                    </label>
                                                )}

                                                {sessionPhotoFile && (
                                                    <button
                                                        onClick={() => handleSessionUpload(activeSession.status === 'accepted' ? 'checkin' : 'checkout')}
                                                        disabled={sessionLoading}
                                                        className="w-full mt-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-purple-200 hover:opacity-90 transition disabled:opacity-50"
                                                    >
                                                        {sessionLoading ? 'Enviando...' : activeSession.status === 'accepted' ? '✅ Confirmar Check-in' : '✅ Confirmar Check-out'}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {activeSession?.status === 'checked_out' && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-center">
                                                <p className="text-2xl mb-2">⏳</p>
                                                <p className="font-bold text-amber-800">Aguardando validação</p>
                                                <p className="text-amber-600 text-sm mt-1">A empresa vai confirmar seu serviço em breve</p>
                                            </div>
                                        )}

                                        {activeSession?.status === 'validated' && (
                                            <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center">
                                                <p className="text-4xl mb-2">🎉</p>
                                                <p className="font-bold text-green-800 text-lg">Serviço Validado!</p>
                                                <p className="text-green-600 text-sm mt-1">A empresa confirmou que você realizou o trabalho</p>
                                            </div>
                                        )}
                                        {activeSession?.status === 'cancelled' && (
                                            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 text-center">
                                                <p className="text-4xl mb-2">❌</p>
                                                <p className="font-bold text-red-800 text-lg">Servico nao concluido</p>
                                                <p className="text-red-600 text-sm mt-1">A empresa informou que o trabalho nao foi concluido.</p>
                                            </div>
                                        )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ===================== COMPANY SESSION VIEW ===================== */}
                {companySessionView && (
                    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-5 flex items-center gap-3 shadow-lg">
                            <button onClick={() => setCompanySessionView(null)} className="p-1.5 rounded-full bg-white/20 hover:bg-white/30">
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h2 className="font-bold text-lg">Controle do Candidato</h2>
                                <p className="text-blue-100 text-xs">{companySessionView.candidateName}</p>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 max-w-md mx-auto w-full space-y-4">
                            {/* Status badge */}
                            <div className={`rounded-2xl p-4 text-center font-bold text-lg ${
                                companySessionView.session.status === 'validated' ? 'bg-green-100 text-green-700' :
                                companySessionView.session.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                companySessionView.session.status === 'checked_out' ? 'bg-amber-100 text-amber-700' :
                                companySessionView.session.status === 'checked_in' ? 'bg-blue-100 text-blue-700' :
                                'bg-gray-100 text-gray-700'
                            }`}>
                                {companySessionView.session.status === 'validated' ? '✅ Serviço Validado' :
                                 companySessionView.session.status === 'cancelled' ? '❌ Servico nao concluido' :
                                 companySessionView.session.status === 'checked_out' ? '⏳ Aguardando sua validação' :
                                 companySessionView.session.status === 'checked_in' ? '🔵 Candidato no local' :
                                 '🟡 Aguardando chegada'}
                            </div>

                            {/* Photos */}
                            <div className="bg-white rounded-2xl shadow-md p-5">
                                <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wide">Fotos de Comprovação</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-2">📍 Check-in</p>
                                        {companySessionView.session.checkinPhotoUrl ? (
                                            <img src={companySessionView.session.checkinPhotoUrl} onClick={() => setEnlargedPhoto(companySessionView!.session.checkinPhotoUrl!)} className="w-full h-32 object-cover rounded-xl cursor-pointer shadow hover:opacity-90 transition" alt="Check-in" />
                                        ) : (
                                            <div className="w-full h-32 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Aguardando</div>
                                        )}
                                        {companySessionView.session.checkinAt && <p className="text-xs text-gray-400 mt-1 text-center">{formatSessionTimestamp(companySessionView.session.checkinAt)}</p>}
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-2">🏁 Check-out</p>
                                        {companySessionView.session.checkoutPhotoUrl ? (
                                            <img src={companySessionView.session.checkoutPhotoUrl} onClick={() => setEnlargedPhoto(companySessionView!.session.checkoutPhotoUrl!)} className="w-full h-32 object-cover rounded-xl cursor-pointer shadow hover:opacity-90 transition" alt="Check-out" />
                                        ) : (
                                            <div className="w-full h-32 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">Aguardando</div>
                                        )}
                                        {companySessionView.session.checkoutAt && <p className="text-xs text-gray-400 mt-1 text-center">{formatSessionTimestamp(companySessionView.session.checkoutAt)}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Validate button */}
                            {companySessionView.session.status === 'checked_out' && (
                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => handleValidateSession(companySessionView.session.id, true)}
                                        disabled={sessionLoading}
                                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-green-200 hover:opacity-90 transition disabled:opacity-50"
                                    >
                                        {sessionLoading ? 'Validando...' : '✅ Validar Serviço'}
                                    </button>
                                    <button
                                        onClick={() => handleValidateSession(companySessionView.session.id, false)}
                                        disabled={sessionLoading}
                                        className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-red-200 hover:opacity-90 transition disabled:opacity-50"
                                    >
                                        {sessionLoading ? 'Validando...' : '❌ Nao Concluiu'}
                                    </button>
                                </div>
                            )}

                            {['validated', 'cancelled'].includes(companySessionView.session.status) && !companySessionView.session.evaluationSubmitted && (
                                <button
                                    onClick={() => openEvaluationModalForSession(companySessionView.session, companySessionView.candidateName)}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-blue-200 hover:opacity-90 transition"
                                >
                                    ⭐ Avaliar Candidato
                                </button>
                            )}

                            {['validated', 'cancelled'].includes(companySessionView.session.status) && companySessionView.session.evaluationSubmitted && (
                                <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-5 text-center">
                                    <p className="text-lg font-bold text-green-800">Avaliacao enviada</p>
                                    <p className="text-sm text-green-600 mt-1">O feedback deste candidato ja foi registrado pela sua empresa.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}


                {activeTab === 'applications' && (
                    <ApplicationsPage
                        userProfile={userProfile}
                        myApplications={myApplications}
                        openSessionPanel={openSessionPanel}
                        handleViewJobDetails={handleViewJobDetails}
                    />
                )}

                {activeTab === 'resumes' && (
                    <ResumesPage
                        userProfile={userProfile}
                        resumeSearchTerm={resumeSearchTerm}
                        setResumeSearchTerm={setResumeSearchTerm}
                        filteredResumes={filteredResumes}
                        setShowResumeForm={setShowResumeForm}
                        setResumeStep={setResumeStep}
                        companyJobsWithCandidates={companyJobsWithCandidates}
                        setCandidatesModalJob={setCandidatesModalJob}
                        setCandidateSearchTerm={setCandidateSearchTerm}
                        getResumeProfileImageUrl={getResumeProfileImageUrl}
                        handleViewResumeDetails={handleViewResumeDetails}
                        handleEditResume={handleEditResume}
                        handleDeleteResume={handleDeleteResume}
                    />
                )}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-purple-100 px-0 py-2 pb-safe shadow-[0_-10px_40px_rgba(99,102,241,0.1)] z-40">
                <div className="flex items-center w-full max-w-md mx-auto relative pb-2 pt-1">
                    <div style={{ flexGrow: 2 }}></div>
                    <button
                        onClick={() => { setShowProfile(false); setShowSupport(false); setActiveTab('jobs'); }}
                        className="flex flex-col items-center p-2 relative group w-16 shrink-0"
                    >
                        <div className={`relative p-2.5 rounded-2xl transition-all duration-300 flex items-center justify-center ${activeTab === 'jobs' && !showProfile && !showSupport ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/40 -translate-y-4 scale-110' : 'text-gray-400 bg-transparent group-hover:text-purple-500 hover:bg-purple-50'}`}>
                            <Home className="h-6 w-6" />
                        </div>
                        <span className={`absolute -bottom-1 text-[10px] font-bold transition-all duration-300 text-center w-full ${activeTab === 'jobs' && !showProfile && !showSupport ? 'text-purple-700 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}>
                            {userProfile.userType === 'company' ? 'Propostas' : 'Trabalhos'}
                        </span>
                    </button>

                    <div style={{ flexGrow: 1 }}></div>

                    {userProfile.userType === 'professional' && (
                        <>
                            <button
                                onClick={() => { setShowProfile(false); setShowSupport(false); setActiveTab('applications'); }}
                                className="flex flex-col items-center p-2 relative group w-16 shrink-0"
                            >
                                <div className={`relative p-2.5 rounded-2xl transition-all duration-300 flex items-center justify-center ${activeTab === 'applications' && !showProfile && !showSupport ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/40 -translate-y-4 scale-110' : 'text-gray-400 bg-transparent group-hover:text-purple-500 hover:bg-purple-50'}`}>
                                    <Briefcase className="h-6 w-6" />
                                </div>
                                <span className={`absolute -bottom-1 text-[10px] font-bold transition-all duration-300 text-center w-full ${activeTab === 'applications' && !showProfile && !showSupport ? 'text-purple-700 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}>
                                    Candidaturas
                                </span>
                            </button>
                            <div style={{ flexGrow: 1 }}></div>
                        </>
                    )}
                    <button
                        onClick={() => { setShowProfile(false); setShowSupport(false); setActiveTab('resumes'); }}
                        className="flex flex-col items-center p-2 relative group w-16 shrink-0"
                    >
                        <div className={`relative p-2.5 rounded-2xl transition-all duration-300 flex items-center justify-center ${activeTab === 'resumes' && !showProfile && !showSupport ? 'bg-gradient-to-tr from-blue-600 to-purple-600 text-white shadow-lg shadow-purple-500/40 -translate-y-4 scale-110' : 'text-gray-400 bg-transparent group-hover:text-purple-500 hover:bg-purple-50'}`}>
                            <FileText className="h-6 w-6" />
                        </div>
                        <span className={`absolute -bottom-1 text-[10px] font-bold transition-all duration-300 text-center w-full ${activeTab === 'resumes' && !showProfile && !showSupport ? 'text-purple-700 opacity-100' : 'text-gray-400 opacity-0 group-hover:opacity-100'}`}>
                            Currículo
                        </span>
                    </button>
                    <div style={{ flexGrow: 2 }}></div>
                </div>
            </div>
            <div className="h-24"></div>
            {/* Modal do Menu Principal */}
            {
                showMenu && (
                    <div className="fixed inset-0 z-50 flex animate-in fade-in duration-300">
                        <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={() => setShowMenu(false)}></div>
                        <div className="bg-white w-72 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                            <div className="bg-blue-600 p-6 flex justify-between items-center text-white">
                                <div className="flex items-center space-x-3">
                                    <div className="bg-white w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0">
                                        {userProfile.imagem_profile ? (
                                            <img src={userProfile.imagem_profile} alt="Perfil" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="h-6 w-6 text-blue-600" />
                                        )}
                                    </div>
                                    <div className="max-w-[180px]">
                                        <p className="font-bold text-lg truncate" title={userProfile.userType === 'company' ? (userProfile.companyInfo?.companyName || userProfile.name || 'Sua Empresa') : (userProfile.name || 'Seu Nome')}>
                                            {userProfile.userType === 'company'
                                                ? userProfile.companyInfo?.companyName || userProfile.name || 'Sua Empresa'
                                                : userProfile.name || 'Seu Nome'}
                                        </p>
                                        <p className="text-blue-100 text-xs">PegaTrampo</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowMenu(false)} className="hover:bg-blue-700 p-1 rounded-full text-white">
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="p-4 space-y-2 flex-1 overflow-y-auto">
                                <button
                                    onClick={() => { setShowMenu(false); setShowProfile(true); }}
                                    className="w-full flex items-center space-x-3 p-4 hover:bg-blue-50 rounded-xl text-gray-700 font-medium transition-colors border border-transparent hover:border-blue-100"
                                >
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <User className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <span className="text-lg">Meu Perfil</span>
                                </button>

                                <button
                                    onClick={() => { setShowMenu(false); setShowSupport(true); }}
                                    className="w-full flex items-center space-x-3 p-4 hover:bg-blue-50 rounded-xl text-gray-700 font-medium transition-colors border border-transparent hover:border-blue-100"
                                >
                                    <div className="bg-blue-100 p-2 rounded-lg">
                                        <HelpCircle className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <span className="text-lg">Suporte</span>
                                </button>
                            </div>

                            <div className="p-4 border-t border-gray-100">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center space-x-3 p-4 hover:bg-red-50 rounded-xl text-red-600 font-bold transition-colors border border-transparent hover:border-red-100"
                                >
                                    <div className="bg-red-100 p-2 rounded-lg">
                                        <LogOut className="h-5 w-5 text-red-600" />
                                    </div>
                                    <span className="text-lg">Sair</span>
                                </button>
                                <p className="text-center text-gray-400 text-xs mt-4">Versão 1.0.0</p>
                            </div>
                        </div>
                    </div>
                )
            }
            <AgendaFilterPopover
                open={openAgenda}
                anchorRef={btnAgendaRef as any}
                onClose={() => setOpenAgenda(false)}
                initialValue={{ startDate: selectedDate }}
                onApply={(val) => {
                    setSelectedDate(val.startDate || '')
                }}
            />

            {/* Modal de Candidatos */}
            {candidatesModalJob && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] max-h-[95vh] overflow-hidden flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <div>
                                <h3 className="font-bold text-gray-900 text-lg">Candidatos interessados</h3>
                                <p className="text-sm text-gray-500 truncate max-w-[250px]">{candidatesModalJob.title}</p>
                            </div>
                            <button
                                onClick={() => setCandidatesModalJob(null)}
                                className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-500" />
                            </button>
                        </div>
                        <div className="p-4 border-b border-gray-100 bg-white shadow-sm z-10">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar candidato por nome..."
                                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                    value={candidateSearchTerm}
                                    onChange={(e) => setCandidateSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="overflow-y-auto p-4 space-y-3 bg-gray-50 flex-1">
                            {(() => {
                                const filtered = (candidatesModalJob.candidates || []).filter(c =>
                                    c.name.toLowerCase().includes(candidateSearchTerm.toLowerCase())
                                );
                                if (filtered.length === 0) {
                                    return (
                                        <div className="text-center py-8">
                                            <User className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                                            <p className="text-gray-500">Nenhum candidato encontrado com "{candidateSearchTerm}".</p>
                                        </div>
                                    );
                                }
                                return filtered.map(candidate => {
                                    const candidatePhoto = getCandidateProfileImageUrl(candidate)
                                    return (
                                        <div key={candidate.applicationId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 hover:shadow transition">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400 border border-gray-200 shrink-0">
                                                    {candidatePhoto ? (
                                                        <img src={candidatePhoto} alt={`Foto de ${candidate.name}`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <User className="h-6 w-6" />
                                                    )}
                                                </div>
                                                  <div className="flex-1 min-w-0">
                                                      <div className="pr-2">
                                                          <p className="font-bold text-gray-900 break-words">{candidate.name}</p>
                                                          <p className="text-sm text-gray-600 truncate">{candidate.category}</p>
                                                      </div>
                                                      <div className="mt-1 flex justify-end">
                                                          <span className={`text-[10px] font-bold px-2 py-1 rounded-full shrink-0 ${['aprovado', 'accepted'].includes(candidate.status?.toLowerCase()) ? 'bg-green-100 text-green-800' :
                                                              ['cancelado', 'cancelled', 'canceled'].includes(candidate.status?.toLowerCase()) ? 'bg-red-100 text-red-800' :
                                                              ['finalizado', 'finished'].includes(candidate.status?.toLowerCase()) ? 'bg-blue-100 text-blue-800' :
                                                                  'bg-yellow-100 text-yellow-800'
                                                              }`}>
                                                              {['aprovado', 'accepted'].includes(candidate.status?.toLowerCase()) ? 'APROVADO' : (['cancelado', 'cancelled', 'canceled'].includes(candidate.status?.toLowerCase()) ? 'CANCELADO' : (['finalizado', 'finished'].includes(candidate.status?.toLowerCase()) ? 'FINALIZADO' : 'PENDENTE'))}
                                                          </span>
                                                      </div>
                                                      <div className="text-xs text-gray-500 mt-2 space-y-1">
                                                          {candidate.email && <div className="flex items-center gap-1 truncate"><Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{candidate.email}</span></div>}
                                                          {candidate.phone && <div className="flex items-center gap-1"><Phone className="h-3 w-3" /> {candidate.phone}</div>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 mt-2 border-t border-gray-100 pt-3 flex-wrap">
                                                {candidate.resume && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleViewResumeDetails(buildResumeFromCandidate(candidate));
                                                        }}
                                                        className="flex-1 bg-blue-50 text-blue-700 py-2 rounded-lg text-sm font-semibold hover:bg-blue-100 transition"
                                                    >
                                                        Resumo Currículo
                                                    </button>
                                                )}
                                                {['aprovado', 'accepted'].includes(candidate.status?.toLowerCase()) && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setSessionLoading(true);
                                                            try {
                                                                const res = await logic.fetchWithAuth(`${logic.API_BASE}/api/sessions/${candidate.applicationId}`);
                                                                if (res.ok) {
                                                                    const d = await res.json();
                                                                    if (d.session) {
                                                                        setCompanySessionView({ session: d.session, candidateName: candidate.name });
                                                                        setCandidatesModalJob(null);
                                                                    } else {
                                                                        alert('Sessão não encontrada para este candidato.');
                                                                    }
                                                                }
                                                            } catch(e) { console.error(e); }
                                                            setSessionLoading(false);
                                                        }}
                                                        className="flex-1 bg-purple-50 text-purple-700 py-2 rounded-lg text-sm font-semibold hover:bg-purple-100 transition flex items-center justify-center gap-1"
                                                    >
                                                        <span>🎯</span> Ver Controle
                                                    </button>
                                                )}
                                                {(!candidate.status || candidate.status === 'pendente' || candidate.status === 'pending') && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            setAcceptingApplicationId(candidate.applicationId)
                                                            await logic.handleAcceptApplication({
                                                                applicationId: candidate.applicationId,
                                                                setCompanyJobsWithCandidates,
                                                                setCandidatesModalJob,
                                                                setNotifications
                                                            })
                                                            setAcceptingApplicationId((current) =>
                                                                current === candidate.applicationId ? null : current
                                                            )
                                                        }}
                                                        disabled={acceptingApplicationId === candidate.applicationId}
                                                        className="flex-1 bg-green-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-600 transition flex items-center justify-center gap-1 disabled:opacity-70 disabled:cursor-not-allowed"
                                                    >
                                                        {acceptingApplicationId === candidate.applicationId ? (
                                                            <>
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                Aceitando...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Check className="h-4 w-4" />
                                                                Aceitar
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            })()}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Avaliação */}
            {showEvaluationModal && evaluationData && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col p-6 space-y-6">
                        <div className="text-center space-y-2">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <Star className="h-10 w-10 text-blue-600 fill-blue-600" />
                            </div>
                            <h3 className="text-2xl font-black text-gray-900 leading-tight">Avalie o seu Candidato!</h3>
                            <p className="text-gray-500 text-sm">Como foi o serviço de <span className="font-bold text-gray-800">{evaluationData.candidateName}</span>?</p>
                        </div>

                        <div className="flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setEvaluationRating(star)}
                                    className="focus:outline-none transition-transform active:scale-90"
                                >
                                    <Star
                                        className={`h-10 w-10 transition-colors ${
                                            star <= evaluationRating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'
                                        }`}
                                    />
                                </button>
                            ))}
                        </div>


                        <div className="flex flex-col gap-3 pt-2">
                            <button
                                onClick={handleSubmitEvaluation}
                                disabled={evaluationSubmitting || evaluationRating === 0}
                                className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50 disabled:shadow-none"
                            >
                                {evaluationSubmitting ? 'Enviando...' : 'Enviar Avaliacao'}
                            </button>
                            <button
                                onClick={() => {
                                    setShowEvaluationModal(false)
                                    setEvaluationData(null)
                                }}
                                className="w-full py-2 text-gray-400 font-semibold text-sm hover:text-gray-600 transition-colors"
                            >
                                Avaliar Depois
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Enlarge Photo (Global para a view principal) */}
            {enlargedPhoto && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setEnlargedPhoto(null)}
                >
                    <button className="absolute top-4 right-4 text-white hover:text-gray-300 p-2">
                        <X className="w-8 h-8" />
                    </button>
                    <div className="max-w-[90%] max-h-[90vh] flex items-center justify-center cursor-auto" onClick={(e) => e.stopPropagation()}>
                        <img src={enlargedPhoto} alt="Trabalho ampliado" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                    </div>
                </div>
            )}

        </div >
    )
}









