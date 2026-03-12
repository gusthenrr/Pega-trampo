import re
from pathlib import Path

def refactor_app():
    path = Path("app.py")
    orig = path.read_text(encoding="utf-8")
    
    # 1. Substitute '?' with '%s' inside string literals safely
    def repl_string(m):
        s = m.group(0)
        if '?' in s and 'split' not in s and '?alt=media' not in s and 'http' not in s and 'sign/' not in s:
            s = s.replace('?', '%s')
        return s

    pattern = r'(\"\"\"[\s\S]*?\"\"\"|\'\'\'[\s\S]*?\'\'\'|\"[^\"]*\"|\'[^\']*\')'
    new_text = re.sub(pattern, repl_string, orig)

    # 2. Add psycopg2 imports where cs50 was imported
    new_text = new_text.replace(
        "import psycopg\nfrom psycopg.rows import dict_row\nfrom psycopg_pool import ConnectionPool\nimport threading",
        "import psycopg2\nfrom psycopg2.extras import DictCursor\nfrom psycopg2.pool import SimpleConnectionPool\nimport threading"
    )

    # 3. Handle previously added block to rewrite psycopg -> psycopg2
    db_setup_old = """class PostgresDB:
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

db = PostgresDB(DATABASE_URL)"""

    db_setup_new = """class PostgresDB:
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
            if is_managed:
                conn.rollback()
            raise e
        finally:
            if not is_managed:
                conn.autocommit = False
                self.pool.putconn(conn)

db = PostgresDB(DATABASE_URL)"""
    new_text = new_text.replace(db_setup_old, db_setup_new)

    path.write_text(new_text, encoding="utf-8")
    print("app.py refactored for psycopg2 successfully.")

if __name__ == "__main__":
    refactor_app()
