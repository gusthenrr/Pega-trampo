import sqlite3
import os
from cs50 import SQL
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") 
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

    db = SQL(DATABASE_URL)
else:
    db = SQL("sqlite:///database.db")

def migrate_status():
    print("Iniciando migração de status...")
    try:
        # Migrar 'pending' -> 'pendente'
        rows_pending = db.execute("SELECT COUNT(*) AS count FROM job_applications WHERE status = 'pending'")
        count_pending = rows_pending[0]['count'] if rows_pending else 0
        
        if count_pending > 0:
            print(f"Encontrados {count_pending} registros com status 'pending'.")
            try:
                db.execute("UPDATE job_applications SET status = 'pendente' WHERE status = 'pending'")
                print("Migração 'pending' -> 'pendente' concluída.")
            except Exception as e:
                if "does not return rows" not in str(e): raise
        else:
            print("Nenhum registro com status 'pending' encontrado.")

        # Migrar 'accepted' -> 'aprovado'
        rows_accepted = db.execute("SELECT COUNT(*) AS count FROM job_applications WHERE status = 'accepted'")
        count_accepted = rows_accepted[0]['count'] if rows_accepted else 0
        
        if count_accepted > 0:
            print(f"Encontrados {count_accepted} registros com status 'accepted'.")
            try:
                db.execute("UPDATE job_applications SET status = 'aprovado' WHERE status = 'accepted'")
                print("Migração 'accepted' -> 'aprovado' concluída.")
            except Exception as e:
                if "does not return rows" not in str(e): raise
        else:
            print("Nenhum registro com status 'accepted' encontrado.")
            
    except Exception as e:
        print(f"Erro durante a migração: {e}")

if __name__ == "__main__":
    migrate_status()
