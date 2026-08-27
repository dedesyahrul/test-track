from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import dashboard, defects, modules, reports, imports, test_scripts, traceability, test_cases_v2, sit_report
from app.database import engine, Base
import os

app = FastAPI(
    title="Dashboard SIT API",
    description="API untuk monitoring System Integration Testing (SIT)",
    version="1.0.0",
)

# CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3100,http://localhost:5173").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers (v1.0.1)
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(defects.router, prefix="/api/defects", tags=["Defects"])
app.include_router(modules.router, prefix="/api/modules", tags=["Modules"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(sit_report.router, prefix="/api/sit-report", tags=["SIT Report"])
app.include_router(imports.router, prefix="/api/import", tags=["Import/Export"])
app.include_router(test_scripts.router, prefix="/api/test-scripts", tags=["Test Scripts"])
app.include_router(test_cases_v2.router, prefix="/api/test-cases-v2", tags=["Test Cases Management V2"])
app.include_router(traceability.router, prefix="/api/traceability", tags=["Traceability Matrix"])


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "Dashboard SIT API"}
