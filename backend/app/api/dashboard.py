from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_
from app.database import get_db
from app.models.models import (
    Defect, Module, SubModule, DefectScoring, SitConfig, Project,
    TestScript, TestCase, TestExecution, TestStepResult
)
from app.schemas.schemas import (
    DashboardOverview, DefectByLevel, DefectByModule, DefectByStatus,
    DefectTrend, TesterWorkload, DefectScoringResponse,
    PriorityDistribution, AgingDistribution
)
from typing import List, Optional
from datetime import date, timedelta
from collections import defaultdict

router = APIRouter()


def _date_range(date_from: Optional[date], date_to: Optional[date]):
    end = date_to or date.today()
    start = date_from or (end - timedelta(days=29))
    return start, end


def _pct(current, previous):
    if not previous:
        return 100.0 if current else 0.0
    return round(((current - previous) / previous) * 100, 1)


def _trend(current, previous):
    change = _pct(current, previous)
    return {"value": current, "previous": previous, "change": change}


@router.get("/overview-v2")
def get_overview_v2(
    project_id: Optional[int] = None,
    phase: Optional[str] = None,
    module_id: Optional[int] = None,
    sub_module_id: Optional[int] = None,
    tester: Optional[str] = None,
    severity: Optional[str] = None,
    defect_status: Optional[str] = None,
    fixing_status: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    db: Session = Depends(get_db),
):
    """Aggregated SIT overview used by the executive dashboard.

    Metrics are calculated from the current test-script, V2 execution, and
    legacy defect tables. The response is intentionally a single payload so
    all dashboard cards and charts use the exact same filters.
    """
    start, end = _date_range(date_from, date_to)
    previous_start = start - (end - start + timedelta(days=1))
    previous_end = start - timedelta(days=1)

    scripts = db.query(TestScript).filter(
        or_(TestScript.completion_date.is_(None), TestScript.completion_date <= end),
        or_(TestScript.completion_date.is_(None), TestScript.completion_date >= start),
    )
    if module_id:
        scripts = scripts.filter(TestScript.module_id == module_id)
    if sub_module_id:
        scripts = scripts.filter(TestScript.sub_module_id == sub_module_id)
    if tester:
        scripts = scripts.filter(TestScript.tester == tester)
    if phase:
        scripts = scripts.filter(TestScript.stage == phase)
    script_rows = scripts.all()

    cases = db.query(TestCase)
    if project_id:
        cases = cases.filter(TestCase.project_id == project_id)
    if module_id:
        cases = cases.filter(TestCase.module_id == module_id)
    if phase:
        cases = cases.filter(TestCase.stage == phase)
    case_rows = cases.all()
    case_ids = {c.id for c in case_rows}

    # The current V2 importer stores the primary SIT catalogue in test_cases;
    # use it as the script catalogue when the legacy test_scripts table is empty.
    script_catalog = script_rows or case_rows

    executions = db.query(TestExecution).filter(
        TestExecution.created_at >= start,
        TestExecution.created_at < end + timedelta(days=1),
    )
    if tester:
        executions = executions.filter(TestExecution.tester_name == tester)
    execution_rows = executions.all()
    execution_rows = [e for e in execution_rows if not case_ids or e.test_case_id in case_ids]

    execution_ids = [e.id for e in execution_rows]
    result_rows = db.query(TestStepResult).filter(
        TestStepResult.execution_id.in_(execution_ids)
    ).all() if execution_ids else []
    result_map = defaultdict(list)
    for r in result_rows:
        result_map[r.execution_id].append((r.status or "NOT_RUN").upper())

    execution_counts = {"total": len(execution_rows), "passed": 0, "failed": 0, "not_run": 0}
    for execution in execution_rows:
        statuses = result_map.get(execution.id, [])
        if statuses and all(s == "PASS" for s in statuses):
            execution_counts["passed"] += 1
        elif any(s in ("FAIL", "BLOCKED") for s in statuses):
            execution_counts["failed"] += 1
        else:
            execution_counts["not_run"] += 1

    defects = db.query(Defect).filter(Defect.defect_criteria == "Defect")
    if module_id:
        defects = defects.filter(Defect.module_id == module_id)
    if sub_module_id:
        defects = defects.filter(Defect.sub_module_id == sub_module_id)
    if severity:
        defects = defects.filter(Defect.level_of_defect == severity)
    if defect_status:
        defects = defects.filter(Defect.status == defect_status)
    if fixing_status:
        defects = defects.filter(or_(
            Defect.fixing_review_status == fixing_status,
            Defect.fixing_status_by_vendor == fixing_status,
        ))
    if tester:
        defects = defects.filter(or_(Defect.created_by == tester, Defect.last_retested_by == tester))
    defect_rows = defects.all()

    def defects_in_period(rows, period_start, period_end):
        return [d for d in rows if d.date_created and period_start <= d.date_created <= period_end]

    def closed_in_period(rows, period_start, period_end):
        return [d for d in rows if d.date_closed and period_start <= d.date_closed <= period_end]

    current_new = defects_in_period(defect_rows, start, end)
    current_closed = closed_in_period(defect_rows, start, end)
    previous_new = defects_in_period(defect_rows, previous_start, previous_end)
    previous_closed = closed_in_period(defect_rows, previous_start, previous_end)
    open_rows = [d for d in defect_rows if d.status in ("Open", "Re-Opened", "Under Review", "Confirmed")]
    ready_rows = [d for d in defect_rows if (d.fixing_review_status or "").lower() in ("ready to test", "ready_to_test")]
    done_rows = [d for d in defect_rows if (d.fixing_review_status or "").lower() in ("done", "done dev", "fixed") or (d.fixing_status_by_vendor or "").lower() in ("done", "done dev", "fixed")]
    total_defects = len(defect_rows)
    closed_total = sum(1 for d in defect_rows if d.status == "Closed")
    progress = round((execution_counts["passed"] / execution_counts["total"] * 100), 1) if execution_counts["total"] else 0

    daily = []
    cursor = start
    while cursor <= end:
        new_count = sum(1 for d in defect_rows if d.date_created == cursor)
        closed_count = sum(1 for d in defect_rows if d.date_closed == cursor)
        day_executions = [e for e in execution_rows if e.created_at and e.created_at.date() == cursor]
        day_passed = sum(1 for e in day_executions if result_map.get(e.id) and all(s == "PASS" for s in result_map[e.id]))
        day_failed = sum(1 for e in day_executions if any(s in ("FAIL", "BLOCKED") for s in result_map.get(e.id, [])))
        day_new_defects = [d for d in defect_rows if d.date_created == cursor]
        day_closed_defects = [d for d in defect_rows if d.date_closed == cursor]

        def execution_status(execution):
            statuses = result_map.get(execution.id, [])
            if statuses and all(s == "PASS" for s in statuses):
                return "PASS"
            if any(s in ("FAIL", "BLOCKED") for s in statuses):
                return "FAIL"
            return "NOT_RUN"

        def defect_detail(defect):
            return {
                "defect_id": defect.defect_id,
                "summary": defect.summary,
                "severity": defect.level_of_defect,
                "status": defect.status,
                "fixing_status": defect.fixing_review_status or defect.fixing_status_by_vendor,
                "vendor_status": defect.fixing_status_by_vendor,
                "created_by": defect.created_by,
                "last_retested_by": defect.last_retested_by,
                "aging": defect.aging or 0,
            }

        # Defect only stores the latest fixing value, not a status-change log.
        # Build a snapshot for the selected day so the count and detail list
        # refer to the same population instead of only new/closed defects.
        snapshot_defects = [
            d for d in defect_rows
            if d.date_created and d.date_created <= cursor
            and (not d.date_closed or d.date_closed > cursor)
        ]
        fixing_details = defaultdict(list)
        for defect in snapshot_defects:
            raw_status = defect.fixing_review_status or defect.fixing_status_by_vendor
            status_text = raw_status or "Belum ada status"
            fixing_details[status_text].append(defect_detail(defect))
        daily.append({
            "date": str(cursor), "executed": len(day_executions), "passed": day_passed,
            "failed": day_failed, "new_defect": new_count, "closed_defect": closed_count,
            "net_defect": new_count - closed_count,
            "open_defect": sum(1 for d in defect_rows if d.date_created and d.date_created <= cursor and (not d.date_closed or d.date_closed > cursor)),
            "ready_to_test": sum(1 for d in defect_rows if d.date_created and d.date_created <= cursor and (d.fixing_review_status or "").lower() in ("ready to test", "ready_to_test")),
            "done_dev": sum(1 for d in defect_rows if d.date_created and d.date_created <= cursor and (d.fixing_review_status or "").lower() in ("done", "done dev", "fixed")),
            "execution_details": [{"execution_no": e.execution_no, "tester": e.tester_name or "Unassigned", "test_case_id": e.test_case_id, "status": execution_status(e), "step_results": result_map.get(e.id, [])} for e in day_executions],
            "new_defect_details": [defect_detail(d) for d in day_new_defects],
            "closed_defect_details": [defect_detail(d) for d in day_closed_defects],
            "fixing_breakdown": [{"status": status, "count": len(items)} for status, items in sorted(fixing_details.items())],
            "fixing_status_details": [{"status": status, "count": len(items), "defects": items} for status, items in sorted(fixing_details.items())],
        })
        cursor += timedelta(days=1)

    severity_rows = []
    for level in ("Fatal", "Major", "Minor", "Kosmetik"):
        level_rows = [d for d in defect_rows if d.level_of_defect == level]
        severity_rows.append({"severity": level, "open": sum(1 for d in level_rows if d.status != "Closed"), "closed": sum(1 for d in level_rows if d.status == "Closed"), "total": len(level_rows)})

    aging_ranges = [("0-1 hari", 0, 1), ("2-3 hari", 2, 3), ("4-7 hari", 4, 7), ("8-14 hari", 8, 14), (">14 hari", 15, 999999)]
    aging = [{"range": label, "count": sum(1 for d in open_rows if low <= (d.aging or 0) <= high)} for label, low, high in aging_ranges]

    module_rows = []
    for module in db.query(Module).order_by(Module.name).all():
        module_defects = [d for d in defect_rows if d.module_id == module.id]
        module_scripts = [s for s in script_catalog if s.module_id == module.id]
        module_rows.append({"module": module.name, "total_test": len(module_scripts), "passed": sum(1 for s in module_scripts if (getattr(s, "status_by_tester", None) or "").upper() == "PASS"), "failed": sum(1 for s in module_scripts if (getattr(s, "status_by_tester", None) or "").upper() == "FAIL"), "not_run": sum(1 for s in module_scripts if (getattr(s, "status_by_tester", None) or "").upper() not in ("PASS", "FAIL")), "total_defect": len(module_defects), "open": sum(1 for d in module_defects if d.status != "Closed"), "closed": sum(1 for d in module_defects if d.status == "Closed"), "ready_to_test": sum(1 for d in module_defects if (d.fixing_review_status or "").lower() in ("ready to test", "ready_to_test") )})

    tester_map = defaultdict(lambda: {"total_script": 0, "passed": 0, "failed": 0, "not_run": 0, "defect_found": 0, "defect_retested": 0})
    for script in script_catalog:
        name = getattr(script, "tester", None) or "Unassigned"
        tester_map[name]["total_script"] += 1
        status = (getattr(script, "status_by_tester", None) or "").upper()
        if status == "PASS": tester_map[name]["passed"] += 1
        elif status == "FAIL": tester_map[name]["failed"] += 1
        else: tester_map[name]["not_run"] += 1
    for defect in defect_rows:
        if defect.created_by: tester_map[defect.created_by]["defect_found"] += 1
        if defect.last_retested_by: tester_map[defect.last_retested_by]["defect_retested"] += 1

    fixing_labels = ["New", "Fix in Progress", "Done Dev", "Ready to Test", "Retest", "Closed", "Re-open"]
    fixing_workflow = []
    for label in fixing_labels:
        if label == "New": count = sum(1 for d in defect_rows if not d.fixing_review_status and d.status != "Closed")
        elif label == "Closed": count = sum(1 for d in defect_rows if d.status == "Closed")
        elif label == "Re-open": count = sum(1 for d in defect_rows if d.status == "Re-Opened")
        elif label == "Retest": count = sum(1 for d in defect_rows if (d.retesting or "").strip())
        else: count = sum(1 for d in defect_rows if label.lower() in ((d.fixing_review_status or "") + " " + (d.fixing_status_by_vendor or "")).lower())
        fixing_workflow.append({"status": label, "count": count})

    total_days = max((end - start).days + 1, 1)
    avg_fixing = round(sum((d.date_closed - d.date_created).days for d in defect_rows if d.date_created and d.date_closed and d.date_closed >= d.date_created) / max(closed_total, 1), 1)
    return {
        "filters": {"date_from": str(start), "date_to": str(end)},
        "health": {"progress": progress, "status": "ON TRACK" if progress >= 80 and len(open_rows) <= len(defect_rows) * 0.4 else "AT RISK", "notes": [f"{len(open_rows)} defect masih open", f"{sum(1 for d in open_rows if (d.aging or 0) > 14)} defect aging >14 hari", f"Closure rate {round(closed_total / total_defects * 100, 1) if total_defects else 0}%"]},
        "kpis": {"total_test_script": len(script_catalog), "total_test_case": len(case_rows), "total_execution": execution_counts["total"], "passed": execution_counts["passed"], "failed": execution_counts["failed"], "not_run": execution_counts["not_run"], "progress": progress, "total_defect": total_defects, "open_defect": len(open_rows), "closed_defect": closed_total, "ready_to_test": len(ready_rows), "done_dev": len(done_rows), "new_today": sum(1 for d in defect_rows if d.date_created == date.today()), "closed_today": sum(1 for d in defect_rows if d.date_closed == date.today())},
        "comparison": {"new_defect": _trend(len(current_new), len(previous_new)), "closed_defect": _trend(len(current_closed), len(previous_closed)), "open_defect": _trend(len(open_rows), len([d for d in defect_rows if d.status != "Closed" and d.date_created and previous_start <= d.date_created <= previous_end])), "progress": _trend(progress, round((len(previous_closed) / max(len(previous_new), 1)) * 100, 1))},
        "daily": daily, "severity": severity_rows, "aging": aging, "modules": module_rows,
        "testers": [{"tester": name, **values} for name, values in sorted(tester_map.items())],
        "fixing_workflow": fixing_workflow,
        "productivity": {"avg_execution_per_day": round(execution_counts["total"] / total_days, 1), "avg_defect_found_per_day": round(len(current_new) / total_days, 1), "avg_defect_closed_per_day": round(len(current_closed) / total_days, 1), "closure_rate": round(closed_total / total_defects * 100, 1) if total_defects else 0, "avg_fixing_days": avg_fixing, "estimated_days_to_close": round(len(open_rows) / max(len(current_closed) / total_days, 0.1), 1)},
        "targets": {"execution": {"target": 3500, "actual": execution_counts["total"]}, "defect_closure": {"target": total_defects, "actual": closed_total}, "sit_progress": {"target": 100, "actual": progress}, "status": "ON TRACK" if progress >= 70 else "AT RISK"},
        "projects": [{"id": p.id, "name": p.project_name, "phase": p.phase} for p in db.query(Project).order_by(Project.project_name).all()],
    }


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
