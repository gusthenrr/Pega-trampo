
import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "database.db")

mockJobs = [
    {
        "id": "1",
        "title": "CONFEITEIRO PARA FESTA DE ANIVERSÁRIO",
        "description": "Preciso de um confeiteiro experiente para fazer doces e bolo para festa de 50 pessoas. Festa será no sábado pela manhã.",
        "category": "Gastronomia",
        "paymentType": "daily",
        "rate": 150,
        "location": "São Paulo, SP",
        "area": "Vila Madalena",
        "address": "Rua Harmonia, 123 - Vila Madalena",
        "workHours": "6 horas",
        "postedBy": "PANETTERIA DELICIAS DO PARQUE",
        "postedAt": "2024-01-15",
        "period": "Manhã",
        "duration": "1 dia",
        "isUrgent": False,
        "professionalRating": 4.8,
        "professionalReviews": 23,
        "completedJobs": 47,
        "likes": 12,
        "comments": 5,
        "views": 89,
        "companyOnly": True,
        "includesFood": True,
        "coordinates": { "lat": -23.5505, "lng": -46.6333 },
        "companyInfo": {
            "name": "PANETTERIA DELICIAS DO PARQUE",
            "verified": True,
            "description": "Empresa especializada em eventos e festas há 8 anos",
            "totalJobs": 156,
            "rating": 4.7,
            "reviews": 89
        }
    },
    {
        "id": "2",
        "title": "DIARISTA PARA LIMPEZA SEMANAL",
        "description": "Busco diarista confiável para limpeza completa de apartamento 2 quartos. Trabalho fixo todas as terças-feiras.",
        "category": "Limpeza",
        "paymentType": "daily",
        "rate": 120,
        "location": "São Paulo, SP",
        "area": "Pinheiros",
        "address": "Av. Faria Lima, 456 - Pinheiros",
        "workHours": "8 horas",
        "postedBy": "CLEAN HOUSE SERVIÇOS",
        "postedAt": "2024-01-14",
        "period": "Tarde",
        "duration": "Recorrente",
        "isUrgent": True,
        "professionalRating": 4.9,
        "professionalReviews": 31,
        "completedJobs": 78,
        "likes": 8,
        "comments": 3,
        "views": 156,
        "companyOnly": True,
        "includesFood": False,
        "coordinates": { "lat": -23.5629, "lng": -46.6544 },
        "companyInfo": {
            "name": "CLEAN HOUSE SERVIÇOS",
            "verified": True,
            "description": "Empresa de limpeza residencial e comercial",
            "totalJobs": 89,
            "rating": 4.5,
            "reviews": 67
        }
    },
    {
        "id": "3",
        "title": "JARDINEIRO PARA MANUTENÇÃO MENSAL",
        "description": "Preciso de jardineiro para cuidar do jardim da minha casa. Poda, rega e manutenção geral das plantas.",
        "category": "Jardinagem",
        "paymentType": "hourly",
        "rate": 25,
        "location": "São Paulo, SP",
        "area": "Mooca",
        "address": "Rua da Mooca, 789 - Mooca",
        "workHours": "4 horas",
        "postedBy": "VERDE VIDA PAISAGISMO",
        "postedAt": "2024-01-13",
        "period": "Manhã",
        "duration": "4 horas",
        "isUrgent": False,
        "professionalRating": 4.7,
        "professionalReviews": 15,
        "completedJobs": 32,
        "likes": 15,
        "comments": 7,
        "views": 67,
        "companyOnly": True,
        "includesFood": False,
        "coordinates": { "lat": -23.5505, "lng": -46.5956 },
        "companyInfo": {
            "name": "VERDE VIDA PAISAGISMO",
            "verified": True,
            "description": "Especialistas em jardinagem e paisagismo",
            "totalJobs": 67,
            "rating": 4.6,
            "reviews": 34
        }
    },
    {
        "id": "4",
        "title": "COZINHEIRO PARA ALMOÇO EMPRESARIAL",
        "description": "Empresa precisa de cozinheiro para preparar almoço para 30 funcionários. Cardápio variado e saudável.",
        "category": "Gastronomia",
        "paymentType": "daily",
        "rate": 200,
        "location": "São Paulo, SP",
        "area": "Vila Olímpia",
        "address": "Av. Brigadeiro Faria Lima, 321 - Vila Olímpia",
        "workHours": "8 horas",
        "postedBy": "SABOR & CIA ALIMENTAÇÃO",
        "postedAt": "2024-01-12",
        "period": "Manhã/Tarde",
        "duration": "5 dias",
        "isUrgent": True,
        "professionalRating": 4.9,
        "professionalReviews": 42,
        "completedJobs": 89,
        "likes": 25,
        "comments": 12,
        "views": 234,
        "companyOnly": True,
        "includesFood": True,
        "coordinates": { "lat": -23.5955, "lng": -46.6856 },
        "companyInfo": {
            "name": "SABOR & CIA ALIMENTAÇÃO",
            "verified": True,
            "description": "Empresa de alimentação corporativa",
            "totalJobs": 234,
            "rating": 4.8,
            "reviews": 156
        }
    },
    {
        "id": "5",
        "title": "CABELEIREIRO PARA SALÃO DE BELEZA",
        "description": "Salão de beleza busca cabeleireiro experiente para atender clientela feminina. Ambiente moderno e equipamentos de qualidade.",
        "category": "Beleza e Estética",
        "paymentType": "daily",
        "rate": 180,
        "location": "São Paulo, SP",
        "area": "Jardins",
        "address": "Rua Oscar Freire, 654 - Jardins",
        "workHours": "8 horas",
        "postedBy": "BELLA DONNA SALÃO",
        "postedAt": "2024-01-11",
        "period": "Tarde",
        "duration": "Recorrente",
        "isUrgent": False,
        "professionalRating": 4.8,
        "professionalReviews": 67,
        "completedJobs": 123,
        "likes": 18,
        "comments": 9,
        "views": 145,
        "companyOnly": True,
        "includesFood": False,
        "coordinates": { "lat": -23.5618, "lng": -46.6565 },
        "companyInfo": {
            "name": "BELLA DONNA SALÃO",
            "verified": True,
            "description": "Salão de beleza premium nos Jardins",
            "totalJobs": 45,
            "rating": 4.9,
            "reviews": 78
        }
    },
    {
        "id": "6",
        "title": "ELETRICISTA PARA INSTALAÇÕES RESIDENCIAIS",
        "description": "Construtora precisa de eletricista para instalações em apartamentos novos. Trabalho em equipe e seguindo normas técnicas.",
        "category": "Reformas e Reparos",
        "paymentType": "daily",
        "rate": 220,
        "location": "São Paulo, SP",
        "area": "Brooklin",
        "address": "Av. Santo Amaro, 987 - Brooklin",
        "workHours": "8 horas",
        "postedBy": "CONSTRUTECH ENGENHARIA",
        "postedAt": "2024-01-10",
        "period": "Integral",
        "duration": "2 semanas",
        "isUrgent": True,
        "professionalRating": 4.9,
        "professionalReviews": 89,
        "completedJobs": 156,
        "likes": 22,
        "comments": 14,
        "views": 198,
        "companyOnly": True,
        "includesFood": False,
        "coordinates": { "lat": -23.6024, "lng": -46.7003 },
        "companyInfo": {
            "name": "CONSTRUTECH ENGENHARIA",
            "verified": True,
            "description": "Construtora especializada em residenciais",
            "totalJobs": 89,
            "rating": 4.7,
            "reviews": 123
        }
    },
    {
        "id": "7",
        "title": "PADEIRO PARA PADARIA TRADICIONAL",
        "description": "Padaria tradicional busca padeiro experiente para produção de pães artesanais e produtos de panificação.",
        "category": "Gastronomia",
        "paymentType": "daily",
        "rate": 160,
        "location": "São Paulo, SP",
        "area": "Liberdade",
        "address": "Rua da Liberdade, 234 - Liberdade",
        "workHours": "8 horas",
        "postedBy": "PADARIA DO BAIRRO",
        "postedAt": "2024-01-09",
        "period": "Madrugada/Manhã",
        "duration": "Recorrente",
        "isUrgent": False,
        "professionalRating": 4.6,
        "professionalReviews": 34,
        "completedJobs": 67,
        "likes": 14,
        "comments": 8,
        "views": 123,
        "companyOnly": True,
        "includesFood": True,
        "coordinates": { "lat": -23.5584, "lng": -46.6339 },
        "companyInfo": {
            "name": "PADARIA DO BAIRRO",
            "verified": True,
            "description": "Padaria familiar há 25 anos no bairro",
            "totalJobs": 23,
            "rating": 4.8,
            "reviews": 45
        }
    }
]

mockResumes = [
    {
        "id": "resume_1",
        "userId": "123.456.789-00",
        "personalInfo": {
            "name": "João Silva",
            "phone": "(11) 98765-4321",
            "email": "joao.silva@email.com",
            "address": "Rua das Flores, 123 - Vila Madalena, São Paulo/SP",
            "birthDate": "1990-05-15",
            "maritalStatus": "solteiro"
        },
        "professionalInfo": {
            "category": "Padeiro",
            "experience": "5 anos",
            "contractTypes": ["CLT (Efetivo)", "Autônomo"],
            "workSchedule": "Madrugada/Manhã",
            "salary": {
                "value": 2500,
                "type": "monthly",
                "hideSalary": False
            },
            "benefits": ["Vale transporte", "Vale alimentação"]
        },
        "workExperience": [
            {
                "company": "Padaria Pão Quente",
                "position": "Padeiro",
                "startDate": "2019-01",
                "endDate": "2024-01",
                "description": "Produção de pães artesanais, fermentação natural, gestão de estoque",
                "isCurrentJob": False
            }
        ],
        "education": [
            {
                "institution": "SENAC",
                "course": "Panificação Profissional",
                "level": "tecnico",
                "status": "completo",
                "year": "2018"
            }
        ],
        "skills": ["Panificação", "Fermentação natural", "Pães artesanais"],
        "bio": "Padeiro com 5 anos de experiência em panificação artesanal",
        "availability": ["Madrugada", "Manhã"],
        "createdAt": "2024-01-15",
        "updatedAt": "2024-01-15",
        "isVisible": True
    },
    {
        "id": "resume_2",
        "userId": "987.654.321-00",
        "personalInfo": {
            "name": "Maria Santos",
            "phone": "(11) 91234-5678",
            "email": "maria.santos@email.com",
            "address": "Av. Paulista, 456 - Bela Vista, São Paulo/SP",
            "birthDate": "1985-08-20",
            "maritalStatus": "casado"
        },
        "professionalInfo": {
            "category": "Confeiteiro",
            "experience": "8 anos",
            "contractTypes": ["CLT (Efetivo)", "Free-lancer"],
            "workSchedule": "Manhã/Tarde",
            "salary": {
                "value": 3000,
                "type": "monthly",
                "hideSalary": False
            },
            "benefits": ["Vale transporte", "Vale refeição", "Plano de saúde"]
        },
        "workExperience": [
            {
                "company": "Confeitaria Doce Sabor",
                "position": "Confeiteira",
                "startDate": "2016-03",
                "endDate": "",
                "description": "Produção de doces finos, bolos decorados, eventos especiais",
                "isCurrentJob": True
            }
        ],
        "education": [
            {
                "institution": "Instituto Culinário",
                "course": "Confeitaria Avançada",
                "level": "tecnico",
                "status": "completo",
                "year": "2015"
            }
        ],
        "skills": ["Confeitaria", "Bolos decorados", "Doces finos"],
        "bio": "Confeiteira especializada em doces finos e bolos decorados",
        "availability": ["Manhã", "Tarde"],
        "createdAt": "2024-01-10",
        "updatedAt": "2024-01-10",
        "isVisible": True
    },
    {
        "id": "resume_3",
        "userId": "456.789.123-00",
        "personalInfo": {
            "name": "Carlos Oliveira",
            "phone": "(11) 99876-5432",
            "email": "carlos.oliveira@email.com",
            "address": "Rua Augusta, 789 - Consolação, São Paulo/SP",
            "birthDate": "1992-03-10",
            "maritalStatus": "solteiro"
        },
        "professionalInfo": {
            "category": "Cozinheiro",
            "experience": "6 anos",
            "contractTypes": ["CLT (Efetivo)", "Prestador de serviços (PJ)"],
            "workSchedule": "Integral",
            "salary": {
                "value": 3500,
                "type": "monthly",
                "hideSalary": False
            },
            "benefits": ["Vale transporte", "Vale alimentação", "Plano de saúde"]
        },
        "workExperience": [
            {
                "company": "Restaurante Sabor & Arte",
                "position": "Cozinheiro",
                "startDate": "2018-06",
                "endDate": "",
                "description": "Preparo de pratos executivos, gestão de equipe, controle de qualidade",
                "isCurrentJob": True
            }
        ],
        "education": [
            {
                "institution": "Escola de Gastronomia",
                "course": "Gastronomia",
                "level": "superior",
                "status": "completo",
                "year": "2017"
            }
        ],
        "skills": ["Culinária", "Gestão de equipe", "Controle de qualidade"],
        "bio": "Cozinheiro com experiência em restaurantes e eventos corporativos",
        "availability": ["Manhã", "Tarde", "Noite"],
        "createdAt": "2024-01-12",
        "updatedAt": "2024-01-12",
        "isVisible": True
    }
]

def seed():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # Clear tables
    c.execute("DELETE FROM jobs")
    c.execute("DELETE FROM resumes")

    # Insert Jobs
    for job in mockJobs:
        coords = job.get("coordinates")
        lat = coords["lat"] if coords else None
        lng = coords["lng"] if coords else None
        
        c.execute("""
            INSERT INTO jobs (
                id, title, description, category, payment_type, rate, location, area, address, 
                work_hours, posted_by, posted_at, period, duration, is_urgent, professional_rating, 
                professional_reviews, completed_jobs, likes, comments, views, company_only, 
                includes_food, lat, lng, company_info_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            job["id"], job["title"], job["description"], job["category"], job["paymentType"], job["rate"],
            job["location"], job["area"], job["address"], job["workHours"], job["postedBy"], job["postedAt"],
            job["period"], job["duration"], job["isUrgent"], job["professionalRating"], job["professionalReviews"],
            job["completedJobs"], job["likes"], job["comments"], job["views"], job["companyOnly"],
            job["includesFood"], lat, lng, json.dumps(job["companyInfo"])
        ))

    # Insert Resumes
    for res in mockResumes:
        c.execute("""
            INSERT INTO resumes (
                id, user_id, personal_info_json, professional_info_json, work_experience_json,
                education_json, skills_json, bio, availability_json, created_at, updated_at, is_visible
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            res["id"], res["userId"], 
            json.dumps(res["personalInfo"]), 
            json.dumps(res["professionalInfo"]),
            json.dumps(res["workExperience"]),
            json.dumps(res["education"]),
            json.dumps(res["skills"]),
            res["bio"],
            json.dumps(res["availability"]),
            res["createdAt"], res["updatedAt"], res["isVisible"]
        ))
    
    conn.commit()
    conn.close()
    print("Database seeded successfully!")

if __name__ == "__main__":
    seed()
