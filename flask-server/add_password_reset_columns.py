"""
Migração: adiciona colunas para reset de senha e invalidação de sessão.
- password_reset_token_hash, password_reset_expires_at, password_reset_requested_at,
  password_reset_used_at, password_changed_at
"""

from cs50 import SQL
import os
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


columns = [
    ("password_reset_token_hash", "TEXT"),
    ("password_reset_expires_at", "TEXT"),       # TIMESTAMPTZ no Postgres, TEXT no SQLite
    ("password_reset_requested_at", "TEXT"),
    ("password_reset_used_at", "TEXT"),
    ("password_changed_at", "TEXT"),
]

for col_name, col_type in columns:
    try:
        db.execute(f"ALTER TABLE usuarios ADD COLUMN {col_name} {col_type}")
        print(f"✅  Coluna '{col_name}' adicionada com sucesso.")
    except Exception as e:
        msg = str(e).lower()
        if "duplicate column" in msg or "already exists" in msg:
            print(f"⏭️  Coluna '{col_name}' já existe, pulando.")
        else:
            print(f"❌  Erro ao adicionar '{col_name}': {e}")

print("\nMigração concluída.")
