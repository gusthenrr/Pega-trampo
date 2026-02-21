// src/types/pegaTrampo.ts

export type PaymentType = 'hourly' | 'daily' | 'project'
export type UserType = 'client' | 'professional' | 'company'
export type NotificationType = 'new_proposal' | 'message' | 'booking'

export type SalaryType = 'hourly' | 'daily' | 'monthly'
export type EducationLevel = 'fundamental' | 'medio' | 'tecnico' | 'superior' | 'pos'
export type EducationStatus = 'completo' | 'incompleto' | 'cursando'

export interface Coordinates {
    lat: number
    lng: number
}

export interface JobCompanyInfo {
    name: string
    logo?: string
    verified: boolean
    description: string
    totalJobs: number
    rating?: number
    reviews?: number
}

export interface Job {
    id: string
    title: string
    description: string
    category: string
    paymentType: PaymentType
    rate: number
    location: string
    area: string
    address: string
    workHours: string
    postedBy: string
    postedAt: string
    period?: string
    duration?: string
    isUrgent: boolean
    professionalRating: number
    professionalReviews: number
    completedJobs: number
    likes: number
    comments: number
    views: number
    companyOnly?: boolean
    companyInfo?: JobCompanyInfo
    includesFood?: boolean
    coordinates?: Coordinates
    startDate?: string
    startTime?: string
}

export interface UserProfileDocuments {
    rg: string
    cpf: string
    comprovante: string
}

export interface UserProfileBankInfo {
    bank: string
    agency: string
    account: string
    accountType: string
}

export interface UserProfilePreferences {
    notifications: boolean
    emailMarketing: boolean
    smsMarketing: boolean
}

export interface UserProfileCompanyInfo {
    cnpj: string
    companyName: string
    businessType: string
    description: string
    publishedJobs: number
    rating?: number
    reviews?: number
    email?: string
}

export interface UserProfileEvaluationData {
    totalEvaluations: number
    attendanceCount: number
    absenceCount: number
    divisionScore: number
    profileCompleteness: number
}

export interface UserProfile {
    name: string
    cpf: string
    birthDate: string
    gender: string
    phone: string
    email: string
    username?: string
    cep: string
    address: string
    addressNumber: string
    complement: string
    neighborhood: string
    city: string
    state: string
    profession: string
    experience: string
    skills: string[]
    bio: string
    portfolio: string[]
    certifications: string[]
    languages: string[]
    availability: string[]
    workRadius: number
    hourlyRate: number
    dailyRate: number
    acceptedTerms: boolean

    userType: UserType
    rating: number
    reviews: number
    completedJobs: number
    profilePhoto: string
    documents: UserProfileDocuments
    bankInfo: UserProfileBankInfo
    preferences: UserProfilePreferences

    companyInfo?: UserProfileCompanyInfo
    workerCategory?: string
    evaluationData?: UserProfileEvaluationData
    lat?: number
    lng?: number
    imagem_profile?: string
}

export interface Notification {
    id: string
    title: string
    message: string
    type: NotificationType
    timestamp: string
    read: boolean
}

export interface CompanyJobPost {
    title: string
    description: string
    category: string
    paymentType: PaymentType
    rate: number
    location: string
    area: string
    address: string
    workHours: string
    period: string
    duration: string
    isUrgent: boolean
    includesFood: boolean
    cep?: string
    coordinates?: Coordinates
    startDate?: string
    startTime?: string
}

export interface ResumeSalary {
    value: number
    type: SalaryType
    hideSalary: boolean
}

export interface ResumePersonalInfo {
    name: string
    phone: string
    email: string
    address: string
    birthDate: string
    maritalStatus: string
}

export interface ResumeProfessionalInfo {
    category: string
    experience: string
    contractTypes: string[]
    workSchedule: string
    salary: ResumeSalary
    benefits: string[]
}

export interface ResumeWorkExperienceItem {
    company: string
    position: string
    startDate: string
    endDate: string
    description: string
    isCurrentJob: boolean
}

export interface ResumeEducationItem {
    institution: string
    course: string
    level: EducationLevel
    status: EducationStatus
    year: string
}

export interface Resume {
    id: string
    userId: string
    personalInfo: ResumePersonalInfo
    professionalInfo: ResumeProfessionalInfo
    workExperience: ResumeWorkExperienceItem[]
    education: ResumeEducationItem[]
    skills: string[]
    bio: string
    availability: string[]
    createdAt: string
    updatedAt: string
    isVisible: boolean
}

export interface CandidateResumePreview {
    id: string
    professionalInfo: ResumeProfessionalInfo
    workExperience: ResumeWorkExperienceItem[]
}

export interface Candidate {
    applicationId: string
    candidateId: string
    name: string
    phone: string
    email: string
    category: string
    appliedAt: string
    status: string
    resume: CandidateResumePreview
}

export interface CompanyJobApplications {
    id: string
    title: string
    candidates: Candidate[]
}

export interface MyApplication {
    applicationId: string
    status: string
    appliedAt: string
    job: Job
}

export type CNPJAddress = {
    street?: string
    number?: string
    neighborhood?: string
    city?: string
    state?: string
    cep?: string
}

export type CNPJApiData = {
    companyName?: string
    tradeName?: string
    status?: string
    cnaeDescription?: string
    address?: CNPJAddress
    businessType?: string // vamos “chutar” depois
}


