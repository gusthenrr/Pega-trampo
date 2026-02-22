"use client"

import { useState, useEffect } from 'react'
import {
    Search, MapPin, Clock, DollarSign, User, Briefcase, Filter, Plus, Heart,
    MessageCircle, Share2, Calendar, Star, MoreVertical, Bell, ChevronLeft, ChevronRight,
    ArrowLeft, HelpCircle, Check, Home, Bookmark, Settings, Menu, Send, Eye, Users, Award,
    Zap, Hammer, Scissors, Car, Baby, Utensils, Paintbrush, Wrench, GraduationCap, Camera,
    Music, Shirt, TreePine, Laptop, Phone, Shield, Truck, Sparkles, Flower2, Palette, Edit,
    FileText, LogOut, MapPinIcon, Mail, Building2, UserCheck, Briefcase as
        BriefcaseIcon, Navigation, Route, ExternalLink, Upload, X, Trash2
} from 'lucide-react'

import type {
    Job,
    UserProfile,
    Notification,
    CompanyJobPost,
    Resume,
    CompanyJobApplications,
    MyApplication,
} from '../types/pegatrampo'

import * as logic from './pegaTrampo.logic'

const categoryData = [
    {
        name: "Atendente/Garçom",
        icon: User,
        description: "Atendimento, balcão, salão, eventos",
        color: "bg-blue-100 text-blue-600",
    },
    {
        name: "Caixa",
        icon: DollarSign,
        description: "Caixa, recebimentos, fechamento",
        color: "bg-green-100 text-green-700",
    },

    {
        name: "Padeiro",
        icon: Utensils,
        description: "Pães, massas, fermentação",
        color: "bg-orange-100 text-orange-600",
    },
    {
        name: "Confeiteiro",
        icon: Utensils,
        description: "Doces, bolos, sobremesas",
        color: "bg-pink-100 text-pink-600",
    },
    {
        name: "Pizzaiolo",
        icon: Utensils,
        description: "Pizza, forno, preparo de massas",
        color: "bg-red-100 text-red-600",
    },
    {
        name: "Cozinheiro",
        icon: Utensils,
        description: "Cozinha, eventos, restaurantes",
        color: "bg-amber-100 text-amber-700",
    },
    {
        name: "Chapeiro",
        icon: Utensils,
        description: "Chapa, lanches, hamburgueria",
        color: "bg-amber-100 text-amber-700",
    },
    {
        name: "Auxiliar da cozinha",
        icon: Utensils,
        description: "Pré-preparo, apoio, limpeza do posto",
        color: "bg-yellow-100 text-yellow-700",
    },
    {
        name: "Churrasqueiro",
        icon: Utensils,
        description: "Churrasco, carnes, eventos",
        color: "bg-rose-100 text-rose-700",
    },
    {
        name: "Copeiro/Bartender",
        icon: Utensils,
        description: "Bebidas, drinks, apoio ao salão",
        color: "bg-purple-100 text-purple-600",
    },

    {
        name: "Diarista",
        icon: Sparkles,
        description: "Limpeza residencial e comercial",
        color: "bg-cyan-100 text-cyan-600",
    },

    {
        name: "Repostior/Estoquista",
        icon: Briefcase,
        description: "Reposição, estoque, organização",
        color: "bg-slate-100 text-slate-600",
    },
    {
        name: "Ajudande geral",
        icon: Hammer,
        description: "Apoio geral, carga/descarga, serviços gerais",
        color: "bg-gray-100 text-gray-700",
    },
    {
        name: "Motoboy/Entregador",
        icon: Car,
        description: "Entregas, rotas, suporte logístico",
        color: "bg-indigo-100 text-indigo-600",
    },
] as const


const categories = ['Todas', ...categoryData.map(cat => cat.name)]

const professions = [
    'Confeiteiro/Doceira',
    'Diarista',
    'Cozinheiro/Chef',
    'Jardineiro',
    'Cabeleireiro/Barbeiro',
    'Manicure/Pedicure',
    'Massagista',
    'Personal Trainer',
    'Professor Particular',
    'Motorista',
    'Babá/Cuidador',
    'Eletricista',
    'Encanador',
    'Pintor',
    'Pedreiro',
    'Marceneiro',
    'Outros'
]

const skills = [
    'Confeitaria',
    'Doces finos',
    'Bolos decorados',
    'Limpeza residencial',
    'Limpeza comercial',
    'Organização',
    'Jardinagem',
    'Paisagismo',
    'Poda de árvores',
    'Corte feminino',
    'Corte masculino',
    'Coloração',
    'Manicure',
    'Pedicure',
    'Unhas decoradas',
    'Massagem relaxante',
    'Massagem terapêutica',
    'Drenagem linfática',
    'Musculação',
    'Pilates',
    'Yoga',
    'Matemática',
    'Português',
    'Inglês',
    'Direção defensiva',
    'Conhecimento da cidade',
    'Primeiros socorros',
    'Cuidados com idosos',
    'Cuidados com crianças',
    'Instalações elétricas',
    'Manutenção elétrica',
    'Instalações hidráulicas',
    'Desentupimento',
    'Pintura residencial',
    'Pintura comercial',
    'Textura',
    'Alvenaria',
    'Acabamento',
    'Móveis sob medida',
    'Restauração'
]

// Tipos de contrato disponíveis 
const contractTypes = [
    'Autônomo',
    'Cooperado',
    'Prestador de serviços (PJ)',
    'Trainee',
    'CLT (Efetivo)',
    'Free-lancer',
    'Temporário',
    'Estágio'
]

// Benefícios disponíveis 
const availableBenefits = [
    'Vale transporte',
    'Vale refeição',
    'Vale alimentação',
    'Plano de saúde',
    'Plano odontológico',
    'Seguro de vida',
    'Participação nos lucros',
    'Auxílio creche',
    'Gympass',
    'Convênio farmácia',
    'Desconto em produtos',
    'Estacionamento gratuito'
]

// Função para formatar data relativa 

export default function PegaTrampoApp() {
    const [currentStep, setCurrentStep] = useState('welcome')
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [apiError, setApiError] = useState('')
    const [companyJobsWithCandidates, setCompanyJobsWithCandidates] = useState<CompanyJobApplications[]>([])

    // States
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('Todas')
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
    const [resumeStep, setResumeStep] = useState(1)
    const [resumeSearchTerm, setResumeSearchTerm] = useState('')
    const [resumes, setResumes] = useState<Resume[]>([])
    const [showResumeDetails, setShowResumeDetails] = useState(false)
    const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
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
        startTime: ''
    }

    const [showMenu, setShowMenu] = useState(false)
    const [newJobPost, setNewJobPost] = useState<CompanyJobPost>(initialJobPostState)

    const handleLogout = async () => {
        if (!confirm('Tem certeza que deseja sair da sua conta?')) return

        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
            await fetch(`${apiUrl}/api/logout`, {
                method: 'POST',
                credentials: 'include',
            })
        } catch (e) {
            console.error('Erro ao fazer logout no servidor:', e)
        }

        localStorage.removeItem('pegaTrampo.user')
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
        workerCategory: '',
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
            address: '',
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



    // filtros
    const filteredJobs = logic.filterJobs({ jobs, searchTerm, selectedCategory, userProfile })
    const filteredResumes = logic.filterResumes({ resumes, resumeSearchTerm, userProfile })

    // handlers (mantém o MESMO nome)
    const handleNextStep = () => logic.handleNextStep({ currentStep, setCurrentStep, userProfile })
    const handlePrevStep = () => logic.handlePrevStep({ currentStep, setCurrentStep })

    const handleSkillToggle = (skill: string) => logic.handleSkillToggle({ skill, setUserProfile })
    const handleAvailabilityToggle = (period: string) =>
        logic.handleAvailabilityToggle({ period, setUserProfile })

    const handleCPFChange = (value: string) =>
        logic.handleCPFChange({ value, userProfile, setUserProfile, setCpfError })

    const handleCNPJChange = (value: string) =>
        logic.handleCNPJChange({ value, setUserProfile, setCnpjLoading, setCnpjError })

    const handleApplyToJob = (job: Job) =>
        logic.handleApplyToJob({
            job,
            setJobs,
            setActiveTab,
            setNotifications,
            setMyApplications,
        })

    const handlePublishJob = () => {
        if (editingJobId) {
            logic.handleUpdateJob({
                jobId: editingJobId,
                updatedJobPost: newJobPost,
                userProfile,
                setJobs,
                setShowJobPostForm,
                setEditingJobId
            })
        } else {
            logic.handlePublishJob({ newJobPost, userProfile, setJobs, setShowJobPostForm })
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

    const handleSaveResume = () =>
        logic.handleSaveResume({
            userResume,
            userProfile,
            setUserResume,
            setResumes,
            setShowResumeForm,
            setResumeStep,
            setNotifications,
        })

    const handleViewResumeDetails = (resume: Resume) =>
        logic.handleViewResumeDetails({ resume, setSelectedResume, setShowResumeDetails })

    const handleEditResume = (resume: Resume) =>
        logic.handleEditResume({ resume, setUserResume, setShowResumeForm, setResumeStep })

    const handleProfileCepBlur = async () => {
        const cep = userProfile.cep.replace(/\D/g, '')
        if (cep.length !== 8) return

        setLoading(true)
        const addressData = await logic.fetchAddressByCEP(cep)
        setLoading(false)

        if (addressData) {
            setUserProfile(prev => ({
                ...prev,
                address: addressData.street,
                neighborhood: addressData.neighborhood,
                city: addressData.city,
                state: addressData.state,
                // If coordinates are returned by fetchAddressByCEP (it doesn't, it uses fetchCoordinates separately)
                // We need to fetch coordinates now
            }))

            // Fetch coordinates immediately
            const coords = await logic.fetchCoordinates(addressData.fullAddress)
            if (coords) {
                // We don't have explicit lat/lng in UserProfile type yet displayed in logic file, 
                // but we know we added them to the payload in handleSaveProfile. 
                // Let's add them to UserProfile state if possible, or just trust handleSaveProfile 
                // BUT handleSaveProfile uses userProfile state. 
                // So we MUST store them in userProfile state.
                // Let's check UserProfile type definition in pegatrampo.ts earlier. 
                // It likely doesn't have lat/lng?
                // Step 55 showed UserProfile type. I should check it.
                // If not, I can just mix them in or update the type. 
                // For now, I'll update the state assuming existing or dynamic property, 
                // OR I should update the type.
                // Let's update the type first if needed.
                // For now, I'll assume they can be stored.
                setUserProfile(prev => ({
                    ...prev,
                    lat: coords.lat,
                    lng: coords.lng
                } as any))

            }
        }
    }

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

    // Função para visualizar currículo completo

    // Modal de Detalhes do Currículo Completo - MELHORADO COM BOTÃO DE CHAMAR 
    if (showResumeDetails && selectedResume) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex 
flex-col">
                {/* Header com gradiente */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
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
rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <User className="h-12 w-12 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 
mb-1">{selectedResume.personalInfo.name}</h2>
                        <p className="text-lg text-blue-600 font-semibold 
mb-3">{selectedResume.professionalInfo.category}</p>
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
                    {/* Informações de Contato */}
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
text-gray-900">{selectedResume.personalInfo.address}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Informações Profissionais */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 p-5">
                        <div className="flex items-center space-x-2 mb-4">
                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center 
justify-center">
                                <Briefcase className="h-5 w-5 text-purple-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">Informações Profissionais</h3>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Tipos de Contrato</p>
                                <div className="flex flex-wrap gap-2">
                                    {selectedResume.professionalInfo.contractTypes.map((type, index) => (
                                        <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 
rounded-full text-xs font-medium">
                                            {type}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-1">Horário de Trabalho</p>
                                <p className="font-medium 
text-gray-900">{selectedResume.professionalInfo.workSchedule}</p>
                            </div>

                        </div>
                    </div>

                    {/* Experiência Profissional */}
                    {selectedResume.workExperience.length > 0 && (
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
                    {selectedResume.education.length > 0 && (
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
                    {selectedResume.skills.length > 0 && (
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
                                    <span key={index} className="bg-gradient-to-r from-purple-100 to-pink-100 
text-purple-800 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
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
            </div>
        )
    }

    // Modal de Detalhes da Proposta (organizado + CTA fixo)
    if (showJobDetails && selectedJob) {
        const waNumber = getCompanyWhatsappNumber(selectedJob)

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                {/* Header */}
                <div className="bg-white shadow-sm border-b">
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
                                {selectedJob.title}
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
                                    {selectedJob.period ? ` • ${selectedJob.period}` : ''}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Descrição completa */}
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

                        <button
                            onClick={() => handleContactCompanyWhatsapp(selectedJob)}
                            disabled={!waNumber}
                            className={`flex-1 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2 
                        ${waNumber ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-500 cursor-not-allowed'}`}
                        >
                            <Phone className="h-5 w-5" />
                            <span>WhatsApp</span>
                        </button>
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
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-blue-500 shadow-sm border-b">
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

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                                    <input
                                        type="date"
                                        max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                                        value={userResume.personalInfo.birthDate}
                                        onChange={(e) => setUserResume(prev => ({
                                            ...prev,
                                            personalInfo: { ...prev.personalInfo, birthDate: e.target.value }
                                        }))}
                                        className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                                    <select
                                        value={userResume.personalInfo.maritalStatus}
                                        onChange={(e) => setUserResume(prev => ({
                                            ...prev,
                                            personalInfo: { ...prev.personalInfo, maritalStatus: e.target.value }
                                        }))}
                                        className="w-full p-4 border-2 border-gray-200 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
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
                                if (userResume.personalInfo.name && userResume.personalInfo.phone &&
                                    userResume.personalInfo.email && userResume.personalInfo.birthDate) {

                                    // Age Validation
                                    const today = new Date();
                                    const birthDate = new Date(userResume.personalInfo.birthDate);
                                    let age = today.getFullYear() - birthDate.getFullYear();
                                    const m = today.getMonth() - birthDate.getMonth();
                                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                        age--;
                                    }

                                    if (age < 18) {
                                        alert("Você precisa ter pelo menos 18 anos para se cadastrar.");
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
                                }
                            }}
                            disabled={!userResume.personalInfo.name || !userResume.personalInfo.phone ||
                                !userResume.personalInfo.email}
                            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold 
disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
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
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-blue-500 shadow-sm border-b">
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

                            <div className="grid grid-cols-2 gap-3">
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

                            <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div className="bg-white border-t p-4">
                    <div className="max-w-md mx-auto">
                        <button
                            onClick={handleSaveResume}
                            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold 
hover:bg-blue-600 transition-colors"
                        >
                            Finalizar Cadastro
                        </button>
                    </div>
                </div>
            </div>
        )
    }

type DurationUnit = "dia" | "semana" | "mes"

const formatDuration = (qty: number, unit: DurationUnit) => {
  const n = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1

  if (unit === "dia") return `${n} ${n === 1 ? "dia" : "dias"}`
  if (unit === "semana") return `${n} ${n === 1 ? "semana" : "semanas"}`
  return `${n} ${n === 1 ? "mês" : "meses"}`
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

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Tipo de Pagamento *
                                </label>
                                <select
                                    value={newJobPost.paymentType}
                                    onChange={(e) => setNewJobPost({ ...newJobPost, paymentType: e.target.value as 'hourly' | 'daily' | 'project' })}
                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder:text-gray-500 focus:ring-blue-500 focus:border-transparent"
                                >
                                    <option value="hourly">Por Hora</option>
                                    <option value="daily">Por Dia</option>
                                    <option value="project">Por Projeto</option>
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

                        {/* MELHORADA: Seção de Horas com entrada direta */}
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

                                <div className="grid grid-cols-2 gap-3">
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
                            <div className="grid grid-cols-2 gap-3">
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
                            disabled={
                                !newJobPost.title ||
                                !newJobPost.description ||
                                !newJobPost.category ||
                                !newJobPost.rate ||
                                !newJobPost.address ||
                                !newJobPost.workHours ||
                                !newJobPost.period ||
                                !newJobPost.duration
                            }
                            className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold 
disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
                        >
                            {editingJobId ? 'Salvar Alterações' : 'Publicar Proposta'}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    // Tela de Perfil Completo com Sistema de Avaliação - REMOVIDO PEGACOINS 
    if (showProfile) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                        <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-gray-100 
rounded-full">
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
                    {/* Perfil do Usuário - Edição ou Visualização */}
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
                                            const file = e.target.files[0];
                                            const reader = new FileReader();
                                            reader.onloadend = () => {
                                                setUserProfile({ ...userProfile, imagem_profile: reader.result as string });
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }} />
                                </label>
                            </div>

                            {userProfile.userType === 'company' ? (
                                <>
                                    {/* CAMPOS PARA EMPRESA */}
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
                                            <span className="text-xs text-gray-500 block">CNPJ (Não editável)</span>
                                            <span className="font-mono text-sm font-medium text-gray-700">
                                                {userProfile.companyInfo?.cnpj || 'Não informado'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-gray-500 block">Email (Não editável)</span>
                                            <span className="text-sm font-medium text-gray-700">
                                                {userProfile.companyInfo?.email || userProfile.email}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* CAMPOS PARA PROFISSIONAL */}
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

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                                        <input
                                            type="date"
                                            max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                                            value={userProfile.birthDate || ''}
                                            onChange={(e) => setUserProfile({ ...userProfile, birthDate: e.target.value })}
                                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-black"
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                onClick={handleSaveProfile}
                                className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition-colors mt-4"
                            >
                                Salvar Alterações
                            </button>
                        </div>
                    ) : (
                        <div className="bg-yellow-300 rounded-xl p-6 text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center 
    mx-auto mb-4 overflow-hidden shadow-sm">
                                {userProfile.imagem_profile ? (
                                    <img src={userProfile.imagem_profile} alt="Perfil" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="h-10 w-10 text-gray-600" />
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">{userProfile.name || userProfile.username || 'Nome do Usuário'}</h2>
                            <p className="text-gray-800 font-medium">
                                {userProfile.userType === 'company'
                                    ? userProfile.companyInfo?.companyName || 'Empresa'
                                    : userProfile.workerCategory || userProfile.profession || 'Profissão'
                                }
                            </p>
                            <p className="text-gray-700 text-sm mt-1">
                                {userProfile.city && userProfile.state ? `${userProfile.city} - ${userProfile.state}` : 'Localização não definida'}
                            </p>

                            {/* Barra de Progresso do Perfil */}
                            {userProfile.userType === 'professional' && !userResume.id && (
                                <div className="mt-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium text-gray-800">Complete seu currículo</span>
                                        <span className="text-sm font-bold text-gray-900">90%</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-green-500 h-2 rounded-full"
                                            style={{ width: '90%' }}
                                        ></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Botão para criar currículo se não existir */}
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
                                <span>Adicionar Currículo</span>
                            </button>
                        </div>
                    )}

                    {/* Detalhes do Perfil - Informações Relevantes */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-4 overflow-hidden">
                        <div className="p-4 bg-gray-50 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900">Informações Detalhadas</h3>
                        </div>

                        <div className="p-4 space-y-4">
                            {userProfile.userType === 'company' ? (
                                <>
                                    <div>
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Sobre a Empresa</p>
                                        <p className="text-gray-700 text-sm">
                                            {userProfile.companyInfo?.description || 'Nenhuma descrição informada.'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Ramo de Atividade</p>
                                            <div className="flex items-center space-x-2 text-gray-700 bg-blue-50 p-2 rounded-lg">
                                                <Briefcase className="h-4 w-4 text-blue-500" />
                                                <span className="font-medium capitalization">
                                                    {userProfile.companyInfo?.businessType || 'Não informado'}
                                                </span>
                                            </div>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">CNPJ</p>
                                            <div className="flex items-center space-x-2 text-gray-700 bg-gray-50 p-2 rounded-lg">
                                                <Building2 className="h-4 w-4 text-gray-500" />
                                                <span className="font-medium font-mono">
                                                    {userProfile.companyInfo?.cnpj || 'Não informado'}
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
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Profissão / Categoria</p>
                                        <div className="flex items-center space-x-2 text-gray-700 bg-blue-50 p-3 rounded-lg">
                                            <User className="h-5 w-5 text-blue-500" />
                                            <span className="font-medium text-lg capitalize">
                                                {userResume.professionalInfo?.category || userProfile.workerCategory || userProfile.profession || 'Não informado'}
                                            </span>
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
                                                    <span className="text-gray-500">Experiência</span>
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

    // Tela de Suporte com Chat Funcional 
    if (showSupport) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="bg-white shadow-sm border-b">
                    <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                        <button onClick={() => setShowSupport(false)} className="p-2 hover:bg-gray-100 
rounded-full">
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <h1 className="text-lg font-semibold text-gray-900">Suporte</h1>
                        <div className="w-10"></div>
                    </div>
                </div>

                <div className="flex-1 max-w-md mx-auto w-full p-4 space-y-6">
                    {/* Central de Ajuda */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center 
justify-center mx-auto mb-4">
                                <HelpCircle className="h-8 w-8 text-blue-600" />
                            </div>
                            <h2 className="text-xl font-bold text-gray-900 mb-2">Como podemos
                                ajudar?</h2>
                            <p className="text-gray-600">Estamos aqui para resolver suas dúvidas</p>
                        </div>
                    </div>

                    {/* Opções de Contato */}
                    <div className="space-y-3">
                        <button className="w-full bg-white rounded-xl shadow-sm border border-gray-100 
p-4 flex items-center space-x-4 hover:shadow-md transition-all">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center 
justify-center">
                                <Mail className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="font-bold text-gray-900">E-mail</h3>
                                <p className="text-gray-600 text-sm">suporte@pegatrampo.com</p>
                            </div>
                        </button>
                    </div>

                    {/* FAQ */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                        <h3 className="font-bold text-gray-900 mb-4">Perguntas Frequentes</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-gray-900 mb-1">Como publico uma proposta
                                    de trabalho?</h4>
                                <p className="text-gray-600 text-sm">Apenas empresas cadastradas podem
                                    publicar propostas. Faça seu cadastro como empresa para ter acesso a essa
                                    funcionalidade.</p>
                            </div>

                            <div>
                                <h4 className="font-medium text-gray-900 mb-1">Posso alterar meu
                                    perfil?</h4>
                                <p className="text-gray-600 text-sm">Sim! Acesse "Meu Perfil" no menu inferior
                                    e clique no ícone de edição para atualizar suas informações.</p>
                            </div>
                        </div>
                    </div>


                </div>
            </div>
        )
    }

    // App Principal - PegaTrampo Style 
    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-blue-600 shadow-sm border-b px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Briefcase className="h-6 w-6 text-white" />
                        <h1 className="text-xl font-bold text-white">PegaTrampo</h1>
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

            {/* Painel de Notificações */}
            {showNotifications && (
                <div className="bg-white border-b shadow-lg">
                    <div className="max-w-md mx-auto">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-gray-900">Notificações</h2>
                                <button
                                    onClick={() => setShowNotifications(false)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                            {notifications.length === 0 ? (
                                <div className="p-4 text-center text-gray-500">
                                    Nenhuma notificação ainda
                                </div>
                            ) : (
                                notifications.map((notification) => (
                                    <div key={notification.id} className={`p-4 border-b hover:bg-gray-50 ${!notification.read ? 'bg-blue-50' : ''}`}>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Bell className="h-4 w-4 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-medium text-gray-900 text-sm">{notification.title}</h3>
                                                <p className="text-gray-600 text-xs">{notification.message}</p>
                                                <p className="text-gray-400 text-xs mt-1">{notification.timestamp}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}


            {userProfile.userType === 'professional' && activeTab === 'jobs' && (
                <div className="bg-white border-b p-4 space-y-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 
text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por: cozinheiro, padeiro, diarista..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 text-black placeholder-gray-600 
focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div className="flex space-x-2 overflow-x-auto">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 text-black
focus:ring-blue-500 min-w-0 flex-shrink-0"
                        >
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <div className="p-4">
                {activeTab === 'jobs' && (
                    <div className="space-y-4">
                        {userProfile.userType === 'professional' && (
                            <>
                                {/* Seção de Propostas das Empresas - Filtradas por categoria do funcionário */}
                                {filteredJobs.map((job) => (
                                    <div
                                        key={job.id}
                                        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                                    >
                                        <div className="p-4">
                                            {/* Cabeçalho (estilo do vídeo) */}
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                        <Building2 className="h-5 w-5 text-blue-600" />
                                                    </div>

                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-gray-900 text-lg leading-snug truncate">
                                                            {job.title}
                                                        </h4>

                                                        <p className="text-sm text-gray-600 truncate">
                                                            {job.category || userProfile.workerCategory || 'Vaga'}
                                                        </p>
                                                    </div>
                                                </div>

                                                <span className="text-xs text-gray-500 flex-shrink-0">
                                                    {formatRelativeDate(job.postedAt)}
                                                </span>
                                            </div>

                                            {/* Local */}
                                            <div className="mt-4 flex items-center gap-2 text-sm text-gray-700">
                                                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <span className="truncate">{job.address || 'Local a combinar'}</span>
                                            </div>

                                            {/* Linhas fixas (scan rápido igual vídeo) */}
                                            <div className="mt-3 space-y-2 text-sm">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <DollarSign className="h-4 w-4 text-gray-400" />
                                                        <span>Valor</span>
                                                    </div>
                                                    <span className="font-semibold text-green-600">
                                                        R$ {job.rate}
                                                        {job.paymentType === 'hourly'
                                                            ? '/hora'
                                                            : job.paymentType === 'daily'
                                                                ? '/dia'
                                                                : ' (projeto)'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <Calendar className="h-4 w-4 text-gray-400" />
                                                        <span>Início</span>
                                                    </div>
                                                    <span className="font-medium text-gray-900">
                                                        {job.startDate
                                                            ? new Date(job.startDate + 'T00:00:00').toLocaleDateString('pt-BR')
                                                            : 'A combinar'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <Clock className="h-4 w-4 text-gray-400" />
                                                        <span>Horário</span>
                                                    </div>
                                                    <span className="font-medium text-gray-900">
                                                        {job.startTime || 'A combinar'}
                                                    </span>
                                                </div>

                                                {job.includesFood && (
                                                    <div className="flex items-center gap-2 text-green-700">
                                                        <Utensils className="h-4 w-4" />
                                                        <span className="font-medium">Inclui alimentação</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Empresa (linha discreta) */}
                                            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between gap-3 text-sm text-gray-500">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <Building2 className="h-4 w-4 flex-shrink-0" />
                                                    <span className="truncate">{job.companyInfo?.name || job.postedBy}</span>
                                                    {job.companyInfo?.verified && (
                                                        <UserCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Botão "Mais detalhes" (igual vídeo) */}
                                        <button
                                            onClick={() => handleViewJobDetails(job)}
                                            className="w-full border-t border-gray-100 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            <span>Ver detalhes</span>
                                        </button>
                                    </div>
                                ))}


                                {filteredJobs.length === 0 && (
                                    <div className="text-center py-12">
                                        <BriefcaseIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Nenhuma proposta encontrada
                                        </h3>
                                        <p className="text-gray-500">
                                            {searchTerm
                                                ? `Nenhuma proposta encontrada para "${searchTerm}". Tente outras palavras-chave como "cozinheiro", "padeiro" ou "diarista".`
                                                : `Aguarde novas propostas serem publicadas na sua área de atuação: ${userProfile.workerCategory}.`
                                            }
                                        </p>
                                    </div>
                                )}
                            </>
                        )}

                        {userProfile.userType === 'company' && (
                            <div className="space-y-4">
                                {/* Botão de Adicionar Trabalho (Visível apenas para empresas) */}
                                <div className="flex justify-end">
                                    <button
                                        onClick={() => {
                                            setEditingJobId(null)
                                            setNewJobPost(initialJobPostState)
                                            setShowJobPostForm(true)
                                        }}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center space-x-2"
                                    >
                                        <Plus className="h-5 w-5" />
                                        <span>Publicar Nova Vaga</span>
                                    </button>
                                </div>

                                {filteredJobs.map((job) => (
                                    <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                                            <div className="flex items-center space-x-2">
                                                {job.isUrgent && (
                                                    <div className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                                                        URGENTE
                                                    </div>
                                                )}
                                                {job.includesFood && (
                                                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                                        ALIMENTAÇÃO
                                                    </div>
                                                )}
                                                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                                                    ATIVA
                                                </div>
                                            </div>
                                        </div>

                                        <p className="text-gray-600 text-sm mb-3">{(job.description || '')}</p>

                                        <div className="grid grid-cols-1 gap-2 text-sm mb-4">
                                            <div className="flex items-center text-gray-600">
                                                <MapPin className="h-4 w-4 mr-2" />
                                                <span>{job.address}</span>
                                            </div>
                                            <div className="flex items-center text-gray-600">
                                                <DollarSign className="h-4 w-4 mr-2" />
                                                <span className="font-medium text-green-600">
                                                    R$ {job.rate}{job.paymentType === 'hourly' ? '/hora' : job.paymentType === 'daily' ? '/dia' : ' (projeto)'}
                                                </span>
                                            </div>
                                            <div className="flex items-center text-gray-600">
                                                <Calendar className="h-4 w-4 mr-2" />
                                                <span>{job.startDate ? new Date(job.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Sem data'} / {job.startTime || 'Sem horário'}</span>
                                            </div>
                                            <div className="flex items-center text-gray-600">
                                                <Clock className="h-4 w-4 mr-2" />
                                                <span>{job.workHours} - {job.period}</span>
                                            </div>
                                            {job.includesFood && (
                                                <div className="flex items-center text-green-600">
                                                    <Utensils className="h-4 w-4 mr-2" />
                                                    <span>Inclui alimentação</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex items-center justify-end pt-3 border-t border-gray-100">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => handleEditJob(job)}
                                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                                >
                                                    Editar
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button
                                                    onClick={() => handleDeleteJob(job.id)}
                                                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                                                >
                                                    Excluir
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <div className="text-sm text-gray-500">
                                                    {formatRelativeDate(job.postedAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {filteredJobs.length === 0 && (
                                    <div className="text-center py-12">
                                        <Plus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                                            Nenhuma proposta publicada
                                        </h3>
                                        <p className="text-gray-500 mb-4">
                                            Publique sua primeira proposta de trabalho para encontrar profissionais qualificados.
                                        </p>
                                        <button
                                            onClick={() => {
                                                setEditingJobId(null)
                                                setNewJobPost(initialJobPostState)
                                                setShowJobPostForm(true)
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
                )}

                {activeTab === 'applications' && (<div className="min-h-screen bg-gray-50">
                    <div className="max-w-md mx-auto px-4 pt-4 pb-2">
                        <div className="bg-blue-600 rounded-xl p-4 shadow-sm">
                            <h2 className="text-lg font-bold text-white">Minhas Candidaturas</h2>
                            <p className="text-blue-100 text-sm mt-1">Trampos que você já se candidatou</p>
                        </div>
                    </div>

                    <div className="max-w-md mx-auto p-4 space-y-3">
                        {myApplications.length === 0 ? (
                            <div className="bg-white p-4 rounded-xl border">
                                <p className="text-gray-700 font-medium">Você ainda não se candidatou em nenhum trampo.</p>
                            </div>
                        ) : (
                            myApplications.map(app => (
                                <div key={app.applicationId} className="bg-white p-4 rounded-xl border">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-bold text-gray-900">{app.job.title}</p>
                                            <p className="text-sm text-gray-600">{app.job.address}</p>
                                            <div className="flex gap-4 mt-2 text-xs text-gray-600">
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
                                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                                            {app.status}
                                        </span>
                                    </div>

                                    <div className="mt-2 text-xs text-gray-500">
                                        Candidatado em: {new Date(app.appliedAt).toLocaleString()}
                                    </div>

                                    <button
                                        onClick={() => handleViewJobDetails(app.job)}
                                        className="w-full mt-3 border-t border-gray-100 pt-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Eye className="h-4 w-4" />
                                        <span>Mais detalhes</span>
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
                )
                }

                {activeTab === 'resumes' && (
                    <div className="space-y-4">
                        {/* Header da seção — para empresa: busca + título; para profissional: título + botão só se não tem currículo */}
                        {userProfile.userType === 'company' ? (
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
                                <h2 className="text-lg font-bold text-gray-900">Currículos</h2>
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
                            <div className="flex items-center justify-between">
                                <h2 className="text-lg font-bold text-gray-900">Meu Currículo</h2>
                            </div>
                        )}

                        {/* Conteúdo */}
                        {filteredResumes.length === 0 ? (
                            <div className="text-center py-12">
                                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">
                                    Nenhum currículo encontrado
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    {resumeSearchTerm
                                        ? `Nenhum currículo encontrado para "${resumeSearchTerm}".`
                                        : userProfile.userType === 'professional'
                                            ? 'Crie seu currículo para se candidatar às vagas!'
                                            : 'Aqui aparecerão os currículos de pessoas interessadas nas suas propostas.'}
                                </p>
                                {userProfile.userType === 'professional' && (
                                    <button
                                        onClick={() => {
                                            setShowResumeForm(true)
                                            setResumeStep(1)
                                        }}
                                        className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
                                    >
                                        Cadastrar Currículo
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredResumes.map((resume) => {
                                    const formattedDate = formatRelativeDate(resume.createdAt)

                                    // Card compacto para profissional
                                    if (userProfile.userType === 'professional') {
                                        return (
                                            <div key={resume.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                                {/* Header colorido compacto */}
                                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-3 flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <User className="h-6 w-6 text-white" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h3 className="text-white font-bold text-base truncate">{resume.personalInfo.name}</h3>
                                                        <p className="text-white/80 text-sm truncate">{resume.professionalInfo.category}</p>
                                                    </div>
                                                    <span className="text-white/60 text-xs flex-shrink-0">{formattedDate}</span>
                                                </div>

                                                {/* Corpo compacto */}
                                                <div className="px-4 py-3 space-y-2">
                                                    <div className="flex items-center gap-4 text-sm text-gray-600">
                                                        <div className="flex items-center gap-1.5">
                                                            <Clock className="h-3.5 w-3.5" />
                                                            <span>{resume.professionalInfo.experience} exp.</span>
                                                        </div>
                                                        {resume.personalInfo.address && (
                                                            <div className="flex items-center gap-1.5 truncate">
                                                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                                                <span className="truncate">{resume.personalInfo.address}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Última experiência */}
                                                    {resume.workExperience.length > 0 && (
                                                        <div className="bg-gray-50 px-3 py-2 rounded-lg">
                                                            <p className="text-gray-800 text-sm font-medium">{resume.workExperience[0].position}</p>
                                                            <p className="text-gray-500 text-xs">{resume.workExperience[0].company} • {resume.workExperience[0].startDate} - {resume.workExperience[0].isCurrentJob ? 'Atual' : resume.workExperience[0].endDate}</p>
                                                        </div>
                                                    )}

                                                    {/* Skills */}
                                                    {resume.skills && resume.skills.length > 0 && (
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {resume.skills.slice(0, 5).map((skill, idx) => (
                                                                <span key={idx} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                            {resume.skills.length > 5 && (
                                                                <span className="text-gray-400 text-xs flex items-center">+{resume.skills.length - 5}</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Botões */}
                                                <div className="px-4 pb-3 flex gap-2">
                                                    <button
                                                        onClick={() => handleEditResume(resume)}
                                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-600 transition-colors"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                        <span>Editar</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteResume(resume.id)}
                                                        className="flex items-center justify-center gap-2 bg-red-50 text-red-600 px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-red-100 transition-colors border border-red-200"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    }

                                    // Card original para empresa
                                    return (
                                        <div key={resume.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h3 className="text-blue-600 font-bold text-lg">{resume.professionalInfo.category}</h3>
                                                    <p className="text-gray-900 font-bold text-xl">{resume.personalInfo.name}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-gray-500 text-sm">{formattedDate}</p>
                                                </div>
                                            </div>

                                            <div className="space-y-2 mb-3">
                                                <div className="flex items-center text-sm text-gray-600">
                                                    <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                                                    <span>{resume.professionalInfo.experience} de experiência</span>
                                                </div>
                                                {resume.professionalInfo.workSchedule && (
                                                    <div className="flex items-center text-sm text-gray-600">
                                                        <Briefcase className="h-4 w-4 mr-2 flex-shrink-0" />
                                                        <span>{resume.professionalInfo.workSchedule}</span>
                                                    </div>
                                                )}
                                            </div>

                                            {resume.workExperience.length > 0 && (
                                                <div className="bg-gray-50 p-3 rounded-lg mb-3">
                                                    <p className="text-gray-700 text-sm font-medium">{resume.workExperience[0].position}</p>
                                                    <p className="text-gray-600 text-sm">{resume.workExperience[0].company}</p>
                                                    <p className="text-gray-500 text-xs">
                                                        {resume.workExperience[0].startDate} -
                                                        {resume.workExperience[0].isCurrentJob ? 'Atual' : resume.workExperience[0].endDate}
                                                    </p>
                                                </div>
                                            )}

                                            {resume.skills && resume.skills.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5 mb-3">
                                                    {resume.skills.slice(0, 4).map((skill, idx) => (
                                                        <span key={idx} className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full text-xs font-medium">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                    {resume.skills.length > 4 && (
                                                        <span className="text-gray-400 text-xs flex items-center px-1">
                                                            +{resume.skills.length - 4}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleViewResumeDetails(resume)}
                                                className="w-full bg-pink-500 text-white py-3 rounded-lg font-semibold hover:bg-pink-600 transition-colors"
                                            >
                                                Ver Currículo Completo
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

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
            {showMenu && (
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
            )}
        </div >
    )
}
