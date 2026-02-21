import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def normalize_pg_url(url: str) -> str:
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    return url

def main():
    url = os.getenv("DATABASE_URL") or os.getenv("DATABASE_PUBLIC_URL")
    if not url:
        raise RuntimeError("Faltou DATABASE_URL. Configure no seu .env ou nas variáveis de ambiente.")
    
    url = normalize_pg_url(url)

    print("Conectando ao banco de dados...")
    
    try:
        with psycopg.connect(url) as conn:
            with conn.cursor() as cur:
                print("Convertendo 'jobs.posted_by_user_id' para INTEGER...")
                cur.execute("ALTER TABLE jobs ALTER COLUMN posted_by_user_id TYPE INTEGER USING (CASE WHEN posted_by_user_id::text ~ '^[0-9]+$' THEN posted_by_user_id::integer ELSE NULL END);")
                
                print("Convertendo 'resumes.user_id' para INTEGER...")
                cur.execute("ALTER TABLE resumes ALTER COLUMN user_id TYPE INTEGER USING (CASE WHEN user_id::text ~ '^[0-9]+$' THEN user_id::integer ELSE NULL END);")
                
                print("Convertendo 'job_applications.candidate_id' para INTEGER...")
                cur.execute("ALTER TABLE job_applications ALTER COLUMN candidate_id TYPE INTEGER USING (CASE WHEN candidate_id::text ~ '^[0-9]+$' THEN candidate_id::integer ELSE NULL END);")
                
                print("Atualizando DEFAULT de datas das tabelas para o padrao Postgres (now::text)...")
                cur.execute("ALTER TABLE jobs ALTER COLUMN created_at SET DEFAULT (now()::text);")
                cur.execute("ALTER TABLE job_applications ALTER COLUMN created_at SET DEFAULT (now()::text);")
                cur.execute("ALTER TABLE usuarios ALTER COLUMN created_at SET DEFAULT (now()::text);")
                cur.execute("ALTER TABLE usuarios ALTER COLUMN updated_at SET DEFAULT (now()::text);")
                cur.execute("ALTER TABLE user_profiles ALTER COLUMN created_at SET DEFAULT (now()::text);")
                
            conn.commit()
            print("✅ Sucesso! Todas as colunas foram atualizadas para INTEGER.")
    except Exception as e:
        print(f"❌ Erro ao alterar colunas: {e}")

if __name__ == "__main__":
    main()
