# Dashboard SIT - Infrastructure Documentation

## Architecture Overview

```
                    +------------------+
                    |    Nginx (FE)    |
                    |   Port: 3100     |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   React.js SPA   |
                    |  Vite + Tailwind |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   FastAPI (BE)   |
                    |   Port: 8800     |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   PostgreSQL 16  |
                    |   Port: 5433     |
                    +------------------+
```

## Tech Stack

| Layer      | Technology             | Version  |
|------------|------------------------|----------|
| Frontend   | React.js + Vite        | 18.3 / 5.4 |
| UI         | TailwindCSS            | 3.4      |
| Charts     | Recharts               | 2.12     |
| State      | TanStack React Query   | 5.56     |
| Backend    | Python FastAPI         | 0.115    |
| ORM        | SQLAlchemy             | 2.0      |
| Database   | PostgreSQL             | 16       |
| Container  | Docker + Docker Compose| 3.8      |
| Proxy      | Nginx                  | Alpine   |

## Project Structure

```
Dashboard SIT/
+-- docker-compose.yml          # Orchestration
+-- .env                        # Environment variables
+-- .gitignore
+-- docs/
|   +-- dump-db_04-*.sql        # Original MySQL dump reference
+-- db/
|   +-- init.sql                # PostgreSQL schema + seed data
+-- backend/
|   +-- Dockerfile
|   +-- requirements.txt
|   +-- app/
|       +-- main.py             # FastAPI entry point
|       +-- database.py         # DB connection
|       +-- models/
|       |   +-- models.py       # SQLAlchemy models
|       +-- schemas/
|       |   +-- schemas.py      # Pydantic schemas
|       +-- api/
|           +-- dashboard.py    # Dashboard analytics endpoints
|           +-- defects.py      # CRUD defect endpoints
|           +-- modules.py      # Module endpoints
|           +-- reports.py      # Report summary endpoints
+-- frontend/
    +-- Dockerfile
    +-- nginx.conf              # Nginx reverse proxy config
    +-- package.json
    +-- vite.config.js
    +-- tailwind.config.js
    +-- src/
        +-- main.jsx
        +-- App.jsx
        +-- index.css
        +-- services/
        |   +-- api.js          # API client (axios)
        +-- components/
        |   +-- Layout.jsx      # Sidebar layout
        +-- pages/
            +-- DashboardPage.jsx    # Overview + charts
            +-- DefectsPage.jsx      # Defect list + filters
            +-- DefectDetailPage.jsx # Single defect detail
            +-- ModulesPage.jsx      # Module breakdown
            +-- ReportsPage.jsx      # Scoring & reports
```

## Database Schema

### Tables

| Table            | Description                                    |
|------------------|------------------------------------------------|
| `modules`        | 4 module utama (PBJ, Vendor, Admin, Catalog)   |
| `sub_modules`    | 78 sub-module detail per module                |
| `testers`        | Daftar tester (Amanda, Destra, Clara, Muamar)  |
| `defects`        | Data defect utama SIT (60+ records)            |
| `report_summary` | Summary defect/non-defect per sub-module       |
| `defect_scoring` | Pembobotan scoring (Fatal=25, Major=10, dst.)  |
| `sit_config`     | Konfigurasi SIT (tanggal, nama project)        |

### Defect Level Scoring

| Level    | Weight | Priority  |
|----------|--------|-----------|
| Fatal    | 25     | Highest   |
| Major    | 10     | High      |
| Minor    | 2      | Medium    |
| Kosmetik | 1      | Low       |

## API Endpoints

### Dashboard (`/api/dashboard/`)
| Method | Endpoint                | Description                    |
|--------|-------------------------|--------------------------------|
| GET    | `/overview`             | KPI overview (total, open, closed, aging) |
| GET    | `/defects-by-level`     | Defect count by severity level |
| GET    | `/defects-by-module`    | Defect count by module         |
| GET    | `/defects-by-status`    | Status distribution            |
| GET    | `/defect-trend`         | Daily created vs closed trend  |
| GET    | `/tester-workload`      | Tester workload analysis       |
| GET    | `/scoring`              | Defect scoring summary         |
| GET    | `/priority-distribution`| Priority distribution          |
| GET    | `/aging-distribution`   | Aging distribution (0-3d, 4-7d, etc.) |
| GET    | `/fixing-status`        | Fixing review status breakdown |

### Defects (`/api/defects/`)
| Method | Endpoint         | Description                         |
|--------|------------------|-------------------------------------|
| GET    | `/`              | Paginated list with filters & search|
| GET    | `/{defect_id}`   | Single defect detail                |
| POST   | `/`              | Create new defect                   |
| PATCH  | `/{defect_id}`   | Update defect                       |

**Query Parameters (GET /):**
- `page`, `page_size` - Pagination
- `status` - Filter by status (Open/Closed/Under Review)
- `level` - Filter by severity (Fatal/Major/Minor/Kosmetik)
- `module_id` - Filter by module
- `priority` - Filter by priority
- `criteria` - Filter by Defect/Non-Defect
- `search` - Full-text search on ID, summary, description
- `created_by` - Filter by creator
- `sort_by`, `sort_order` - Sorting

### Modules (`/api/modules/`)
| Method | Endpoint                      | Description              |
|--------|-------------------------------|--------------------------|
| GET    | `/`                           | List all modules + stats |
| GET    | `/{id}/sub-modules`           | Sub-modules per module   |
| GET    | `/{id}/defect-detail`         | Defect detail per sub-module |

### Reports (`/api/reports/`)
| Method | Endpoint                 | Description                  |
|--------|--------------------------|------------------------------|
| GET    | `/summary-by-submodule`  | Summary per sub-module       |
| GET    | `/scoring-summary`       | Scoring pembobotan           |
| GET    | `/daily-summary`         | Daily defect discovery       |
| GET    | `/module-summary`        | Module + sub-module summary  |

## Quick Start

### Prerequisites
- Docker & Docker Compose
- (Optional) Node.js 20+ & Python 3.12+ for local dev

### Run with Docker (Production)

```bash
# Clone & navigate to project
cd "Dashboard SIT"

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

Services will be available at:
- **Frontend**: http://localhost:3100
- **Backend API**: http://localhost:8800
- **API Docs (Swagger)**: http://localhost:8800/docs
- **PostgreSQL**: localhost:5433

### Local Development

#### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Set environment variable
set DATABASE_URL=postgresql://postgres:secret123@localhost:5433/db_sit

# Run
uvicorn app.main:app --reload --port 8800
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

Frontend dev server runs at http://localhost:5173 with proxy to backend.

#### Database Only (Docker)
```bash
docker-compose up -d db
```

## Environment Variables

| Variable           | Default                                    | Description          |
|--------------------|--------------------------------------------|----------------------|
| `POSTGRES_DB`      | `db_sit`                                   | Database name        |
| `POSTGRES_USER`    | `postgres`                                 | DB user              |
| `POSTGRES_PASSWORD`| `secret123`                                | DB password          |
| `POSTGRES_PORT`    | `5433`                                     | DB port              |
| `BACKEND_PORT`     | `8800`                                     | Backend API port     |
| `FRONTEND_PORT`    | `3100`                                     | Frontend port        |
| `DATABASE_URL`     | `postgresql://postgres:secret123@db:5432/db_sit` | Full connection string |
| `CORS_ORIGINS`     | `http://localhost:3100,http://localhost:5173` | Allowed CORS origins |

## Dashboard Features

1. **Overview Dashboard**
   - KPI cards: Total defects, Open, Closed, Avg aging
   - Defect trend chart (created vs closed over time)
   - Module comparison (stacked bar chart)
   - Severity pie chart (Fatal/Major/Minor/Kosmetik)
   - Status distribution pie chart
   - Aging distribution bar chart
   - Tester workload comparison
   - Fixing/Review status progress bars
   - Priority distribution cards

2. **Defect List**
   - Paginated table with 15 items/page
   - Multi-filter (status, level, module, priority, criteria)
   - Full-text search
   - Click to view detail

3. **Defect Detail**
   - Complete defect information
   - Activity log/history
   - Retesting notes
   - Timeline (created, closed, aging)
   - People (creator, retester, fixer)

4. **Modules**
   - Module cards with stats
   - Expandable sub-module defect chart
   - Resolution progress per module

5. **Reports**
   - Defect scoring summary (pembobotan)
   - Daily defect discovery chart
   - Module summary with sub-module breakdown table

## Data Migration Notes

Data asli dari MySQL dump (`db_04`) di-normalized dari:
- Kolom `unnamed_0` s/d `unnamed_24` -> Kolom yang bermakna
- Tabel `sit` -> Tabel `defects` + `modules` + `sub_modules` + `testers`
- Tabel `report` -> Tabel `report_summary` + `defect_scoring` + `sit_config`
- Target database: PostgreSQL 16 (production-ready)
