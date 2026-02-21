import sqlite3
import uuid
import json
import os
import argparse
import math
from datetime import datetime, timedelta

# -------------------------
# Password hash (opcional)
# -------------------------
try:
    from werkzeug.security import generate_password_hash
except Exception:
    generate_password_hash = None

# -------------------------
# .env + criptografia (opcional)
# -------------------------
try:
    from dotenv import load_dotenv
    load_dotenv()
except Exception:
    pass

try:
    from cryptography.fernet import Fernet
except Exception:
    Fernet = None

KEY = os.getenv("PROFILE_ENCRYPTION_KEY")

fernet = None
if KEY and Fernet:
    try:
        fernet = Fernet(KEY.encode() if isinstance(KEY, str) else KEY)
    except Exception:
        fernet = None


def enc(value):
    # se não tiver fernet, retorna original
    if value is None or not fernet:
        return value
    return fernet.encrypt(str(value).encode("utf-8")).decode("utf-8")


DB_DEFAULT = os.path.join(os.path.dirname(__file__), "database.db")


def now():
    return datetime.now().isoformat(timespec="seconds")


def today():
    return datetime.now().date().isoformat()


def list_tables(conn: sqlite3.Connection) -> list[str]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type='table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    )
    return [r[0] for r in cur.fetchall()]


def table_info(conn: sqlite3.Connection, table: str):
    cur = conn.cursor()
    cur.execute(f"PRAGMA table_info({table})")
    # cid, name, type, notnull, dflt_value, pk
    return cur.fetchall()


def table_columns(conn: sqlite3.Connection, table: str) -> set[str]:
    return {row[1] for row in table_info(conn, table)}


def ensure_columns(conn: sqlite3.Connection):
    """
    Mantém robusto se o schema mudar.
    Só adiciona colunas faltantes (não remove nada).
    """
    cur = conn.cursor()
    tables = set(list_tables(conn))

    # ---------- usuarios ----------
    if "usuarios" in tables:
        u_cols = table_columns(conn, "usuarios")
        if "email_verified" not in u_cols:
            cur.execute("ALTER TABLE usuarios ADD COLUMN email_verified INTEGER DEFAULT 0")
        if "email_verified_at" not in u_cols:
            cur.execute("ALTER TABLE usuarios ADD COLUMN email_verified_at TEXT")
        if "email_verification_code_hash" not in u_cols:
            cur.execute("ALTER TABLE usuarios ADD COLUMN email_verification_code_hash TEXT")
        if "email_verification_expires_at" not in u_cols:
            cur.execute("ALTER TABLE usuarios ADD COLUMN email_verification_expires_at TEXT")
        if "email_verification_sent_at" not in u_cols:
            cur.execute("ALTER TABLE usuarios ADD COLUMN email_verification_sent_at TEXT")
        if "email_verification_attempts" not in u_cols:
            cur.execute("ALTER TABLE usuarios ADD COLUMN email_verification_attempts INTEGER DEFAULT 0")

    # ---------- user_profiles ----------
    if "user_profiles" in tables:
        up_cols = table_columns(conn, "user_profiles")
        if "worker_category" not in up_cols:
            cur.execute("ALTER TABLE user_profiles ADD COLUMN worker_category TEXT")
        if "lat" not in up_cols:
            cur.execute("ALTER TABLE user_profiles ADD COLUMN lat REAL")
        if "lng" not in up_cols:
            cur.execute("ALTER TABLE user_profiles ADD COLUMN lng REAL")
        if "cep" not in up_cols:
            cur.execute("ALTER TABLE user_profiles ADD COLUMN cep TEXT")
        if "birth_date" not in up_cols:
            cur.execute("ALTER TABLE user_profiles ADD COLUMN birth_date TEXT")

    # ---------- jobs ----------
    if "jobs" in tables:
        j_cols = table_columns(conn, "jobs")
        # garante campos que você mostrou no schema
        for col, ctype in [
            ("lat", "REAL"),
            ("lng", "REAL"),
            ("cep", "TEXT"),
            ("posted_by_user_id", "TEXT"),
            ("start_date", "TEXT"),
            ("start_time", "TEXT"),
        ]:
            if col not in j_cols:
                cur.execute(f"ALTER TABLE jobs ADD COLUMN {col} {ctype}")

    # ---------- job_applications ----------
    if "job_applications" in tables:
        ja_cols = table_columns(conn, "job_applications")
        if "resume_id" not in ja_cols:
            cur.execute("ALTER TABLE job_applications ADD COLUMN resume_id TEXT")

    conn.commit()


def wipe_all_data(conn: sqlite3.Connection):
    """
    Apaga 100% dos registros de todas as tabelas (mantém schema).
    Reseta AUTOINCREMENT via sqlite_sequence.
    """
    cur = conn.cursor()
    cur.execute("PRAGMA foreign_keys = OFF")

    for t in list_tables(conn):
        cur.execute(f"DELETE FROM {t}")

    # reseta autoincrement
    try:
        cur.execute("DELETE FROM sqlite_sequence")
    except Exception:
        pass

    conn.commit()
    cur.execute("PRAGMA foreign_keys = ON")
    conn.commit()


def _default_for_col(col_type: str):
    t = (col_type or "").upper()
    if "INT" in t or "BOOL" in t:
        return 0
    if "REAL" in t or "FLOA" in t or "DOUB" in t:
        return 0.0
    return ""


def insert_full_row(conn: sqlite3.Connection, table: str, data: dict):
    """
    Insere preenchendo 100% das colunas existentes no schema.
    Se um campo não estiver no dict, recebe um default coerente por tipo.
    """
    info = table_info(conn, table)
    if not info:
        raise RuntimeError(f"Tabela '{table}' não existe no banco (ou PRAGMA falhou).")

    cols = []
    vals = []

    for cid, name, col_type, notnull, dflt, pk in info:
        # Deixa o SQLite gerar INTEGER PRIMARY KEY (id) se não vier explicitamente
        if pk == 1 and name == "id" and name not in data:
            continue

        cols.append(name)

        if name in data:
            vals.append(data[name])
        else:
            if name in ("created_at", "updated_at", "posted_at"):
                vals.append(now())
            else:
                vals.append(_default_for_col(col_type))

    qmarks = ",".join(["?"] * len(cols))
    sql = f"INSERT INTO {table} ({','.join(cols)}) VALUES ({qmarks})"
    cur = conn.cursor()
    cur.execute(sql, vals)
    conn.commit()
    return cur.lastrowid


# ============================================================
# Inserts alinhados ao seu types/pegaTrampo.ts
# ============================================================

def insert_user(conn, username: str, password: str, email: str, user_type: str, email_verified: int = 1):
    if generate_password_hash:
        senha_hash = generate_password_hash(password)
    else:
        senha_hash = f"plain::{password}"

    created = now()
    updated = created

    # campos de verificação preenchidos (mesmo se você não usar no frontend ainda)
    code_hash = enc("seed_code_hash")
    expires = (datetime.now() + timedelta(days=1)).isoformat(timespec="seconds")
    sent_at = created
    verified_at = created if email_verified else ""

    return insert_full_row(
        conn,
        "usuarios",
        {
            "username": username,
            "senha_hash": senha_hash,
            "email": email,
            "type": user_type,  # 'company' | 'professional'
            "created_at": created,
            "updated_at": updated,
            "email_verified": int(email_verified),
            "email_verified_at": verified_at,
            "email_verification_code_hash": code_hash,
            "email_verification_expires_at": expires,
            "email_verification_sent_at": sent_at,
            "email_verification_attempts": 0,
        },
    )


def insert_profile_company(conn, user_id: int, p: dict):
    """
    user_profiles (seu schema) não tem todos os campos do UserProfile do frontend,
    então aqui a gente garante 100% DAS COLUNAS DO BANCO, com dados bem completos.
    """
    insert_full_row(
        conn,
        "user_profiles",
        {
            "user_id": user_id,

            # empresa
            "cnpj": enc(p["cnpj"]),
            "company_name": enc(p["companyName"]),
            "company_email": enc(p["email"]),
            "business_type": enc(p["businessType"]),
            "company_description": enc(p["description"]),

            # pessoa responsável (preenchendo campos “de pessoa”)
            "full_name": enc(p["responsibleName"]),
            "cpf": enc(p["responsibleCpf"]),
            "phone": enc(p["phone"]),

            # endereço
            "address": enc(p["address"]),
            "number": int(p["addressNumber"]),
            "complement": enc(p["complement"]),
            "neighborhood": enc(p["neighborhood"]),
            "city": enc(p["city"]),
            "state": enc(p["state"]),
            "cep": enc(p["cep"]),

            # extra
            "birth_date": enc(p["birthDate"]),
            "worker_category": enc(""),  # empresas não usam

            "lat": float(p["lat"]),
            "lng": float(p["lng"]),
            "created_at": now(),
            "updated_at": now(),
        },
    )


def insert_profile_professional(conn, user_id: int, p: dict):
    insert_full_row(
        conn,
        "user_profiles",
        {
            "user_id": user_id,

            # empresa (não se aplica, mas preenche)
            "cnpj": enc(""),
            "company_name": enc(""),
            "company_email": enc(""),
            "business_type": enc(""),
            "company_description": enc(""),

            # pessoa
            "full_name": enc(p["name"]),
            "cpf": enc(p["cpf"]),
            "phone": enc(p["phone"]),

            # endereço
            "address": enc(p["address"]),
            "number": int(p["addressNumber"]),
            "complement": enc(p["complement"]),
            "neighborhood": enc(p["neighborhood"]),
            "city": enc(p["city"]),
            "state": enc(p["state"]),
            "cep": enc(p["cep"]),

            "birth_date": enc(p["birthDate"]),
            "worker_category": enc(p["workerCategory"]),

            "lat": float(p["lat"]),
            "lng": float(p["lng"]),
            "created_at": now(),
            "updated_at": now(),
        },
    )


def insert_resume(conn, user_id: int, resume: dict):
    """
    Guarda JSON nas colunas *_json no formato que o frontend espera.
    """
    rid = f"resume_{uuid.uuid4().hex[:12]}"
    insert_full_row(
        conn,
        "resumes",
        {
            "id": rid,
            "user_id": str(user_id),

            # JSONs com chaves camelCase conforme types TS
            "personal_info_json": json.dumps(resume["personalInfo"], ensure_ascii=False),
            "professional_info_json": json.dumps(resume["professionalInfo"], ensure_ascii=False),
            "work_experience_json": json.dumps(resume["workExperience"], ensure_ascii=False),
            "education_json": json.dumps(resume["education"], ensure_ascii=False),

            "bio": resume["bio"],
            "availability_json": json.dumps(resume["availability"], ensure_ascii=False),

            "created_at": now(),
            "updated_at": now(),
            "is_visible": 1,
        },
    )
    return rid


def insert_job(conn, j: dict):
    """
    company_info_json segue JobCompanyInfo do TS:
    { name, logo?, verified, description, totalJobs, rating?, reviews? }
    """
    jid = f"job_{uuid.uuid4().hex[:12]}"

    companyInfo: dict = j["companyInfo"]
    # garante o formato TS mínimo
    companyInfo.setdefault("name", "")
    companyInfo.setdefault("logo", "")
    companyInfo.setdefault("verified", False)
    companyInfo.setdefault("description", "")
    companyInfo.setdefault("totalJobs", 0)
    companyInfo.setdefault("rating", 0)
    companyInfo.setdefault("reviews", 0)

    insert_full_row(
        conn,
        "jobs",
        {
            "id": jid,
            "title": j["title"].upper(),
            "description": j["description"],
            "category": j["category"],

            # PaymentType TS: 'hourly' | 'daily' | 'project'
            "payment_type": j["paymentType"],
            "rate": float(j["rate"]),

            "location": j["location"],
            "area": j["area"],
            "address": j["address"],
            "work_hours": j["workHours"],

            "posted_by": j["postedBy"],
            "posted_at": j["postedAt"],

            "period": j.get("period", ""),
            "duration": j.get("duration", ""),
            "is_urgent": int(bool(j["isUrgent"])),

            "professional_rating": float(j["professionalRating"]),
            "professional_reviews": int(j["professionalReviews"]),
            "completed_jobs": int(j["completedJobs"]),
            "likes": int(j["likes"]),
            "comments": int(j["comments"]),
            "views": int(j["views"]),

            "company_only": int(bool(j.get("companyOnly", False))),
            "includes_food": int(bool(j.get("includesFood", False))),

            # coordinates TS -> columns lat/lng
            "lat": float(j["coordinates"]["lat"]) if j.get("coordinates") else None,
            "lng": float(j["coordinates"]["lng"]) if j.get("coordinates") else None,

            # companyInfo TS -> company_info_json
            "company_info_json": json.dumps(companyInfo, ensure_ascii=False),

            "created_at": now(),
            "posted_by_user_id": str(j["postedByUserId"]),
            "cep": j.get("cep", ""),

            "start_date": j.get("startDate", today()),
            "start_time": j.get("startTime", "08:00"),
        },
    )

    return jid


def insert_job_application(conn, job_id: str, candidate_id: int, resume_id: str, status: str):
    app_id = f"app_{uuid.uuid4().hex[:12]}"
    insert_full_row(
        conn,
        "job_applications",
        {
            "id": app_id,
            "job_id": job_id,
            "candidate_id": str(candidate_id),
            "status": status,
            "created_at": now(),
            "resume_id": resume_id,
        },
    )
    return app_id


# -------------------------
# Distância (Haversine) - opcional debug
# -------------------------
def haversine_km(lat1, lng1, lat2, lng2):
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dl / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def print_nearest_jobs(conn: sqlite3.Connection, username: str, limit: int = 10):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT u.id, up.lat, up.lng, up.cep, up.worker_category
        FROM usuarios u
        JOIN user_profiles up ON up.user_id = u.id
        WHERE u.username = ?
        """,
        (username,),
    )
    row = cur.fetchone()
    if not row:
        print(f"❌ Usuário '{username}' não encontrado.")
        return

    _, ulat, ulng, ucep, wcat = row
    if ulat is None or ulng is None:
        print(f"❌ Usuário '{username}' não tem lat/lng no profile.")
        return

    cur.execute(
        """
        SELECT id, title, category, cep, lat, lng, posted_by
        FROM jobs
        WHERE lat IS NOT NULL AND lng IS NOT NULL
        ORDER BY created_at DESC
        """
    )
    jobs = cur.fetchall()

    scored = []
    for (jid, title, category, jcep, jlat, jlng, posted_by) in jobs:
        d = haversine_km(ulat, ulng, jlat, jlng)
        scored.append((d, jid, title, category, posted_by, jcep))

    scored.sort(key=lambda x: x[0])

    print(f"\n📍 Nearest jobs para '{username}' (cat={wcat}, cep={ucep}, lat/lng={ulat},{ulng})")
    for d, jid, title, category, posted_by, jcep in scored[:limit]:
        print(f"- {d:6.2f} km | {title} | cat={category} | {posted_by} | cep={jcep} | id={jid}")


def seed(conn: sqlite3.Connection):
    # ===============================
    # Tipos (iguais ao frontend)
    # ===============================
    BUSINESS_TYPES = [
        "padaria", "mercado", "restaurante", "bar", "eventos", "postos",
        "casa_bolos", "lanchonete", "pizzaria", "hamburger",
    ]

    WORKER_CATEGORIES = [
        "Padeiro",
        "Confeiteiro",
        "Cozinheiro",
        "Copeiro/Bartender",
        "Atendente/Garçom",
        "Churrasqueiro",
        "Diarista",
        "Auxiliar da cozinha",
        "Pizzaiolo",
        "Caixa",
        "Repostior/Estoquista",
        "Ajudande geral",
        "Motoboy/Entregador",
    ]

    # Santos/SP - pontos diferentes pra distância ficar real
    COORDS = {
        "padaria":   (-23.9678, -46.3320),  # Gonzaga/Ana Costa (aprox)
        "pizzaria":  (-23.9650, -46.3270),  # Boqueirão (aprox)
        "pro":       (-23.9652, -46.3265),  # perto da pizzaria
    }
    CEPS = {
        "padaria":  "11060-000",
        "pizzaria": "11055-000",
        "pro":      "11055-001",
    }

    # ============================================================
    # 1) 3 contas (2 company + 1 professional)
    # ============================================================
    company1_id = insert_user(conn, "company_padaria_centro", "123456", "padaria@test.com", "company", email_verified=1)
    company2_id = insert_user(conn, "company_pizzaria_napoli", "123456", "pizzaria@test.com", "company", email_verified=1)
    pro_id      = insert_user(conn, "professional_lucas", "123456", "lucas@test.com", "professional", email_verified=1)

    # ============================================================
    # 2) Profiles (100% colunas do banco preenchidas)
    #    business_type usando os values do frontend
    # ============================================================
    insert_profile_company(conn, company1_id, {
        "cnpj": "11222333000199",
        "companyName": "Padaria do Centro",
        "businessType": "padaria",  # <- businessTypes.value
        "description": "Padaria tradicional, alto fluxo de manhã e fim de tarde. Equipe enxuta e organizada.",
        "email": "rh@padariadocentro.com",
        "responsibleName": "Marcos Vinícius (Gerente)",
        "responsibleCpf": "12345678901",
        "phone": "5513999991001",
        "cep": CEPS["padaria"],
        "address": "Av. Ana Costa",
        "addressNumber": "120",
        "complement": "Loja 2",
        "neighborhood": "Gonzaga",
        "city": "Santos",
        "state": "SP",
        "birthDate": "1990-01-01",
        "lat": COORDS["padaria"][0],
        "lng": COORDS["padaria"][1],
    })

    insert_profile_company(conn, company2_id, {
        "cnpj": "99888777000155",
        "companyName": "Pizzaria Napoli",
        "businessType": "pizzaria",  # <- businessTypes.value
        "description": "Pizzaria com alto volume à noite. Produção rápida e padrão de qualidade.",
        "email": "contato@pizzarianapoli.com",
        "responsibleName": "Ana Paula (Dona)",
        "responsibleCpf": "98765432100",
        "phone": "5513999992002",
        "cep": CEPS["pizzaria"],
        "address": "Rua Tolentino Filgueiras",
        "addressNumber": "455",
        "complement": "Esquina com canal 3",
        "neighborhood": "Boqueirão",
        "city": "Santos",
        "state": "SP",
        "birthDate": "1992-02-02",
        "lat": COORDS["pizzaria"][0],
        "lng": COORDS["pizzaria"][1],
    })

    # profissional alinhado com workerCategories.name
    insert_profile_professional(conn, pro_id, {
        "name": "Lucas Henrique",
        "cpf": "32165498700",
        "birthDate": "2001-07-15",
        "phone": "5513999993003",
        "cep": CEPS["pro"],
        "address": "Rua Azevedo Sodré",
        "addressNumber": "88",
        "complement": "Apto 24",
        "neighborhood": "Boqueirão",
        "city": "Santos",
        "state": "SP",
        "workerCategory": "Pizzaiolo",  # <- workerCategories.name
        "lat": COORDS["pro"][0],
        "lng": COORDS["pro"][1],
    })

    # ============================================================
    # 3) Resume (JSON no formato do TS)
    # ============================================================
    resume_id = insert_resume(conn, pro_id, {
        "personalInfo": {
            "name": "Lucas Henrique",
            "phone": "5513999993003",
            "email": "lucas@test.com",
            "address": "Rua Azevedo Sodré, 88 - Boqueirão",
            "birthDate": "2001-07-15",
            "maritalStatus": "solteiro"
        },
        "professionalInfo": {
            "category": "Pizzaiolo",  # <- workerCategories.name
            "experience": "3 anos em pizzaria (forno + montagem + finalização)",
            "contractTypes": ["diaria", "freelancer", "fixo"],
            "workSchedule": "noite e fim de semana",
            "salary": {
                "value": 220,
                "type": "daily",          # SalaryType: hourly | daily | monthly
                "hideSalary": False
            },
            "benefits": ["refeição", "vale transporte"]
        },
        "workExperience": [
            {
                "company": "Pizzaria Itália",
                "position": "Pizzaiolo",
                "startDate": "2022-01-01",
                "endDate": "2023-08-01",
                "description": "Montagem, forno e padrão de qualidade.",
                "isCurrentJob": False
            },
            {
                "company": "Pizzaria do Porto",
                "position": "Pizzaiolo",
                "startDate": "2023-09-01",
                "endDate": "2025-01-01",
                "description": "Produção em volume, organização e controle de insumos.",
                "isCurrentJob": False
            }
        ],
        "education": [
            {
                "institution": "EE Santos",
                "course": "Ensino Médio",
                "level": "medio",
                "status": "completo",
                "year": "2020"
            }
        ],
        "bio": "Pizzaiolo rápido e organizado. Experiência com produção em volume e horário noturno.",
        "availability": ["sex 18:00-23:30", "sab 18:00-23:30", "dom 18:00-23:30"]
    })

    postedAt = now()

    # ============================================================
    # 4) Jobs (categories só do seu workerCategories)
    #    paymentType só do seu TS: hourly | daily | project
    #    businessType extra no companyInfo_json (chave extra)
    # ============================================================

    def mk_company_info(name: str, description: str, business_type_value: str, totalJobs: int, rating: float, reviews: int):
        return {
            "name": name,
            "logo": "",
            "verified": True,
            "description": description,
            "totalJobs": totalJobs,
            "rating": rating,
            "reviews": reviews,
            "businessType": business_type_value,  # <- extra (ajuda no frontend)
        }

    # ---------- PADARIA (padaria) ----------
    job_pad_padeiro = insert_job(conn, {
        "title": "Padeiro (Manhã)",
        "description": "Produção de pães, massas e fermentação. Organização da bancada e limpeza do posto.",
        "category": "Padeiro",
        "paymentType": "daily",
        "rate": 200,
        "location": "Santos/SP",
        "area": "Gonzaga",
        "address": "Av. Ana Costa, 120",
        "workHours": "05:30-13:30",
        "postedBy": "Padaria do Centro",
        "postedAt": postedAt,
        "period": "manhã",
        "duration": "2 meses",
        "isUrgent": True,
        "professionalRating": 4.8,
        "professionalReviews": 120,
        "completedJobs": 350,
        "likes": 74,
        "comments": 14,
        "views": 1460,
        "companyOnly": False,
        "includesFood": True,
        "coordinates": {"lat": COORDS["padaria"][0], "lng": COORDS["padaria"][1]},
        "cep": CEPS["padaria"],
        "startDate": (datetime.now().date() + timedelta(days=2)).isoformat(),
        "startTime": "05:30",
        "postedByUserId": company1_id,
        "companyInfo": mk_company_info(
            "Padaria do Centro",
            "Padaria tradicional, alto fluxo de manhã e fim de tarde. Equipe enxuta e organizada.",
            "padaria",
            totalJobs=52,
            rating=4.7,
            reviews=210
        )
    })

    job_pad_confeiteiro = insert_job(conn, {
        "title": "Confeiteiro (Doces e Bolos)",
        "description": "Doces, bolos, sobremesas e montagem de vitrine. Controle básico de validade e estoque.",
        "category": "Confeiteiro",
        "paymentType": "daily",
        "rate": 220,
        "location": "Santos/SP",
        "area": "Gonzaga",
        "address": "Av. Ana Costa, 120",
        "workHours": "08:00-16:00",
        "postedBy": "Padaria do Centro",
        "postedAt": postedAt,
        "period": "integral",
        "duration": "1 mês",
        "isUrgent": False,
        "professionalRating": 4.7,
        "professionalReviews": 88,
        "completedJobs": 240,
        "likes": 51,
        "comments": 10,
        "views": 980,
        "companyOnly": False,
        "includesFood": True,
        "coordinates": {"lat": COORDS["padaria"][0], "lng": COORDS["padaria"][1]},
        "cep": CEPS["padaria"],
        "startDate": (datetime.now().date() + timedelta(days=4)).isoformat(),
        "startTime": "08:00",
        "postedByUserId": company1_id,
        "companyInfo": mk_company_info(
            "Padaria do Centro",
            "Padaria tradicional, alto fluxo de manhã e fim de tarde. Equipe enxuta e organizada.",
            "padaria",
            totalJobs=52,
            rating=4.7,
            reviews=210
        )
    })

    job_pad_caixa = insert_job(conn, {
        "title": "Caixa (Balcão)",
        "description": "Operação de caixa, atendimento rápido, organização do balcão e apoio em horários de pico.",
        "category": "Caixa",
        "paymentType": "hourly",
        "rate": 24,
        "location": "Santos/SP",
        "area": "Gonzaga",
        "address": "Av. Ana Costa, 120",
        "workHours": "15:00-21:00",
        "postedBy": "Padaria do Centro",
        "postedAt": postedAt,
        "period": "tarde/noite",
        "duration": "3 semanas",
        "isUrgent": False,
        "professionalRating": 4.6,
        "professionalReviews": 70,
        "completedJobs": 190,
        "likes": 33,
        "comments": 6,
        "views": 740,
        "companyOnly": False,
        "includesFood": False,
        "coordinates": {"lat": COORDS["padaria"][0], "lng": COORDS["padaria"][1]},
        "cep": CEPS["padaria"],
        "startDate": (datetime.now().date() + timedelta(days=1)).isoformat(),
        "startTime": "15:00",
        "postedByUserId": company1_id,
        "companyInfo": mk_company_info(
            "Padaria do Centro",
            "Padaria tradicional, alto fluxo de manhã e fim de tarde. Equipe enxuta e organizada.",
            "padaria",
            totalJobs=52,
            rating=4.7,
            reviews=210
        )
    })

    # ---------- PIZZARIA (pizzaria) ----------
    job_piz_pizzaiolo = insert_job(conn, {
        "title": "Pizzaiolo (Noite)",
        "description": "Montagem, forno e finalização. Produção em volume e padrão de qualidade.",
        "category": "Pizzaiolo",
        "paymentType": "daily",
        "rate": 240,
        "location": "Santos/SP",
        "area": "Boqueirão",
        "address": "Rua Tolentino Filgueiras, 455",
        "workHours": "17:30-23:30",
        "postedBy": "Pizzaria Napoli",
        "postedAt": postedAt,
        "period": "noturno",
        "duration": "2 meses",
        "isUrgent": True,
        "professionalRating": 4.8,
        "professionalReviews": 140,
        "completedJobs": 420,
        "likes": 96,
        "comments": 22,
        "views": 1980,
        "companyOnly": False,
        "includesFood": True,
        "coordinates": {"lat": COORDS["pizzaria"][0], "lng": COORDS["pizzaria"][1]},
        "cep": CEPS["pizzaria"],
        "startDate": (datetime.now().date() + timedelta(days=3)).isoformat(),
        "startTime": "17:30",
        "postedByUserId": company2_id,
        "companyInfo": mk_company_info(
            "Pizzaria Napoli",
            "Pizzaria com alto volume à noite. Produção rápida e padrão de qualidade.",
            "pizzaria",
            totalJobs=61,
            rating=4.8,
            reviews=330
        )
    })

    job_piz_aux = insert_job(conn, {
        "title": "Auxiliar da cozinha",
        "description": "Pré-preparo, organização, limpeza e apoio na montagem. Ritmo forte no pico.",
        "category": "Auxiliar da cozinha",
        "paymentType": "hourly",
        "rate": 22,
        "location": "Santos/SP",
        "area": "Boqueirão",
        "address": "Rua Tolentino Filgueiras, 455",
        "workHours": "16:00-23:00",
        "postedBy": "Pizzaria Napoli",
        "postedAt": postedAt,
        "period": "tarde/noite",
        "duration": "1 mês",
        "isUrgent": False,
        "professionalRating": 4.7,
        "professionalReviews": 95,
        "completedJobs": 260,
        "likes": 44,
        "comments": 8,
        "views": 1120,
        "companyOnly": False,
        "includesFood": True,
        "coordinates": {"lat": COORDS["pizzaria"][0], "lng": COORDS["pizzaria"][1]},
        "cep": CEPS["pizzaria"],
        "startDate": (datetime.now().date() + timedelta(days=2)).isoformat(),
        "startTime": "16:00",
        "postedByUserId": company2_id,
        "companyInfo": mk_company_info(
            "Pizzaria Napoli",
            "Pizzaria com alto volume à noite. Produção rápida e padrão de qualidade.",
            "pizzaria",
            totalJobs=61,
            rating=4.8,
            reviews=330
        )
    })

    job_piz_motoboy = insert_job(conn, {
        "title": "Motoboy/Entregador",
        "description": "Entregas no raio de Santos. Necessário CNH e moto própria. Pagamento por diária.",
        "category": "Motoboy/Entregador",
        "paymentType": "daily",
        "rate": 180,
        "location": "Santos/SP",
        "area": "Boqueirão",
        "address": "Rua Tolentino Filgueiras, 455",
        "workHours": "18:00-23:30",
        "postedBy": "Pizzaria Napoli",
        "postedAt": postedAt,
        "period": "noturno",
        "duration": "3 semanas",
        "isUrgent": True,
        "professionalRating": 4.6,
        "professionalReviews": 60,
        "completedJobs": 210,
        "likes": 38,
        "comments": 7,
        "views": 1350,
        "companyOnly": False,
        "includesFood": False,
        "coordinates": {"lat": COORDS["pizzaria"][0], "lng": COORDS["pizzaria"][1]},
        "cep": CEPS["pizzaria"],
        "startDate": (datetime.now().date() + timedelta(days=1)).isoformat(),
        "startTime": "18:00",
        "postedByUserId": company2_id,
        "companyInfo": mk_company_info(
            "Pizzaria Napoli",
            "Pizzaria com alto volume à noite. Produção rápida e padrão de qualidade.",
            "pizzaria",
            totalJobs=61,
            rating=4.8,
            reviews=330
        )
    })

    # ============================================================
    # 5) Applications (minhas candidaturas)
    # - pro (Pizzaiolo) aplica em Pizzaiolo + Auxiliar
    # ============================================================
    insert_job_application(conn, job_piz_pizzaiolo, pro_id, resume_id, status="pending")
    insert_job_application(conn, job_piz_aux, pro_id, resume_id, status="accepted")

    # ============================================================
    # 6) Print final
    # ============================================================
    print("✅ RESET + SEED (businessTypes + workerCategories) concluído.\n")
    print("Logins (senha 123456):")
    print("- Empresa 1 (company/padaria): company_padaria_centro")
    print("- Empresa 2 (company/pizzaria): company_pizzaria_napoli")
    print("- Profissional (professional/Pizzaiolo): professional_lucas")

    print("\nDebug: jobs mais próximos do profissional:")
    print_nearest_jobs(conn, "professional_lucas", limit=10)



def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--db", default=DB_DEFAULT)
    parser.add_argument("--no-wipe", action="store_true", help="Não apaga dados (só adiciona por cima).")
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    conn.execute("PRAGMA foreign_keys = ON")

    ensure_columns(conn)

    if not args.no_wipe:
        wipe_all_data(conn)

    seed(conn)


if __name__ == "__main__":
    main()
