from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database import get_db
from app.models.models import Defect, Module, SubModule
from app.schemas.schemas import DefectResponse, DefectCreate, DefectUpdate, PaginatedDefects
from typing import List, Optional
from datetime import date
import math

router = APIRouter()


@router.get("/", response_model=PaginatedDefects)
def get_defects(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    level: Optional[str] = None,
    module_id: Optional[int] = None,
    sub_module_id: Optional[int] = None,
    criteria: Optional[str] = None,
    search: Optional[str] = None,
    priority: Optional[str] = None,
    fixing_status: Optional[str] = None,
    created_by: Optional[str] = None,
    retested_by: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    date_closed_from: Optional[date] = None,
    date_closed_to: Optional[date] = None,
    aging_min: Optional[int] = None,
    aging_max: Optional[int] = None,
    sort_by: Optional[str] = "date_created",
    sort_order: Optional[str] = "desc",
    db: Session = Depends(get_db)
):
    query = db.query(Defect)

    # Apply filters
    if status:
        query = query.filter(Defect.status == status)
    if level:
        query = query.filter(Defect.level_of_defect == level)
    if module_id:
        query = query.filter(Defect.module_id == module_id)
    if sub_module_id:
        query = query.filter(Defect.sub_module_id == sub_module_id)
    if criteria:
        query = query.filter(Defect.defect_criteria == criteria)
    if priority:
        query = query.filter(Defect.priority == priority)
    if fixing_status:
        query = query.filter(Defect.fixing_review_status == fixing_status)
    if created_by:
        query = query.filter(Defect.created_by == created_by)
    if retested_by:
        query = query.filter(Defect.last_retested_by == retested_by)
    if date_from:
        query = query.filter(Defect.date_created >= date_from)
    if date_to:
        query = query.filter(Defect.date_created <= date_to)
    if date_closed_from:
        query = query.filter(Defect.date_closed >= date_closed_from)
    if date_closed_to:
        query = query.filter(Defect.date_closed <= date_closed_to)
    if aging_min is not None:
        query = query.filter(Defect.aging >= aging_min)
    if aging_max is not None:
        query = query.filter(Defect.aging <= aging_max)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Defect.defect_id.ilike(search_filter),
                Defect.summary.ilike(search_filter),
                Defect.description.ilike(search_filter),
                Defect.issue_link.ilike(search_filter),
            )
        )

    # Get total before pagination
    total = query.count()

    # Sort
    sort_column = getattr(Defect, sort_by, Defect.date_created)
    if sort_order == "asc":
        query = query.order_by(sort_column.asc())
    else:
        query = query.order_by(sort_column.desc())

    # Paginate
    offset = (page - 1) * page_size
    defects = query.offset(offset).limit(page_size).all()

    # Enrich with module/sub_module names
    items = []
    for d in defects:
        module = db.query(Module).filter(Module.id == d.module_id).first()
        sub_module = db.query(SubModule).filter(SubModule.id == d.sub_module_id).first()
        items.append(DefectResponse(
            id=d.id,
            defect_id=d.defect_id,
            module_id=d.module_id,
            sub_module_id=d.sub_module_id,
            module_name=module.name if module else None,
            sub_module_name=sub_module.name if sub_module else None,
            summary=d.summary,
            stage=d.stage,
            environment=d.environment,
            description=d.description,
            issue_link=d.issue_link,
            impact_of_issue=d.impact_of_issue,
            level_of_defect=d.level_of_defect,
            scoring_level=d.scoring_level,
            priority=d.priority,
            defect_criteria=d.defect_criteria,
            status=d.status,
            date_created=d.date_created,
            date_reopened=d.date_reopened,
            date_closed=d.date_closed,
            aging=d.aging,
            created_by=d.created_by,
            last_retested_by=d.last_retested_by,
            fixing_confirmed_by=d.fixing_confirmed_by,
            estimated_fix_date=d.estimated_fix_date,
            fixing_review_status=d.fixing_review_status,
            keterangan=d.keterangan,
            retesting=d.retesting,
            created_at=d.created_at,
        ))

    return PaginatedDefects(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1
    )


@router.get("/filter-options")
def get_filter_options(db: Session = Depends(get_db)):
    """Get unique values for all filter dropdowns."""
    fixing_statuses = db.query(Defect.fixing_review_status).filter(
        Defect.fixing_review_status.isnot(None)
    ).distinct().order_by(Defect.fixing_review_status).all()

    creators = db.query(Defect.created_by).filter(
        Defect.created_by.isnot(None)
    ).distinct().order_by(Defect.created_by).all()

    retesters = db.query(Defect.last_retested_by).filter(
        Defect.last_retested_by.isnot(None)
    ).distinct().order_by(Defect.last_retested_by).all()

    fixers = db.query(Defect.fixing_confirmed_by).filter(
        Defect.fixing_confirmed_by.isnot(None)
    ).distinct().order_by(Defect.fixing_confirmed_by).all()

    sub_modules = db.query(
        SubModule.id, SubModule.name, SubModule.module_id, Module.name.label('module_name')
    ).join(Module, Module.id == SubModule.module_id).order_by(Module.name, SubModule.name).all()

    min_date = db.query(func.min(Defect.date_created)).scalar()
    max_date = db.query(func.max(Defect.date_created)).scalar()

    return {
        "fixing_statuses": [r[0] for r in fixing_statuses],
        "creators": [r[0] for r in creators],
        "retesters": [r[0] for r in retesters],
        "fixers": [r[0] for r in fixers],
        "sub_modules": [
            {"id": s.id, "name": s.name, "module_id": s.module_id, "module_name": s.module_name}
            for s in sub_modules
        ],
        "date_range": {
            "min": str(min_date) if min_date else None,
            "max": str(max_date) if max_date else None,
        },
    }


@router.get("/closure-monitor/summary")
def get_closure_monitor_summary(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    module_id: Optional[int] = None,
    created_age: Optional[str] = None, # 'today', 'new', 'recent', 'old', 'overdue'
    db: Session = Depends(get_db)
):
    """
    Summary Metrics for Defect Closure Monitor (100% Matches Dashboard Utama & Excel).
    """
    today_date = date.today()

    # Base query for all defects (matching Dashboard Utama)
    base_query = db.query(Defect).filter(Defect.defect_criteria == 'Defect')
    if module_id:
        base_query = base_query.filter(Defect.module_id == module_id)

    total_defects = base_query.count()

    # 1. Closed Defects (matches Dashboard Utama: status == 'Closed')
    query_closed = base_query.filter(Defect.status == 'Closed')
    if date_from: query_closed = query_closed.filter(Defect.date_closed >= date_from)
    if date_to: query_closed = query_closed.filter(Defect.date_closed <= date_to)
    
    closed_items = query_closed.all()
    closed_count = len(closed_items)

    # 2. Created Defects (matches Dashboard Utama)
    query_created = base_query
    if date_from: query_created = query_created.filter(Defect.date_created >= date_from)
    if date_to: query_created = query_created.filter(Defect.date_created <= date_to)
    
    if created_age == "today":
        query_created = query_created.filter(Defect.date_created == today_date)
    elif created_age == "new":
        query_created = query_created.filter(Defect.aging <= 3)
    elif created_age == "recent":
        query_created = query_created.filter(Defect.aging >= 4, Defect.aging <= 7)
    elif created_age == "old":
        query_created = query_created.filter(Defect.aging > 7)
    elif created_age == "overdue":
        query_created = query_created.filter(Defect.aging > 14)

    created_count = query_created.count()

    # 3. Open Defects
    open_count = base_query.filter(Defect.status.in_(['Open', 'Re-Opened'])).count()

    # 4. Created Today Count (exact today)
    created_today_count = db.query(func.count(Defect.id)).filter(
        Defect.defect_criteria == 'Defect',
        Defect.date_created == today_date
    ).scalar() or 0

    # 5. Old Defects (>7 days) Count
    old_defects_count = db.query(func.count(Defect.id)).filter(
        Defect.defect_criteria == 'Defect',
        Defect.status.in_(['Open', 'Re-Opened']),
        or_(Defect.aging > 7, Defect.date_created < today_date)
    ).scalar() or 0

    resolution_days = []
    for d in closed_items:
        if d.date_created and d.date_closed:
            days = (d.date_closed - d.date_created).days
            if days >= 0: resolution_days.append(days)
        elif d.aging and d.aging >= 0:
            resolution_days.append(d.aging)

    avg_closing_days = round(sum(resolution_days) / len(resolution_days), 1) if resolution_days else 0.0

    fatal_closed = sum(1 for d in closed_items if d.level_of_defect == 'Fatal')
    major_closed = sum(1 for d in closed_items if d.level_of_defect == 'Major')
    minor_closed = sum(1 for d in closed_items if d.level_of_defect == 'Minor')

    resolvers_map = {}
    for d in closed_items:
        name = d.last_retested_by or d.created_by or "IT Team"
        resolvers_map[name] = resolvers_map.get(name, 0) + 1

    top_resolvers = [{"name": k, "count": v} for k, v in sorted(resolvers_map.items(), key=lambda x: x[1], reverse=True)[:5]]

    return {
        "total_defects": total_defects,
        "closed_count": closed_count,
        "created_count": created_count,
        "open_count": open_count,
        "created_today_count": created_today_count,
        "old_defects_count": old_defects_count,
        "avg_closing_days": avg_closing_days,
        "fatal_closed": fatal_closed,
        "major_closed": major_closed,
        "minor_closed": minor_closed,
        "top_resolvers": top_resolvers,
    }


@router.get("/closure-monitor/table", response_model=PaginatedDefects)
def get_closure_monitor_table(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    type: Optional[str] = "closed", # 'closed', 'created', 'all'
    created_age: Optional[str] = None, # 'today', 'new', 'recent', 'old', 'overdue'
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    module_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Detailed Table for Defect Closure Monitor (matches Dashboard Utama calculation).
    """
    query = db.query(Defect).filter(Defect.defect_criteria == 'Defect')
    today_date = date.today()

    if type == "closed":
        query = query.filter(Defect.status == 'Closed')
        if date_from: query = query.filter(Defect.date_closed >= date_from)
        if date_to: query = query.filter(Defect.date_closed <= date_to)
        sort_col = Defect.id.desc()
    elif type == "created":
        if date_from: query = query.filter(Defect.date_created >= date_from)
        if date_to: query = query.filter(Defect.date_created <= date_to)
        sort_col = Defect.date_created.desc()
    else:
        if date_from: query = query.filter(or_(Defect.date_created >= date_from, Defect.date_closed >= date_from))
        if date_to: query = query.filter(or_(Defect.date_created <= date_to, Defect.date_closed <= date_to))
        sort_col = Defect.id.desc()

    if created_age == "today":
        query = query.filter(Defect.date_created == today_date)
    elif created_age == "new":
        query = query.filter(Defect.aging <= 3)
    elif created_age == "recent":
        query = query.filter(Defect.aging >= 4, Defect.aging <= 7)
    elif created_age == "old":
        query = query.filter(Defect.aging > 7)
    elif created_age == "overdue":
        query = query.filter(Defect.aging > 14)

    if module_id: query = query.filter(Defect.module_id == module_id)
    if search:
        s = f"%{search}%"
        query = query.filter(or_(Defect.defect_id.ilike(s), Defect.summary.ilike(s), Defect.description.ilike(s)))

    total = query.count()
    offset = (page - 1) * page_size
    defects = query.order_by(sort_col).offset(offset).limit(page_size).all()

    items = []
    for d in defects:
        module = db.query(Module).filter(Module.id == d.module_id).first()
        sub_module = db.query(SubModule).filter(SubModule.id == d.sub_module_id).first()
        items.append(DefectResponse(
            id=d.id,
            defect_id=d.defect_id,
            module_id=d.module_id,
            sub_module_id=d.sub_module_id,
            module_name=module.name if module else None,
            sub_module_name=sub_module.name if sub_module else None,
            summary=d.summary,
            stage=d.stage,
            environment=d.environment,
            description=d.description,
            issue_link=d.issue_link,
            impact_of_issue=d.impact_of_issue,
            level_of_defect=d.level_of_defect,
            scoring_level=d.scoring_level,
            priority=d.priority,
            defect_criteria=d.defect_criteria,
            status=d.status,
            date_created=d.date_created,
            date_reopened=d.date_reopened,
            date_closed=d.date_closed,
            aging=d.aging,
            created_by=d.created_by,
            last_retested_by=d.last_retested_by,
            fixing_confirmed_by=d.fixing_confirmed_by,
            estimated_fix_date=d.estimated_fix_date,
            fixing_review_status=d.fixing_review_status,
            keterangan=d.keterangan,
            retesting=d.retesting,
            created_at=d.created_at,
        ))

    return PaginatedDefects(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1
    )


@router.get("/{defect_id}", response_model=DefectResponse)
def get_defect(defect_id: str, db: Session = Depends(get_db)):
    d = db.query(Defect).filter(Defect.defect_id == defect_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")

    module = db.query(Module).filter(Module.id == d.module_id).first()
    sub_module = db.query(SubModule).filter(SubModule.id == d.sub_module_id).first()

    return DefectResponse(
        id=d.id,
        defect_id=d.defect_id,
        module_id=d.module_id,
        sub_module_id=d.sub_module_id,
        module_name=module.name if module else None,
        sub_module_name=sub_module.name if sub_module else None,
        summary=d.summary,
        stage=d.stage,
        environment=d.environment,
        description=d.description,
        issue_link=d.issue_link,
        impact_of_issue=d.impact_of_issue,
        level_of_defect=d.level_of_defect,
        scoring_level=d.scoring_level,
        priority=d.priority,
        defect_criteria=d.defect_criteria,
        status=d.status,
        date_created=d.date_created,
        date_reopened=d.date_reopened,
        date_closed=d.date_closed,
        aging=d.aging,
        created_by=d.created_by,
        last_retested_by=d.last_retested_by,
        fixing_confirmed_by=d.fixing_confirmed_by,
        estimated_fix_date=d.estimated_fix_date,
        fixing_review_status=d.fixing_review_status,
        keterangan=d.keterangan,
        retesting=d.retesting,
        created_at=d.created_at,
    )


@router.post("/", response_model=DefectResponse)
def create_defect(defect: DefectCreate, db: Session = Depends(get_db)):
    existing = db.query(Defect).filter(Defect.defect_id == defect.defect_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Defect ID already exists")

    db_defect = Defect(**defect.model_dump())
    db.add(db_defect)
    db.commit()
    db.refresh(db_defect)

    module = db.query(Module).filter(Module.id == db_defect.module_id).first()
    sub_module = db.query(SubModule).filter(SubModule.id == db_defect.sub_module_id).first()

    return DefectResponse(
        id=db_defect.id,
        defect_id=db_defect.defect_id,
        module_id=db_defect.module_id,
        sub_module_id=db_defect.sub_module_id,
        module_name=module.name if module else None,
        sub_module_name=sub_module.name if sub_module else None,
        summary=db_defect.summary,
        stage=db_defect.stage,
        environment=db_defect.environment,
        description=db_defect.description,
        issue_link=db_defect.issue_link,
        level_of_defect=db_defect.level_of_defect,
        scoring_level=db_defect.scoring_level,
        priority=db_defect.priority,
        defect_criteria=db_defect.defect_criteria,
        status=db_defect.status,
        date_created=db_defect.date_created,
        date_reopened=db_defect.date_reopened,
        date_closed=db_defect.date_closed,
        aging=db_defect.aging,
        created_by=db_defect.created_by,
        last_retested_by=db_defect.last_retested_by,
        fixing_confirmed_by=db_defect.fixing_confirmed_by,
        fixing_review_status=db_defect.fixing_review_status,
        keterangan=db_defect.keterangan,
        retesting=db_defect.retesting,
        created_at=db_defect.created_at,
    )


@router.patch("/{defect_id}", response_model=DefectResponse)
def update_defect(defect_id: str, update: DefectUpdate, db: Session = Depends(get_db)):
    d = db.query(Defect).filter(Defect.defect_id == defect_id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Defect not found")

    update_data = update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(d, key, value)

    db.commit()
    db.refresh(d)

    module = db.query(Module).filter(Module.id == d.module_id).first()
    sub_module = db.query(SubModule).filter(SubModule.id == d.sub_module_id).first()

    return DefectResponse(
        id=d.id,
        defect_id=d.defect_id,
        module_id=d.module_id,
        sub_module_id=d.sub_module_id,
        module_name=module.name if module else None,
        sub_module_name=sub_module.name if sub_module else None,
        summary=d.summary,
        stage=d.stage,
        environment=d.environment,
        description=d.description,
        issue_link=d.issue_link,
        level_of_defect=d.level_of_defect,
        scoring_level=d.scoring_level,
        priority=d.priority,
        defect_criteria=d.defect_criteria,
        status=d.status,
        date_created=d.date_created,
        date_reopened=d.date_reopened,
        date_closed=d.date_closed,
        aging=d.aging,
        created_by=d.created_by,
        last_retested_by=d.last_retested_by,
        fixing_confirmed_by=d.fixing_confirmed_by,
        fixing_review_status=d.fixing_review_status,
        keterangan=d.keterangan,
        retesting=d.retesting,
        created_at=d.created_at,
    )
