# Database Schema Structure

This document outlines the database structure for the application. The database is SQLite (`database.db`).

## Tables

### `usuarios`
Stores user authentication details.
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `username`: TEXT UNIQUE
- `senha_hash`: TEXT NOT NULL
- `email`: TEXT UNIQUE
- `type`: TEXT (e.g., 'empresa', 'professional')
- `created_at`: TEXT DEFAULT (datetime('now'))
- `updated_at`: TEXT DEFAULT (datetime('now'))

### `user_profiles`
Stores extended profile information for users (both companies and professionals). Has a 1:1 relationship with `usuarios`.
- `id`: INTEGER PRIMARY KEY AUTOINCREMENT
- `user_id`: INTEGER NOT NULL UNIQUE (Foreign Key to `usuarios.id`)
- `cnpj`: TEXT (Encrypted)
- `company_name`: TEXT (Encrypted)
- `company_email`: TEXT
- `business_type`: TEXT
- `company_description`: TEXT (Encrypted)
- `full_name`: TEXT (Encrypted)
- `cpf`: TEXT (Encrypted)
- `phone`: TEXT (Encrypted)
- `address`: TEXT
- `number`: INTEGER
- `complement`: TEXT
- `neighborhood`: TEXT
- `city`: TEXT
- `state`: TEXT
- `created_at`: TEXT NOT NULL DEFAULT (datetime('now'))
- `updated_at`: TEXT

### `jobs`
Stores job postings.
- `id`: TEXT PRIMARY KEY
- `title`: TEXT NOT NULL
- `description`: TEXT
- `category`: TEXT
- `payment_type`: TEXT
- `rate`: REAL
- `location`: TEXT
- `area`: TEXT
- `address`: TEXT
- `work_hours`: TEXT
- `posted_by`: TEXT
- `posted_at`: TEXT
- `period`: TEXT
- `duration`: TEXT
- `is_urgent`: BOOLEAN
- `professional_rating`: REAL
- `professional_reviews`: INTEGER
- `completed_jobs`: INTEGER
- `likes`: INTEGER
- `comments`: INTEGER
- `views`: INTEGER
- `company_only`: BOOLEAN
- `includes_food`: BOOLEAN
- `lat`: REAL
- `lng`: REAL
- `company_info_json`: TEXT
- `created_at`: TEXT DEFAULT (datetime('now'))
- `posted_by_user_id`: TEXT

### `resumes`
Stores candidate resumes.
- `id`: TEXT PRIMARY KEY
- `user_id`: TEXT
- `personal_info_json`: TEXT
- `professional_info_json`: TEXT
- `work_experience_json`: TEXT
- `education_json`: TEXT
- `skills_json`: TEXT
- `bio`: TEXT
- `availability_json`: TEXT
- `created_at`: TEXT
- `updated_at`: TEXT
- `is_visible`: BOOLEAN

### `job_applications`
Links candidates to jobs they have applied for.
- `id`: TEXT PRIMARY KEY
- `job_id`: TEXT NOT NULL (Foreign Key to `jobs.id`)
- `candidate_id`: TEXT NOT NULL (Foreign Key to `usuarios.id`)
- `status`: TEXT DEFAULT 'pending'
- `created_at`: TEXT DEFAULT (datetime('now'))

## Notes
- `usuarios_backup_broken`: Backup table, likely not in use.
- `sqlite_sequence`: Internal SQLite table.
