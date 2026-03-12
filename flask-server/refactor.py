import re
from pathlib import Path

def refactor_app():
    path = Path("app.py")
    orig = path.read_text(encoding="utf-8")
    
    # 1. Substitute '?' with '%s' inside string literals safely
    def repl_string(m):
        s = m.group(0)
        # Exclude URL-related strings and known false-positives
        if '?' in s and 'split' not in s and '?alt=media' not in s and 'http' not in s and 'sign/' not in s:
            s = s.replace('?', '%s')
        return s

    # Regex to match python string literals
    pattern = r'(\"\"\"[\s\S]*?\"\"\"|\'\'\'[\s\S]*?\'\'\'|\"[^\"]*\"|\'[^\']*\')'
    new_text = re.sub(pattern, repl_string, orig)

    # 2. Add psycopg imports where cs50 was imported
    new_text = new_text.replace(
        "from cs50 import SQL",
        "import psycopg\nfrom psycopg.rows import dict_row\nfrom psycopg_pool import ConnectionPool\nimport threading"
    )

    # 3. Replace db initialization logic
    db_setup_old = """#Config do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL") 

if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

    # força SQLAlchemy a usar psycopg3 (e não psycopg2)
    if DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

    db = SQL(DATABASE_URL)
else:
    db = SQL("sqlite:///database.db")"""

    db_setup_new = """#Config do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
# Remove the psycopg sqlalchemy prefix for native psycopg3 pool
if DATABASE_URL and DATABASE_URL.startswith("postgresql+psycopg://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql+psycopg://", "postgresql://", 1)

class PostgresDB:
    def __init__(self, conninfo):
        # Disable auto_commit so we can handle transactions identical to cs50
        self.pool = ConnectionPool(conninfo=conninfo, min_size=1, max_size=10, kwargs={"autocommit": True})
        self.local = threading.local()
    
    def execute(self, sql, *args):
        # Check if we are in a transaction manually managed by the thread
        conn = getattr(self.local, 'conn', None)
        is_managed = (conn is not None)
        
        # If not managed, grab a fresh one from the pool
        if not is_managed:
            conn = self.pool.getconn()

        try:
            with conn.cursor(row_factory=dict_row) as cur:
                if len(args) == 1 and isinstance(args[0], (list, tuple)):
                    args = args[0]
                    
                sql_upper = sql.strip().upper()
                
                # Check for explicit transaction boundaries (simulating cs50)
                if sql_upper == "BEGIN" or sql_upper == "BEGIN TRANSACTION":
                    # disable autocommit and bind connection to thread
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
                    # CS50 standard is to return a list of dicts for SELECTs OR RETURNING clauses
                    return cur.fetchall()
                else:
                    return cur.rowcount
        finally:
            if not is_managed:
                self.pool.putconn(conn)

db = PostgresDB(DATABASE_URL)
"""
    new_text = new_text.replace(db_setup_old, db_setup_new)

    path.write_text(new_text, encoding="utf-8")
    print("app.py refactored successfully.")

if __name__ == "__main__":
    refactor_app()
