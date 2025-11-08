# backend/scripts/create_db.py

import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

# --- Your Database Connection Details ---
# These should match your local PostgreSQL setup
DB_USER = "postgres"
DB_PASSWORD = "Karthick7"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME_TO_CREATE = "task_manager_db1"

# --- The Script ---
try:
    # Connect to the default 'postgres' database
    conn = psycopg2.connect(
        dbname="postgres",
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT
    )

    # CREATE DATABASE cannot run inside a transaction block,
    # so we use autocommit
    conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
    cursor = conn.cursor()

    # Check if the database already exists
    cursor.execute(f"SELECT 1 FROM pg_database WHERE datname = %s", (DB_NAME_TO_CREATE,))
    exists = cursor.fetchone()

    if not exists:
        print(f"Database '{DB_NAME_TO_CREATE}' does not exist. Creating...")
        cursor.execute(f"CREATE DATABASE {DB_NAME_TO_CREATE}")
        print(f"Database '{DB_NAME_TO_CREATE}' created successfully. ✅")
    else:
        print(f"Database '{DB_NAME_TO_CREATE}' already exists. Skipping. 🐘")

    cursor.close()
    conn.close()

except psycopg2.OperationalError as e:
    print(f"Error connecting to PostgreSQL: {e}")
except Exception as e:
    print(f"An unexpected error occurred: {e}")