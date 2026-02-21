

from flask import Flask, request, jsonify
from flask_cors import CORS
from cs50 import SQL
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet
from werkzeug.security import check_password_hash, generate_password_hash
import re
import hmac, hashlib, os, re, secrets
from datetime import datetime, timedelta, timezone
from flask import request, jsonify
import requests


app = Flask(__name__)
#Config do jwt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
load_dotenv()
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_ACCESS_COOKIE_NAME"] = "__Host-token"
app.config["JWT_COOKIE_SECURE"] = True
app.config["JWT_COOKIE_SAMESITE"] = "None"
app.config["JWT_COOKIE_CSRF_PROTECT"] = False

jwt = JWTManager(app)
DATABASE_URL = os.getenv("DATABASE_URL") 

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # força SQLAlchemy a usar psycopg3 (e não psycopg2)
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

    db = SQL(DATABASE_URL)
else:
    db = SQL("sqlite:///database.db")
ALLOWED_ORIGIN = os.getenv("ALLOWED_ORIGIN")
CORS(app, supports_credentials=True, resources={r"/*": {"origins": [ALLOWED_ORIGIN]}})
COOKIE_NAME = "__Host-token"

# ---- ENV + Encryption ----

KEY = os.getenv("PROFILE_ENCRYPTION_KEY")

if not KEY:
    raise RuntimeError("Faltou PROFILE_ENCRYPTION_KEY no .env (chave de criptografia).")

fernet = Fernet(KEY.encode() if isinstance(KEY, str) else KEY)

from flask_jwt_extended import verify_jwt_in_request
from flask_jwt_extended.exceptions import NoAuthorizationError

@app.before_request
def check_jwt_globally():
    # Protege todas as rotas que começarem por /api/
    if request.path.startswith('/api/'):
        # Exceções (rotas públicas)
        public_routes = ['/api/login', '/api/register', '/api/user-profile', '/api/auth/']
        is_public = any(request.path.startswith(route) for route in public_routes) or request.path.startswith('/api/cnpj/')
        
        if not is_public:
            try:
                verify_jwt_in_request()
            except Exception as e:
                return jsonify({"success": False, "error": "Token expirado ou inválido", "msg": str(e)}), 401

def gerar_token(user_id):
    print('entrou no gerar token')
    token = create_access_token(identity=str(user_id), expires_delta=timedelta(hours=2))
    return token

def set_auth_cookie(resp, jwt_value: str):
    resp.set_cookie(
        key=COOKIE_NAME,
        value=jwt_value,
        httponly=True,
        secure=True,
        samesite="None",
        path="/",          # obrigatório para __Host-
        # sem Domain -> host-only
        max_age=60*60*24,
    )
    return resp

def clear_legacy_cookies(resp):
    # apaga qualquer 'token' residual (host-only)
    resp.set_cookie("token", "", max_age=0, path="/", secure=True, samesite="None")
    # apaga variações com Domain que podem ter ficado
    for d in [".nossopoint-backend-flask-server.com", "app.nossopoint-backend-flask-server.com"]:
        resp.set_cookie("token", "", max_age=0, path="/", domain=d, secure=True, samesite="None")
    return resp

def enc(value):
    """Criptografa string (ou None) e devolve string base64."""
    if value is None:
        return None
    s = str(value).strip()
    if s == "":
        return None
    return fernet.encrypt(s.encode("utf-8")).decode("utf-8")

def api_ok(**extra):
    return jsonify({"success": True, **extra})

def api_error(message: str, status: int = 400):
    return jsonify({"success": False, "error": message}), status

def norm_email(v):
    s = (v or "").strip().lower()
    return s or None

def norm_username(v):
    s = (v or "").strip()
    return s or None

def cnpj_digits(v):
    if v is None:
        return None
    s = str(v)
    d = re.sub(r"\D", "", s)
    return d or None


# ---- TABELAS AGORA GERENCIADAS PELO SCHEMA_POSTGRES.SQL ----
@app.route("/api/jobs", methods=["POST"])
def create_job():
    data = request.json or {}
    user_id = get_jwt_identity()

    import uuid, json
    job_id = data.get("id") or str(uuid.uuid4())

    # Nome de exibição (opcional, só para mostrar no app)
    profile_rows = db.execute("SELECT company_name, full_name FROM user_profiles WHERE user_id = ?", user_id)
    posted_by = "Empresa"
    if profile_rows:
        p = profile_rows[0]
        if p.get("company_name"):
            try: posted_by = fernet.decrypt(p["company_name"].encode()).decode()
            except: pass
        elif p.get("full_name"):
            try: posted_by = fernet.decrypt(p["full_name"].encode()).decode()
            except: pass

    company_info = data.get("companyInfo") or {}
    company_info_json = json.dumps(company_info, ensure_ascii=False)

    db.execute("""
        INSERT INTO jobs (
            id, title, description, category, payment_type, rate,
            location, area, address, work_hours,
            posted_by, posted_by_user_id, posted_at,
            period, duration, is_urgent,
            company_only, includes_food,
            lat, lng, company_info_json,
            start_date, start_time
        ) VALUES (
            ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?,
            ?, ?, CURRENT_TIMESTAMP,
            ?, ?, ?,
            ?, ?,
            ?, ?, ?,
            ?, ?
        )
    """,
        job_id,
        data.get("title"),
        data.get("description"),
        data.get("category"),
        data.get("paymentType"),
        data.get("rate"),
        data.get("location"),
        data.get("area"),
        data.get("address"),
        data.get("workHours"),
        posted_by,
        user_id,
        data.get("period"),
        data.get("duration"),
        1 if data.get("isUrgent") else 0,
        1 if data.get("companyOnly") else 0,
        1 if data.get("includesFood") else 0,
        (data.get("coordinates") or {}).get("lat"),
        (data.get("coordinates") or {}).get("lng"),
        company_info_json,
        data.get("startDate"),
        data.get("startTime")
    )

    return api_ok(id=job_id)


@app.route("/api/jobs", methods=["GET"])
def get_jobs():
    print("get_jobs")

    identity = get_jwt_identity()
    user_type = "professional"

    if identity:
        # Verifica se o usuario eh empresa ou profissional
        user_rows = db.execute("SELECT type FROM usuarios WHERE id = ?", identity)
        if user_rows and user_rows[0].get("type") in ["empresa", "company"]:
            user_type = "company"

    # Se for empresa, fetch vagas dela. Se profissional, fetch o feed normal (escondendo já aplicadas se logado)
    user_id = identity if user_type == "company" else None
    candidate_id = identity if user_type == "professional" else None

    try:
        if user_id:
            rows = db.execute("""
                SELECT j.*, up.phone as up_phone 
                FROM jobs j 
                LEFT JOIN user_profiles up ON j.posted_by_user_id = up.user_id 
                WHERE j.posted_by_user_id = ? 
                ORDER BY j.created_at DESC
            """, user_id)

        elif candidate_id:
            rows = db.execute("""
                SELECT j.*, up.phone as up_phone
                FROM jobs j
                LEFT JOIN job_applications ja
                    ON ja.job_id = j.id
                   AND ja.candidate_id = ?
                LEFT JOIN user_profiles up ON j.posted_by_user_id = up.user_id
                WHERE ja.id IS NULL
                ORDER BY j.created_at DESC
            """, candidate_id)

        else:
            rows = db.execute("""
                SELECT j.*, up.phone as up_phone 
                FROM jobs j 
                LEFT JOIN user_profiles up ON j.posted_by_user_id = up.user_id 
                ORDER BY j.created_at DESC
            """)

        import json
        results = []

        for r in rows:
            item = dict(r)

            up_phone = item.pop("up_phone", None)
            real_phone = ""
            if up_phone:
                try: real_phone = fernet.decrypt(up_phone.encode()).decode()
                except: real_phone = up_phone

            if item.get("company_info_json"):
                try:
                    item["companyInfo"] = json.loads(item["company_info_json"])
                except:
                    item["companyInfo"] = {}
            else:
                item["companyInfo"] = {}
                
            # Force exactly the profile's phone. If none exists, clear out any buggy old data.
            item["companyInfo"]["phone"] = real_phone

            item["paymentType"] = item.pop("payment_type", None)
            item["workHours"] = item.pop("work_hours", None)
            item["postedBy"] = item.pop("posted_by", None)
            item["postedAt"] = item.pop("posted_at", None)
            item["isUrgent"] = bool(item.pop("is_urgent", 0))
            item["professionalRating"] = item.pop("professional_rating", None)
            item["professionalReviews"] = item.pop("professional_reviews", None)
            item["completedJobs"] = item.pop("completed_jobs", None)
            item["companyOnly"] = bool(item.pop("company_only", 0))
            item["includesFood"] = bool(item.pop("includes_food", 0))

            # Manter lat/lng planos para ranking e expor coordinates como extra
            if item.get("lat") is not None and item.get("lng") is not None:
                item["coordinates"] = {"lat": item["lat"], "lng": item["lng"]}
            else:
                item["coordinates"] = None

            item["startDate"] = item.pop("start_date", None)
            item["startTime"] = item.pop("start_time", None)

            item.pop("company_info_json", None)
            results.append(item)

        return jsonify(results)

    except Exception as e:
        print(f"Erro ao processar jobs: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/jobs/<job_id>", methods=["PUT"])
def update_job(job_id):
    data = request.json or {}
    user_id = get_jwt_identity()

    # 1. Verificar se a vaga existe e pertence à empresa
    row = db.execute("SELECT id, posted_by_user_id FROM jobs WHERE id = ?", job_id)
    if not row:
        return api_error("Vaga não encontrada", 404)
    
    job = row[0]
    if str(job["posted_by_user_id"]) != str(user_id):
        return api_error("Você não tem permissão para editar esta vaga", 403)

    # 2. Atualizar dados
    import json
    company_info = data.get("companyInfo") or {}
    company_info_json = json.dumps(company_info, ensure_ascii=False)

    try:
        db.execute("""
            UPDATE jobs
            SET title = ?,
                description = ?,
                category = ?,
                payment_type = ?,
                rate = ?,
                location = ?,
                area = ?,
                address = ?,
                work_hours = ?,
                period = ?,
                duration = ?,
                is_urgent = ?,
                company_only = ?,
                includes_food = ?,
                lat = ?,
                lng = ?,
                company_info_json = ?,
                start_date = ?,
                start_time = ?
            WHERE id = ?
        """,
            data.get("title"),
            data.get("description"),
            data.get("category"),
            data.get("paymentType"),
            data.get("rate"),
            data.get("location"),
            data.get("area"),
            data.get("address"),
            data.get("workHours"),
            data.get("period"),
            data.get("duration"),
            1 if data.get("isUrgent") else 0,
            1 if data.get("companyOnly") else 0,
            1 if data.get("includesFood") else 0,
            (data.get("coordinates") or {}).get("lat"),
            (data.get("coordinates") or {}).get("lng"),
            company_info_json,
            data.get("startDate"),
            data.get("startTime"),
            job_id
        )
        return api_ok(message="Vaga atualizada com sucesso")
    except Exception as e:
        print(f"Erro ao atualizar vaga: {e}")
        return api_error("Erro ao atualizar vaga", 500)

@app.route("/api/jobs/<job_id>", methods=["DELETE"])
def delete_job(job_id):
    user_id = get_jwt_identity()

    # 1. Verificar se a vaga existe e pertence à empresa
    row = db.execute("SELECT id, posted_by_user_id FROM jobs WHERE id = ?", job_id)
    if not row:
        return api_error("Vaga não encontrada", 404)
    
    job = row[0]
    if str(job["posted_by_user_id"]) != str(user_id):
        return api_error("Você não tem permissão para excluir esta vaga", 403)

    try:
        # Opcional: Remover candidaturas antes? Ou deixar constraints tratarem (se houver CASCADE)?
        # Meu schema tem FOREIGN KEY, mas não vi ON DELETE CASCADE explícito no CREATE TABLE do step 7.
        # Melhor excluir candidaturas primeiro para evitar erro de FK, ou adicionar CASCADE.
        # Verificando schema no step 7: FOREIGN KEY(job_id) REFERENCES jobs(id). Sem CASCADE.
        # Então preciso deletar applications primeiro.
        
        db.execute("DELETE FROM job_applications WHERE job_id = ?", job_id)
        db.execute("DELETE FROM jobs WHERE id = ?", job_id)
        
        return api_ok(message="Vaga excluída com sucesso")
    except Exception as e:
        print(f"Erro ao excluir vaga: {e}")
        return api_error("Erro ao excluir vaga", 500)

@app.route("/api/my/applications", methods=["GET"])
def get_my_applications():
    user_id = get_jwt_identity()

    try:
        rows = db.execute("""
            SELECT
                ja.id AS application_id,
                ja.status AS application_status,
                ja.created_at AS applied_at,
                j.*,
                up.phone AS up_phone
            FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            LEFT JOIN user_profiles up ON j.posted_by_user_id = up.user_id
            WHERE ja.candidate_id = ?
            ORDER BY ja.created_at DESC
        """, user_id)

        import json
        applications = []

        for r in rows:
            item = dict(r)

            up_phone = item.pop("up_phone", None)
            real_phone = ""
            if up_phone:
                try: real_phone = fernet.decrypt(up_phone.encode()).decode()
                except: real_phone = up_phone

            # parse company_info_json
            if item.get("company_info_json"):
                try:
                    item["companyInfo"] = json.loads(item["company_info_json"])
                except:
                    item["companyInfo"] = {}
            else:
                item["companyInfo"] = {}
                
            # Force exactly the profile's phone. If none exists, clear out any buggy old data.
            item["companyInfo"]["phone"] = real_phone

            # job fields -> frontend shape
            item["paymentType"] = item.pop("payment_type", None)
            item["workHours"] = item.pop("work_hours", None)
            item["postedBy"] = item.pop("posted_by", None)
            item["postedAt"] = item.pop("posted_at", None)
            item["isUrgent"] = bool(item.pop("is_urgent", 0))
            item["professionalRating"] = item.pop("professional_rating", None)
            item["professionalReviews"] = item.pop("professional_reviews", None)
            item["completedJobs"] = item.pop("completed_jobs", None)
            item["companyOnly"] = bool(item.pop("company_only", 0))
            item["includesFood"] = bool(item.pop("includes_food", 0))

            # Manter lat/lng planos para ranking e expor coordinates como extra
            if item.get("lat") is not None and item.get("lng") is not None:
                item["coordinates"] = {"lat": item["lat"], "lng": item["lng"]}
            else:
                item["coordinates"] = None

            item["startDate"] = item.pop("start_date", None)
            item["startTime"] = item.pop("start_time", None)

            item.pop("company_info_json", None)

            applications.append({
                "applicationId": item.pop("application_id"),
                "status": item.pop("application_status"),
                "appliedAt": item.pop("applied_at"),
                "job": item
            })

        return api_ok(applications=applications)

    except Exception as e:
        print(f"Erro ao buscar candidaturas: {e}")
        return api_error("Erro ao buscar candidaturas", 500)


# GET /api/cnpj/<cnpj>
import requests, re

def only_digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")

@app.get("/api/cnpj/<cnpj>")
def lookup_cnpj(cnpj):
    cnpj = only_digits(cnpj)
    if len(cnpj) != 14:
        return jsonify({"success": False, "error": "CNPJ inválido"}), 400

    r = requests.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}", timeout=10)
    if r.status_code != 200:
        return jsonify({"success": False, "error": "Não foi possível consultar o CNPJ"}), 400

    data = r.json()
    # você mapeia o que quer mandar pro front:
    payload = {
        "company_name": data.get("razao_social"),
        "trade_name": data.get("nome_fantasia"),
        "status": data.get("descricao_situacao_cadastral"),
        "address": {
            "street": data.get("logradouro"),
            "number": data.get("numero"),
            "neighborhood": data.get("bairro"),
            "city": data.get("municipio"),
            "state": data.get("uf"),
            "cep": data.get("cep"),
        }
    }
    return jsonify({"success": True, "data": payload})

EMAIL_CODE_TTL_MIN = 10
EMAIL_RESEND_COOLDOWN_SEC = 60
EMAIL_CODE_SECRET = os.environ.get("EMAIL_CODE_SECRET", "troque-por-um-segredo-longo")

EMAIL_FROM = os.environ.get("EMAIL_FROM", "suporte@pegatrampo.com.br")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Pega Trampo")
BREVO_API_KEY = os.environ.get("BREVO_API_KEY", "")
BREVO_SANDBOX = os.environ.get("BREVO_SANDBOX", "1") == "1"

def hash_code(user_id: str, code: str) -> str:
    msg = f"{user_id}:{code}".encode("utf-8")
    key = EMAIL_CODE_SECRET.encode("utf-8")
    return hmac.new(key, msg, hashlib.sha256).hexdigest()

def gen_code():
    # 6 dígitos com zero à esquerda, seguro (secrets)
    return f"{secrets.randbelow(1_000_000):06d}"

@app.post("/api/auth/request-email-verification")
def request_email_verification():
    data = request.json or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"success": False, "error": "user_id obrigatório"}), 400

    try:
        row = db.execute("SELECT id, email, email_verified, email_verification_sent_at FROM usuarios WHERE id = ?", user_id)
        if not row:
            return jsonify({"success": False, "error": "Usuário não encontrado"}), 404

        u = row[0]
        sent_at = u.get("email_verification_sent_at")
        if sent_at:
            last = datetime.fromisoformat(sent_at)
            # Comparação segura fazendo ambos naive ou aware
            now_utc = datetime.now(timezone.utc)
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
                
            if (now_utc - last).total_seconds() < EMAIL_RESEND_COOLDOWN_SEC:
                return jsonify({"success": False, "error": "Aguarde um pouco para reenviar."}), 429
        
        if u.get("email_verified") == 1:
            return jsonify({"success": True, "already_verified": True})
            
        code = gen_code()
        code_hash = hash_code(user_id, code)
        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        expires = (now_naive + timedelta(minutes=EMAIL_CODE_TTL_MIN)).isoformat(timespec="seconds")

        db.execute("""
            UPDATE usuarios
            SET email_verification_code_hash = ?,
                email_verification_expires_at = ?,
                email_verification_sent_at = ?,
                email_verification_attempts = 0
            WHERE id = ?
        """, code_hash, expires, now_naive.isoformat(timespec="seconds"), user_id)

        try:
            send_verification_email_brevo(u["email"], code, EMAIL_CODE_TTL_MIN)
        except Exception:
            return jsonify({"success": False, "error": "Falha ao enviar e-mail. Tente novamente."}), 500

        return jsonify({"success": True})
    except Exception as e:
        app.logger.exception("Erro em request_email_verification")
        return jsonify({"success": False, "error": str(e)}), 500


import re, hmac
@app.post("/api/auth/verify-email")
def verify_email():
    data = request.json or {}
    user_id = data.get("user_id")
    code = re.sub(r"\D", "", (data.get("code") or ""))

    if not user_id or len(code) != 6:
        return jsonify({"success": False, "error": "Dados inválidos"}), 400

    row = db.execute("""
        SELECT email_verified, email_verification_code_hash, email_verification_expires_at,
               COALESCE(email_verification_attempts, 0) as attempts
          FROM usuarios
         WHERE id = ?
    """, user_id)

    if not row:
        return jsonify({"success": False, "error": "Usuário não encontrado"}), 404

    u = row[0]
    if u["email_verified"] == 1:
        return jsonify({"success": True, "already_verified": True})

    if int(u["attempts"]) >= 5:
        return jsonify({"success": False, "error": "Muitas tentativas. Reenvie o código."}), 429

    expires_at = u["email_verification_expires_at"]
    if not expires_at:
        return jsonify({"success": False, "error": "Código expirado. Reenvie."}), 400

    expires_dt = datetime.fromisoformat(expires_at)
    now = datetime.utcnow()
    
    # Tornar ambos ingênuos (naive) para comparação correta
    expires_dt = expires_dt.replace(tzinfo=None)
    now = now.replace(tzinfo=None)
    
    if expires_dt < now:
        return jsonify({"success": False, "error": "Código expirado. Reenvie."}), 400

    expected = u["email_verification_code_hash"]
    if not expected:
        return jsonify({"success": False, "error": "Sem código ativo. Reenvie."}), 400

    got = hash_code(user_id, code)
    if not hmac.compare_digest(got, expected):
        db.execute("""
            UPDATE usuarios
               SET email_verification_attempts = COALESCE(email_verification_attempts,0) + 1
             WHERE id = ?
        """, user_id)
        return jsonify({"success": False, "error": "Código incorreto"}), 400

    db.execute("""
        UPDATE usuarios
           SET email_verified = 1,
               email_verified_at = ?,
               email_verification_code_hash = NULL,
               email_verification_expires_at = NULL,
               email_verification_attempts = 0
         WHERE id = ?
    """, now.isoformat(timespec="seconds"), user_id)

    return jsonify({"success": True})

def send_verification_email_brevo(to_email: str, code: str, ttl_min: int):
    if not BREVO_API_KEY:
        print(f"\n=========================================\n[MOCK EMAIL] Para: {to_email}\n[MOCK EMAIL] Código de Verificação: {code}\n=========================================\n")
        return

    payload = {
        "sender": {"name": EMAIL_FROM_NAME, "email": EMAIL_FROM},
        "to": [{"email": to_email}],
        "subject": "Seu código de verificação",
        "htmlContent": f"""
          <div style="font-family:Arial,sans-serif">
            <h2>Verificação de e-mail</h2>
            <p>Seu código é:</p>
            <div style="font-size:28px;font-weight:700;letter-spacing:4px">{code}</div>
            <p>Expira em {ttl_min} minutos.</p>
          </div>
        """,
    }

    # Sandbox: não entrega de verdade
    if BREVO_SANDBOX:
        payload["headers"] = {"X-Sib-Sandbox": "drop"}

    r = requests.post(
        "https://api.brevo.com/v3/smtp/email",
        headers={"api-key": BREVO_API_KEY, "Content-Type": "application/json"},
        json=payload,
        timeout=15,
    )
    if r.status_code >= 300:
        raise RuntimeError(f"Brevo falhou ({r.status_code}): {r.text}")

@app.route("/api/resumes", methods=["POST"])
def save_resume():
    data = request.json or {}
    user_id = get_jwt_identity()

    import json, uuid
    resume_id = data.get("id") or f"resume_{uuid.uuid4()}"

    # ====== Validation Age ======
    personal_data = data.get("personalInfo") or {}
    birth_date_str = personal_data.get("birthDate")
    if birth_date_str:
        try:
            bdate = datetime.strptime(birth_date_str, "%Y-%m-%d")
            today_date = datetime.now()
            age = today_date.year - bdate.year - ((today_date.month, today_date.day) < (bdate.month, bdate.day))
            if age < 18:
                return api_error("Você precisa ter pelo menos 18 anos de idade.", 400)
        except ValueError:
            pass

    # Serialize JSON fields
    personal_info = json.dumps(data.get("personalInfo") or {}, ensure_ascii=False)
    professional_info = json.dumps(data.get("professionalInfo") or {}, ensure_ascii=False)
    work_experience = json.dumps(data.get("workExperience") or [], ensure_ascii=False)
    education = json.dumps(data.get("education") or [], ensure_ascii=False)
    skills = json.dumps(data.get("skills") or [], ensure_ascii=False)
    availability = json.dumps(data.get("availability") or [], ensure_ascii=False)
    
    bio = data.get("bio")
    is_visible = True if data.get("isVisible") else False

    try:
        # Check if exists
        row = db.execute("SELECT id FROM resumes WHERE id = ?", resume_id)
        if row:
             db.execute("""
                UPDATE resumes
                SET user_id = ?,
                    personal_info_json = ?,
                    professional_info_json = ?,
                    work_experience_json = ?,
                    education_json = ?,
                    skills_json = ?,
                    availability_json = ?,
                    bio = ?,
                    is_visible = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """,
                user_id,
                personal_info, professional_info,
                work_experience, education,
                skills, availability,
                bio, is_visible,
                resume_id
            )
        else:
             db.execute("""
                INSERT INTO resumes (
                    id, user_id, 
                    personal_info_json, professional_info_json, 
                    work_experience_json, education_json, 
                    skills_json, availability_json, 
                    bio, is_visible, 
                    created_at, updated_at
                ) VALUES (
                    ?, ?, 
                    ?, ?, 
                    ?, ?, 
                    ?, ?, 
                    ?, ?, 
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
            """, 
                resume_id, user_id,
                personal_info, professional_info,
                work_experience, education,
                skills, availability,
                bio, is_visible
            )

        # ---- Sync phone: resume → profile ----
        try:
            pi_data = data.get("personalInfo") or {}
            resume_phone = pi_data.get("phone")
            if resume_phone and user_id:
                db.execute(
                    "UPDATE user_profiles SET phone = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?",
                    enc(resume_phone), user_id
                )
        except Exception as sync_err:
            print(f"Aviso: falha ao sincronizar phone no perfil: {sync_err}")

        return api_ok(resume_id=resume_id)

    except Exception as e:
        print(f"Erro ao salvar currículo: {e}")
        return api_error(f"Erro ao salvar currículo: {str(e)}", 500)


@app.route("/api/resumes/<resume_id>", methods=["DELETE"])
def delete_resume(resume_id):
    try:
        db.execute("DELETE FROM resumes WHERE id = ?", resume_id)
        return api_ok(message="Currículo excluído")
    except Exception as e:
        print(f"Erro ao excluir currículo: {e}")
        return api_error(str(e), 500)


@app.route("/api/resumes", methods=["GET"])
def get_resumes():
    user_id = get_jwt_identity()
    
    if user_id:
        rows = db.execute("""
            SELECT r.*, up.phone as up_phone 
            FROM resumes r 
            LEFT JOIN user_profiles up ON r.user_id = up.user_id
            WHERE r.user_id = ?
        """, user_id)
    else:
        # Professional users (and potentially companies searching for resumes) might want all.
        # However, the requirement says "na hora de chamar o endpoint para pegar os curriculos, ainda esta pegando todos os curriculos... se for professional, precisa pegar apenas o curriculo do proprio funcionario"
        # Since this endpoint is general, we will return all if no user_id is passed, BUT the frontend will filter.
        # Wait, if user_id is passed it returns THAT user's resume.
        rows = db.execute("""
            SELECT r.*, up.phone as up_phone 
            FROM resumes r 
            LEFT JOIN user_profiles up ON r.user_id = up.user_id
        """)

    import json
    results = []
    for r in rows:
        item = dict(r)
        
        up_phone = item.pop("up_phone", None)
        real_phone = ""
        if up_phone:
            try: real_phone = fernet.decrypt(up_phone.encode()).decode()
            except: real_phone = up_phone

        # Parse JSONs
        for field, target in [
            ("personal_info_json", "personalInfo"),
            ("professional_info_json", "professionalInfo"),
            ("work_experience_json", "workExperience"),
            ("education_json", "education"),
            ("skills_json", "skills"),
            ("availability_json", "availability")
        ]:
            val = item.pop(field, "[]")
            try: item[target] = json.loads(val) if val else None
            except: item[target] = None
            
        item["userId"] = item.pop("user_id", None)
        item["createdAt"] = item.pop("created_at", None)
        item["updatedAt"] = item.pop("updated_at", None)
        item["isVisible"] = bool(item.pop("is_visible", 0))
        
        results.append(item)
        
        # Override phone with the fresh one from user_profiles if available (or clear if None)
        if not item.get("personalInfo"):
            item["personalInfo"] = {}
        item["personalInfo"]["phone"] = real_phone
        
    return jsonify(results)

@app.route("/api/user-profile", methods=["POST"])
def save_user_profile():
    data = request.json or {}

    try:
        # ====== USUÁRIO (admin da empresa) ======
        username = norm_username(data.get("username"))
        password = data.get("password") or ""
        user_email = norm_email(data.get("email"))

        # fallback: company_email
        company_email = norm_email(data.get("company_email"))
        if not user_email:
            user_email = company_email

        user_type = "empresa"
        user_id = data.get("user_id")  # opcional

        # ====== cria usuário se não veio user_id ======
        if not user_id:
            if not username:
                return api_error("username é obrigatório", 400)
            if len(username) < 3 or re.search(r"\s", username):
                return api_error("username inválido (mín. 3 caracteres e sem espaços)", 400)

            if not password:
                return api_error("password é obrigatório", 400)
            if len(password) < 8:
                return api_error("password inválido (mín. 8 caracteres)", 400)

            if not user_email:
                return api_error("email é obrigatório", 400)

            # checagem simples de duplicidade (ideal: UNIQUE no banco)
            exists = db.execute(
                "SELECT id FROM usuarios WHERE username = ? OR email = ? LIMIT 1",
                username, user_email
            )
            if exists:
                return api_error("username ou email já cadastrado", 409)

            senha_hash = generate_password_hash(password)

            db.execute(
                """
                INSERT INTO usuarios (username, senha_hash, email, type, created_at, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """,
                username, senha_hash, user_email, user_type
            )

            row = db.execute("SELECT id FROM usuarios WHERE username = ? LIMIT 1", username)
            if not row:
                return api_error("Falha ao criar usuário", 500)

            user_id = row[0]["id"]

        # ====== Validation Age ======
        birth_date_str = data.get("birthDate")
        if birth_date_str:
            try:
                bdate = datetime.strptime(birth_date_str, "%Y-%m-%d")
                today_date = datetime.now()
                age = today_date.year - bdate.year - ((today_date.month, today_date.day) < (bdate.month, bdate.day))
                if age < 18:
                    return api_error("Você precisa ter pelo menos 18 anos de idade.", 400)
            except ValueError:
                pass

        # ====== PERFIL (seu código, padronizado) ======
        payload = {
            "cnpj": enc(cnpj_digits(data.get("cnpj"))),  # <- salva só dígitos (sem mudar front)
            "company_name": enc(data.get("company_name")),
            "company_email": company_email,  # sem criptografia, como você queria
            "business_type": enc(data.get("business_type")),
            "company_description": enc(data.get("company_description")),

            "full_name": enc(data.get("full_name")),
            "cpf": enc(data.get("cpf")),
            "phone": enc(data.get("phone")),

            "address": enc(data.get("address")),
            "number": data.get("number"),
            "complement": enc(data.get("complement")),
            "neighborhood": enc(data.get("neighborhood")),
            "city": enc(data.get("city")),
            "state": enc(data.get("state")),
            "cep": enc(data.get("cep")),
            "lat": data.get("lat"),
            "lng": data.get("lng"),
            "birth_date": enc(data.get("birthDate")),
            "imagem_profile": data.get("imagem_profile"),
        }

        # normaliza number
        try:
            if payload["number"] in ("", None):
                payload["number"] = None
            elif isinstance(payload["number"], str):
                payload["number"] = int(payload["number"])
        except ValueError:
            return api_error("number precisa ser inteiro", 400)

        db.execute(
            """
            INSERT INTO user_profiles (
                user_id,
                cnpj, company_name, company_email, business_type, company_description,
                full_name, cpf, phone,
                address, number, complement, neighborhood, city, state, cep, lat, lng, birth_date, imagem_profile,
                updated_at
            ) VALUES (
                ?, ?, ?, ?, ?, ?,
                ?, ?, ?,
                ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT(user_id) DO UPDATE SET
                cnpj = excluded.cnpj,
                company_name = excluded.company_name,
                company_email = excluded.company_email,
                business_type = excluded.business_type,
                company_description = excluded.company_description,
                full_name = excluded.full_name,
                cpf = excluded.cpf,
                phone = excluded.phone,
                address = excluded.address,
                number = excluded.number,
                complement = excluded.complement,
                neighborhood = excluded.neighborhood,
                city = excluded.city,
                state = excluded.state,
                cep = excluded.cep,
                lat = excluded.lat,
                lng = excluded.lng,
                birth_date = excluded.birth_date,
                imagem_profile = excluded.imagem_profile,
                updated_at = CURRENT_TIMESTAMP;
            """,
            user_id,
            payload["cnpj"], payload["company_name"], payload["company_email"], payload["business_type"], payload["company_description"],
            payload["full_name"], payload["cpf"], payload["phone"],
            payload["address"], payload["number"], payload["complement"], payload["neighborhood"], payload["city"], payload["state"], payload["cep"], payload["lat"], payload["lng"], payload["birth_date"], payload["imagem_profile"]
        )

        # ---- Sync phone: profile → resume ----
        raw_phone = data.get("phone")
        if raw_phone and user_id:
            import json as _json
            resume_rows = db.execute("SELECT id, personal_info_json FROM resumes WHERE user_id = ?", user_id)
            for rr in resume_rows:
                try:
                    pi = _json.loads(rr["personal_info_json"]) if rr.get("personal_info_json") else {}
                    pi["phone"] = raw_phone
                    db.execute("UPDATE resumes SET personal_info_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                               _json.dumps(pi, ensure_ascii=False), rr["id"])
                except Exception as sync_err:
                    print(f"Aviso: falha ao sincronizar phone no currículo: {sync_err}")

        return api_ok(user_id=user_id)


    except Exception:
        # loga no servidor, mas não vaza detalhes pro cliente
        # (se quiser, aqui você faz print/ logger.exception)
        return api_error("Erro interno ao salvar cadastro", 500)

@app.route("/api/register", methods=["POST"])
def register_user():
    data = request.json or {}

    # Basic fields
    username = norm_username(data.get("username"))
    email = norm_email(data.get("email"))
    password = data.get("password")
    
    # Profile fields (Employee)
    full_name = data.get("full_name") or data.get("name") # support both
    cpf = only_digits(data.get("cpf"))
    phone = data.get("phone")
    category = data.get("category")
    
    # Validate required fields
    if not username or len(username) < 3:
        return api_error("Username deve ter no mínimo 3 caracteres", 400)
    if not email:
        return api_error("Email é obrigatório", 400)
    if not password or len(password) < 6:
        return api_error("Senha deve ter no mínimo 6 caracteres", 400)
    if not full_name:
        return api_error("Nome completo é obrigatório", 400)
    if not cpf or len(cpf) != 11:
        return api_error("CPF inválido", 400)

    try:
        # Check if user exists
        exists = db.execute("SELECT id FROM usuarios WHERE username = ? OR email = ?", username, email)
        if exists:
            return api_error("Username ou Email já cadastrado", 409)

        # Create user
        senha_hash = generate_password_hash(password)
        db.execute(
            """
            INSERT INTO usuarios (username, senha_hash, email, type, created_at, updated_at)
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            username, senha_hash, email, "professional"
        )
        
        # Get user ID
        user_row = db.execute("SELECT id FROM usuarios WHERE username = ?", username)
        if not user_row:
             return api_error("Erro ao criar usuário", 500)
        user_id = user_row[0]["id"]
        
        # Create profile
        # Encrypt sensitive data
        enc_full_name = enc(full_name)
        enc_cpf = enc(cpf)
        enc_phone = enc(phone)
        
        # We store category in "business_type" or "company_description" or separate field?
        # The Current `user_profiles` table has `business_type` which is used for company type.
        # For employee, `category` is akin to that. Let's use `business_type` column for category as well for now, 
        # or `company_description` if it fits better.
        # Looking at `manipule.py`, there isn't a specific `category` column for employees in `user_profiles`.
        # `business_type` seems appropriate enough for "profession/category".
        
        enc_category = enc(category)
        imagem_profile = data.get("imagem_profile")

        db.execute(
            """
            INSERT INTO user_profiles (
                user_id,
                full_name, cpf, phone, business_type, imagem_profile,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """,
            user_id, enc_full_name, enc_cpf, enc_phone, enc_category, imagem_profile
        )

        return api_ok(user_id=user_id, message="Cadastro realizado com sucesso!")

    except Exception as e:
        print(f"Erro no /api/register: {e}")
        return api_error("Erro interno no servidor ao registrar", 500)

def only_digits(s):
    if not s: return ""
    return re.sub(r"\D", "", str(s))

@app.route("/api/login", methods=["POST"])
def login():
    data = request.json or {}
    email = norm_email(data.get("email"))
    password = data.get("password")

    if not email or not password:
        return api_error("Email e senha são obrigatórios", 400)

    # 1. Buscar usuário
    rows = db.execute("SELECT * FROM usuarios WHERE email = ?", email)
    if not rows:
        return api_error("Email ou senha inválidos", 401)
    
    user = rows[0]

    # 2. Verificar senha
    if not check_password_hash(user["senha_hash"], password):
        return api_error("Email ou senha inválidos", 401)

    # 3. Buscar perfil para determinar tipo
    profile_rows = db.execute("SELECT * FROM user_profiles WHERE user_id = ?", user["id"])
    
    jwt_token = gerar_token(user["id"])
    
    db_type = user.get("type")
    if db_type == "empresa" or db_type == "company":
        user_type = "company"
    else:
        user_type = "professional"
    
    company_name = None
    full_name = None
    cpf_val = None
    cnpj_val = None
    
    if profile_rows:
        profile = profile_rows[0]
        
        # Descriptografar campos necessários
        try:
            if profile.get("cnpj"):
                decrypted_cnpj = fernet.decrypt(profile["cnpj"].encode()).decode()
                if decrypted_cnpj:
                    user_type = "company"
                    cnpj_val = decrypted_cnpj
                    
            if profile.get("cpf"):
                decrypted_cpf = fernet.decrypt(profile["cpf"].encode()).decode()
                if decrypted_cpf and not cnpj_val:
                    user_type = "professional"
                    cpf_val = decrypted_cpf
                
            # Recuperar nomes para o frontend
            if profile.get("company_name"):
               company_name = fernet.decrypt(profile["company_name"].encode()).decode()
            
            if profile.get("full_name"):
               full_name = fernet.decrypt(profile["full_name"].encode()).decode()
               
        except Exception as e:
            print(f"Erro ao descriptografar dados do login: {e}")
            # Em caso de erro de criptografia, mantém o login mas com dados limitados
            pass

    resp = jsonify({
        "message": "Login bem-sucedido",
        "success": True,
        "user": {
            "id": user['id'], 
            "email": user['email'], 
            "username": user["username"], 
            "userType": user_type, 
            "companyName": company_name, 
            "fullName": full_name, 
            "cpf": cpf_val, 
            "cnpj": cnpj_val
        }
    })
    
    resp.set_cookie(
        key=COOKIE_NAME,
        value=jwt_token,
        httponly=True,
        secure=True,
        samesite="None",
        path="/",          # obrigatório para __Host-
        max_age=60*60*24,
    )

    return resp, 200


@app.route("/api/jobs/<job_id>/apply", methods=["POST"])
def apply_to_job(job_id):
    data = request.json or {}
    user_id = get_jwt_identity()
    print(f"user_id: {user_id}")

    # Verifica se já existe candidatura
    existing = db.execute(
        "SELECT id FROM job_applications WHERE job_id = ? AND candidate_id = ?",
        job_id, user_id
    )
    if existing:
        return api_error("Você já se candidatou para esta vaga", 409)

    import uuid
    application_id = str(uuid.uuid4())

    try:
        db.execute(
            """
            INSERT INTO job_applications (id, job_id, candidate_id, status)
            VALUES (?, ?, ?, 'pending')
            """,
            application_id, job_id, user_id
        )
        return api_ok(message="Candidatura realizada com sucesso!", applicationId=application_id)
    except Exception as e:
        print(f"Erro ao candidatar: {e}")
        return api_error("Erro ao processar candidatura", 500)

@app.route("/api/company/applications", methods=["GET"])
def get_company_applications():
    # Identificar a empresa logada via JWT securely.
    company_user_id = get_jwt_identity()

    try:
        # 1. Buscar vagas publicadas por esta empresa (pelo user_id do dono, ou posted_by nome se for string solta)
        # No endpoint de POST /api/jobs, salvamos "posted_by" como nome. 
        # Mas o ideal é linkar com o ID do usuário.
        # Vamos assumir que o frontend manda o ID do usuário que é dono da empresa.
        
        # Precisamos descobrir quais jobs pertencem a esse user_id.
        # O user_profiles tem company_name. A tabela jobs tem posted_by (nome da empresa). 
        # Vamos buscar o profile primeiro para pegar o nome da empresa.
        
        profile_rows = db.execute("SELECT company_name, full_name FROM user_profiles WHERE user_id = ?", company_user_id)
        if not profile_rows:
            return api_ok(jobs=[])
            
        profile = profile_rows[0]
        # Tenta pegar nome da empresa, ou nome do usuário se não tiver empresa (profissional autônomo q posta vaga?)
        poster_name = None
        if profile.get("company_name"):
            try:
                poster_name = fernet.decrypt(profile["company_name"].encode()).decode()
            except:
                poster_name = profile["company_name"] # Fallback se não for criptografado
        elif profile.get("full_name"):
            try:
                poster_name = fernet.decrypt(profile["full_name"].encode()).decode()
            except:
                poster_name = profile["full_name"]
            
        if not poster_name:
            return api_ok(jobs=[])

        # 2. Buscar Jobs
        # ATENÇÃO: posted_by no jobs é o Nome. Isso é frágil se houver nomes duplicados.
        # Mas seguindo a estrutura atual:
        my_jobs = db.execute("SELECT * FROM jobs WHERE posted_by = ?", poster_name)
        
        results = []
        import json

        for job in my_jobs:
            job_id = job["id"]
            
            # 3. Buscar candidaturas para este job
            applications = db.execute("""
                SELECT 
                    ja.id as app_id, 
                    ja.status, 
                    ja.created_at as app_date,
                    ja.candidate_id,
                    u.email,
                    u.username,
                    up.full_name,
                    up.phone,
                    up.business_type as category, -- usando business_type como categoria pro profissional
                    r.id as resume_id,
                    r.professional_info_json,
                    r.work_experience_json
                FROM job_applications ja
                JOIN usuarios u ON ja.candidate_id = u.id
                LEFT JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN resumes r ON u.id = r.user_id -- Pega o currículo do candidato
                WHERE ja.job_id = ?
            """, job_id)
            
            candidates = []
            for app in applications:
                # Decrypt profile info
                c_name = "Anônimo"
                c_phone = ""
                
                # Nome: tenta full_name (profile), fallback para username (usuario)
                if app.get("full_name"):
                    try: c_name = fernet.decrypt(app["full_name"].encode()).decode()
                    except: c_name = app["full_name"]
                elif app.get("username"):
                    c_name = app["username"]
                    
                if app.get("phone"):
                    try: c_phone = fernet.decrypt(app["phone"].encode()).decode()
                    except: c_phone = app["phone"]
                
                c_category = ""
                if app.get("category"):
                    try: c_category = fernet.decrypt(app["category"].encode()).decode()
                    except: c_category = app["category"]

                # Parse resume info if available
                resume_info = {}
                if app.get("professional_info_json"):
                    try: resume_info = json.loads(app["professional_info_json"])
                    except: pass
                    
                work_exp = []
                if app.get("work_experience_json"):
                    try: work_exp = json.loads(app["work_experience_json"])
                    except: pass

                candidates.append({
                    "applicationId": app["app_id"],
                    "candidateId": app["candidate_id"],
                    "name": c_name,
                    "phone": c_phone,
                    "email": app["email"],
                    "category": c_category,
                    "appliedAt": app["app_date"],
                    "status": app["status"],
                    "resume": {
                        "id": app["resume_id"],
                        "professionalInfo": resume_info,
                        "workExperience": work_exp
                    }
                })
                
            # Formata o job para retorno (simplificado)
            job_data = {
                "id": job["id"],
                "title": job["title"],
                "candidates": candidates
            }
            results.append(job_data)

        return api_ok(jobs=results)

    except Exception as e:
        print(f"Erro ao buscar applications: {e}")
        return api_error("Erro ao buscar candidaturas da empresa", 500)


@app.route("/api/get_dados", methods=["GET"])
def get_dados():
    user_id = get_jwt_identity()

    try:
        # 1. Fetch User Profile
        profile_rows = db.execute("SELECT * FROM user_profiles WHERE user_id = ?", user_id)
        user_rows = db.execute("SELECT email, type, username FROM usuarios WHERE id = ?", user_id)
        
        profile_data = {}
        if profile_rows:
            p = profile_rows[0]
            # Decrypt fields
            for key in ["cnpj", "company_name", "business_type", "company_description", 
                        "full_name", "cpf", "phone", "address", "complement", 
                        "neighborhood", "city", "state", "birth_date"]:
                val = p.get(key)
                if val:
                    try:
                        profile_data[key] = fernet.decrypt(val.encode()).decode()
                    except:
                        profile_data[key] = None
                else:
                    profile_data[key] = None
            
            # Non-encrypted fields
            profile_data["company_email"] = p.get("company_email")
            profile_data["number"] = p.get("number")
            # localização (lat/lng) vão em texto plano
            profile_data["lat"] = p.get("lat")
            profile_data["lng"] = p.get("lng")
            profile_data["imagem_profile"] = p.get("imagem_profile")
        
        if user_rows:
            profile_data["email"] = user_rows[0]["email"]
            profile_data["userType"] = user_rows[0]["type"]
            profile_data["username"] = user_rows[0]["username"]

        # 2. Fetch Resume
        resume_rows = db.execute("SELECT * FROM resumes WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1", user_id)
        resume_data = None
        if resume_rows:
            r = dict(resume_rows[0])
            import json
            # Parse JSON fields
            json_fields = [
                ("personal_info_json", "personalInfo"),
                ("professional_info_json", "professionalInfo"),
                ("work_experience_json", "workExperience"),
                ("education_json", "education"),
                ("skills_json", "skills"),
                ("availability_json", "availability")
            ]
            
            for field, target in json_fields:
                val = r.get(field)
                try:
                    r[target] = json.loads(val) if val else None
                except:
                    r[target] = None
                r.pop(field, None)
            
            r["userId"] = r.pop("user_id", None)
            r["createdAt"] = r.pop("created_at", None)
            r["updatedAt"] = r.pop("updated_at", None)
            r["isVisible"] = bool(r.pop("is_visible", 0))
            
            # Inject fresh phone exactly as it is in the profile
            if not r.get("personalInfo"):
                r["personalInfo"] = {}
            r["personalInfo"]["phone"] = profile_data.get("phone") or ""
                
            resume_data = r

        return jsonify({"success": True, "profile": profile_data, "resume": resume_data})

    except Exception as e:
        print(f"Erro em get_dados: {e}")
        return api_error("Erro ao buscar dados", 500)


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)
