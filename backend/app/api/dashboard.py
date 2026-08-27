from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_
from app.database import get_db
from app.models.models import Defect, Module, SubModule, DefectScoring, SitConfig
from app.schemas.schemas import (
    DashboardOverview, DefectByLevel, DefectByModule, DefectByStatus,
    DefectTrend, TesterWorkload, DefectScoringResponse,
    PriorityDistribution, AgingDistribution
)
from typing import List, Optional

router = APIRouter()


@router.get("/overview", response_model=DashboardOverview)
def get_overview(db: Session = Depends(get_db)):
    total = db.query(func.count(Defect.id)).filter(Defect.defect_criteria == 'Defect').scalar() or 0
    total_open = db.query(func.count(Defect.id)).filter(
        Defect.defect_criteria == 'Defect',
        Defect.status.in_(['Open', 'Re-Opened'])
    ).scalar() or 0
    total_closed = db.query(func.count(Defect.id)).filter(
        Defect.defect_criteria == 'Defect',
        Defect.status == 'Closed'
    ).scalar() or 0
    total_non_defect = db.query(func.count(Defect.id)).filter(
        Defect.defect_criteria == 'Non-Defect'
    ).scalar() or 0
    total_under_review = db.query(func.count(Defect.id)).filter(
        Defect.status.in_(['Under Review', 'Confirmed'])
    ).scalar() or 0

    avg_aging = db.query(func.avg(Defect.aging)).filter(
        Defect.defect_criteria == 'Defect'
    ).scalar() or 0.0

    defect_rate = (total / (total + total_non_defect) * 100) if (total + total_non_defect) > 0 else 0
    resolution_rate = (total_closed / total * 100) if total > 0 else 0

    config = db.query(SitConfig).first()

    return DashboardOverview(
        total_defects=total,
        total_open=total_open,
        total_closed=total_closed,
        total_non_defect=total_non_defect,
        total_under_review=total_under_review,
        defect_rate=round(defect_rate, 1),
        resolution_rate=round(resolution_rate, 1),
        avg_aging=round(float(avg_aging), 1),
        sit_date=str(config.sit_date) if config else None,
        project_name=config.project_name if config else None
    )


@router.get("/defects-by-level", response_model=List[DefectByLevel])
def get_defects_by_level(db: Session = Depends(get_db)):
    levels = ['Fatal', 'Major', 'Minor', 'Kosmetik']
    weights = {'Fatal': 25, 'Major': 10, 'Minor': 2, 'Kosmetik': 1}
    result = []

    for level in levels:
        count = db.query(func.count(Defect.id)).filter(
            Defect.level_of_defect == level,
            Defect.defect_criteria == 'Defect'
        ).scalar() or 0
        result.append(DefectByLevel(
            level=level,
            count=count,
            weight=weights[level],
            score=count * weights[level]
        ))
    return result


@router.get("/defects-by-module", response_model=List[DefectByModule])
def get_defects_by_module(db: Session = Depends(get_db)):
    modules = db.query(Module).all()
    result = []
    for mod in modules:
        total = db.query(func.count(Defect.id)).filter(
            Defect.module_id == mod.id,
            Defect.defect_criteria == 'Defect'
        ).scalar() or 0
        open_count = db.query(func.count(Defect.id)).filter(
            Defect.module_id == mod.id,
            Defect.defect_criteria == 'Defect',
            Defect.status.in_(['Open', 'Re-Opened'])
        ).scalar() or 0
        closed_count = db.query(func.count(Defect.id)).filter(
            Defect.module_id == mod.id,
            Defect.defect_criteria == 'Defect',
            Defect.status == 'Closed'
        ).scalar() or 0
        result.append(DefectByModule(
            module=mod.name,
            total=total,
            open=open_count,
            closed=closed_count
        ))
    return result


@router.get("/defects-by-status", response_model=List[DefectByStatus])
def get_defects_by_status(db: Session = Depends(get_db)):
    statuses = db.query(
        Defect.status, func.count(Defect.id)
    ).filter(
        Defect.defect_criteria == 'Defect'
    ).group_by(Defect.status).all()

    return [DefectByStatus(status=s[0], count=s[1]) for s in statuses]


@router.get("/defect-trend", response_model=List[DefectTrend])
def get_defect_trend(db: Session = Depends(get_db)):
    # Get all created dates
    created = db.query(
        Defect.date_created, func.count(Defect.id)
    ).filter(
        Defect.date_created.isnot(None),
        Defect.defect_criteria == 'Defect'
    ).group_by(Defect.date_created).order_by(Defect.date_created).all()

    # Get all closed dates
    closed = db.query(
        Defect.date_closed, func.count(Defect.id)
    ).filter(
        Defect.date_closed.isnot(None),
        Defect.defect_criteria == 'Defect'
    ).group_by(Defect.date_closed).order_by(Defect.date_closed).all()

    # Build date map
    date_map = {}
    for d, c in created:
        ds = str(d)
        if ds not in date_map:
            date_map[ds] = {"created": 0, "closed": 0}
        date_map[ds]["created"] = c

    for d, c in closed:
        ds = str(d)
        if ds not in date_map:
            date_map[ds] = {"created": 0, "closed": 0}
        date_map[ds]["closed"] = c

    # Calculate cumulative
    sorted_dates = sorted(date_map.keys())
    result = []
    cumulative = 0
    for d in sorted_dates:
        cumulative += date_map[d]["created"] - date_map[d]["closed"]
        result.append(DefectTrend(
            date=d,
            created=date_map[d]["created"],
            closed=date_map[d]["closed"],
            cumulative_open=cumulative
        ))

    return result


@router.get("/tester-workload", response_model=List[TesterWorkload])
def get_tester_workload(db: Session = Depends(get_db)):
    # Created by
    created_by = db.query(
        Defect.created_by, func.count(Defect.id)
    ).filter(
        Defect.created_by.isnot(None),
        Defect.defect_criteria == 'Defect'
    ).group_by(Defect.created_by).all()

    # Last retested by
    retested_by = db.query(
        Defect.last_retested_by, func.count(Defect.id)
    ).filter(
        Defect.last_retested_by.isnot(None),
        Defect.defect_criteria == 'Defect'
    ).group_by(Defect.last_retested_by).all()

    tester_map = {}
    for name, count in created_by:
        tester_map[name] = {"created": count, "retested": 0}
    for name, count in retested_by:
        if name not in tester_map:
            tester_map[name] = {"created": 0, "retested": 0}
        tester_map[name]["retested"] = count

    return [
        TesterWorkload(tester=name, created=data["created"], retested=data["retested"])
        for name, data in tester_map.items()
    ]


@router.get("/scoring", response_model=List[DefectScoringResponse])
def get_scoring(db: Session = Depends(get_db)):
    scores = db.query(DefectScoring).order_by(DefectScoring.weight.desc()).all()
    return [
        DefectScoringResponse(
            category=s.category,
            weight=s.weight,
            total_closed=s.total_closed,
            total_open=s.total_open,
            score_open=s.score_open
        ) for s in scores
    ]


@router.get("/priority-distribution", response_model=List[PriorityDistribution])
def get_priority_distribution(db: Session = Depends(get_db)):
    priorities = db.query(
        Defect.priority, func.count(Defect.id)
    ).filter(
        Defect.priority.isnot(None),
        Defect.defect_criteria == 'Defect'
    ).group_by(Defect.priority).all()

    return [PriorityDistribution(priority=p[0], count=p[1]) for p in priorities]


@router.get("/aging-distribution", response_model=List[AgingDistribution])
def get_aging_distribution(db: Session = Depends(get_db)):
    ranges = [
        ("0-3 hari", 0, 3),
        ("4-7 hari", 4, 7),
        ("8-14 hari", 8, 14),
        ("15+ hari", 15, 9999),
    ]
    result = []
    for label, low, high in ranges:
        count = db.query(func.count(Defect.id)).filter(
            Defect.defect_criteria == 'Defect',
            Defect.aging >= low,
            Defect.aging <= high
        ).scalar() or 0
        result.append(AgingDistribution(range=label, count=count))
    return result


@router.get("/fixing-status")
def get_fixing_status(db: Session = Depends(get_db)):
    statuses = db.query(
        Defect.fixing_review_status, func.count(Defect.id)
    ).filter(
        Defect.fixing_review_status.isnot(None),
        Defect.defect_criteria == 'Defect'
    ).group_by(Defect.fixing_review_status).all()

    return [{"status": s[0], "count": s[1]} for s in statuses]
