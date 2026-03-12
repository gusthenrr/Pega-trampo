
from flask import Flask, request, jsonify
from flask_cors import CORS
import psycopg2
from psycopg2.extras import DictCursor
from psycopg2.pool import SimpleConnectionPool
import threading
import warnings
warnings.filterwarnings("ignore", category=DeprecationWarning)
warnings.filterwarnings("ignore", category=UserWarning)
import os
from dotenv import load_dotenv

load_dotenv()  # load env FIRST so supabase keys are available

from cryptography.fernet import Fernet
from werkzeug.security import check_password_hash, generate_password_hash
import re
import hmac, hashlib, secrets
from datetime import datetime, timedelta, timezone
from itsdangerous import URLSafeTimedSerializer
import requests
from urllib.parse import urlparse

try:
    from supabase import create_client, Client as SupabaseClient
    _supabase_url = os.environ.get("SUPABASE_URL", "")
    _supabase_key = os.environ.get("SUPABASE_KEY", "")
    supabase = create_client(_supabase_url, _supabase_key) if _supabase_url and _supabase_key else None
except Exception as _sb_err:
    supabase = None
    print(f"WARN: Supabase client init failed: {_sb_err}")

SUPABASE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "job-session-photos")

app = Flask(__name__)
#Config do jwt
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
# load_dotenv() # This line is moved up

def env_bool(name: str, default: bool = False) -> bool:
    v = os.getenv(name)
    if v is None:
        return default
    return v.strip().lower() in ("1", "true", "yes", "y", "on")

JWT_ENABLED = env_bool("JWT_ENABLED", True)
DEV_USER_ID = int(os.getenv("DEV_USER_ID", "1"))
COOKIE_NAME = (os.getenv("JWT_COOKIE_NAME") or "__Host-token").strip()
COOKIE_SECURE = env_bool("JWT_COOKIE_SECURE", True)
COOKIE_SAMESITE = (os.getenv("JWT_COOKIE_SAMESITE") or "None").strip()
COOKIE_DOMAIN = (os.getenv("JWT_COOKIE_DOMAIN") or "").strip() or None
APP_ENV = (os.getenv("APP_ENV") or os.getenv("FLASK_ENV") or "development").strip().lower()
FRONTEND_PUBLIC_API_URL = (os.getenv("NEXT_PUBLIC_API_URL") or "").strip()
FRONTEND_SITE_URL = (os.getenv("FRONTEND_SITE_URL") or os.getenv("SITE_URL") or "").strip()


def origin_host(url: str):
    if not url:
        return None
    if url.startswith("/"):
        return "same-site"
    parsed = urlparse(url)
    return parsed.netloc or None


def validate_cookie_architecture():
    is_prod = APP_ENV == "production"
    api_host = origin_host(FRONTEND_PUBLIC_API_URL)
    site_host = origin_host(FRONTEND_SITE_URL)

    if is_prod and COOKIE_SECURE is not True:
        raise RuntimeError("ProduÃ§Ã£o requer JWT_COOKIE_SECURE=1 para cookie HttpOnly com HTTPS.")

    if is_prod and COOKIE_SAMESITE.lower() != "none":
        raise RuntimeError("ProduÃ§Ã£o requer JWT_COOKIE_SAMESITE=None para fluxo cross-site.")

    if COOKIE_NAME.startswith("__Host-"):
        if COOKIE_DOMAIN is not None:
            raise RuntimeError("Cookie com prefixo __Host- nÃ£o pode definir Domain.")

    if is_prod and api_host and site_host and api_host != "same-site" and api_host != site_host:
        app.logger.warning(
            "NEXT_PUBLIC_API_URL (%s) e FRONTEND_SITE_URL (%s) estÃ£o em domÃ­nios diferentes. "
            "Priorize reverse proxy/subpath (ex: NEXT_PUBLIC_API_URL=/api) para first-party cookie.",
            FRONTEND_PUBLIC_API_URL,
            FRONTEND_SITE_URL,
        )


validate_cookie_architecture()

# Se tentar usar __Host- sem Secure, o browser pode ignorar.
# EntÃ£o: em dev, use cookie_name=token e secure=0
if COOKIE_NAME.startswith("__Host-") and not COOKIE_SECURE:
    # vocÃª pode ou dar erro, ou trocar automaticamente:
    # raise RuntimeError("__Host- exige JWT_COOKIE_SECURE=1 (HTTPS).")
    COOKIE_NAME = "token"

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY") or "dev-secret"
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]
app.config["JWT_ACCESS_COOKIE_NAME"] = COOKIE_NAME
app.config["JWT_COOKIE_SECURE"] = COOKIE_SECURE
app.config["JWT_COOKIE_SAMESITE"] = COOKIE_SAMESITE
app.config["JWT_COOKIE_CSRF_PROTECT"] = False  # como vocÃª jÃ¡ usa

jwt = JWTManager(app)

#Config do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
# Remove the psycopg sqlalchemy prefix for native psycopg3 pool
if DATABASE_URL and DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1)

class PostgresDB:
    def __init__(self, conninfo):
        self.pool = SimpleConnectionPool(1, 10, conninfo)
        self.local = threading.local()
    
    def execute(self, sql, *args):
        conn = getattr(self.local, 'conn', None)
        is_managed = (conn is not None)
        
        if not is_managed:
            conn = self.pool.getconn()
            conn.autocommit = True

        try:
            with conn.cursor(cursor_factory=DictCursor) as cur:
                if len(args) == 1 and isinstance(args[0], (list, tuple)):
                    args = args[0]
                    
                sql_upper = sql.strip().upper()
                
                if sql_upper == "BEGIN" or sql_upper == "BEGIN TRANSACTION":
                    conn.autocommit = False
                    self.local.conn = conn
                    return []
                elif sql_upper == "COMMIT":
                    conn.commit()
                    conn.autocommit = True
                    self.local.conn = None
                    self.pool.putconn(conn)
                    return []
                elif sql_upper == "ROLLBACK":
                    conn.rollback()
                    conn.autocommit = True
                    self.local.conn = None
                    self.pool.putconn(conn)
                    return []
                    
                cur.execute(sql, args)
                if cur.description is not None:
                    return [dict(row) for row in cur.fetchall()]
                else:
                    return cur.rowcount
        except Exception as e:
            if getattr(self.local, 'conn', None) is conn:
                conn.rollback()
            raise e
        finally:
            # If at the end of this execute the connection isn't stored locally,
            # it means it was a single query OR we just committed/rolled back.
            # We must return it to the pool if we were the ones who acquired it (i.e. not managed at start)
            # OR if we were managed but we just ended the transaction.
            # Wait, `is_managed` tells us if we started with it.
            # If we started without it (`not is_managed`), we must return it UNLESS we just started a transaction.
            if getattr(self.local, 'conn', None) is not conn:
                # the connection is not currently tracked by the thread, so if we acquired it, or if we just ended it
                # Wait, if we just ended it, `is_managed` was True, but `self.local.conn` is None now.
                # If `is_managed` was True, we ALREADY called putconn in the COMMIT/ROLLBACK block!
                # So we only putconn here if we acquired it AND didn't start a transaction!
                if not is_managed:
                    conn.autocommit = False
                    self.pool.putconn(conn)

db = PostgresDB(DATABASE_URL)


ALLOWED_ORIGIN = (os.getenv("ALLOWED_ORIGIN") or "http://localhost:3000").strip()
CORS(
    app,
    supports_credentials=True,
    resources={r"/*": {"origins": [ALLOWED_ORIGIN]}},
)

# ---- ENV + Encryption ----

KEY = os.getenv("PROFILE_ENCRYPTION_KEY")

if not KEY:
    raise RuntimeError("Faltou PROFILE_ENCRYPTION_KEY no .env (chave de criptografia).")

fernet = Fernet(KEY.encode() if isinstance(KEY, str) else KEY)

from flask_jwt_extended import verify_jwt_in_request
from flask_jwt_extended.exceptions import NoAuthorizationError

@app.before_request
def check_jwt_globally():
    # âœ… Se JWT estiver desligado no .env, nÃ£o bloqueia nada
    if not JWT_ENABLED:
        return

    if request.path.startswith('/api/'):
        public_routes = ['/api/login', '/api/register', '/api/user-profile', '/api/auth/', '/api/logout']
        is_public = any(request.path.startswith(route) for route in public_routes) or request.path.startswith('/api/cnpj/')

        if not is_public:
            try:
                verify_jwt_in_request()
                client_user_id = request.headers.get("X-Client-User-Id")
                if client_user_id:
                    jwt_user_id = current_user_id()
                    if not jwt_user_id:
                        jwt_user_id = current_user_id()
                    if str(jwt_user_id) != str(client_user_id):
                        return jsonify({"success": False, "error": "SessÃ£o cruzada divergente. FaÃ§a login novamente.", "session_mismatch": True}), 401
            except Exception as e:
                return jsonify({"success": False, "error": "Token expirado ou invÃ¡lido", "msg": str(e)}), 401

@app.route("/api/logout", methods=["POST"])
def logout():
    resp = jsonify({"success": True, "message": "Logout realizado com sucesso"})
    cookie_domain = None if COOKIE_NAME.startswith("__Host-") else COOKIE_DOMAIN
    resp.set_cookie(
        key=COOKIE_NAME,
        value="",
        max_age=0,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
        domain=cookie_domain,
    )
    return resp, 200

def gerar_token(user_id):
    print('entrou no gerar token')
    token = create_access_token(identity=str(user_id), expires_delta=timedelta(hours=2))
    return token

def current_user_id():
    if not JWT_ENABLED:
        return DEV_USER_ID

    # garante que o JWT foi verificado (cookie/header conforme config)
    try:
        verify_jwt_in_request(optional=True)
    except Exception:
        return None

    identity = get_jwt_identity()
    if identity is None:
        return None

    # aceita identity como int ou string numÃ©rica
    try:
        return int(identity)
    except (TypeError, ValueError):
        return None

def set_auth_cookie(resp, jwt_value: str):
    cookie_domain = None if COOKIE_NAME.startswith("__Host-") else COOKIE_DOMAIN
    resp.set_cookie(
        key=COOKIE_NAME,
        value=jwt_value,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        path="/",
        max_age=60*60*24,
        domain=cookie_domain,
    )
    return resp 

def clear_legacy_cookies(resp):
    # apaga qualquer 'token' residual (host-only)
    resp.set_cookie("token", "", max_age=0, path="/", secure=True, samesite="None")
    # apaga variaÃ§Ãµes com Domain que podem ter ficado
    for d in [".nossopoint-backend-flask-server.com", "app.nossopoint-backend-flask-server.com"]:
        resp.set_cookie("token", "", max_age=0, path="/", domain=d, secure=True, samesite="None")
    return resp


@app.route("/api/auth/cookie-architecture", methods=["GET"])
def cookie_architecture_check():
    api_host = origin_host(FRONTEND_PUBLIC_API_URL)
    site_host = origin_host(FRONTEND_SITE_URL)
    same_site_api = api_host in (None, "same-site") or api_host == site_host

    return jsonify(
        {
            "success": True,
            "environment": APP_ENV,
            "next_public_api_url": FRONTEND_PUBLIC_API_URL or None,
            "frontend_site_url": FRONTEND_SITE_URL or None,
            "api_host": api_host,
            "site_host": site_host,
            "is_first_party_cookie_architecture": same_site_api,
            "jwt_cookie_name": COOKIE_NAME,
            "jwt_cookie_secure": COOKIE_SECURE,
            "jwt_cookie_samesite": COOKIE_SAMESITE,
            "jwt_cookie_domain": COOKIE_DOMAIN,
            "https_required": True,
            "proxy_set_cookie_rewrite_check": "validar no ingress/cdn: Set-Cookie nÃ£o deve ser reescrito",
            "safari_fallback": "considerar OAuth/PKCE + token de sessÃ£o first-party, sem depender de third-party cookie",
        }
    )

def db_write(query, *args):
    """
    Wrapper para INSERT/UPDATE/DELETE no PostgreSQL via CS50.
    O CS50 tenta ler linhas do resultado, mas essas queries nÃ£o retornam linhas no Postgres.
    Captura o erro e retorna None (a escrita jÃ¡ foi commitada com sucesso).
    """
    try:
        return db.execute(query, *args)
    except Exception as e:
        if "does not return rows" in str(e):
            return None
        raise

def enc(value):
    """Criptografa string (ou None) e devolve string base64."""
    if value is None:
        return None
    s = str(value).strip()
    if s == "":
        return None
    return fernet.encrypt(s.encode("utf-8")).decode("utf-8")

def dec(value):
    """Tenta descriptografar; se nÃ£o for token Fernet vÃ¡lido, retorna como estÃ¡."""
    if value is None:
        return None
    s = str(value)
    if not s.strip():
        return None
    try:
        return fernet.decrypt(s.encode("utf-8")).decode("utf-8")
    except Exception:
        return s

def api_ok(**extra):
    return jsonify({"success": True, **extra})

def api_error(message: str, status: int = 400):
    return jsonify({"success": False, "error": message}), status

class ApiTxError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.message = message
        self.status = status

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


def normalize_account_type(raw_type):
    value = str(raw_type or "").strip().lower()
    if value in ("empresa", "company"):
        return "company"
    return "professional"


def recalculate_user_profile_rating(evaluated_id):
    rows = db.execute(
        """
        SELECT COALESCE(AVG(rating), 0) AS avg_rating,
               COUNT(*) AS reviews_count
        FROM user_evaluations
        WHERE evaluated_id = %s
        """,
        evaluated_id,
    )
    row = rows[0] if rows else {"avg_rating": 0, "reviews_count": 0}
    avg_rating = float(row.get("avg_rating") or 0)
    reviews_count = int(row.get("reviews_count") or 0)

    db_write(
        """
        INSERT INTO user_profiles (user_id, rating, reviews_count, updated_at)
        VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
        ON CONFLICT(user_id) DO UPDATE SET
            rating = excluded.rating,
            reviews_count = excluded.reviews_count,
            updated_at = CURRENT_TIMESTAMP
        """,
        evaluated_id,
        avg_rating,
        reviews_count,
    )
    return {"averageRating": avg_rating, "reviewsCount": reviews_count}


CONFLICT_CANCELLATION_STATUSES = {"pendente", "pending"}
ACCEPTED_APPLICATION_STATUSES = {"aprovado", "accepted"}
CLOSED_APPLICATION_STATUSES = {"cancelado", "cancelled", "canceled", "finalizado", "finished"}


def parse_job_date(value):
    text = str(value or "").strip()
    if not text:
        return None
    try:
        return datetime.strptime(text[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def parse_job_time(value):
    text = str(value or "").strip()
    if not text:
        return None
    for fmt in ("%H:%M", "%H:%M:%S"):
        try:
            return datetime.strptime(text, fmt).time()
        except ValueError:
            continue
    return None


def extract_hours_decimal(value):
    text = str(value or "").strip().lower().replace(",", ".")
    if not text:
        return None
    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        return None
    try:
        return float(match.group(1))
    except ValueError:
        return None


def build_job_time_window(job_row):
    job_date = parse_job_date(job_row.get("start_date"))
    start_time = parse_job_time(job_row.get("start_time"))
    duration_hours = extract_hours_decimal(job_row.get("work_hours"))
    if not job_date or not start_time or not duration_hours or duration_hours <= 0:
        return None
    start_dt = datetime.combine(job_date, start_time)
    end_dt = start_dt + timedelta(hours=duration_hours)
    return start_dt, end_dt


def jobs_have_conflicting_schedule(job_a, job_b):
    window_a = build_job_time_window(job_a)
    window_b = build_job_time_window(job_b)
    if not window_a or not window_b:
        return False
    start_a, end_a = window_a
    start_b, end_b = window_b
    return start_a < end_b and start_b < end_a


def cancel_conflicting_pending_applications(candidate_id, accepted_application_id, accepted_job_row):
    other_rows = db.execute(
        """
        SELECT ja.id, ja.job_id, ja.status, j.title, j.start_date, j.start_time, j.work_hours
        FROM job_applications ja
        JOIN jobs j ON j.id = ja.job_id
        WHERE ja.candidate_id = %s
          AND ja.id <> %s
        """,
        candidate_id,
        accepted_application_id,
    )

    cancelled = []
    for row in other_rows:
        status_value = str(row.get("status") or "").strip().lower()
        if status_value not in CONFLICT_CANCELLATION_STATUSES:
            continue
        if not jobs_have_conflicting_schedule(accepted_job_row, row):
            continue

        db_write("UPDATE job_applications SET status = 'cancelado' WHERE id = %s", row["id"])
        cancelled.append(dict(row))

    return cancelled

# ---- TABELAS AGORA GERENCIADAS PELO SCHEMA_POSTGRES.SQL ----
# Garante que job_sessions existe (idempotente)
try:
    db_write("""
        CREATE TABLE IF NOT EXISTS job_sessions (
            id TEXT PRIMARY KEY,
            application_id TEXT NOT NULL,
            candidate_id INTEGER NOT NULL,
            company_id INTEGER NOT NULL,
            job_id TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'accepted',
            checkin_storage_path TEXT,
            checkin_mime_type TEXT,
            checkin_file_size INTEGER,
            checkout_storage_path TEXT,
            checkout_mime_type TEXT,
            checkout_file_size INTEGER,
            checkin_at TIMESTAMP,
            checkout_at TIMESTAMP,
            validated_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
except Exception as _e:
    print(f"WARN: job_sessions table creation: {_e}")


def ensure_postgres_runtime_schema():
    statements = [
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS image_job TEXT[]",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION NOT NULL DEFAULT 0",
        "ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS reviews_count INTEGER NOT NULL DEFAULT 0",
        "CREATE INDEX IF NOT EXISTS idx_user_evaluations_evaluator_id ON user_evaluations(evaluator_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_evaluations_job_id ON user_evaluations(job_id)",
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_user_evaluations_unique_review ON user_evaluations(evaluator_id, evaluated_id, job_id)",
    ]
    for statement in statements:
        try:
            db_write(statement)
        except Exception as schema_err:
            print(f"WARN: schema update failed for {statement}: {schema_err}")


ensure_postgres_runtime_schema()

# ---- Supabase Storage helpers ----
def upload_session_photo(file_bytes: bytes, path: str, content_type: str) -> str:
    """Uploads to Supabase Storage and returns the storage path."""
    if not supabase:
        raise RuntimeError("Supabase client not configured")
    supabase.storage.from_(SUPABASE_BUCKET).upload(
        path=path,
        file=file_bytes,
        file_options={"content-type": content_type, "upsert": "true"}
    )
    return path

def get_signed_url(path: str, expires_in: int = 3600) -> str | None:
    """Returns a temporary signed URL for a private bucket object."""
    if not supabase or not path:
        return None
    try:
        res = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(path, expires_in)
        return res.get("signedURL") or res.get("signedUrl")
    except Exception as e:
        print(f"WARN signed URL: {e}")
        return None

def build_session_photo_path(company_id, job_id, application_id, phase: str, mime: str) -> str:
    ext = "jpg" if "jpeg" in mime else mime.split("/")[-1]
    ts = int(datetime.now(timezone.utc).timestamp())
    return f"job-sessions/{company_id}/{job_id}/{application_id}/{phase}-{ts}.{ext}"

def process_profile_image(b64_string, user_id):
    if not b64_string or not isinstance(b64_string, str):
        return None
    if not b64_string.startswith("data:image"):
        # Se for signed URL ou vazio
        if b64_string.startswith("http") and ("sign/" in b64_string and SUPABASE_BUCKET in b64_string):
            try:
                from urllib.parse import urlparse
                parsed = urlparse(b64_string)
                path_part = parsed.path.split("/object/sign/")[1]
                path = path_part.split("%s")[0]
                return path
            except Exception:
                pass
        return b64_string
    try:
        header, encoded = b64_string.split(",", 1)
        import base64
        file_data = base64.b64decode(encoded)
        mime_type = header.split(":")[1].split(";")[0]
        ext = "jpg" if "jpeg" in mime_type else mime_type.split("/")[-1]
        from datetime import datetime, timezone
        ts = int(datetime.now(timezone.utc).timestamp())
        path = f"profile_photos/{user_id}/avatar_{ts}.{ext}"
        if supabase:
            supabase.storage.from_(SUPABASE_BUCKET).upload(
                path, 
                file_data, 
                file_options={"content-type": mime_type}
            )
            return path
        else:
            print("WARN: Supabase not configured")
    except Exception as e:
        print(f"Error uploading profile photo base64: {e}")
    return b64_string

def process_portfolio_images(image_list, user_id):
    if not image_list or not isinstance(image_list, list):
        return []
    processed_paths = []
    for i, item in enumerate(image_list):
        if not item or not isinstance(item, str):
            continue
        if len(processed_paths) >= 6:
            break
        
        # Case 1: Base64 string -> upload
        if item.startswith("data:image"):
            try:
                header, encoded = item.split(",", 1)
                import base64
                file_data = base64.b64decode(encoded)
                mime_type = header.split(":")[1].split(";")[0]
                ext = "jpg" if "jpeg" in mime_type else mime_type.split("/")[-1]
                ts = int(datetime.now(timezone.utc).timestamp())
                path = f"portfolio/{user_id}/img_{i}_{ts}.{ext}"
                if supabase:
                    supabase.storage.from_(SUPABASE_BUCKET).upload(
                        path, 
                        file_data, 
                        file_options={"content-type": mime_type}
                    )
                    processed_paths.append(path)
                else:
                    print("WARN: Supabase not configured, cannot save base64 photo.")
            except Exception as e:
                print(f"Error uploading portfolio base64: {e}")
                
        # Case 2: Signed URL -> extract path
        elif item.startswith("http") and ("sign/" in item and SUPABASE_BUCKET in item):
            try:
                path_part = item.split(f"sign/{SUPABASE_BUCKET}/")[1]
                path = path_part.split("%s")[0]
                processed_paths.append(path)
            except Exception as e:
                pass
                
        # Case 3: Just the path
        elif not item.startswith("http") and not item.startswith("data:"):
            processed_paths.append(item)
            
    return processed_paths

@app.route("/api/jobs", methods=["POST"])
def create_job():
    data = request.json or {}
    user_id = current_user_id()

    import uuid, json
    job_id = data.get("id") or str(uuid.uuid4())

    # Nome de exibiÃ§Ã£o (opcional, sÃ³ para mostrar no app)
    profile_rows = db.execute("SELECT company_name, full_name FROM user_profiles WHERE user_id = %s", user_id)
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

    db_write("""
        INSERT INTO jobs (
            id, title, description, category, payment_type, rate,
            location, area, address, work_hours,
            posted_by, posted_by_user_id, posted_at,
            period, duration, is_urgent,
            company_only, includes_food,
            lat, lng, company_info_json,
            start_date, start_time
        ) VALUES (
            %s, %s, %s, %s, %s, %s,
            %s, %s, %s, %s,
            %s, %s, CURRENT_TIMESTAMP,
            %s, %s, %s,
            %s, %s,
            %s, %s, %s,
            %s, %s
        ) RETURNING id
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
        True if data.get("isUrgent") else False,
        True if data.get("companyOnly") else False,
        True if data.get("includesFood") else False,
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

    identity = current_user_id()
    user_type = "professional"

    if identity:
        # Verifica se o usuario eh empresa ou profissional
        user_rows = db.execute("SELECT type FROM usuarios WHERE id = %s", identity)
        if user_rows and user_rows[0].get("type") in ["empresa", "company"]:
            user_type = "company"

    # Se for empresa, fetch vagas dela. Se profissional, fetch o feed normal (escondendo jÃ¡ aplicadas se logado)
    user_id = identity if user_type == "company" else None
    candidate_id = identity if user_type == "professional" else None

    try:
        if user_id:
            rows = db.execute("""
                SELECT j.*, up.phone as up_phone, up.imagem_profile as up_imagem_profile 
                FROM jobs j 
                LEFT JOIN user_profiles up ON j.posted_by_user_id = up.user_id 
                WHERE j.posted_by_user_id = %s 
                ORDER BY j.created_at DESC
            """, user_id)

        elif candidate_id:
            rows = db.execute("""
                SELECT j.*, up.phone as up_phone, up.imagem_profile as up_imagem_profile,
                       CASE WHEN ja.id IS NOT NULL THEN 1 ELSE 0 END AS already_applied,
                       CASE WHEN EXISTS (
                           SELECT 1
                           FROM job_applications ja_locked
                           WHERE ja_locked.job_id = j.id
                             AND LOWER(COALESCE(ja_locked.status, '')) IN ('aprovado', 'accepted')
                       ) THEN 1 ELSE 0 END AS has_approved_candidate
                FROM jobs j
                LEFT JOIN job_applications ja
                    ON ja.job_id = j.id
                   AND ja.candidate_id = %s
                LEFT JOIN user_profiles up ON j.posted_by_user_id = up.user_id
                ORDER BY j.created_at DESC
            """, candidate_id)

        else:
            rows = db.execute("""
                SELECT j.*, up.phone as up_phone, up.imagem_profile as up_imagem_profile 
                FROM jobs j 
                LEFT JOIN user_profiles up ON j.posted_by_user_id = up.user_id 
                ORDER BY j.created_at DESC
            """)

        import json
        results = []

        for r in rows:
            item = dict(r)

            if candidate_id:
                job_start_date = parse_job_date(item.get("start_date"))
                if job_start_date and job_start_date < datetime.now().date():
                    continue
                if bool(item.pop("has_approved_candidate", 0)):
                    continue
            up_phone = item.pop("up_phone", None)
            up_imagem_profile = item.pop("up_imagem_profile", None)
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
            if up_imagem_profile:
                item["companyInfo"]["imagem_profile"] = up_imagem_profile

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
            item["alreadyApplied"] = bool(item.pop("already_applied", 0))

            item.pop("company_info_json", None)
            results.append(item)

        return jsonify(results)

    except Exception as e:
        print(f"Erro ao processar jobs: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/jobs/<job_id>", methods=["PUT"])
def update_job(job_id):
    data = request.json or {}
    user_id = current_user_id()

    # 1. Verificar se a vaga existe e pertence Ã  empresa
    row = db.execute("SELECT id, posted_by_user_id FROM jobs WHERE id = %s", job_id)
    if not row:
        return api_error("Vaga nÃ£o encontrada", 404)
    
    job = row[0]
    if str(job["posted_by_user_id"]) != str(user_id):
        return api_error("VocÃª nÃ£o tem permissÃ£o para editar esta vaga", 403)

    # 2. Atualizar dados
    import json
    company_info = data.get("companyInfo") or {}
    company_info_json = json.dumps(company_info, ensure_ascii=False)

    try:
        db_write("""
            UPDATE jobs
            SET title = %s,
                description = %s,
                category = %s,
                payment_type = %s,
                rate = %s,
                location = %s,
                area = %s,
                address = %s,
                work_hours = %s,
                period = %s,
                duration = %s,
                is_urgent = %s,
                company_only = %s,
                includes_food = %s,
                lat = %s,
                lng = %s,
                company_info_json = %s,
                start_date = %s,
                start_time = %s
            WHERE id = %s
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
    user_id = current_user_id()

    # 1. Verificar se a vaga existe e pertence Ã  empresa
    row = db.execute("SELECT id, posted_by_user_id FROM jobs WHERE id = %s", job_id)
    if not row:
        return api_error("Vaga nÃ£o encontrada", 404)
    
    job = row[0]
    if str(job["posted_by_user_id"]) != str(user_id):
        return api_error("VocÃª nÃ£o tem permissÃ£o para excluir esta vaga", 403)

    try:
        # Opcional: Remover candidaturas antes%s Ou deixar constraints tratarem (se houver CASCADE)%s
        # Meu schema tem FOREIGN KEY, mas nÃ£o vi ON DELETE CASCADE explÃ­cito no CREATE TABLE do step 7.
        # Melhor excluir candidaturas primeiro para evitar erro de FK, ou adicionar CASCADE.
        # Verificando schema no step 7: FOREIGN KEY(job_id) REFERENCES jobs(id). Sem CASCADE.
        # EntÃ£o preciso deletar applications primeiro.
        
        db_write("DELETE FROM job_applications WHERE job_id = %s", job_id)
        db_write("DELETE FROM jobs WHERE id = %s", job_id)
        
        return api_ok(message="Vaga excluÃ­da com sucesso")
    except Exception as e:
        print(f"Erro ao excluir vaga: {e}")
        return api_error("Erro ao excluir vaga", 500)

@app.route("/api/my/applications", methods=["GET"])
def get_my_applications():
    user_id = current_user_id()

    try:
        rows = db.execute("""
            SELECT
                ja.id AS application_id,
                ja.status AS application_status,
                ja.created_at AS applied_at,
                j.*,
                up.phone AS up_phone,
                up.imagem_profile AS up_imagem_profile
            FROM job_applications ja
            JOIN jobs j ON j.id = ja.job_id
            LEFT JOIN user_profiles up ON j.posted_by_user_id = up.user_id
            WHERE ja.candidate_id = %s
            ORDER BY ja.created_at DESC
        """, user_id)

        import json
        applications = []

        for r in rows:
            item = dict(r)
            up_phone = item.pop("up_phone", None)
            up_imagem_profile = item.pop("up_imagem_profile", None)
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
            if up_imagem_profile:
                item["companyInfo"]["imagem_profile"] = up_imagem_profile

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
        return jsonify({"success": False, "error": "CNPJ invÃ¡lido"}), 400

    try:
        r = requests.get(f"https://brasilapi.com.br/api/cnpj/v1/{cnpj}", timeout=10)
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Erro de rede ao consultar BrasilAPI ({cnpj}): {e}")
        return jsonify({"success": False, "error": "ServiÃ§o de validaÃ§Ã£o de CNPJ indisponÃ­vel. Tente novamente mais tarde."}), 503

    if r.status_code != 200:
        return jsonify({"success": False, "error": "NÃ£o foi possÃ­vel consultar o CNPJ"}), 400

    data = r.json()
    # vocÃª mapeia o que quer mandar pro front:
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
    # 6 dÃ­gitos com zero Ã  esquerda, seguro (secrets)
    return f"{secrets.randbelow(1_000_000):06d}"

def get_verification_serializer():
    secret = app.config.get("JWT_SECRET_KEY") or "dev-secret"
    return URLSafeTimedSerializer(secret)

def sign_user_id(user_id):
    return get_verification_serializer().dumps(user_id)

def decode_user_id(token):
    try:
        return get_verification_serializer().loads(token, max_age=86400) # 24 horas
    except:
        return None

@app.post("/api/auth/request-email-verification")
@jwt_required(optional=True)
def request_email_verification():
    data = request.json or {}
    user_id_raw = data.get("user_id")
    
    # 1. Se logado tira do JWT, senao valida token
    user_id = current_user_id()
    if not user_id and user_id_raw:
        user_id = decode_user_id(user_id_raw)
        
    if not user_id:
        return jsonify({"success": False, "error": "NÃ£o autorizado ou token expirado"}), 401

    try:
        row = db.execute("SELECT id, email, email_verified, email_verification_sent_at FROM usuarios WHERE id = %s", user_id)
        if not row:
            return jsonify({"success": False, "error": "UsuÃ¡rio nÃ£o encontrado"}), 404

        u = row[0]
        sent_at = u.get("email_verification_sent_at")
        if sent_at:
            last = datetime.fromisoformat(sent_at)
            # ComparaÃ§Ã£o segura fazendo ambos naive ou aware
            now_utc = datetime.now(timezone.utc)
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
                
            if (now_utc - last).total_seconds() < EMAIL_RESEND_COOLDOWN_SEC:
                return jsonify({"success": False, "error": "Aguarde um pouco para reenviar."}), 429
        
        if u.get("email_verified"):
            return jsonify({"success": True, "already_verified": True})
            
        code = gen_code()
        code_hash = hash_code(user_id, code)
        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        expires = (now_naive + timedelta(minutes=EMAIL_CODE_TTL_MIN)).isoformat(timespec="seconds")

        db_write("""
            UPDATE usuarios
            SET email_verification_code_hash = %s,
                email_verification_expires_at = %s,
                email_verification_sent_at = %s,
                email_verification_attempts = 0
            WHERE id = %s
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
@jwt_required(optional=True)
def verify_email():
    data = request.json or {}
    user_id_raw = data.get("user_id")
    code = re.sub(r"\D", "", (data.get("code") or ""))
    
    user_id = current_user_id()
    if not user_id and user_id_raw:
        user_id = decode_user_id(user_id_raw)
        
    if not user_id or len(code) != 6:
        return jsonify({"success": False, "error": "SessÃ£o invÃ¡lida ou dados incorretos"}), 400

    row = db.execute("""
        SELECT email_verified, email_verification_code_hash, email_verification_expires_at,
               COALESCE(email_verification_attempts, 0) as attempts
          FROM usuarios
         WHERE id = %s
    """, user_id)

    if not row:
        return jsonify({"success": False, "error": "UsuÃ¡rio nÃ£o encontrado"}), 404

    u = row[0]
    if u["email_verified"]:
        return jsonify({"success": True, "already_verified": True})

    if int(u["attempts"]) >= 5:
        return jsonify({"success": False, "error": "Muitas tentativas. Reenvie o cÃ³digo."}), 429

    expires_at = u["email_verification_expires_at"]
    if not expires_at:
        return jsonify({"success": False, "error": "CÃ³digo expirado. Reenvie."}), 400

    expires_dt = datetime.fromisoformat(expires_at)
    now = datetime.utcnow()
    
    # Tornar ambos ingÃªnuos (naive) para comparaÃ§Ã£o correta
    expires_dt = expires_dt.replace(tzinfo=None)
    now = now.replace(tzinfo=None)
    
    if expires_dt < now:
        return jsonify({"success": False, "error": "CÃ³digo expirado. Reenvie."}), 400

    expected = u["email_verification_code_hash"]
    if not expected:
        return jsonify({"success": False, "error": "Sem cÃ³digo ativo. Reenvie."}), 400

    got = hash_code(user_id, code)
    if not hmac.compare_digest(got, expected):
        db_write("""
            UPDATE usuarios
               SET email_verification_attempts = COALESCE(email_verification_attempts,0) + 1
             WHERE id = %s
        """, user_id)
        return jsonify({"success": False, "error": "CÃ³digo incorreto"}), 400

    db_write("""
        UPDATE usuarios
           SET email_verified = TRUE,
               email_verified_at = %s,
               email_verification_code_hash = NULL,
               email_verification_expires_at = NULL,
               email_verification_attempts = 0
         WHERE id = %s
    """, now.isoformat(timespec="seconds"), user_id)

    return jsonify({"success": True})

def send_verification_email_brevo(to_email: str, code: str, ttl_min: int):
    if not BREVO_API_KEY:
        print(f"\n=========================================\n[MOCK EMAIL] Para: {to_email}\n[MOCK EMAIL] CÃ³digo de VerificaÃ§Ã£o: {code}\n=========================================\n")
        return

    payload = {
        "sender": {"name": EMAIL_FROM_NAME, "email": EMAIL_FROM},
        "to": [{"email": to_email}],
        "subject": "Seu cÃ³digo de verificaÃ§Ã£o",
        "htmlContent": f"""
          <div style="font-family:Arial,sans-serif">
            <h2>VerificaÃ§Ã£o de e-mail</h2>
            <p>Seu cÃ³digo Ã©:</p>
            <div style="font-size:28px;font-weight:700;letter-spacing:4px">{code}</div>
            <p>Expira em {ttl_min} minutos.</p>
          </div>
        """,
    }

    # Sandbox: nÃ£o entrega de verdade
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


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# PASSWORD RESET (Esqueci minha senha)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

PASSWORD_RESET_TTL_MIN = 30
PASSWORD_RESET_COOLDOWN_SEC = 60


def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@app.post("/api/auth/forgot-password")
def forgot_password():
    """
    Sempre retorna 200 â€” nunca revela se o e-mail existe ou se hÃ¡ cooldown.
    """
    GENERIC_OK = jsonify({"success": True})

    data = request.json or {}
    email = norm_email(data.get("email"))
    if not email:
        return GENERIC_OK  # Sem e-mail â†’ 200 silencioso

    try:
        rows = db.execute(
            "SELECT id, email, password_reset_requested_at FROM usuarios WHERE email = %s",
            email,
        )
        if not rows:
            return GENERIC_OK  # E-mail nÃ£o cadastrado â†’ 200 silencioso

        user = rows[0]
        user_id = user["id"]

        # Cooldown silencioso
        requested_at = user.get("password_reset_requested_at")
        if requested_at:
            last = datetime.fromisoformat(str(requested_at))
            now_utc = datetime.now(timezone.utc)
            if last.tzinfo is None:
                last = last.replace(tzinfo=timezone.utc)
            if (now_utc - last).total_seconds() < PASSWORD_RESET_COOLDOWN_SEC:
                return GENERIC_OK  # Dentro do cooldown â†’ 200 silencioso

        # Gerar token
        raw_token = secrets.token_urlsafe(32)
        token_hash = _hash_reset_token(raw_token)
        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        expires = (now_naive + timedelta(minutes=PASSWORD_RESET_TTL_MIN)).isoformat(timespec="seconds")

        db_write("""
            UPDATE usuarios
               SET password_reset_token_hash = %s,
                   password_reset_expires_at = %s,
                   password_reset_requested_at = %s,
                   password_reset_used_at = NULL
             WHERE id = %s
        """, token_hash, expires, now_naive.isoformat(timespec="seconds"), user_id)

        # Montar link
        base_url = FRONTEND_SITE_URL or ALLOWED_ORIGIN or "http://localhost:3000"
        reset_link = f"{base_url}/redefinir-senha%stoken={raw_token}"

        try:
            send_password_reset_email_brevo(user["email"], reset_link)
        except Exception:
            app.logger.exception("Falha ao enviar e-mail de reset")
            # Continua retornando 200

    except Exception:
        app.logger.exception("Erro em forgot_password")

    return GENERIC_OK


@app.post("/api/auth/reset-password")
def reset_password():
    data = request.json or {}
    raw_token = (data.get("token") or "").strip()
    new_password = data.get("password") or ""

    if not raw_token:
        return api_error("Token Ã© obrigatÃ³rio", 400)

    if len(new_password) < 8:
        return api_error("A senha deve ter no mÃ­nimo 8 caracteres", 400)

    token_hash = _hash_reset_token(raw_token)

    rows = db.execute("""
        SELECT id, password_reset_expires_at, password_reset_used_at
          FROM usuarios
         WHERE password_reset_token_hash = %s
    """, token_hash)

    if not rows:
        return api_error("Token invÃ¡lido ou expirado", 400)

    user = rows[0]

    # JÃ¡ usado?
    if user.get("password_reset_used_at"):
        return api_error("Token invÃ¡lido ou expirado", 400)

    # Expirado?
    expires_at = user.get("password_reset_expires_at")
    if not expires_at:
        return api_error("Token invÃ¡lido ou expirado", 400)

    expires_dt = datetime.fromisoformat(str(expires_at)).replace(tzinfo=None)
    now = datetime.utcnow()
    if expires_dt < now:
        return api_error("Token invÃ¡lido ou expirado", 400)

    # Trocar senha + invalidar sessÃµes
    new_hash = generate_password_hash(new_password)
    now_iso = now.isoformat(timespec="seconds")

    db_write("""
        UPDATE usuarios
           SET senha_hash = %s,
               password_changed_at = %s,
               password_reset_used_at = %s,
               password_reset_token_hash = NULL,
               password_reset_expires_at = NULL
         WHERE id = %s
    """, new_hash, now_iso, now_iso, user["id"])

    return api_ok(message="Senha redefinida com sucesso")


def send_password_reset_email_brevo(to_email: str, reset_link: str):
    if not BREVO_API_KEY:
        print(f"\n=========================================\n"
              f"[MOCK EMAIL] Para: {to_email}\n"
              f"[MOCK EMAIL] Link de redefiniÃ§Ã£o: {reset_link}\n"
              f"=========================================\n")
        return

    payload = {
        "sender": {"name": EMAIL_FROM_NAME, "email": EMAIL_FROM},
        "to": [{"email": to_email}],
        "subject": "RedefiniÃ§Ã£o de senha â€” Pega Trampo",
        "htmlContent": f"""
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#333">RedefiniÃ§Ã£o de senha</h2>
            <p>VocÃª solicitou a redefiniÃ§Ã£o da sua senha no Pega Trampo.</p>
            <p>Clique no botÃ£o abaixo para criar uma nova senha:</p>
            <div style="text-align:center;margin:24px 0">
              <a href="{reset_link}"
                 style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);color:#fff;text-decoration:none;border-radius:12px;font-weight:bold;font-size:16px">
                Redefinir senha
              </a>
            </div>
            <p style="color:#666;font-size:13px">Este link expira em {PASSWORD_RESET_TTL_MIN} minutos.</p>
            <p style="color:#666;font-size:13px">Se vocÃª nÃ£o solicitou, ignore este e-mail.</p>
          </div>
        """,
    }

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
    user_id = current_user_id()

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
                return api_error("VocÃª precisa ter pelo menos 18 anos de idade.", 400)
        except ValueError:
            return api_error("Formato de data de nascimento invÃ¡lido. Use AAAA-MM-DD.", 400)

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
        row = db.execute("SELECT id, user_id FROM resumes WHERE id = %s", resume_id)
        if row:
             # Ownership check: only the owner can update their resume

             if row[0]["user_id"] != user_id:

                 return api_error("NÃ£o autorizado a editar este currÃ­culo", 403)

             db_write("""
                UPDATE resumes
                SET user_id = %s,
                    personal_info_json = %s,
                    professional_info_json = %s,
                    work_experience_json = %s,
                    education_json = %s,
                    skills_json = %s,
                    availability_json = %s,
                    bio = %s,
                    is_visible = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
            """,
                user_id,
                personal_info, professional_info,
                work_experience, education,
                skills, availability,
                bio, is_visible,
                resume_id
            )
        else:
             db_write("""
                INSERT INTO resumes (
                    id, user_id, 
                    personal_info_json, professional_info_json, 
                    work_experience_json, education_json, 
                    skills_json, availability_json, 
                    bio, is_visible, 
                    created_at, updated_at
                ) VALUES (
                    %s, %s, 
                    %s, %s, 
                    %s, %s, 
                    %s, %s, 
                    %s, %s, 
                    CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                ) RETURNING id
            """, 
                resume_id, user_id,
                personal_info, professional_info,
                work_experience, education,
                skills, availability,
                bio, is_visible
            )

        # ---- Sync phone: resume â†’ profile ----
        try:
            pi_data = data.get("personalInfo") or {}
            resume_phone = pi_data.get("phone")
            if resume_phone and user_id:
                db_write(
                    "UPDATE user_profiles SET phone = %s, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s",
                    enc(resume_phone), user_id
                )
        except Exception as sync_err:
            print(f"Aviso: falha ao sincronizar phone no perfil: {sync_err}")

        # ---- Sync imageJob: resume â†’ profile ----
        try:
            image_job_raw = data.get("imageJob")
            if image_job_raw is not None and user_id:
                final_paths = process_portfolio_images(image_job_raw, user_id)
                def to_pg_text_array(items):
                    if not items:
                        return None
                    safe = [str(x).replace("\\", "\\\\").replace('"', '\\"') for x in items]
                    return "{" + ",".join(f'"{x}"' for x in safe) + "}"
                
                image_job_val = to_pg_text_array(final_paths)
                db_write(
                    "UPDATE user_profiles SET image_job = %s::text[], updated_at = CURRENT_TIMESTAMP WHERE user_id = %s",
                    image_job_val, user_id
                )
        except Exception as sync_err:
            print(f"Aviso: falha ao sincronizar image_job no perfil: {sync_err}")

        saved_resume_rows = db.execute("""
            SELECT r.*, up.phone as up_phone, up.imagem_profile as up_imagem_profile, up.image_job as up_image_job
            FROM resumes r
            LEFT JOIN user_profiles up ON r.user_id = up.user_id
            WHERE r.id = %s
            LIMIT 1
        """, resume_id)

        saved_resume = None
        if saved_resume_rows:
            item = dict(saved_resume_rows[0])
            up_phone = item.pop("up_phone", None)
            up_imagem_profile = item.pop("up_imagem_profile", None)
            up_image_job = item.pop("up_image_job", None)
            
            real_phone = ""
            if up_phone:
                try:
                    real_phone = fernet.decrypt(up_phone.encode()).decode()
                except:
                    real_phone = up_phone

            if up_imagem_profile:
                item["profilePhoto"] = get_signed_url(up_imagem_profile) or up_imagem_profile

            if up_image_job:
                def parse_pg_array(val):
                    if not val: return []
                    if isinstance(val, list): return val
                    s = str(val).strip()
                    if s.startswith('{') and s.endswith('}'):
                        inner = s[1:-1].strip()
                        if not inner: return []
                        import csv
                        return next(csv.reader([inner]))
                    return [s]
                paths = parse_pg_array(up_image_job)
                item["imageJob"] = [get_signed_url(p) or p for p in paths]

            for field, target in [
                ("personal_info_json", "personalInfo"),
                ("professional_info_json", "professionalInfo"),
                ("work_experience_json", "workExperience"),
                ("education_json", "education"),
                ("skills_json", "skills"),
                ("availability_json", "availability")
            ]:
                val = item.pop(field, "[]")
                try:
                    item[target] = json.loads(val) if val else None
                except:
                    item[target] = None

            item["userId"] = item.pop("user_id", None)
            item["createdAt"] = item.pop("created_at", None)
            item["updatedAt"] = item.pop("updated_at", None)
            item["isVisible"] = bool(item.pop("is_visible", 0))

            if not item.get("personalInfo"):
                item["personalInfo"] = {}
            item["personalInfo"]["phone"] = real_phone
            saved_resume = item

        return api_ok(resume_id=resume_id, resume=saved_resume)

    except Exception as e:
        print(f"Erro ao salvar currÃ­culo: {e}")
        return api_error(f"Erro ao salvar currÃ­culo: {str(e)}", 500)


@app.route("/api/resumes/<resume_id>", methods=["DELETE"])
def delete_resume(resume_id):
    user_id = current_user_id()
    try:
        # Ownership check
        row = db.execute("SELECT user_id FROM resumes WHERE id = %s", resume_id)
        if not row:
            return api_error("CurrÃ­culo nÃ£o encontrado", 404)
        if row[0]["user_id"] != user_id:
            return api_error("NÃ£o autorizado a excluir este currÃ­culo", 403)

        db_write("DELETE FROM resumes WHERE id = %s", resume_id)
        return api_ok(message="CurrÃ­culo excluÃ­do")
    except Exception as e:
        print(f"Erro ao excluir currÃ­culo: {e}")
        return api_error(str(e), 500)


@app.route("/api/auth/me", methods=["GET"])
def auth_me():
    print("[ME] cookie keys:", list(request.cookies.keys()))
    try:
        verify_jwt_in_request(optional=True)
    except Exception as e:
        print("[ME] verify error:", repr(e))
    print("[ME] identity:", get_jwt_identity())
    """
    Returns basic session info for session validation.
    - 200 if authenticated
    - 401 if not authenticated
    """
    uid = current_user_id()
    if uid is None:
        return jsonify({"ok": False, "error": "unauthorized"}), 401
    return api_ok(user_id=uid)


@app.route("/api/resumes", methods=["GET"])
def get_resumes():
    print("get_resumes")
    user_id = current_user_id()
    print(user_id)
    # Verifica o tipo do usuÃ¡rio para decidir o que retornar
    user_rows = db.execute("SELECT type FROM usuarios WHERE id = %s", user_id)
    user_type = user_rows[0]["type"] if user_rows else "professional"
    requested_ids = [part.strip() for part in (request.args.get("user_ids") or "").split(",") if part.strip()]
    
    if user_type in ("empresa", "company"):
        # Empresa vÃª TODOS os currÃ­culos visÃ­veis dos profissionais
        if requested_ids:
            placeholders = ", ".join(["%s"] * len(requested_ids))
            rows = db.execute(f"""
                SELECT r.*, up.phone as up_phone, up.imagem_profile as up_imagem_profile, up.image_job as up_image_job
                FROM resumes r
                LEFT JOIN user_profiles up ON r.user_id = up.user_id
                WHERE r.is_visible = true
                  AND CAST(r.user_id AS TEXT) IN ({placeholders})
            """, *requested_ids)
        else:
            rows = db.execute("""
                SELECT r.*, up.phone as up_phone, up.imagem_profile as up_imagem_profile, up.image_job as up_image_job
                FROM resumes r 
                LEFT JOIN user_profiles up ON r.user_id = up.user_id
                WHERE r.is_visible = true
            """)
    else:
        # Profissional vÃª apenas o prÃ³prio currÃ­culo
        rows = db.execute("""
            SELECT r.*, up.phone as up_phone, up.imagem_profile as up_imagem_profile, up.image_job as up_image_job
            FROM resumes r 
            LEFT JOIN user_profiles up ON r.user_id = up.user_id
            WHERE r.user_id = %s
        """, user_id)

    import json
    results = []
    
    def parse_pg_array(val):
        if not val:
            return []
        if isinstance(val, list):
            return val
        s = str(val).strip()
        if s.startswith('{') and s.endswith('}'):
            inner = s[1:-1].strip()
            if not inner:
                return []
            import csv
            return next(csv.reader([inner]))
        return [s]

    for r in rows:
        item = dict(r)
        
        up_phone = item.pop("up_phone", None)
        up_imagem_profile = item.pop("up_imagem_profile", None)
        up_image_job = item.pop("up_image_job", None)
        real_phone = ""
        if up_phone:
            try: real_phone = fernet.decrypt(up_phone.encode()).decode()
            except: real_phone = up_phone

        if up_imagem_profile:
            item["profilePhoto"] = get_signed_url(up_imagem_profile) or up_imagem_profile
            
        if up_image_job:
            paths = parse_pg_array(up_image_job)
            item["imageJob"] = [get_signed_url(p) or p for p in paths]

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
    tx_started = False

    try:
        # ====== USUÃRIO (admin da empresa) ======
        username = norm_username(data.get("username"))
        password = data.get("password") or ""
        user_email = norm_email(data.get("email"))

        # fallback: company_email
        company_email = norm_email(data.get("company_email"))
        if not user_email:
            user_email = company_email

        user_type = "empresa"
        
        # Tenta usar JWT se o usuÃ¡rio jÃ¡ estÃ¡ logado (ediÃ§Ã£o de perfil)
        user_id = None
        if not JWT_ENABLED:
            user_id = DEV_USER_ID
        else:
            try:
                verify_jwt_in_request()
                user_id = current_user_id()
            except:
                pass  # Sem JWT = cadastro novo (vai criar usuÃ¡rio abaixo)

        # ====== cria usuÃ¡rio se nÃ£o veio user_id ======
        if not user_id:
            if not username:
                return api_error("username Ã© obrigatÃ³rio", 400)
            if len(username) < 3 or re.search(r"\s", username):
                return api_error("username invÃ¡lido (mÃ­n. 3 caracteres e sem espaÃ§os)", 400)

            if not password:
                return api_error("password Ã© obrigatÃ³rio", 400)
            if len(password) < 8:
                return api_error("password invÃ¡lido (mÃ­n. 8 caracteres)", 400)

            if not user_email:
                return api_error("email Ã© obrigatÃ³rio", 400)

            # checagem simples de duplicidade (ideal: UNIQUE no banco)
            existing_users = db.execute(
                "SELECT id, email_verified FROM usuarios WHERE username = %s OR email = %s",
                username, user_email
            )
            if existing_users:
                # Se hÃ¡ algum jÃ¡ verificado, bloqueia
                verified = [u for u in existing_users if u.get("email_verified")]
                if verified:
                    return api_error("username ou email jÃ¡ cadastrado", 409)
                else:
                    # Todos sÃ£o nÃ£o-verificados (abandonados). Limpa para recadastro:
                    for u in existing_users:
                        uid = u["id"]
                        db_write("DELETE FROM user_profiles WHERE user_id = %s", uid)
                        db_write("DELETE FROM resumes WHERE user_id = %s", uid)
                        db_write("DELETE FROM usuarios WHERE id = %s", uid)

            senha_hash = generate_password_hash(password)
            db.execute("BEGIN")
            tx_started = True

            db_write(
                """
                INSERT INTO usuarios (username, senha_hash, email, type, created_at, updated_at)
                VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                RETURNING id
                """,
                username, senha_hash, user_email, user_type
            )

            row = db.execute("SELECT id FROM usuarios WHERE username = %s LIMIT 1", username)
            if not row:
                raise ApiTxError("Falha ao criar usuario", 500)

            user_id = row[0]["id"]

        # ====== Validation Age ======
        birth_date_str = data.get("birthDate")
        if birth_date_str:
            try:
                bdate = datetime.strptime(birth_date_str, "%Y-%m-%d")
                today_date = datetime.now()
                age = today_date.year - bdate.year - ((today_date.month, today_date.day) < (bdate.month, bdate.day))
                if age < 18:
                    raise ApiTxError("VocÃª precisa ter pelo menos 18 anos de idade.", 400)
            except ValueError:
                raise ApiTxError("Formato de data de nascimento invÃ¡lido. Use AAAA-MM-DD.", 400)

        # ====== PERFIL (seu cÃ³digo, padronizado) ======
        def to_pg_text_array(items):
            if not items:
                return None
            safe = [str(x).replace("\\", "\\\\").replace('"', '\\"') for x in items]
            return "{" + ",".join(f'"{x}"' for x in safe) + "}"

        image_job_raw = data.get("image_job")
        final_paths = process_portfolio_images(image_job_raw, user_id) if image_job_raw else []
        image_job_val = to_pg_text_array(final_paths) if final_paths else None

        payload = {
            "cnpj": enc(cnpj_digits(data.get("cnpj"))),  # <- salva sÃ³ dÃ­gitos (sem mudar front)
            "company_name": enc(data.get("company_name")),
            "company_email": company_email,  # sem criptografia, como vocÃª queria
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
            "imagem_profile": process_profile_image(data.get("imagem_profile"), user_id),
            "image_job": image_job_val,
        }

        # normaliza number
        try:
            if payload["number"] in ("", None):
                payload["number"] = None
            elif isinstance(payload["number"], str):
                payload["number"] = int(payload["number"])
        except ValueError:
            raise ApiTxError("number precisa ser inteiro", 400)

        if not tx_started:
            db.execute("BEGIN")
            tx_started = True

        db_write(
            """
            INSERT INTO user_profiles (
                user_id,
                cnpj, company_name, company_email, business_type, company_description,
                full_name, cpf, phone,
                address, number, complement, neighborhood, city, state, cep, lat, lng, birth_date, imagem_profile, image_job,
                updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::text[],
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
                image_job = excluded.image_job,
                updated_at = CURRENT_TIMESTAMP
            RETURNING id;
            """,
            user_id,
            payload["cnpj"], payload["company_name"], payload["company_email"], payload["business_type"], payload["company_description"],
            payload["full_name"], payload["cpf"], payload["phone"],
            payload["address"], payload["number"], payload["complement"], payload["neighborhood"], payload["city"], payload["state"], payload["cep"], payload["lat"], payload["lng"], payload["birth_date"], payload["imagem_profile"], payload["image_job"]
        )

        # ---- Sync phone: profile â†’ resume ----
        raw_phone = data.get("phone")
        if raw_phone and user_id:
            import json as _json
            resume_rows = db.execute("SELECT id, personal_info_json FROM resumes WHERE user_id = %s", user_id)
            for rr in resume_rows:
                try:
                    pi = _json.loads(rr["personal_info_json"]) if rr.get("personal_info_json") else {}
                    pi["phone"] = raw_phone
                    db_write("UPDATE resumes SET personal_info_json = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                               _json.dumps(pi, ensure_ascii=False), rr["id"])
                except Exception as sync_err:
                    raise ApiTxError(f"Falha ao sincronizar phone no curriculo: {sync_err}", 500)

        db.execute("COMMIT")
        tx_started = False
        return api_ok(user_id=sign_user_id(user_id))


    except ApiTxError as e:
        if tx_started:
            try:
                db.execute("ROLLBACK")
            except Exception:
                pass
        return api_error(e.message, e.status)

    except Exception as e:
        if tx_started:
            try:
                db.execute("ROLLBACK")
            except Exception:
                pass
        # loga no servidor, mas nÃ£o vaza detalhes pro cliente
        # (se quiser, aqui vocÃª faz print/ logger.exception)
        print(f"Erro interno no save_user_profile: {e}")
        return api_error("Erro interno ao salvar cadastro", 500)


@app.route("/")
def connect():
    return "Conectado"


@app.route("/api/register", methods=["POST"])
def register_user():
    data = request.json or {}
    tx_started = False

    try:
        import json as _json

        def parse_categories(d):
            raw = (
                d.get("categories")
                or d.get("worker_category")
                or d.get("workerCategory")
                or d.get("category")
            )

            if raw is None:
                return []

            # jÃ¡ Ã© lista
            if isinstance(raw, list):
                items = [str(x).strip() for x in raw]
            else:
                s = str(raw).strip()
                if not s:
                    return []
                # string JSON tipo '["Padeiro","Cozinheiro"]'
                if s.startswith("["):
                    try:
                        arr = _json.loads(s)
                        items = [str(x).strip() for x in arr] if isinstance(arr, list) else [s]
                    except:
                        items = [s]
                else:
                    # "Padeiro|Cozinheiro" ou "Padeiro, Cozinheiro"
                    import re as _re
                    items = [x.strip() for x in _re.split(r"[|,]", s)]

            # remove vazios, remove duplicados preservando ordem e corta em 3
            seen = set()
            out = []
            for it in items:
                if not it:
                    continue
                if it in seen:
                    continue
                seen.add(it)
                out.append(it)
                if len(out) == 3:
                    break
            return out



        def to_pg_text_array(items):
            if not items:
                return None
            safe = [str(x).replace("\\", "\\\\").replace('"', '\\"') for x in items]
            return "{" + ",".join(f'"{x}"' for x in safe) + "}"

        # ====== USUÃRIO ======
        username = norm_username(data.get("username"))
        password = (data.get("password") or "")

        user_email = norm_email(data.get("email"))
        company_email = norm_email(data.get("company_email"))
        if not user_email:
            user_email = company_email

        user_type = (data.get("userType") or data.get("type") or "professional")
        user_type = str(user_type).strip().lower()

        # ====== PERFIL (FUNCIONÃRIO) ======
        full_name = (data.get("full_name") or data.get("name") or "").strip()
        cpf = only_digits(data.get("cpf") or "")
        phone_raw = (data.get("phone") or "").strip()
        categories = parse_categories(data)  # <-- LISTA AQUI
        imagem_profile = data.get("imagem_profile")
        image_job_raw = data.get("image_job")

        # ====== VALIDAÃ‡Ã•ES ======
        if not username:
            return api_error("username Ã© obrigatÃ³rio", 400)
        if len(username) < 3 or re.search(r"\s", username):
            return api_error("username invÃ¡lido (mÃ­n. 3 caracteres e sem espaÃ§os)", 400)

        if not password:
            return api_error("password Ã© obrigatÃ³rio", 400)
        if len(password) < 6:
            return api_error("password invÃ¡lido (mÃ­n. 6 caracteres)", 400)

        if not user_email:
            return api_error("email Ã© obrigatÃ³rio", 400)

        if not full_name:
            return api_error("Nome completo Ã© obrigatÃ³rio", 400)

        if not cpf or len(cpf) != 11:
            return api_error("CPF invÃ¡lido", 400)

        if not categories:
            return api_error("Selecione pelo menos 1 categoria", 400)
        if len(categories) > 3:
            return api_error("Selecione no mÃ¡ximo 3 categorias", 400)

        # ====== DUPLICIDADE ======
        existing_users = db.execute(
            "SELECT id, email_verified FROM usuarios WHERE username = %s OR email = %s",
            username, user_email
        )
        if existing_users:
            verified = [u for u in existing_users if u.get("email_verified")]
            if verified:
                return api_error("username ou email jÃ¡ cadastrado", 409)
            else:
                for u in existing_users:
                    uid = u["id"]
                    db_write("DELETE FROM user_profiles WHERE user_id = %s", uid)
                    db_write("DELETE FROM resumes WHERE user_id = %s", uid)
                    db_write("DELETE FROM usuarios WHERE id = %s", uid)

        # ====== CRIA USUÃRIO ======
        senha_hash = generate_password_hash(password)
        db.execute("BEGIN")
        tx_started = True

        db_write(
            """
            INSERT INTO usuarios (username, senha_hash, email, type, created_at, updated_at)
            VALUES (%s, %s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            """,
            username, senha_hash, user_email, user_type
        )

        row = db.execute("SELECT id FROM usuarios WHERE username = %s LIMIT 1", username)
        if not row:
            raise ApiTxError("Falha ao criar usuario", 500)
        user_id = row[0]["id"]

        # ====== PERFIL ======
        payload = {
            "cnpj": None,
            "company_name": None,
            "company_email": user_email,
            "business_type": None,
            "company_description": None,

            "full_name": enc(full_name),
            "cpf": enc(cpf),
            "phone": enc(phone_raw) if phone_raw else None,

            "address": None,
            "number": None,
            "complement": None,
            "neighborhood": None,
            "city": None,
            "state": None,
            "cep": None,
            "lat": None,
            "lng": None,
            "birth_date": None,

            # com cs50: envia literal de array e faz cast no SQL
            "worker_category": to_pg_text_array(categories) if user_type == "professional" else None,

            "imagem_profile": imagem_profile,
            "image_job": to_pg_text_array(image_job_raw[:6]) if image_job_raw and isinstance(image_job_raw, list) else None,
        }

        # IMPORTANTE: incluir worker_category no INSERT tambÃ©m
        db_write(
            """
            INSERT INTO user_profiles (
                user_id,
                cnpj, company_name, company_email, business_type, company_description,
                full_name, cpf, phone,
                address, number, complement, neighborhood, city, state, cep, lat, lng, birth_date,
                worker_category,
                imagem_profile,
                image_job,
                updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s,
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                %s::text[],
                %s,
                %s::text[],
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
                worker_category = excluded.worker_category,
                imagem_profile = excluded.imagem_profile,
                image_job = excluded.image_job,
                updated_at = CURRENT_TIMESTAMP
            """,
            user_id,
            payload["cnpj"], payload["company_name"], payload["company_email"], payload["business_type"], payload["company_description"],
            payload["full_name"], payload["cpf"], payload["phone"],
            payload["address"], payload["number"], payload["complement"], payload["neighborhood"], payload["city"], payload["state"],
            payload["cep"], payload["lat"], payload["lng"], payload["birth_date"],
            payload["worker_category"],
            payload["imagem_profile"],
            payload["image_job"]
        )

        # ---- Sync phone: profile â†’ resume (igual ao user-profile) ----
        raw_phone = data.get("phone")
        if raw_phone and user_id:
            import json as _json
            resume_rows = db.execute("SELECT id, personal_info_json FROM resumes WHERE user_id = %s", user_id)
            for rr in resume_rows:
                try:
                    pi = _json.loads(rr["personal_info_json"]) if rr.get("personal_info_json") else {}
                    pi["phone"] = raw_phone
                    db_write(
                        "UPDATE resumes SET personal_info_json = %s, updated_at = CURRENT_TIMESTAMP WHERE id = %s",
                        _json.dumps(pi, ensure_ascii=False), rr["id"]
                    )
                except Exception as sync_err:
                    print(f"Aviso: falha ao sincronizar phone no currÃ­culo: {sync_err}")

        db.execute("COMMIT")
        tx_started = False
        # Faz auto-login na API apÃ³s registro para suportar current_user_id direto
        jwt_token = gerar_token(user_id)
        resp = jsonify({"success": True, "token": sign_user_id(user_id), "user_id": sign_user_id(user_id), "message": "Cadastro realizado com sucesso!"})
        if JWT_ENABLED:
            set_auth_cookie(resp, jwt_token)
        return resp, 200

    except Exception as e:
        if tx_started:
            try:
                db.execute("ROLLBACK")
            except Exception:
                pass
        import traceback
        print("ERRO NO /api/register:", e)
        traceback.print_exc()
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
        return api_error("Email e senha sÃ£o obrigatÃ³rios", 400)

    # 1. Buscar usuÃ¡rio
    rows = db.execute("SELECT * FROM usuarios WHERE email = %s", email)
    if not rows:
        return api_error("Email ou senha invÃ¡lidos", 401)
    
    user = rows[0]

    # 2. Verificar senha
    if not check_password_hash(user["senha_hash"], password):
        return api_error("Email ou senha invÃ¡lidos", 401)

    # 3. Buscar perfil para determinar tipo
    profile_rows = db.execute("SELECT * FROM user_profiles WHERE user_id = %s", user["id"])
    
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
        
        # Descriptografar campos necessÃ¡rios
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
            # Em caso de erro de criptografia, mantÃ©m o login mas com dados limitados
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
    if JWT_ENABLED:
        set_auth_cookie(resp, jwt_token)
    return resp, 200


@app.route("/api/jobs/<job_id>/apply", methods=["POST"])
def apply_to_job(job_id):
    data = request.json or {}
    user_id = current_user_id()
    
    if not user_id:
        return api_error("NÃ£o autorizado", 401)
        
    # Validar se o usuÃ¡rio Ã© empresa. Empresa nÃ£o pode se candidatar.
    user_data = db.execute("SELECT type FROM usuarios WHERE id = %s", user_id)
    if not user_data or user_data[0]["type"] in ["empresa", "company"]:
        return api_error("Apenas contas de profissional podem se candidatar Ã s vagas", 403)
        
    print(f"user_id: {user_id}")

    # Buscar dados para a notificaÃ§Ã£o (Empresa e vaga) E validar se vaga existe primeiro
    company_id = None
    job_title = "vaga"
    job_info = db.execute("SELECT posted_by_user_id, title FROM jobs WHERE id = %s", job_id)
    
    if not job_info:
        return api_error("Vaga nÃ£o encontrada", 404)
        
    company_id = job_info[0]["posted_by_user_id"]
    job_title = job_info[0]["title"]
    
    # Validar se nÃ£o estÃ¡ se candidatando Ã  prÃ³pria vaga
    if company_id == user_id:
        return api_error("VocÃª nÃ£o pode se candidatar Ã  prÃ³pria vaga", 409)

    # --- 1. BUSCA DE DADOS (LEITURA) ---
    # Verifica se jÃ¡ existe candidatura
    existing = db.execute(
        "SELECT id FROM job_applications WHERE job_id = %s AND candidate_id = %s",
        job_id, user_id
    )
    if existing:
        return api_error("VocÃª jÃ¡ se candidatou para esta vaga", 409)

    # Busca o resume_id do candidato
    resume_id = None
    resume_rows = db.execute("SELECT id FROM resumes WHERE user_id = %s LIMIT 1", user_id)
    if resume_rows:
        resume_id = resume_rows[0]["id"]

    # Buscar nome do candidato
    candidate_name = "Um profissional"
    profile_info = db.execute("SELECT full_name FROM user_profiles WHERE user_id = %s", user_id)
    if profile_info and profile_info[0]["full_name"]:
        try: 
            candidate_name = fernet.decrypt(profile_info[0]["full_name"].encode()).decode()
        except: 
            candidate_name = profile_info[0]["full_name"]
    else:
        user_info = db.execute("SELECT username FROM usuarios WHERE id = %s", user_id)
        if user_info:
            candidate_name = user_info[0]["username"]

    # --- 2. OPERAÃ‡Ã•ES DE ESCRITA ---
    import uuid
    application_id = str(uuid.uuid4())

    try:
        # Inserir candidatura
        db_write(
            "INSERT INTO job_applications (id, job_id, candidate_id, status, resume_id) VALUES (%s, %s, %s, 'pendente', %s)",
            application_id, job_id, user_id, resume_id
        )

        # Inserir notificaÃ§Ã£o se tiver empresa
        if company_id:
            message = f"{candidate_name} se candidatou a vaga de {job_title}."
            db_write(
                "INSERT INTO notifications (user_id, type, message, reference_id) VALUES (%s, 'application', %s, %s)",
                company_id, message, resume_id
            )

        return api_ok(message="Candidatura realizada com sucesso!", applicationId=application_id)
    except Exception as e:
        print(f"Erro ao candidatar: {e}")
        return api_error("Erro ao processar candidatura", 500)

@app.route("/api/notifications", methods=["GET"])
def get_notifications():
    user_id = current_user_id()
    try:
        # Busca notificaÃ§Ãµes mais recentes
        rows = db.execute("SELECT * FROM notifications WHERE user_id = %s ORDER BY created_at DESC", user_id)
        
        notifications = []
        for r in rows:
            notifications.append({
                "id": r["id"],
                "type": r["type"],
                "message": r["message"],
                "reference_id": r["reference_id"],
                "read": bool(r["visto"]),
                "timestamp": r["created_at"]
            })
            
        return api_ok(notifications=notifications)
    except Exception as e:
        print(f"Erro ao buscar notificaÃ§Ãµes: {e}")
        return api_error("Erro ao buscar notificaÃ§Ãµes", 500)

@app.route("/api/notifications/<int:notification_id>/read", methods=["PUT"])
def mark_notification_read(notification_id):
    user_id = current_user_id()
    try:
        # Verifica se pertence ao usuÃ¡rio
        existing = db.execute("SELECT id FROM notifications WHERE id = %s AND user_id = %s", notification_id, user_id)
        if not existing:
            return api_error("NotificaÃ§Ã£o nÃ£o encontrada", 404)
            
        db_write("UPDATE notifications SET visto = TRUE WHERE id = %s", notification_id)
        return api_ok()
    except Exception as e:
        print(f"Erro ao marcar notificaÃ§Ã£o como lida: {e}")
        return api_error("Erro ao marcar notificaÃ§Ã£o como lida", 500)

@app.route("/api/company/applications", methods=["GET"])
def get_company_applications():
    # Identificar a empresa logada via JWT securely.
    company_user_id = current_user_id()

    try:
        # Buscar vagas publicadas por esta empresa pelo user_id (confiÃ¡vel)
        my_jobs = db.execute("SELECT * FROM jobs WHERE posted_by_user_id = %s", company_user_id)
        
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
                    up.worker_category as category,
                    up.imagem_profile as profile_photo,
                    up.image_job,
                    r.id as resume_id,
                    r.professional_info_json,
                    r.work_experience_json
                FROM job_applications ja
                JOIN usuarios u ON ja.candidate_id = u.id
                LEFT JOIN user_profiles up ON u.id = up.user_id
                LEFT JOIN resumes r ON u.id = r.user_id -- Pega o currÃ­culo do candidato
                WHERE ja.job_id = %s
            """, job_id)
            
            candidates = []
            for app in applications:
                # Decrypt profile info
                c_name = "AnÃ´nimo"
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
                raw_category = app.get("category")
                if raw_category:
                    if isinstance(raw_category, list):
                        c_category = ", ".join([str(x).strip() for x in raw_category if str(x).strip()])
                    else:
                        c_category = str(raw_category)
                        if c_category.startswith("{") and c_category.endswith("}"):
                            inner = c_category[1:-1].strip()
                            if inner:
                                c_category = ", ".join([x.strip().strip('"') for x in inner.split(",") if x.strip()])
                            else:
                                c_category = ""

                # Parse resume info if available
                resume_info = {}
                if app.get("professional_info_json"):
                    try: resume_info = json.loads(app["professional_info_json"])
                    except: pass
                    
                work_exp = []
                if app.get("work_experience_json"):
                    try: work_exp = json.loads(app["work_experience_json"])
                    except: pass

                # Parse image_job (portfolio photos)
                c_image_job = []
                raw_image_job = app.get("image_job")
                if raw_image_job:
                    if isinstance(raw_image_job, list):
                        c_image_job = [str(x) for x in raw_image_job if x]
                    else:
                        s = str(raw_image_job).strip()
                        if s.startswith("{") and s.endswith("}"):
                            inner = s[1:-1].strip()
                            if inner:
                                c_image_job = [x.strip().strip('"') for x in inner.split(",") if x.strip()]

                candidates.append({
                    "applicationId": app["app_id"],
                    "candidateId": app["candidate_id"],
                    "name": c_name,
                    "phone": c_phone,
                    "email": app["email"],
                    "category": c_category,
                    "appliedAt": app["app_date"],
                    "status": app["status"],
                    "profile_image_url": get_signed_url(app.get("profile_photo")) or app.get("profile_photo"),
                    "imageJob": c_image_job,
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

@app.route("/api/applications/<app_id>/accept", methods=["PUT"])
def accept_application(app_id):
    company_user_id = current_user_id()
    if not company_user_id:
        return api_error("NÃ£o autorizado", 401)

    try:
        app_rows = db.execute("SELECT job_id, candidate_id, status FROM job_applications WHERE id = %s", app_id)
        if not app_rows:
            return api_error("Candidatura nÃ£o encontrada", 404)

        app_row = app_rows[0]
        current_status = str(app_row.get("status") or "").strip().lower()
        if current_status in CLOSED_APPLICATION_STATUSES:
            return api_error("Essa candidatura jÃ¡ foi encerrada e nÃ£o pode ser aprovada.", 400)

        job_id = app_row["job_id"]
        candidate_id = app_row["candidate_id"]

        job_rows = db.execute(
            "SELECT title, posted_by_user_id, start_date, start_time, work_hours FROM jobs WHERE id = %s",
            job_id,
        )
        if not job_rows or str(job_rows[0]["posted_by_user_id"]) != str(company_user_id):
            return api_error("PermissÃ£o negada ou vaga nÃ£o encontrada", 403)

        accepted_job_row = dict(job_rows[0])
        job_title = accepted_job_row["title"]

        db_write("UPDATE job_applications SET status = 'aprovado' WHERE id = %s", app_id)

        cancelled_applications = cancel_conflicting_pending_applications(
            candidate_id,
            app_id,
            accepted_job_row,
        )

        message = f"VocÃª foi chamado para a proposta {job_title}"
        db_write(
            "INSERT INTO notifications (user_id, type, message, reference_id) VALUES (%s, 'application_status', %s, %s)",
            candidate_id, message, job_id
        )

        import uuid as _uuid
        existing_session = db.execute(
            "SELECT id FROM job_sessions WHERE application_id = %s", app_id
        )
        if not existing_session:
            session_id = str(_uuid.uuid4())
            db_write(
                """INSERT INTO job_sessions
                   (id, application_id, candidate_id, company_id, job_id, status)
                   VALUES (%s, %s, %s, %s, %s, 'accepted')""",
                session_id, app_id, candidate_id, company_user_id, job_id
            )

        return api_ok(
            message="Candidato aprovado com sucesso",
            cancelledApplicationIds=[row["id"] for row in cancelled_applications],
        )

    except Exception as e:
        print(f"Erro ao aceitar candidatura: {e}")
        return api_error("Erro ao aceitar candidatura", 500)


# =============================================
# JOB SESSION ENDPOINTS
# =============================================

@app.route("/api/sessions/<application_id>", methods=["GET"])
def get_session(application_id):
    """Returns current session status + signed photo URLs."""
    user_id = current_user_id()
    if not user_id:
        return api_error("NÃ£o autorizado", 401)
    try:
        rows = db.execute(
            """
            SELECT *
            FROM job_sessions
            WHERE application_id = %s
              AND (candidate_id = %s OR company_id = %s)
            """,
            application_id, user_id, user_id,
        )
        if not rows:
            return api_ok(session=None)
        s = rows[0]
        checkin_url = get_signed_url(s.get("checkin_storage_path"))
        checkout_url = get_signed_url(s.get("checkout_storage_path"))
        evaluation_rows = db.execute(
            """
            SELECT 1
            FROM user_evaluations
            WHERE evaluator_id = %s AND evaluated_id = %s AND job_id = %s
            LIMIT 1
            """,
            user_id,
            s["candidate_id"],
            s["job_id"],
        )
        return api_ok(session={
            "id": s["id"],
            "applicationId": s["application_id"],
            "status": s["status"],
            "candidate_id": s["candidate_id"],
            "job_id": s["job_id"],
            "evaluationSubmitted": bool(evaluation_rows),
            "checkinPhotoUrl": checkin_url,
            "checkoutPhotoUrl": checkout_url,
            "checkinAt": str(s["checkin_at"]) if s.get("checkin_at") else None,
            "checkoutAt": str(s["checkout_at"]) if s.get("checkout_at") else None,
            "validatedAt": str(s["validated_at"]) if s.get("validated_at") else None,
        })
    except Exception as e:
        print(f"Erro ao buscar sessÃ£o: {e}")
        return api_error("Erro ao buscar sessÃ£o", 500)


@app.route("/api/sessions/checkin", methods=["POST"])
def session_checkin():
    """Candidate uploads check-in photo."""
    user_id = current_user_id()
    if not user_id:
        return api_error("NÃ£o autorizado", 401)
        
    data = request.get_json(silent=True) or {}
    
    # Try getting from JSON first (base64)
    application_id = data.get("application_id")
    photo_b64 = data.get("photo")
    
    # Fallback to form-data if someone uploads using multipart
    if not application_id or not photo_b64:
        application_id = request.form.get("application_id") or application_id
        photo = request.files.get("photo")
        if photo:
            import base64
            mime = photo.content_type or "image/jpeg"
            photo_bytes = photo.read()
            photo_b64 = f"data:{mime};base64," + base64.b64encode(photo_bytes).decode('utf-8')
    
    if not application_id or not photo_b64:
        return api_error("application_id e photo sÃ£o obrigatÃ³rios", 400)
    
    # Process Base64
    try:
        header, encoded = photo_b64.split(",", 1)
        import base64
        photo_bytes = base64.b64decode(encoded)
        mime = header.split(":")[1].split(";")[0]
        
        MAX_SIZE = 50 * 1024 * 1024
        if len(photo_bytes) > MAX_SIZE:
            return api_error("Foto muito grande. MÃ¡ximo 50MB.", 400)
            
        allowed = {"image/jpeg", "image/png", "image/webp"}
        if mime not in allowed:
            return api_error("Formato nÃ£o permitido. Use JPG, PNG ou WebP.", 400)
            
        rows = db.execute(
            "SELECT * FROM job_sessions WHERE application_id = %s AND candidate_id = %s",
            application_id, user_id
        )
        if not rows:
            return api_error("SessÃ£o nÃ£o encontrada", 404)
        s = rows[0]
        if s["status"] != "accepted":
            return api_error(f"Check-in nÃ£o permitido no status atual: {s['status']}", 409)
            
        path = build_session_photo_path(s["company_id"], s["job_id"], application_id, "checkin", mime)
        upload_session_photo(photo_bytes, path, mime)
        
        now = datetime.now(timezone.utc).isoformat()
        db_write("""
            UPDATE job_sessions
            SET checkin_storage_path = %s,
                checkin_mime_type = %s,
                checkin_file_size = %s,
                checkin_at = %s,
                status = 'checked_in'
            WHERE application_id = %s
        """, path, mime, len(photo_bytes), now, application_id)
        
        return api_ok(message="Check-in realizado com sucesso!", status="checked_in")
    except Exception as e:
        print(f"Erro no checkin: {e}")
        return api_error("Erro ao processar check-in", 500)


@app.route("/api/sessions/checkout", methods=["POST"])
def session_checkout():
    """Candidate uploads check-out photo."""
    user_id = current_user_id()
    if not user_id:
        return api_error("NÃ£o autorizado", 401)
        
    data = request.get_json(silent=True) or {}
    
    application_id = data.get("application_id")
    photo_b64 = data.get("photo")
    
    if not application_id or not photo_b64:
        application_id = request.form.get("application_id") or application_id
        photo = request.files.get("photo")
        if photo:
            import base64
            mime = photo.content_type or "image/jpeg"
            photo_bytes = photo.read()
            photo_b64 = f"data:{mime};base64," + base64.b64encode(photo_bytes).decode('utf-8')
            
    if not application_id or not photo_b64:
        return api_error("application_id e photo sÃ£o obrigatÃ³rios", 400)

    try:
        header, encoded = photo_b64.split(",", 1)
        import base64
        photo_bytes = base64.b64decode(encoded)
        mime = header.split(":")[1].split(";")[0]

        MAX_SIZE = 50 * 1024 * 1024
        if len(photo_bytes) > MAX_SIZE:
            return api_error("Foto muito grande. MÃ¡ximo 50MB.", 400)

        allowed = {"image/jpeg", "image/png", "image/webp"}
        if mime not in allowed:
            return api_error("Formato nÃ£o permitido. Use JPG, PNG ou WebP.", 400)
            
        rows = db.execute(
            "SELECT * FROM job_sessions WHERE application_id = %s AND candidate_id = %s",
            application_id, user_id
        )
        if not rows:
            return api_error("SessÃ£o nÃ£o encontrada", 404)
        s = rows[0]
        if s["status"] != "checked_in":
            return api_error(f"Check-out nÃ£o permitido no status atual: {s['status']}", 409)

        path = build_session_photo_path(s["company_id"], s["job_id"], application_id, "checkout", mime)
        upload_session_photo(photo_bytes, path, mime)

        now = datetime.now(timezone.utc).isoformat()
        db_write("""
            UPDATE job_sessions
            SET checkout_storage_path = %s,
                checkout_mime_type = %s,
                checkout_file_size = %s,
                checkout_at = %s,
                status = 'checked_out'
            WHERE application_id = %s
        """, path, mime, len(photo_bytes), now, application_id)

        return api_ok(message="Check-out realizado com sucesso!", status="checked_out")
    except Exception as e:
        print(f"Erro no checkout: {e}")
        return api_error("Erro ao processar check-out", 500)


@app.route("/api/sessions/<session_id>/validate", methods=["PUT"])
def validate_session(session_id):
    """Company validates completed work."""
    user_id = current_user_id()
    if not user_id:
        return api_error("NÃ£o autorizado", 401)
    try:
        rows = db.execute(
            "SELECT * FROM job_sessions WHERE id = %s AND company_id = %s",
            session_id, user_id
        )
        if not rows:
            return api_error("SessÃ£o nÃ£o encontrada", 404)
        s = rows[0]
        if s["status"] != "checked_out":
            return api_error(f"SÃ³ Ã© possÃ­vel validar apÃ³s o check-out. Status atual: {s['status']}", 409)

        now = datetime.now(timezone.utc).isoformat()
        db_write("""
            UPDATE job_sessions SET validated_at = %s, status = 'validated'
            WHERE id = %s
        """, now, session_id)
        db_write("UPDATE job_applications SET status = 'finalizado' WHERE id = %s", s["application_id"])

        # Notifica candidato
        db_write(
            "INSERT INTO notifications (user_id, type, message, reference_id) VALUES (%s, 'session_validated', %s, %s)",
            s["candidate_id"],
            "Seu serviÃ§o foi validado pela empresa! âœ…",
            s["job_id"]
        )
        return api_ok(message="ServiÃ§o validado com sucesso!")
    except Exception as e:
        print(f"Erro ao validar sessÃ£o: {e}")
        return api_error("Erro ao validar sessÃ£o", 500)


@app.route("/api/get_dados", methods=["GET"])
def get_dados():
    user_id = current_user_id()
    try:
        def normalize_worker_categories(raw):
            if raw is None:
                return []

            if isinstance(raw, list):
                items = [str(x).strip() for x in raw]
            else:
                s = str(raw).strip()
                if not s:
                    return []

                # PostgreSQL array literal: {"Padeiro","Cozinheiro"}
                if s.startswith("{") and s.endswith("}"):
                    inner = s[1:-1].strip()
                    if not inner:
                        return []
                    items = [x.strip().strip('"') for x in inner.split(",")]
                # JSON string list: ["Padeiro","Cozinheiro"]
                elif s.startswith("["):
                    import json as _json
                    try:
                        parsed = _json.loads(s)
                        if isinstance(parsed, list):
                            items = [str(x).strip() for x in parsed]
                        else:
                            items = [s]
                    except Exception:
                        items = [s]
                else:
                    import re as _re
                    items = [x.strip() for x in _re.split(r"[|,]", s)]

            seen = set()
            out = []
            for it in items:
                if not it or it in seen:
                    continue
                seen.add(it)
                out.append(it)
            return out

        # 1. Fetch User Profile
        profile_rows = db.execute("SELECT * FROM user_profiles WHERE user_id = %s", user_id)
        user_rows = db.execute("SELECT email, type, username FROM usuarios WHERE id = %s", user_id)
        
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
            raw_company_email = p.get("company_email")
            profile_data["company_email"] = dec(raw_company_email)
            profile_data["number"] = p.get("number")
            # localizaÃ§Ã£o (lat/lng) vÃ£o em texto plano
            profile_data["lat"] = p.get("lat")
            profile_data["lng"] = p.get("lng")
            profile_data["imagem_profile"] = get_signed_url(p.get("imagem_profile")) or p.get("imagem_profile")
            
            def parse_pg_array(val):
                if not val:
                    return []
                if isinstance(val, list):
                    return val
                s = str(val).strip()
                if s.startswith('{') and s.endswith('}'):
                    inner = s[1:-1].strip()
                    if not inner:
                        return []
                    import csv
                    return next(csv.reader([inner]))
                return [s]

            paths = parse_pg_array(p.get("image_job"))
            profile_data["image_job"] = [get_signed_url(pth) or pth for pth in paths]
            profile_data["rating"] = float(p.get("rating") or 0)
            profile_data["reviews_count"] = int(p.get("reviews_count") or 0)
            
            profile_data["worker_category"] = normalize_worker_categories(p.get("worker_category"))
        
        if user_rows:
            profile_data["email"] = user_rows[0].get("email")
            
            # Normalize userType for frontend
            db_type = user_rows[0].get("type")
            if db_type in ["empresa", "company"]:
                profile_data["userType"] = "company"
            else:
                profile_data["userType"] = "professional"
                
            profile_data["username"] = user_rows[0]["username"]

        # 2. Fetch Resume
        resume_rows = db.execute("SELECT * FROM resumes WHERE user_id = %s ORDER BY updated_at DESC LIMIT 1", user_id)
        print("resume_rows")
        print(resume_rows)
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
        print("resume_data")
        print(resume_data)
        return jsonify({"success": True, "user_id": user_id, "profile": profile_data, "resume": resume_data})

    except Exception as e:
        print(f"Erro em get_dados: {e}")
        return api_error("Erro ao buscar dados", 500)


@app.route("/api/evaluations", methods=["POST"])
def submit_evaluation():
    user_id = current_user_id()
    if not user_id:
        return api_error("NÃ£o autorizado", 401)

    data = request.json or {}
    evaluated_id = data.get("evaluated_id")
    job_id = data.get("job_id")
    rating = data.get("rating")
    comment = (data.get("comment") or "").strip()

    if not evaluated_id or not job_id or rating is None:
        return api_error("Campos obrigatÃ³rios: evaluated_id, job_id, rating.", 400)

    try:
        evaluated_id = int(evaluated_id)
    except (TypeError, ValueError):
        return api_error("evaluated_id invÃ¡lido.", 400)

    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            return api_error("A nota (rating) deve ser entre 1 e 5.", 400)
    except (TypeError, ValueError):
        return api_error("A nota (rating) deve ser um nÃºmero inteiro.", 400)

    if evaluated_id == user_id:
        return api_error("VocÃª nÃ£o pode avaliar a si mesmo.", 400)

    if len(comment) > 1000:
        return api_error("O comentÃ¡rio pode ter no mÃ¡ximo 1000 caracteres.", 400)

    evaluator_rows = db.execute("SELECT type FROM usuarios WHERE id = %s", user_id)
    evaluated_rows = db.execute("SELECT type FROM usuarios WHERE id = %s", evaluated_id)
    if not evaluator_rows or not evaluated_rows:
        return api_error("UsuÃ¡rio da avaliaÃ§Ã£o nÃ£o encontrado.", 404)

    evaluator_type = normalize_account_type(evaluator_rows[0].get("type"))
    evaluated_type = normalize_account_type(evaluated_rows[0].get("type"))
    if evaluator_type != "company":
        return api_error("Apenas empresas podem avaliar candidatos.", 403)
    if evaluated_type != "professional":
        return api_error("A avaliaÃ§Ã£o deve ser enviada para um candidato profissional.", 400)

    relation_rows = db.execute(
        """
        SELECT ja.id AS application_id,
               COALESCE(ja.status, '') AS application_status,
               s.id AS session_id,
               COALESCE(s.status, '') AS session_status
        FROM jobs j
        LEFT JOIN job_applications ja
          ON ja.job_id = j.id
         AND ja.candidate_id = %s
        LEFT JOIN job_sessions s
          ON s.application_id = ja.id
        WHERE j.id = %s
          AND j.posted_by_user_id = %s
        LIMIT 1
        """,
        evaluated_id, job_id, user_id,
    )
    if not relation_rows or not relation_rows[0].get("application_id"):
        return api_error("VocÃª sÃ³ pode avaliar candidatos vinculados a uma vaga da sua empresa.", 403)

    relation = relation_rows[0]
    terminal_session_statuses = {"validated", "finished", "finalized", "cancelled", "canceled"}
    terminal_application_statuses = {"finalizado", "finished", "cancelado", "cancelled", "canceled"}
    session_status = str(relation.get("session_status") or "").strip().lower()
    application_status = str(relation.get("application_status") or "").strip().lower()
    if session_status not in terminal_session_statuses and application_status not in terminal_application_statuses:
        return api_error("A avaliaÃ§Ã£o sÃ³ pode ser enviada apÃ³s a conclusÃ£o ou cancelamento do serviÃ§o.", 409)

    try:
        db.execute("BEGIN")
        db_write(
            """
            INSERT INTO user_evaluations (evaluator_id, evaluated_id, job_id, rating, comment)
            VALUES (%s, %s, %s, %s, %s)
            """,
            user_id, evaluated_id, job_id, rating, comment or None,
        )
        stats = recalculate_user_profile_rating(evaluated_id)
        db.execute("COMMIT")
        return api_ok(
            message="AvaliaÃ§Ã£o enviada com sucesso!",
            averageRating=stats["averageRating"],
            reviewsCount=stats["reviewsCount"],
        )
    except Exception as e:
        try:
            db.execute("ROLLBACK")
        except Exception:
            pass
        if "duplicate key" in str(e).lower() or "idx_user_evaluations_unique_review" in str(e):
            return api_error("VocÃª jÃ¡ avaliou este candidato para este serviÃ§o.", 409)
        print(f"Erro ao salvar avaliaÃ§Ã£o: {e}")
        return api_error("Erro ao processar a avaliaÃ§Ã£o.", 500)


@app.route("/api/users/<evaluated_id>/evaluations", methods=["GET"])
def get_user_evaluations(evaluated_id):
    try:
        try:
            evaluated_user_id = int(evaluated_id)
        except (TypeError, ValueError):
            return api_error("UsuÃ¡rio invÃ¡lido.", 400)

        rows = db.execute(
            """
            SELECT e.id, e.rating, e.comment, e.created_at, e.job_id,
                   up.company_name, up.full_name, up.imagem_profile
            FROM user_evaluations e
            JOIN user_profiles up ON e.evaluator_id = up.user_id
            WHERE e.evaluated_id = %s
            ORDER BY e.created_at DESC
            """,
            evaluated_user_id,
        )

        stats_rows = db.execute(
            "SELECT rating, reviews_count FROM user_profiles WHERE user_id = %s",
            evaluated_user_id,
        )
        if stats_rows:
            average_rating = float(stats_rows[0].get("rating") or 0)
            reviews_count = int(stats_rows[0].get("reviews_count") or 0)
        else:
            fallback_rows = db.execute(
                """
                SELECT COALESCE(AVG(rating), 0) AS avg_rating,
                       COUNT(*) AS reviews_count
                FROM user_evaluations
                WHERE evaluated_id = %s
                """,
                evaluated_user_id,
            )
            fallback = fallback_rows[0] if fallback_rows else {"avg_rating": 0, "reviews_count": 0}
            average_rating = float(fallback.get("avg_rating") or 0)
            reviews_count = int(fallback.get("reviews_count") or 0)

        results = []
        for r in rows:
            eval_dict = dict(r)
            eval_dict["created_at"] = eval_dict["created_at"].isoformat() if eval_dict["created_at"] else None

            company_name = eval_dict.pop("company_name", None)
            full_name = eval_dict.pop("full_name", None)

            display_name = "Empresa"
            if company_name:
                try:
                    display_name = fernet.decrypt(company_name.encode()).decode()
                except Exception:
                    display_name = company_name
            elif full_name:
                try:
                    display_name = fernet.decrypt(full_name.encode()).decode()
                except Exception:
                    display_name = full_name

            img = eval_dict.pop("imagem_profile", None)
            if img:
                img = get_signed_url(img) or img

            eval_dict["evaluatorName"] = display_name
            eval_dict["evaluatorImage"] = img
            results.append(eval_dict)

        return api_ok(
            evaluations=results,
            averageRating=average_rating,
            reviewsCount=reviews_count,
        )
    except Exception as e:
        print(f"Erro ao buscar avaliaÃ§Ãµes: {e}")
        return api_error("Erro ao buscar avaliaÃ§Ãµes", 500)

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, debug=True)















