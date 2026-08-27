from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from app.database import get_db
from app.models.models import (
    Defect, Module, SubModule, TestScript, TestCase, TestStep,
    TestExecution, TestStepResult, DefectV2, SitConfig
)
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from io import BytesIO
from datetime import datetime, date
from typing import List, Optional
import math
import re

router = APIRouter()

@router.get("/health-index")
def get_sit_health_index(db: Session = Depends(get_db)):
    """
    Calculate SIT Health Index V2 & Readiness Score.
    """
    total_defects = db.query(func.count(Defect.id)).filter(Defect.defect_criteria == 'Defect').scalar() or 0
    open_defects = db.query(func.count(Defect.id)).filter(Defect.defect_criteria == 'Defect', Defect.status.in_(['Open', 'Re-Opened'])).scalar() or 0
    closed_defects = db.query(func.count(Defect.id)).filter(Defect.defect_criteria == 'Defect', Defect.status == 'Closed').scalar() or 0

    fatal_open = db.query(func.count(Defect.id)).filter(Defect.defect_criteria == 'Defect', Defect.status.in_(['Open', 'Re-Opened']), Defect.level_of_defect == 'Fatal').scalar() or 0
    major_open = db.query(func.count(Defect.id)).filter(Defect.defect_criteria == 'Defect', Defect.status.in_(['Open', 'Re-Opened']), Defect.level_of_defect == 'Major').scalar() or 0
    minor_open = db.query(func.count(Defect.id)).filter(Defect.defect_criteria == 'Defect', Defect.status.in_(['Open', 'Re-Opened']), Defect.level_of_defect == 'Minor').scalar() or 0
    kosmetik_open = db.query(func.count(Defect.id)).filter(Defect.defect_criteria == 'Defect', Defect.status.in_(['Open', 'Re-Opened']), Defect.level_of_defect == 'Kosmetik').scalar() or 0

    # Total test cases & executed steps in V2 or V1
    tc_v2_count = db.query(func.count(TestCase.id)).scalar() or 0
    ts_v1_count = db.query(func.count(TestScript.id)).scalar() or 0
    total_cases = max(tc_v2_count, ts_v1_count)

    penalty = (fatal_open * 25) + (major_open * 10) + (minor_open * 2) + (kosmetik_open * 1)
    base_denominator = max(total_cases, 100)
    health_score = max(0.0, min(100.0, round(100.0 - ((penalty / base_denominator) * 10), 1)))

    if fatal_open > 0 or health_score < 70:
        readiness_status = "HOLD (CRITICAL BUGS)"
        readiness_color = "red"
    elif major_open > 5 or health_score < 85:
        readiness_status = "CONDITIONAL (NEEDS FIXES)"
        readiness_color = "orange"
    else:
        readiness_status = "GO-LIVE READY"
        readiness_color = "emerald"

    # Count discrepancies
    discrepancy_count = db.query(func.count(func.distinct(Defect.id))).join(
        TestScript, func.trim(func.lower(Defect.issue_link)) == func.trim(func.lower(TestScript.test_case_id))
    ).filter(
        Defect.status.in_(['Open', 'Re-Opened']),
        TestScript.status_by_tester.ilike("pass%")
    ).scalar() or 0

    return {
        "health_score": health_score,
        "readiness_status": readiness_status,
        "readiness_color": readiness_color,
        "total_defects": total_defects,
        "open_defects": open_defects,
        "closed_defects": closed_defects,
        "fatal_open": fatal_open,
        "major_open": major_open,
        "minor_open": minor_open,
        "kosmetik_open": kosmetik_open,
        "total_test_cases": total_cases,
        "discrepancy_count": discrepancy_count,
    }


@router.get("/matrix")
def get_traceability_matrix_v2(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = None, # 'linked', 'unlinked', 'discrepancy', 'fail', 'pass'
    module_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get Step-Level Traceability Matrix V2.
    Queries TestCase, TestStep, Latest TestExecution & Linked Defects per step.
    """
    # If V2 test_cases exist, use V2; else fallback gracefully to V1
    tc_count = db.query(func.count(TestCase.id)).scalar() or 0

    if tc_count > 0:
        query = db.query(TestCase)
        if module_id:
            query = query.filter(TestCase.module_id == module_id)
        if search:
            s = f"%{search}%"
            query = query.filter(
                or_(
                    TestCase.test_case_id.ilike(s),
                    TestCase.summary.ilike(s),
                    TestCase.case_description.ilike(s)
                )
            )

        all_cases = query.order_by(TestCase.id.desc()).all()
        matrix_rows = []

        for tc in all_cases:
            mod_name = tc.module.name if tc.module else "General Module"
            latest_exec = db.query(TestExecution).filter(
                TestExecution.test_case_id == tc.id
            ).order_by(desc(TestExecution.execution_no)).first()

            # Find defects linked strictly by exact issue_link ONLY
            tc_clean = tc.test_case_id.strip().lower()
            tc_defects = db.query(Defect).filter(
                Defect.issue_link.isnot(None),
                Defect.issue_link != '',
                func.trim(func.lower(Defect.issue_link)) == tc_clean
            ).all()

            steps_detail = []
            case_has_open_defect = False
            case_has_fail = False
            case_has_pass = False

            for step in tc.test_steps:
                # Find step result in latest execution
                step_res = None
                if latest_exec:
                    step_res = db.query(TestStepResult).filter(
                        TestStepResult.execution_id == latest_exec.id,
                        TestStepResult.test_step_id == step.id
                    ).first()

                step_status = (step_res.status if step_res else "NOT_RUN").upper()
                step_keterangan = step_res.keterangan if step_res else None

                if step_status == "FAIL": case_has_fail = True
                if step_status == "PASS": case_has_pass = True

                # Match defects specifically for this step (by defect_code in keterangan OR exact issue_link)
                step_linked_defects = []
                for d in tc_defects:
                    d_code = d.defect_id.lower()
                    # Check if defect_id mentioned in step keterangan OR if step text matches
                    if step_keterangan and d_code in step_keterangan.lower():
                        step_linked_defects.append(d)
                        if d.status in ['Open', 'Re-Opened']: case_has_open_defect = True
                    elif not step_keterangan and step_status == "FAIL":
                        # If step is FAIL and defect belongs to this case, link it
                        step_linked_defects.append(d)
                        if d.status in ['Open', 'Re-Opened']: case_has_open_defect = True

                # If no specific step match but case has defects & step is FAIL
                if not step_linked_defects and step_status == "FAIL" and tc_defects:
                    step_linked_defects = tc_defects
                    if any(d.status in ['Open', 'Re-Opened'] for d in tc_defects):
                        case_has_open_defect = True

                defect_list = []
                for d in step_linked_defects:
                    defect_list.append({
                        "defect_id": d.defect_id,
                        "summary": d.summary,
                        "level": d.level_of_defect,
                        "priority": d.priority,
                        "status": d.status,
                        "confirmed_by": d.fixing_confirmed_by or d.created_by or "-",
                        "keterangan": d.keterangan,
                    })

                steps_detail.append({
                    "step_id": step.id,
                    "step_no": step.step_no,
                    "test_step": step.test_step,
                    "expected_result": step.expected_result,
                    "status": step_status,
                    "keterangan": step_keterangan,
                    "linked_defects": defect_list,
                    "has_open_defect": any(d['status'] in ['Open', 'Re-Opened'] for d in defect_list),
                })

            overall_status = "NOT RUN"
            if case_has_fail: overall_status = "FAIL"
            elif case_has_pass: overall_status = "PASS"

            is_discrepancy = (overall_status == "PASS" and case_has_open_defect)

            # Apply filters
            if status_filter == 'linked' and not tc_defects: continue
            if status_filter == 'unlinked' and tc_defects: continue
            if status_filter == 'discrepancy' and not is_discrepancy: continue
            if status_filter == 'fail' and overall_status != 'FAIL': continue
            if status_filter == 'pass' and overall_status != 'PASS': continue

            matrix_rows.append({
                "test_case_db_id": tc.id,
                "test_case_id": tc.test_case_id,
                "module_name": mod_name,
                "component": tc.component,
                "summary": tc.summary,
                "prerequisite": tc.prerequisite,
                "stage": tc.stage,
                "overall_status": overall_status,
                "last_tester": latest_exec.tester_name if latest_exec else None,
                "last_testing_date": str(latest_exec.completion_testing_date) if latest_exec else None,
                "execution_no": latest_exec.execution_no if latest_exec else 0,
                "steps": steps_detail,
                "total_steps": len(steps_detail),
                "has_open_defect": case_has_open_defect,
                "is_discrepancy": is_discrepancy,
            })

        total = len(matrix_rows)
        start = (page - 1) * page_size
        end = start + page_size
        items_paginated = matrix_rows[start:end]

        return {
            "items": items_paginated,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if total > 0 else 1
        }

    else:
        # Fallback to V1 TestScript matrix if test_cases table empty
        query = db.query(TestScript)
        if module_id: query = query.filter(TestScript.module_id == module_id)
        if search:
            s = f"%{search}%"
            query = query.filter(or_(TestScript.test_case_id.ilike(s), TestScript.summary.ilike(s)))

        all_scripts = query.order_by(TestScript.id.desc()).all()
        matrix_rows = []

        for ts in all_scripts:
            tc_clean = ts.test_case_id.strip().lower() if ts.test_case_id else ""
            tc_defects = db.query(Defect).filter(
                Defect.issue_link.isnot(None),
                func.trim(func.lower(Defect.issue_link)) == tc_clean
            ).all()

            mod_name = ts.module.name if ts.module else "General Module"
            ts_status = ts.status_by_tester or "Untested"
            has_open = any(d.status in ['Open', 'Re-Opened'] for d in tc_defects)
            is_disc = (ts_status.lower().startswith('pass') and has_open)

            defect_list = []
            for d in tc_defects:
                defect_list.append({
                    "defect_id": d.defect_id,
                    "summary": d.summary,
                    "level": d.level_of_defect,
                    "priority": d.priority,
                    "status": d.status,
                    "confirmed_by": d.fixing_confirmed_by or d.created_by or "-",
                    "keterangan": d.keterangan,
                })

            matrix_rows.append({
                "test_case_db_id": ts.id,
                "test_case_id": ts.test_case_id,
                "module_name": mod_name,
                "component": ts.components,
                "summary": ts.summary,
                "prerequisite": ts.prerequisite,
                "stage": ts.stage,
                "overall_status": ts_status,
                "last_tester": ts.tester,
                "last_testing_date": str(ts.completion_date) if ts.completion_date else None,
                "execution_no": 1,
                "steps": [
                    {
                        "step_id": ts.id,
                        "step_no": 1,
                        "test_step": ts.test_step or ts.summary,
                        "expected_result": ts.expected_result,
                        "status": ts_status,
                        "keterangan": ts.keterangan,
                        "linked_defects": defect_list,
                        "has_open_defect": has_open,
                    }
                ],
                "total_steps": 1,
                "has_open_defect": has_open,
                "is_discrepancy": is_disc,
            })

        total = len(matrix_rows)
        start = (page - 1) * page_size
        end = start + page_size
        return {
            "items": matrix_rows[start:end],
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if total > 0 else 1
        }


@router.post("/sync-statuses")
def sync_test_script_statuses(db: Session = Depends(get_db)):
    """
    1-Click Auto Sync:
    Synchronizes Test Case / Step execution status with latest Defect status.
    """
    tc_count = db.query(func.count(TestCase.id)).scalar() or 0
    synced_count = 0
    synced_details = []

    if tc_count > 0:
        all_cases = db.query(TestCase).all()
        for tc in all_cases:
            tc_defects = db.query(Defect).filter(
                Defect.issue_link.isnot(None),
                func.trim(func.lower(Defect.issue_link)) == func.trim(func.lower(tc.test_case_id))
            ).all()

            open_defs = [d for d in tc_defects if d.status in ['Open', 'Re-Opened']]
            latest_exec = db.query(TestExecution).filter(
                TestExecution.test_case_id == tc.id
            ).order_by(desc(TestExecution.execution_no)).first()

            if open_defs and latest_exec:
                for sr in latest_exec.step_results:
                    if sr.status.upper() == "PASS":
                        sr.status = "FAIL"
                        synced_count += 1
                        synced_details.append(f"{tc.test_case_id} Step {sr.test_step_id}: PASS -> FAIL (Defect Open)")
    else:
        all_scripts = db.query(TestScript).all()
        for ts in all_scripts:
            tc_defects = db.query(Defect).filter(
                Defect.issue_link.isnot(None),
                func.trim(func.lower(Defect.issue_link)) == func.trim(func.lower(ts.test_case_id))
            ).all()
            open_defs = [d for d in tc_defects if d.status in ['Open', 'Re-Opened']]
            if open_defs and ts.status_by_tester and ts.status_by_tester.upper() == "PASS":
                ts.status_by_tester = "FAIL"
                synced_count += 1
                synced_details.append(f"{ts.test_case_id}: PASS -> FAIL")

    db.commit()

    return {
        "success": True,
        "message": f"Berhasil menyinkronkan {synced_count} status langkah pengujian berdasarkan Defect Open terkini.",
        "synced_count": synced_count,
        "details": synced_details
    }


@router.get("/export-excel")
def export_traceability_excel(db: Session = Depends(get_db)):
    """Export Step-Level Traceability Matrix to Excel."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Traceability Matrix (RTM)"

    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    data_font = Font(name="Calibri", size=10)
    bold_font = Font(name="Calibri", bold=True, size=10)
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin")
    )
    fail_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    pass_fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    open_fill = PatternFill(start_color="FEF2F2", end_color="FEF2F2", fill_type="solid")

    ws.cell(row=1, column=1, value="REQUIREMENT TRACEABILITY MATRIX (RTM)").font = Font(name="Calibri", bold=True, size=14, color="1E3A5F")
    ws.cell(row=2, column=1, value=f"Project: Procurement Management System | Date: {date.today().strftime('%d-%m-%Y')}").font = Font(size=10, color="64748B")

    headers = [
        "No", "Modul", "Test Case ID", "Test Case Summary", "Step No", "Langkah Pengujian (Test Step)",
        "Hasil Step", "Terikat Defect ID", "Severity Bug", "Status Defect", "PIC Fixing", "Keterangan Log"
    ]

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    row_num = 5
    no_counter = 1

    all_cases = db.query(TestCase).order_by(TestCase.id.desc()).all()
    for tc in all_cases:
        mod_name = tc.module.name if tc.module else "General Module"
        latest_exec = db.query(TestExecution).filter(
            TestExecution.test_case_id == tc.id
        ).order_by(desc(TestExecution.execution_no)).first()

        tc_defects = db.query(Defect).filter(
            Defect.issue_link.isnot(None),
            func.trim(func.lower(Defect.issue_link)) == func.trim(func.lower(tc.test_case_id))
        ).all()

        for step in tc.test_steps:
            step_res = None
            if latest_exec:
                step_res = db.query(TestStepResult).filter(
                    TestStepResult.execution_id == latest_exec.id,
                    TestStepResult.test_step_id == step.id
                ).first()

            step_status = (step_res.status if step_res else "NOT_RUN").upper()
            step_keterangan = step_res.keterangan if step_res else "-"

            # Find defects for this step
            step_defects = [d for d in tc_defects if step_keterangan and d.defect_id.lower() in step_keterangan.lower()]
            if not step_defects and step_status == "FAIL":
                step_defects = tc_defects

            if step_defects:
                for d in step_defects:
                    row_vals = [
                        no_counter, mod_name, tc.test_case_id, tc.summary, step.step_no, step.test_step,
                        step_status, d.defect_id, d.level_of_defect or "-", d.status,
                        d.fixing_confirmed_by or d.created_by or "-", d.keterangan or "-"
                    ]
                    for c_idx, val in enumerate(row_vals, 1):
                        cell = ws.cell(row=row_num, column=c_idx, value=val)
                        cell.font = data_font
                        cell.border = thin_border
                        if c_idx in [1, 3, 5, 7, 8, 9, 10]:
                            cell.alignment = Alignment(horizontal="center", vertical="top")
                        else:
                            cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

                        if c_idx == 7:
                            if step_status == 'PASS': cell.fill = pass_fill
                            elif step_status == 'FAIL': cell.fill = fail_fill
                        if c_idx == 10 and d.status in ['Open', 'Re-Opened']:
                            cell.fill = open_fill
                            cell.font = Font(name="Calibri", bold=True, color="991B1B")

                    row_num += 1
            else:
                row_vals = [
                    no_counter, mod_name, tc.test_case_id, tc.summary, step.step_no, step.test_step,
                    step_status, "-", "-", "-", "-", step_keterangan
                ]
                for c_idx, val in enumerate(row_vals, 1):
                    cell = ws.cell(row=row_num, column=c_idx, value=val)
                    cell.font = data_font
                    cell.border = thin_border
                    if c_idx in [1, 3, 5, 7, 8, 9, 10]:
                        cell.alignment = Alignment(horizontal="center", vertical="top")
                    else:
                        cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)

                    if c_idx == 7:
                        if step_status == 'PASS': cell.fill = pass_fill
                        elif step_status == 'FAIL': cell.fill = fail_fill

                row_num += 1

        no_counter += 1

    widths = [6, 25, 18, 35, 8, 45, 12, 15, 12, 15, 18, 40]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=4, column=i).column_letter].width = w

    ws.freeze_panes = "A5"

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Traceability_Matrix_RTM_V2_{date.today().strftime('%Y%m%d')}.xlsx"}
    )
