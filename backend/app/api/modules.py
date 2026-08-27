from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.models import Module, SubModule, Defect
from app.schemas.schemas import ModuleResponse, SubModuleResponse, ModuleDefectDetail
from typing import List

router = APIRouter()


@router.get("/", response_model=List[ModuleResponse])
def get_modules(db: Session = Depends(get_db)):
    modules = db.query(Module).all()
    result = []
    for mod in modules:
        sub_count = db.query(func.count(SubModule.id)).filter(SubModule.module_id == mod.id).scalar() or 0
        total = db.query(func.count(Defect.id)).filter(
            Defect.module_id == mod.id, Defect.defect_criteria == 'Defect'
        ).scalar() or 0
        open_count = db.query(func.count(Defect.id)).filter(
            Defect.module_id == mod.id, Defect.defect_criteria == 'Defect',
            Defect.status.in_(['Open', 'Re-Opened'])
        ).scalar() or 0
        closed_count = db.query(func.count(Defect.id)).filter(
            Defect.module_id == mod.id, Defect.defect_criteria == 'Defect',
            Defect.status == 'Closed'
        ).scalar() or 0
        result.append(ModuleResponse(
            id=mod.id,
            name=mod.name,
            sub_module_count=sub_count,
            total_defects=total,
            open_defects=open_count,
            closed_defects=closed_count
        ))
    return result


@router.get("/{module_id}/sub-modules", response_model=List[SubModuleResponse])
def get_sub_modules(module_id: int, db: Session = Depends(get_db)):
    module = db.query(Module).filter(Module.id == module_id).first()
    subs = db.query(SubModule).filter(SubModule.module_id == module_id).all()
    return [SubModuleResponse(
        id=s.id, name=s.name, module_id=s.module_id,
        module_name=module.name if module else None
    ) for s in subs]


@router.get("/{module_id}/defect-detail", response_model=List[ModuleDefectDetail])
def get_module_defect_detail(module_id: int, db: Session = Depends(get_db)):
    subs = db.query(SubModule).filter(SubModule.module_id == module_id).all()
    result = []
    for s in subs:
        defect_count = db.query(func.count(Defect.id)).filter(
            Defect.sub_module_id == s.id, Defect.defect_criteria == 'Defect'
        ).scalar() or 0
        non_defect_count = db.query(func.count(Defect.id)).filter(
            Defect.sub_module_id == s.id, Defect.defect_criteria == 'Non-Defect'
        ).scalar() or 0
        if defect_count > 0 or non_defect_count > 0:
            result.append(ModuleDefectDetail(
                sub_module=s.name,
                total_defect=defect_count,
                total_non_defect=non_defect_count,
                total=defect_count + non_defect_count
            ))
    return result
