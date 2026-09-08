from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc
from app.database import get_db
from app.models.models import (
    Defect, Module, SubModule, TestScript, TestCase, TestStep,
    TestExecution, TestStepResult, DefectV2, Project, DefectScoring, SitConfig, Tester
)
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from io import BytesIO
from datetime import datetime, date
from typing import List, Optional, Dict, Any
import math
import re

router = APIRouter()


def clean_file_name(file_name: Optional[str]) -> str:
    if not file_name:
        return "Dokumen Excel"
    return re.sub(r'\.(xlsx|xls|csv)$', '', file_name.strip(), flags=re.IGNORECASE)


def resolve_sub_module_id(db: Session, module_id: Optional[int], component: Optional[str]) -> Optional[int]:
    """Resolve the V2 component value to the shared SubModule relation."""
    if not module_id or not component:
        return None
    component_name = component.strip()
    if not component_name:
        return None
    sub_module = db.query(SubModule).filter(
        SubModule.module_id == module_id,
        func.trim(func.lower(SubModule.name)) == component_name.lower(),
    ).first()
    return sub_module.id if sub_module else None


def natural_sort_key(key_tuple):
    """
    Sort key for Natural Ascending Ordering of Test Script names (Module_1, Module_2 ... Module_10).
    """
    file_name, mod_name, ts_name = key_tuple
    numbers = re.findall(r'\d+', ts_name)
    num = int(numbers[0]) if numbers else 9999
    return (file_name, num, mod_name, ts_name)


def get_fixing_count(db: Session, test_cases):
    """Count completed FAIL -> PASS cycles from Test Case V2 snapshots."""
    executions_by_round = {}
    for test_case in test_cases:
        executions = db.query(TestExecution).filter(
            TestExecution.test_case_id == test_case.id
        ).order_by(TestExecution.execution_no, TestExecution.id).all()
        for execution in executions:
            statuses = {
                (result.status or "").upper()
                for result in execution.step_results
            }
            round_no = execution.execution_no or execution.id
            executions_by_round.setdefault(round_no, False)
            executions_by_round[round_no] = executions_by_round[round_no] or bool(
                statuses.intersection({"FAIL", "BLOCKED"})
            )

    completed_cycles = 0
    was_failing = False
    for round_is_failing in (
        executions_by_round[key] for key in sorted(executions_by_round)
    ):
        if was_failing and not round_is_failing:
            completed_cycles += 1
        was_failing = round_is_failing
    return completed_cycles


@router.get("/cascading-filters")
def get_cascading_filters(
    project_id: Optional[str] = None,
    phase: Optional[str] = None,
    import_file_name: Optional[str] = None,
    module_id: Optional[str] = None,
    sub_module_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Cascading Dependent Filters:
    Project -> Phase -> Nama File Import -> Module -> Sub Module -> Test Script -> Tester
    """
    # 1. Projects
    projects = db.query(Project).all()
    project_options = [{"id": p.id, "name": p.project_name, "phase": p.phase} for p in projects]

    # 2. Phases
    phase_query = db.query(Project.phase).filter(Project.phase.isnot(None))
    if project_id:
        phase_query = phase_query.filter(Project.id == project_id)
    phases = [p[0] for p in phase_query.distinct().all() if p[0]]

    # 3. Import File Names (from TestScript & TestCase)
    files_ts = db.query(TestScript.import_file_name).filter(TestScript.import_file_name.isnot(None)).distinct().all()
    files_tc = db.query(TestCase.import_file_name).filter(TestCase.import_file_name.isnot(None)).distinct().all()
    all_files = sorted(list(set([clean_file_name(f[0]) for f in files_ts + files_tc if f[0]])))

    # 4. Modules
    modules_query = db.query(Module)
    if module_id:
        modules_query = modules_query.filter(Module.id == module_id)
    modules = modules_query.order_by(Module.name).all()
    module_options = [{"id": m.id, "name": m.name} for m in modules]

    # 5. Sub-Modules
    sub_query = db.query(SubModule)
    if module_id:
        sub_query = sub_query.filter(SubModule.module_id == module_id)
    sub_modules = sub_query.order_by(SubModule.name).all()
    sub_module_options = [{"id": s.id, "name": s.name, "module_id": s.module_id} for s in sub_modules]

    # 6. Testers
    testers_ts = db.query(TestScript.tester).filter(TestScript.tester.isnot(None)).distinct().all()
    testers_te = db.query(TestExecution.tester_name).filter(TestExecution.tester_name.isnot(None)).distinct().all()
    testers_def = db.query(Defect.created_by).filter(Defect.created_by.isnot(None)).distinct().all()
    all_testers = sorted(list(set([t[0].strip() for t in testers_ts + testers_te + testers_def if t[0] and t[0].strip()])))

    return {
        "projects": project_options,
        "phases": phases if phases else ["Phase 2 - SIT"],
        "import_files": all_files,
        "modules": module_options,
        "sub_modules": sub_module_options,
        "testers": all_testers,
    }


def calculate_report_metrics(db: Session, filters: dict) -> dict:
    """
    Computes Summary Cards Metrics automatically from database (supports V2 test_cases & V1 test_scripts).
    """
    tc_count = db.query(func.count(TestCase.id)).scalar() or 0

    if tc_count > 0:
        query_tc = db.query(TestCase)
        query_def = db.query(Defect).filter(Defect.defect_criteria == 'Defect')

        if filters.get("module_id") and str(filters["module_id"]).strip():
            try:
                m_id = int(filters["module_id"])
                query_tc = query_tc.filter(TestCase.module_id == m_id)
                selected_mod = db.query(Module).filter(Module.id == m_id).first()
                if selected_mod:
                    matching_subs = db.query(SubModule).filter(func.lower(SubModule.name) == func.lower(selected_mod.name)).all()
                    matching_sub_ids = [s.id for s in matching_subs]
                    if matching_sub_ids:
                        query_def = query_def.filter(or_(Defect.module_id == m_id, Defect.sub_module_id.in_(matching_sub_ids)))
                    else:
                        query_def = query_def.filter(Defect.module_id == m_id)
                else:
                    query_def = query_def.filter(Defect.module_id == m_id)
            except: pass

        if filters.get("sub_module_id") and str(filters["sub_module_id"]).strip():
            try:
                query_tc = query_tc.filter(TestCase.sub_module_id == int(filters["sub_module_id"]))
                query_def = query_def.filter(Defect.sub_module_id == int(filters["sub_module_id"]))
            except: pass

        all_cases = query_tc.all()
        if filters.get("sub_module_id") and str(filters["sub_module_id"]).strip():
            try:
                pass
            except: pass
        total_script = sum(len(tc.test_steps) for tc in all_cases) or len(all_cases)

        pass_cnt = 0
        fail_cnt = 0
        not_run_cnt = 0
        na_cnt = 0
        in_prog_cnt = 0

        for tc in all_cases:
            latest_exec = db.query(TestExecution).filter(
                TestExecution.test_case_id == tc.id
            ).order_by(desc(TestExecution.execution_no)).first()

            if not latest_exec or not latest_exec.step_results:
                not_run_cnt += len(tc.test_steps) or 1
                continue

            for sr in latest_exec.step_results:
                st = (sr.status or '').upper()
                if st == "PASS": pass_cnt += 1
                elif st in ["FAIL", "BLOCKED"]: fail_cnt += 1
                elif st in ["N/A", "NA"]: na_cnt += 1
                elif st in ["IN_PROGRESS", "PROGRESS"]: in_prog_cnt += 1
                else: not_run_cnt += 1

        jumlah_testing = total_script - not_run_cnt
        all_defects = query_def.all()
        total_defect = len(all_defects)

        fixing_cnt = sum(1 for d in all_defects if d.status in ['Open', 'Re-Opened', 'In Progress', 'OPEN', 'IN_PROGRESS', 'REOPEN'])
        ready_to_test_cnt = sum(1 for d in all_defects if d.status in ['Ready to Test', 'READY_TO_TEST', 'Confirmed'])
        retest_cnt = sum(1 for d in all_defects if d.status in ['Under Review', 'Review in Progress', 'RETEST'])
        closed_cnt = sum(1 for d in all_defects if d.status in ['Closed', 'CLOSED'])
        reopen_cnt = sum(1 for d in all_defects if d.status in ['Re-Opened', 'REOPEN'])

        return {
            "total_script": total_script,
            "jumlah_testing": jumlah_testing,
            "pass_count": pass_cnt,
            "fail_count": fail_cnt,
            "not_run_count": not_run_cnt,
            "na_count": na_cnt,
            "in_progress_count": in_prog_cnt,
            "total_defect": total_defect,
            "fixing_count": fixing_cnt,
            "ready_to_test_count": ready_to_test_cnt,
            "retest_count": retest_cnt,
            "closed_count": closed_cnt,
            "reopen_count": reopen_cnt,
        }

    # Fallback to V1 TestScript if test_cases is empty
    query_ts = db.query(TestScript)
    query_def = db.query(Defect).filter(Defect.defect_criteria == 'Defect')

    if filters.get("module_id") and str(filters["module_id"]).strip():
        try:
            m_id = int(filters["module_id"])
            query_ts = query_ts.filter(TestScript.module_id == m_id)
            query_def = query_def.filter(Defect.module_id == m_id)
        except: pass

    if filters.get("sub_module_id") and str(filters["sub_module_id"]).strip():
        try:
            sm_id = int(filters["sub_module_id"])
            query_ts = query_ts.filter(TestScript.sub_module_id == sm_id)
            query_def = query_def.filter(Defect.sub_module_id == sm_id)
        except: pass

    if filters.get("tester") and str(filters["tester"]).strip():
        t_str = str(filters["tester"]).strip()
        query_ts = query_ts.filter(TestScript.tester == t_str)
        query_def = query_def.filter(or_(Defect.created_by == t_str, Defect.last_retested_by == t_str))

    if filters.get("date_from") and str(filters["date_from"]).strip():
        try:
            d_from = datetime.strptime(str(filters["date_from"]).strip(), '%Y-%m-%d').date()
            query_ts = query_ts.filter(TestScript.completion_date >= d_from)
            query_def = query_def.filter(Defect.date_created >= d_from)
        except: pass

    if filters.get("date_to") and str(filters["date_to"]).strip():
        try:
            d_to = datetime.strptime(str(filters["date_to"]).strip(), '%Y-%m-%d').date()
            query_ts = query_ts.filter(TestScript.completion_date <= d_to)
            query_def = query_def.filter(Defect.date_created <= d_to)
        except: pass

    all_scripts = query_ts.all()

    total_script = sum((getattr(s, 'excel_step_count', 1) or 1) for s in all_scripts) or len(all_scripts)
    
    pass_cnt = 0
    fail_cnt = 0
    not_run_cnt = 0
    na_cnt = 0
    in_prog_cnt = 0

    for s in all_scripts:
        st = (s.status_by_tester or '').strip().lower()
        cnt = getattr(s, 'excel_step_count', 1) or 1
        if st.startswith("pass") or st.startswith("ok") or st.startswith("berhasil") or st.startswith("done"):
            pass_cnt += cnt
        elif st.startswith("fail") or st.startswith("gagal") or st.startswith("bug"):
            fail_cnt += cnt
        elif st == "n/a" or st.startswith("not app"):
            na_cnt += cnt
        elif st.startswith("in prog") or st.startswith("proses"):
            in_prog_cnt += cnt
        else:
            not_run_cnt += cnt

    jumlah_testing = total_script - not_run_cnt

    # Defect Metrics
    all_defects = query_def.all()
    total_defect = len(all_defects)

    fixing_cnt = sum(1 for d in all_defects if d.status in ['Open', 'Re-Opened', 'In Progress', 'OPEN', 'IN_PROGRESS', 'REOPEN'])
    ready_to_test_cnt = sum(1 for d in all_defects if d.status in ['Ready to Test', 'READY_TO_TEST', 'Confirmed'])
    retest_cnt = sum(1 for d in all_defects if d.status in ['Under Review', 'Review in Progress', 'RETEST'])
    closed_cnt = sum(1 for d in all_defects if d.status in ['Closed', 'CLOSED'])
    reopen_cnt = sum(1 for d in all_defects if d.status in ['Re-Opened', 'REOPEN'])

    return {
        "total_script": total_script,
        "jumlah_testing": jumlah_testing,
        "pass_count": pass_cnt,
        "fail_count": fail_cnt,
        "not_run_count": not_run_cnt,
        "na_count": na_cnt,
        "in_progress_count": in_prog_cnt,
        "total_defect": total_defect,
        "fixing_count": fixing_cnt,
        "ready_to_test_count": ready_to_test_cnt,
        "retest_count": retest_cnt,
        "closed_count": closed_cnt,
        "reopen_count": reopen_cnt,
    }


def generate_rule_based_note(fail_cnt: int, not_run_cnt: int, open_defect_cnt: int, ready_cnt: int, last_retest_status: Optional[str]) -> str:
    """
    Auto Generated Note per Section 15 (Pengembangan.md):
    Rule-based narrative generator based on actual testing data.
    """
    if fail_cnt == 0 and not_run_cnt == 0 and open_defect_cnt == 0:
        return "Testing telah selesai dilakukan dan seluruh test script berhasil memenuhi expected result. Tidak terdapat defect yang masih open."
    
    if last_retest_status and last_retest_status.upper() == "FAIL":
        return "Berdasarkan hasil retest terakhir, defect masih terjadi sehingga diperlukan fixing lebih lanjut oleh tim vendor IT."
    
    if last_retest_status and last_retest_status.upper() == "PASS":
        return "Berdasarkan hasil retest terakhir, perbaikan telah berhasil dan defect dinyatakan teratasi."

    if fail_cnt > 0 and ready_cnt > 0 and open_defect_cnt == 0:
        return "Defect telah diperbaiki dan berstatus Ready to Test, namun belum terdapat hasil retest. Diperlukan retest untuk memastikan perbaikan."

    if fail_cnt > 0 or open_defect_cnt > 0:
        return "Testing belum dapat dinyatakan selesai karena masih terdapat test script yang FAIL dan defect yang masih berstatus Open. Diperlukan fixing dan retest lebih lanjut."

    return "Pengujian sedang berlangsung (In Progress)."


@router.get("/summary")
def get_sit_report_summary(
    project_id: Optional[str] = None,
    phase: Optional[str] = None,
    import_file_name: Optional[str] = None,
    module_id: Optional[str] = None,
    sub_module_id: Optional[str] = None,
    tester: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    filters = {
        "project_id": project_id,
        "phase": phase,
        "import_file_name": import_file_name,
        "module_id": module_id,
        "sub_module_id": sub_module_id,
        "tester": tester,
        "date_from": date_from,
        "date_to": date_to,
    }
    return calculate_report_metrics(db, filters)


@router.get("/table")
def get_sit_report_table(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    project_id: Optional[str] = None,
    phase: Optional[str] = None,
    import_file_name: Optional[str] = None,
    module_id: Optional[str] = None,
    sub_module_id: Optional[str] = None,
    tester: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    18-Column SIT Report Table per Section 4 & 18 (Pengembangan.md).
    Supports V2 test_cases & V1 test_scripts seamlessly.
    """
    tc_count = db.query(func.count(TestCase.id)).scalar() or 0
    SEVERITY_WEIGHT = {"fatal": 4, "major": 3, "minor": 2, "kosmetik": 1}

    if tc_count > 0:
        query = db.query(TestCase)
        query_def = db.query(Defect).filter(Defect.defect_criteria == "Defect")

        if module_id and str(module_id).strip():
            try:
                query = query.filter(TestCase.module_id == int(module_id))
                query_def = query_def.filter(Defect.module_id == int(module_id))
            except: pass
        if search:
            s = f"%{search}%"
            query = query.filter(or_(TestCase.test_case_id.ilike(s), TestCase.summary.ilike(s)))

        all_cases = query.order_by(TestCase.id.desc()).all()

        # Group by import file, module, and test script/sheet.
        grouped = {}
        for tc in all_cases:
            file_name = clean_file_name(tc.import_file_name)
            mod_name = tc.module.name if tc.module else "General Module"
            ts_name = tc.sheet_name or tc.component or "General Test Case"
            key = (file_name, mod_name, ts_name)

            if key not in grouped:
                grouped[key] = []
            grouped[key].append(tc)

        report_rows = []
        no_counter = 1

        # Natural sort by Module number (Module_1, Module_2 ... Module_10)
        sorted_grouped_keys = sorted(grouped.keys(), key=natural_sort_key)

        seen_unlinked_defects_per_mod = {}

        for (file_name, mod_name, ts_name) in sorted_grouped_keys:
            items = grouped[(file_name, mod_name, ts_name)]
            total_ts = sum(len(tc.test_steps) for tc in items) or len(items)

            cnt_fail = 0
            cnt_not_run = 0
            cnt_na = 0
            cnt_pass = 0

            fail_details = []
            linked_defects = []
            seen_defect_ids = set()

            for tc in items:
                latest_exec = db.query(TestExecution).filter(
                    TestExecution.test_case_id == tc.id
                ).order_by(desc(TestExecution.execution_no)).first()

                # Original SIT Report relation: exact Issue Link to Test Case ID.
                tc_clean = (tc.test_case_id or "").strip().lower()
                tc_defects = db.query(Defect).filter(
                    Defect.issue_link.isnot(None),
                    Defect.issue_link != "",
                    func.trim(func.lower(Defect.issue_link)) == tc_clean,
                ).all() if tc_clean else []

                for d in tc_defects:
                    if d.id not in seen_defect_ids:
                        seen_defect_ids.add(d.id)
                        linked_defects.append(d)

                if not latest_exec or not latest_exec.step_results:
                    cnt_not_run += len(tc.test_steps) or 1
                    continue

                for st in tc.test_steps:
                    step_res = db.query(TestStepResult).filter(
                        TestStepResult.execution_id == latest_exec.id,
                        TestStepResult.test_step_id == st.id
                    ).first()

                    st_status = (step_res.status if step_res else "NOT_RUN").upper()
                    if st_status == "PASS":
                        cnt_pass += 1
                    elif st_status in ["FAIL", "BLOCKED"]:
                        cnt_fail += 1
                        fail_str = f"[{tc.test_case_id}] {st.test_step}"
                        if step_res and step_res.keterangan: fail_str += f" ({step_res.keterangan})"
                        fail_details.append(fail_str)
                    elif st_status in ["N/A", "NA", "NOT APPLICABLE"]:
                        cnt_na += 1
                    elif st_status in ["IN_PROGRESS", "PROGRESS"]:
                        pass
                    else:
                        cnt_not_run += 1

            jumlah_testing = total_ts - cnt_not_run
            keterangan_temuan = "\n".join(fail_details) if fail_details else "-"

            # Fallback: Fetch defects matching the module/sub-module name if issue_link is empty
            if mod_name not in seen_unlinked_defects_per_mod:
                seen_unlinked_defects_per_mod[mod_name] = set()
                
                unlinked_defects = db.query(Defect).outerjoin(Module, Defect.module_id == Module.id).outerjoin(SubModule, Defect.sub_module_id == SubModule.id).filter(
                    or_(Defect.issue_link == None, Defect.issue_link == ""),
                    or_(Module.name == mod_name, SubModule.name == mod_name)
                ).all()

                for d in unlinked_defects:
                    if d.id not in seen_defect_ids and d.id not in seen_unlinked_defects_per_mod[mod_name]:
                        seen_unlinked_defects_per_mod[mod_name].add(d.id)
                        seen_defect_ids.add(d.id)
                        linked_defects.append(d)

            # Original behavior: show only active defects in the report.
            open_linked_defects = [
                d for d in linked_defects
                if d.status and d.status.strip().lower() in ["open", "re-opened", "reopen"]
            ]
            fixing_history_total = get_fixing_count(db, items)

            if open_linked_defects:
                defect_ids = ", ".join([d.defect_id for d in open_linked_defects])
                
                # Highest Severity among OPEN defects
                sorted_defs = sorted(
                    open_linked_defects,
                    key=lambda x: SEVERITY_WEIGHT.get((x.level_of_defect or '').lower(), 0),
                    reverse=True
                )
                highest_severity = sorted_defs[0].level_of_defect or "-"

                status_defect = ", ".join(list(set([d.status for d in open_linked_defects if d.status])))
                summary_defect = "\n".join([f"[{d.defect_id}] {d.summary}" for d in open_linked_defects if d.summary]) or "-"
                pic_fixing = ", ".join(list(set([d.fixing_confirmed_by or d.created_by for d in open_linked_defects if d.fixing_confirmed_by or d.created_by]))) or "-"

                # Keterangan taken directly from defects.keterangan
                keterangan_logs = [f"[{d.defect_id}] {d.keterangan}" for d in open_linked_defects if d.keterangan]
                latest_keterangan_str = "\n".join(keterangan_logs[:3]) if keterangan_logs else "-"

                # Note taken directly from defects.retesting
                retest_notes = [f"[{d.defect_id}] {d.retesting}" for d in open_linked_defects if d.retesting]
                note_str = "\n".join(retest_notes[:3]) if retest_notes else "-"
            else:
                defect_ids = "-"
                highest_severity = "-"
                status_defect = "-"
                summary_defect = "-"
                pic_fixing = "-"
                latest_keterangan_str = "-"
                note_str = "-"

            report_rows.append({
                "id": items[0].id if items else no_counter,
                "no": no_counter,
                "nama_file_import": file_name,
                "modul": mod_name,
                "sub_module": ts_name,
                "test_script": items[0].sheet_name if hasattr(items[0], 'sheet_name') and items[0].sheet_name else "-",
                "total_test_script": total_ts,
                "jumlah_testing": jumlah_testing,
                "fail": cnt_fail,
                "not_run": cnt_not_run,
                "na": cnt_na,
                "pass": cnt_pass,
                "fixing": fixing_history_total,
                "fixing_history_text": fixing_history_total,
                "keterangan_temuan": keterangan_temuan,
                "defect_id": defect_ids,
                "severity_bug": highest_severity,
                "status_defect": status_defect,
                "summary_defect": summary_defect,
                "pic_fixing": pic_fixing,
                "keterangan_log_retest": latest_keterangan_str,
                "note": note_str,
                "linked_defect_count": len(open_linked_defects),
            })
            no_counter += 1

        total = len(report_rows)
        start = (page - 1) * page_size
        end = start + page_size
        items_paginated = report_rows[start:end]

        return {
            "items": items_paginated,
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": math.ceil(total / page_size) if total > 0 else 1
        }

    # Fallback to V1 TestScript if test_cases is empty
    query = db.query(TestScript)
    if module_id and str(module_id).strip():
        try: query = query.filter(TestScript.module_id == int(module_id))
        except: pass

    if sub_module_id and str(sub_module_id).strip():
        try: query = query.filter(TestScript.sub_module_id == int(sub_module_id))
        except: pass

    if tester and str(tester).strip(): query = query.filter(TestScript.tester == tester.strip())
    if date_from and str(date_from).strip():
        try: query = query.filter(TestScript.completion_date >= datetime.strptime(date_from.strip(), '%Y-%m-%d').date())
        except: pass
    if date_to and str(date_to).strip():
        try: query = query.filter(TestScript.completion_date <= datetime.strptime(date_to.strip(), '%Y-%m-%d').date())
        except: pass
    if search:
        s = f"%{search}%"
        query = query.filter(or_(TestScript.test_case_id.ilike(s), TestScript.summary.ilike(s)))

    all_scripts = query.order_by(TestScript.id.desc()).all()

    # Group by (Import File, Module, Test Script/Sheet)
    grouped = {}
    for s in all_scripts:
        file_name = clean_file_name(s.import_file_name)
        mod_name = s.module.name if s.module else "Tanpa Modul"
        ts_name = s.sheet_name or s.components or (s.sub_module.name if s.sub_module else "General Test Script")
        key = (file_name, mod_name, ts_name)

        if key not in grouped:
            grouped[key] = []
        grouped[key].append(s)

    report_rows = []
    no_counter = 1

    SEVERITY_WEIGHT = {"fatal": 4, "major": 3, "minor": 2, "kosmetik": 1}

    sorted_grouped_keys_v1 = sorted(grouped.keys(), key=natural_sort_key)

    seen_unlinked_defects_per_mod_v1 = {}

    for (file_name, mod_name, ts_name) in sorted_grouped_keys_v1:
        items = grouped[(file_name, mod_name, ts_name)]
        total_ts = sum((it.excel_step_count or 1) for it in items)
        
        cnt_fail = 0
        cnt_not_run = 0
        cnt_na = 0
        cnt_pass = 0

        fail_details = []
        linked_defects = []
        seen_defect_ids = set()

        for item in items:
            st = (item.status_by_tester or '').strip().lower()
            cnt = item.excel_step_count or 1

            if st.startswith("fail") or st.startswith("gagal") or st.startswith("bug"):
                cnt_fail += cnt
                # Find defects linked to item test_case_id
                def_matches = db.query(Defect).filter(
                    Defect.issue_link.isnot(None),
                    func.trim(func.lower(Defect.issue_link)) == func.trim(func.lower(item.test_case_id)),
                ).all()

                for d in def_matches:
                    if d.id not in seen_defect_ids:
                        seen_defect_ids.add(d.id)
                        linked_defects.append(d)

                fail_str = f"[{item.test_case_id or 'TC'}] {item.summary or ''}"
                if item.test_step: fail_str += f" (Step: {item.test_step})"
                fail_details.append(fail_str)

            elif st.startswith("not run") or st.startswith("untested") or st.startswith("belum") or st == "":
                cnt_not_run += cnt
            elif st == "n/a" or st.startswith("not app"):
                cnt_na += cnt
            elif st.startswith("pass") or st.startswith("ok") or st.startswith("berhasil") or st.startswith("done"):
                cnt_pass += cnt
            elif st.startswith("fix") or st.startswith("in prog") or st.startswith("proses"):
                pass
            else:
                cnt_not_run += cnt

        jumlah_testing = total_ts - cnt_not_run
        keterangan_temuan = "\n".join(fail_details) if fail_details else "-"

        # Fallback: Fetch defects matching the module/sub-module name if issue_link is empty
        if mod_name not in seen_unlinked_defects_per_mod_v1:
            seen_unlinked_defects_per_mod_v1[mod_name] = set()
            
            unlinked_defects = db.query(Defect).outerjoin(Module, Defect.module_id == Module.id).outerjoin(SubModule, Defect.sub_module_id == SubModule.id).filter(
                or_(Defect.issue_link == None, Defect.issue_link == ""),
                or_(Module.name == mod_name, SubModule.name == mod_name)
            ).all()

            for d in unlinked_defects:
                if d.id not in seen_defect_ids and d.id not in seen_unlinked_defects_per_mod_v1[mod_name]:
                    seen_unlinked_defects_per_mod_v1[mod_name].add(d.id)
                    seen_defect_ids.add(d.id)
                    linked_defects.append(d)

        # Defect Aggregation
        defect_ids = ", ".join([d.defect_id for d in linked_defects]) if linked_defects else "-"
        
        # Highest Severity Calculation (Rule: Fatal > Major > Minor)
        open_linked_defects = [
            d for d in linked_defects
            if d.status and d.status.strip().lower() in ["open", "re-opened", "reopen"]
        ]

        if open_linked_defects:
            defect_ids = ", ".join([d.defect_id for d in open_linked_defects])
            sorted_defs = sorted(
                open_linked_defects,
                key=lambda x: SEVERITY_WEIGHT.get((x.level_of_defect or '').lower(), 0),
                reverse=True
            )
            highest_severity = sorted_defs[0].level_of_defect or "-"

            status_defect = ", ".join(list(set([d.status for d in open_linked_defects if d.status])))
            summary_defect = "\n".join([f"[{d.defect_id}] {d.summary}" for d in open_linked_defects if d.summary]) or "-"
            pic_fixing = ", ".join(list(set([d.fixing_confirmed_by or d.created_by for d in open_linked_defects if d.fixing_confirmed_by or d.created_by]))) or "-"

            keterangan_logs = [f"[{d.defect_id}] {d.keterangan}" for d in open_linked_defects if d.keterangan]
            latest_keterangan_str = "\n".join(keterangan_logs[:3]) if keterangan_logs else "-"

            retest_notes = [f"[{d.defect_id}] {d.retesting}" for d in open_linked_defects if d.retesting]
            note_str = "\n".join(retest_notes[:3]) if retest_notes else "-"
        else:
            defect_ids = "-"
            highest_severity = "-"
            status_defect = "-"
            summary_defect = "-"
            pic_fixing = "-"
            latest_keterangan_str = "-"
            note_str = "-"

        fixing_history_total = get_fixing_count(db, items)

        report_rows.append({
            "no": no_counter,
            "nama_file_import": file_name,
            "modul": mod_name,
            "sub_module": ts_name,
            "test_script": items[0].sheet_name if hasattr(items[0], 'sheet_name') and items[0].sheet_name else "-",
            "total_test_script": total_ts,
            "jumlah_testing": jumlah_testing,
            "fail": cnt_fail,
            "not_run": cnt_not_run,
            "na": cnt_na,
            "pass": cnt_pass,
            "fixing": fixing_history_total,
            "keterangan_temuan": keterangan_temuan,
            "defect_id": defect_ids,
            "severity_bug": highest_severity,
            "status_defect": status_defect,
            "summary_defect": summary_defect,
            "pic_fixing": pic_fixing,
            "keterangan_log_retest": latest_keterangan_str,
            "note": note_str,
            "linked_defect_count": len(open_linked_defects),
        })
        no_counter += 1

    total = len(report_rows)
    start = (page - 1) * page_size
    end = start + page_size
    items_paginated = report_rows[start:end]

    return {
        "items": items_paginated,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 1
    }


@router.get("/detail/{id}")
def get_sit_report_detail(id: int, db: Session = Depends(get_db)):
    """
    Detail Report Modal per Section 17 (Pengembangan.md)
    Supports V2 TestCase & V1 TestScript seamlessly.
    """
    # 1. Try V2 TestCase first
    tc = db.query(TestCase).filter(TestCase.id == id).first()
    if tc:
        mod_name = tc.module.name if tc.module else "General Module"
        tc_clean = (tc.test_case_id or "").strip().lower()
        linked_defects = db.query(Defect).filter(
            Defect.issue_link.isnot(None),
            func.trim(func.lower(Defect.issue_link)) == tc_clean,
        ).all() if tc_clean else []

        defect_details = [
            {
                "defect_id": d.defect_id,
                "test_case": d.issue_link or tc.test_case_id,
                "severity": d.level_of_defect or "-",
                "status": d.status or "Open",
                "pic": d.fixing_confirmed_by or d.created_by or "-",
                "latest_retest": d.retesting or d.keterangan or "Belum terdapat hasil retest."
            }
            for d in linked_defects
        ]

        latest_exec = db.query(TestExecution).filter(
            TestExecution.test_case_id == tc.id
        ).order_by(desc(TestExecution.execution_no)).first()

        retest_history_text = "Belum ada histori retest."
        if linked_defects:
            logs = []
            for d in linked_defects:
                if d.retesting: logs.append(f"[{d.defect_id}] {d.retesting}")
                elif d.keterangan: logs.append(f"[{d.defect_id}] {d.keterangan}")
            if logs: retest_history_text = "\n\n".join(logs)

        return {
            "id": tc.id,
            "module": mod_name,
            "test_script": tc.sheet_name or tc.component or "General Test Case",
            "test_case_id": tc.test_case_id,
            "summary": tc.summary,
            "stage": tc.stage,
            "tester": latest_exec.tester_name if latest_exec else "Amanda",
            "status": "PASS" if not linked_defects else "FAIL",
            "defects": defect_details,
            "retest_history": retest_history_text
        }

    # 2. Fallback to V1 TestScript
    ts = db.query(TestScript).filter(TestScript.id == id).first()
    if ts:
        mod_name = ts.module.name if ts.module else "General Module"
        ts_clean = (ts.test_case_id or "").strip().lower()
        linked_defects = db.query(Defect).filter(
            Defect.issue_link.isnot(None),
            func.trim(func.lower(Defect.issue_link)) == ts_clean,
        ).all() if ts_clean else []

        defect_details = [
            {
                "defect_id": d.defect_id,
                "test_case": d.issue_link,
                "severity": d.level_of_defect or "-",
                "status": d.status,
                "pic": d.fixing_confirmed_by or d.created_by or "-",
                "latest_retest": d.retesting or d.keterangan or "Belum terdapat hasil retest."
            }
            for d in linked_defects
        ]

        return {
            "id": ts.id,
            "module": mod_name,
            "test_script": ts.components or ts.sheet_name or "General",
            "test_case_id": ts.test_case_id,
            "summary": ts.summary,
            "stage": ts.stage,
            "tester": ts.tester,
            "status": ts.status_by_tester,
            "defects": defect_details,
            "retest_history": ts.retesting or ts.keterangan or "Belum ada histori retest."
        }

    raise HTTPException(status_code=404, detail=f"Data SIT Report ID {id} tidak ditemukan")


@router.post("/ai-conclusion")
def generate_ai_conclusion(payload: dict):
    """
    AI-Generated Conclusion per Section 16 (Pengembangan.md).
    Generates natural narrative strictly from database factual aggregation.
    """
    mod = payload.get("module", "Aplikasi")
    total_ts = payload.get("total_test_script", 0)
    pass_cnt = payload.get("pass", 0)
    fail_cnt = payload.get("fail", 0)
    open_def = payload.get("open", 0)

    if fail_cnt == 0 and open_def == 0:
        narrative = f"Berdasarkan analisis data SIT pada modul '{mod}', seluruh {total_ts} skenario uji telah berhasil dieksekusi dengan status PASS (100% Memenuhi Expected Result). Tidak ditemukan open defect sehingga modul dinyatakan stabil dan siap untuk tahap selanjutnya."
    else:
        narrative = f"Pengujian SIT pada modul '{mod}' mencatat {total_ts} total skenario uji dengan hasil {pass_cnt} PASS dan {fail_cnt} FAIL. Saat ini masih terdapat {open_def} defect berstatus Open yang memerlukan perbaikan dari tim vendor IT dan retest susulan."

@router.get("/export-excel")
def export_sit_report_excel(
    project_id: Optional[str] = None,
    phase: Optional[str] = None,
    import_file_name: Optional[str] = None,
    module_id: Optional[str] = None,
    sub_module_id: Optional[str] = None,
    tester: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Export SIT Report 18 Columns per Section 18 (Pengembangan.md).
    Calculates summary automatically from the exact same report query as UI.
    """
    data = get_sit_report_table(
        page=1, page_size=10000,
        project_id=project_id, phase=phase, import_file_name=import_file_name,
        module_id=module_id, sub_module_id=sub_module_id,
        tester=tester, date_from=date_from, date_to=date_to,
        db=db
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "SIT Report"

    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    data_font = Font(name="Calibri", size=10)
    bold_font = Font(name="Calibri", bold=True, size=10)
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin")
    )
    # Styles for Soft Colors
    fail_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    pass_fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    fixing_fill = PatternFill(start_color="FFEDD5", end_color="FFEDD5", fill_type="solid")
    ready_fill = PatternFill(start_color="DBEAFE", end_color="DBEAFE", fill_type="solid")
    
    # Separator Column Accent Fill
    separator_fill = PatternFill(start_color="475569", end_color="475569", fill_type="solid")
    separator_body_fill = PatternFill(start_color="E2E8F0", end_color="E2E8F0", fill_type="solid")

    headers = [
        "No", "Nama File Import", "Modul", "Test Script", "Total Test Script",
        "Jumlah Testing", "FAIL", "Not Run", "N/A", "PASS", "Fixing",
        "Keterangan Temuan", "", "Defect ID", "Severity Bug", "Status Defect",
        "Summary Defect", "PIC Fixing", "Keterangan / Log Retest", "Note (Retesting)"
    ]

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        if col_idx == 13:
            cell.fill = separator_fill
        else:
            cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    items_list = data.get("items", [])
    last_row = 2

    tot_total_script = sum(it.get("total_test_script", 0) for it in items_list)
    tot_jumlah_testing = sum(it.get("jumlah_testing", 0) for it in items_list)
    tot_fail = sum(it.get("fail", 0) for it in items_list)
    tot_not_run = sum(it.get("not_run", 0) for it in items_list)
    tot_na = sum(it.get("na", 0) for it in items_list)
    tot_pass = sum(it.get("pass", 0) for it in items_list)
    tot_fixing = sum(it.get("fixing", 0) for it in items_list)

    for row_idx, item in enumerate(items_list, 2):
        last_row = row_idx + 1
        row_vals = [
            item["no"], item["nama_file_import"], item["modul"], item["test_script"],
            item["total_test_script"], item["jumlah_testing"], item["fail"],
            item["not_run"], item["na"], item["pass"],
            item.get("fixing_history_text", item["fixing"]),
            item["keterangan_temuan"], "", item["defect_id"], item["severity_bug"],
            item["status_defect"], item["summary_defect"], item["pic_fixing"],
            item["keterangan_log_retest"], item["note"]
        ]
        for col_idx, val in enumerate(row_vals, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = data_font
            cell.border = thin_border

            if col_idx == 1:
                cell.alignment = Alignment(horizontal="center", vertical="top")
            elif col_idx in [5, 6, 7, 8, 9, 10, 11, 14, 15, 16]:
                cell.alignment = Alignment(horizontal="center", vertical="top")
            elif col_idx in [12, 17, 18, 19, 20]:
                cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
            else:
                cell.alignment = Alignment(horizontal="left", vertical="top")

            # Soft Colors Styling
            if col_idx == 7 and item["fail"] > 0:
                cell.fill = fail_fill
                cell.font = Font(name="Calibri", bold=True, color="991B1B")
            if col_idx == 10 and item["pass"] > 0:
                cell.fill = pass_fill
                cell.font = Font(name="Calibri", bold=True, color="065F46")
            if col_idx == 11 and item["fixing"] > 0:
                cell.fill = fixing_fill
                cell.font = Font(name="Calibri", bold=True, color="9A3412")

            # Separator Column Styling (Column 13)
            if col_idx == 13:
                cell.fill = separator_body_fill

            # Status Defect Soft Fill (Column 16)
            if col_idx == 16 and item["status_defect"] != "-":
                st_lower = item["status_defect"].lower()
                if "open" in st_lower or "re-open" in st_lower:
                    cell.fill = fail_fill
                    cell.font = Font(name="Calibri", bold=True, color="991B1B")
                elif "ready" in st_lower:
                    cell.fill = ready_fill
                    cell.font = Font(name="Calibri", bold=True, color="1E40AF")
                elif "closed" in st_lower:
                    cell.fill = pass_fill
                    cell.font = Font(name="Calibri", bold=True, color="065F46")

    # Write TOTAL Summary Row at Bottom
    total_vals = [
        "TOTAL", "", "", "", tot_total_script, tot_jumlah_testing,
        tot_fail, tot_not_run, tot_na, tot_pass, tot_fixing,
        "", "", "", "", "", "", "", "", ""
    ]
    for col_idx, val in enumerate(total_vals, 1):
        cell = ws.cell(row=last_row, column=col_idx, value=val)
        cell.font = bold_font
        cell.border = thin_border
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")

        if col_idx in [5, 6, 7, 8, 9, 10, 11]:
            cell.alignment = Alignment(horizontal="center", vertical="center")
            if col_idx == 7 and tot_fail > 0:
                cell.fill = fail_fill
                cell.font = Font(name="Calibri", bold=True, color="991B1B")
            if col_idx == 10 and tot_pass > 0:
                cell.fill = pass_fill
                cell.font = Font(name="Calibri", bold=True, color="065F46")
            if col_idx == 11 and tot_fixing > 0:
                cell.fill = fixing_fill
                cell.font = Font(name="Calibri", bold=True, color="9A3412")

        if col_idx == 13:
            cell.fill = separator_fill

    ws.merge_cells(start_row=last_row, start_column=1, end_row=last_row, end_column=4)

    widths = [6, 22, 25, 18, 16, 16, 8, 8, 8, 8, 8, 45, 4, 15, 12, 14, 45, 15, 35, 45]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    ws.freeze_panes = "A2"

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=SIT_Report_{date.today().strftime('%Y%m%d')}.xlsx"}
    )
