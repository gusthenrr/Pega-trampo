import sqlite3
import os

def migrate():
    # Caminho para o banco de dados
    # O PegaTrampo parece usar SQLite em alguns ambientes ou PostgreSQL em outros.
    # Mas o script seed_test_data.py no topo (não mostrado) define como conectar.
    # Vou usar a lógica de db_write/db do app.py se possível.
    
    db_path = 'database.db' # Nome comum, mas vamos verificar no app.py
    
    if not os.path.exists(db_path):
        print(f"Banco {db_path} não encontrado localmente.")
        return

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    
    try:
        # 1. Migrar 'pending' -> 'pendente'
        cur.execute("UPDATE job_applications SET status = 'pendente' WHERE status = 'pending'")
        print(f"{cur.rowcount} registros 'pending' migrados para 'pendente'.")
        
        # 2. Migrar 'accepted' -> 'aprovado'
        cur.execute("UPDATE job_applications SET status = 'aprovado' WHERE status = 'accepted'")
        print(f"{cur.rowcount} registros 'accepted' migrados para 'aprovado'.")
        
        conn.commit()
    except Exception as e:
        print(f"Erro na migração: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
