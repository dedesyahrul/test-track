from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc
from app.database import get_db
from app.models.models import (
    Project, TestCase, TestStep, TestExecution, TestStepResult, DefectV2, Defect, Module, SubModule, Tester
)
from app.schemas.schemas import (
    TestCaseResponse, TestCaseCreate, PaginatedTestCases,
    TestExecutionCreate, TestExecutionResponse, TestStepResultResponse,
    DefectV2Response, DefectV2Create
)
from openpyxl import load_workbook, Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from io import BytesIO
from datetime import datetime, date
from typing import List, Optional
import math
import re

router = APIRouter()


def parse_date(val) -> Optional[date]:
    if val is None:
        return None
    if isinstance(val, datetime):
        return val.date()
    if isinstance(val, date) and not isinstance(val, datetime):
        return val
    s = str(val).strip()
    if not s or s == "None" or s.startswith("="):
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%Y %H:%M:%S"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def compute_test_case_status(latest_execution: Optional[TestExecution]) -> tuple:
    """
    Computes overall Test Case Status from its latest execution:
    - If no execution: NOT RUN
    - If all steps PASS: PASS
    - If any step FAIL: FAIL
    - If any step BLOCKED: BLOCKED
    - If some steps PASS/FAIL/BLOCKED and some NOT_RUN: IN PROGRESS
    Returns (status_string, last_tester, last_date)
    """
    if not latest_execution or not latest_execution.step_results:
        return "NOT RUN", None, None

    statuses = [sr.status.upper() for sr in latest_execution.step_results]

    last_tester = latest_execution.tester_name
    last_date = latest_execution.completion_testing_date

    if any(s == "FAIL" for s in statuses):
        return "FAIL", last_tester, last_date
    if any(s == "BLOCKED" for s in statuses):
        return "BLOCKED", last_tester, last_date
    if all(s == "PASS" for s in statuses):
        return "PASS", last_tester, last_date
    if any(s in ["PASS", "FAIL", "BLOCKED", "IN_PROGRESS"] for s in statuses):
        return "IN PROGRESS", last_tester, last_date

    return "NOT RUN", last_tester, last_date


@router.get("/", response_model=PaginatedTestCases)
def get_test_cases(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None, # PASS, FAIL, BLOCKED, NOT RUN, IN PROGRESS
    module_id: Optional[int] = None,
    stage: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(TestCase)

    if module_id:
        query = query.filter(TestCase.module_id == module_id)
    if stage:
        query = query.filter(TestCase.stage == stage)
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

    filtered_items = []
    for tc in all_cases:
        latest_exec = db.query(TestExecution).filter(
            TestExecution.test_case_id == tc.id
        ).order_by(desc(TestExecution.execution_no)).first()

        calc_status, last_tester, last_date = compute_test_case_status(latest_exec)

        if status and calc_status != status:
            continue

        mod_name = tc.module.name if tc.module else "General Module"

        # Build steps
        steps_resp = [
            {
                "id": step.id,
                "test_case_id": tc.id,
                "step_no": step.step_no,
                "test_step": step.test_step,
                "expected_result": step.expected_result,
            }
            for step in tc.test_steps
        ]

        # Build latest execution response
        latest_exec_resp = None
        if latest_exec:
            step_results_resp = []
            for sr in latest_exec.step_results:
                st_obj = db.query(TestStep).filter(TestStep.id == sr.test_step_id).first()
                step_results_resp.append({
                    "id": sr.id,
                    "execution_id": latest_exec.id,
                    "test_step_id": sr.test_step_id,
                    "status": sr.status,
                    "keterangan": sr.keterangan,
                    "test_step_text": st_obj.test_step if st_obj else None,
                    "expected_result_text": st_obj.expected_result if st_obj else None,
                })
            latest_exec_resp = {
                "id": latest_exec.id,
                "test_case_id": tc.id,
                "tester_id": latest_exec.tester_id,
                "tester_name": latest_exec.tester_name,
                "completion_testing_date": latest_exec.completion_testing_date,
                "execution_no": latest_exec.execution_no,
                "notes": latest_exec.notes,
                "created_at": latest_exec.created_at,
                "step_results": step_results_resp,
            }

        filtered_items.append({
            "id": tc.id,
            "project_id": tc.project_id,
            "module_id": tc.module_id,
            "module_name": mod_name,
            "test_case_id": tc.test_case_id,
            "summary": tc.summary,
            "prerequisite": tc.prerequisite,
            "stage": tc.stage,
            "component": tc.component,
            "case_description": tc.case_description,
            "sheet_name": tc.sheet_name,
            "import_file_name": tc.import_file_name,
            "cycle": tc.cycle,
            "year": tc.year,
            "month": tc.month,
            "day": tc.day,
            "total_steps": len(tc.test_steps),
            "calculated_status": calc_status,
            "last_tester": last_tester,
            "last_testing_date": last_date,
            "created_at": tc.created_at,
            "steps": steps_resp,
            "latest_execution": latest_exec_resp,
        })

    total = len(filtered_items)
    start = (page - 1) * page_size
    end = start + page_size
    items_paginated = filtered_items[start:end]

    return {
        "items": items_paginated,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": math.ceil(total / page_size) if total > 0 else 1
    }


@router.get("/{id}", response_model=TestCaseResponse)
def get_test_case_detail(id: int, db: Session = Depends(get_db)):
    tc = db.query(TestCase).filter(TestCase.id == id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test Case tidak ditemukan")

    latest_exec = db.query(TestExecution).filter(
        TestExecution.test_case_id == tc.id
    ).order_by(desc(TestExecution.execution_no)).first()

    calc_status, last_tester, last_date = compute_test_case_status(latest_exec)
    mod_name = tc.module.name if tc.module else "General Module"

    steps_resp = [
        {
            "id": step.id,
            "test_case_id": tc.id,
            "step_no": step.step_no,
            "test_step": step.test_step,
            "expected_result": step.expected_result,
        }
        for step in tc.test_steps
    ]

    latest_exec_resp = None
    if latest_exec:
        step_results_resp = []
        for sr in latest_exec.step_results:
            st_obj = db.query(TestStep).filter(TestStep.id == sr.test_step_id).first()
            step_results_resp.append({
                "id": sr.id,
                "execution_id": latest_exec.id,
                "test_step_id": sr.test_step_id,
                "status": sr.status,
                "keterangan": sr.keterangan,
                "test_step_text": st_obj.test_step if st_obj else None,
                "expected_result_text": st_obj.expected_result if st_obj else None,
            })
        latest_exec_resp = {
            "id": latest_exec.id,
            "test_case_id": tc.id,
            "tester_id": latest_exec.tester_id,
            "tester_name": latest_exec.tester_name,
            "completion_testing_date": latest_exec.completion_testing_date,
            "execution_no": latest_exec.execution_no,
            "notes": latest_exec.notes,
            "created_at": latest_exec.created_at,
            "step_results": step_results_resp,
        }

    return {
        "id": tc.id,
        "project_id": tc.project_id,
        "module_id": tc.module_id,
        "module_name": mod_name,
        "test_case_id": tc.test_case_id,
        "summary": tc.summary,
        "prerequisite": tc.prerequisite,
        "stage": tc.stage,
        "component": tc.component,
        "case_description": tc.case_description,
        "sheet_name": tc.sheet_name,
        "import_file_name": tc.import_file_name,
        "cycle": tc.cycle,
        "year": tc.year,
        "month": tc.month,
        "day": tc.day,
        "total_steps": len(tc.test_steps),
        "calculated_status": calc_status,
        "last_tester": last_tester,
        "last_testing_date": last_date,
        "created_at": tc.created_at,
        "steps": steps_resp,
        "latest_execution": latest_exec_resp,
    }


@router.post("/{id}/execute", response_model=TestExecutionResponse)
def create_test_execution(
    id: int,
    exec_data: TestExecutionCreate,
    db: Session = Depends(get_db)
):
    """
    Start Testing / Retest Mode (#1, #2...):
    Creates a new execution record & step results without overwriting previous history.
    """
    tc = db.query(TestCase).filter(TestCase.id == id).first()
    if not tc:
        raise HTTPException(status_code=404, detail="Test Case tidak ditemukan")

    # Get latest execution number
    max_no = db.query(func.max(TestExecution.execution_no)).filter(
        TestExecution.test_case_id == tc.id
    ).scalar() or 0

    next_no = max_no + 1

    new_exec = TestExecution(
        test_case_id=tc.id,
        tester_id=exec_data.tester_id,
        tester_name=exec_data.tester_name or "Amanda",
        completion_testing_date=exec_data.completion_testing_date or date.today(),
        execution_no=next_no,
        notes=exec_data.notes,
    )
    db.add(new_exec)
    db.flush()

    step_results_resp = []
    for sr_item in exec_data.step_results:
        sr_db = TestStepResult(
            execution_id=new_exec.id,
            test_step_id=sr_item.test_step_id,
            status=sr_item.status.upper(),
            keterangan=sr_item.keterangan,
        )
        db.add(sr_db)
        st_obj = db.query(TestStep).filter(TestStep.id == sr_item.test_step_id).first()
        step_results_resp.append({
            "id": 0,
            "execution_id": new_exec.id,
            "test_step_id": sr_item.test_step_id,
            "status": sr_item.status.upper(),
            "keterangan": sr_item.keterangan,
            "test_step_text": st_obj.test_step if st_obj else None,
            "expected_result_text": st_obj.expected_result if st_obj else None,
        })

    db.commit()
    db.refresh(new_exec)

    return {
        "id": new_exec.id,
        "test_case_id": tc.id,
        "tester_id": new_exec.tester_id,
        "tester_name": new_exec.tester_name,
        "completion_testing_date": new_exec.completion_testing_date,
        "execution_no": new_exec.execution_no,
        "notes": new_exec.notes,
        "created_at": new_exec.created_at,
        "step_results": step_results_resp,
    }


def clean_str(val) -> Optional[str]:
    if val is None: return None
    s = str(val).strip()
    if s == "" or s == "None" or s.startswith("="): return None
    return s


def clean_file_name(file_name: str) -> str:
    if not file_name: return "Dokumen Excel"
    return re.sub(r'\.(xlsx|xls|csv)$', '', file_name.strip(), flags=re.IGNORECASE)


@router.post("/import/excel")
async def import_test_cases_excel_v2(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Smart Importer V2 (per Pengembangan.md & test-scripts parity):
    Reads Banner Metadata (Row 1-6), Multi-Sheet, Row 7+ Data.
    Parses multiple rows for 1 test_case_id into:
    1 TestCase + N TestSteps + Initial Test Execution & Step Results.
    Saves import_file_name, sheet_name, cycle, year, month, day.
    """
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File harus berformat .xlsx atau .xls")

    original_filename = file.filename
    clean_filename = clean_file_name(original_filename)

    try:
        # Ensure default Project id=1 exists
        proj = db.query(Project).filter(Project.id == 1).first()
        if not proj:
            proj = Project(id=1, project_name="Procurement Management System", phase="Phase 2 - SIT")
            db.add(proj)
            db.commit()

        contents = await file.read()
        wb = load_workbook(BytesIO(contents), data_only=True)

        IGNORED_SHEETS = [
            "home", "beranda", "cover", "index", "summary", "dashboard",
            "info", "guide", "panduan", "table of contents", "toc",
            "rekap", "rekapitulasi", "pembobotan", "list user", "list_user",
            "user list", "user_list", "list-user", "users", "kredensial"
        ]

        results = {
            "test_cases_created": 0,
            "test_cases_updated": 0,
            "test_steps_created": 0,
            "executions_created": 0,
            "sheets_processed": 0,
            "sheet_names": [],
        }
        import_executions = {}

        for sheet_name in wb.sheetnames:
            s_clean = sheet_name.strip().lower()
            if s_clean in IGNORED_SHEETS or any(ign in s_clean for ign in ["home", "cover", "toc", "index"]):
                continue

            ws = wb[sheet_name]

            # 1. Extract Banner Metadata (Row 1-6)
            banner_cycle = None
            banner_year = None
            banner_month = None
            banner_day = None
            banner_module = None
            banner_stage = None

            for r in range(1, min(ws.max_row + 1, 7)):
                for c in range(1, 10):
                    val_cell = str(ws.cell(row=r, column=c).value or "").strip()
                    val_lower = val_cell.lower()

                    if "module" in val_lower or "modul" in val_lower:
                        next_val = clean_str(ws.cell(row=r, column=c+1).value)
                        if next_val and next_val.lower() not in ["document", "name", "nama"]:
                            banner_module = next_val

                    if "stage" in val_lower or "phase" in val_lower:
                        next_val = clean_str(ws.cell(row=r, column=c+1).value)
                        if next_val:
                            banner_stage = next_val

                    if "cycle" in val_lower:
                        try: banner_cycle = int(ws.cell(row=r, column=c+1).value)
                        except: pass
                    if "month" in val_lower or "bulan" in val_lower:
                        try: banner_month = int(ws.cell(row=r, column=c+1).value)
                        except: pass
                    if "day" in val_lower or "hari" in val_lower:
                        try: banner_day = int(ws.cell(row=r, column=c+1).value)
                        except: pass
                    if "year" in val_lower or "tahun" in val_lower:
                        try: banner_year = int(ws.cell(row=r, column=c+1).value)
                        except: pass

            module_name = banner_module or clean_str(sheet_name) or "General Module"

            # Detect data start row (default Row 7)
            data_start = 7
            for r in range(1, min(ws.max_row + 1, 15)):
                val_a = str(ws.cell(row=r, column=1).value or "").strip().lower()
                val_b = str(ws.cell(row=r, column=2).value or "").strip().lower()
                if "test case id" in val_a or "summary" in val_b or "prerequisite" in str(ws.cell(row=r, column=3).value or "").lower():
                    data_start = r + 1
                    break

            results["sheets_processed"] += 1
            results["sheet_names"].append(sheet_name)

            current_parent_tc_id = None
            step_counter = 1

            for row_idx in range(data_start, ws.max_row + 1):
                try:
                    raw_tc_id = clean_str(ws.cell(row=row_idx, column=1).value)
                    raw_summary = clean_str(ws.cell(row=row_idx, column=2).value)
                    prereq = clean_str(ws.cell(row=row_idx, column=3).value)
                    step_text = clean_str(ws.cell(row=row_idx, column=4).value)
                    expected_text = clean_str(ws.cell(row=row_idx, column=5).value)
                    stage = clean_str(ws.cell(row=row_idx, column=6).value) or banner_stage or "Testing: SIT"
                    component = clean_str(ws.cell(row=row_idx, column=7).value) or clean_str(sheet_name)
                    desc = clean_str(ws.cell(row=row_idx, column=8).value)
                    comp_date = parse_date(ws.cell(row=row_idx, column=9).value)
                    tester = clean_str(ws.cell(row=row_idx, column=10).value) or "Amanda"
                    status_raw = clean_str(ws.cell(row=row_idx, column=11).value) or "NOT_RUN"
                    keterangan = clean_str(ws.cell(row=row_idx, column=12).value)

                    if not raw_tc_id and not raw_summary and not step_text and not expected_text:
                        continue

                    if raw_summary and raw_summary.lower() in ["summary", "test case summary (name)", "test case id #", "<nama/deskripsi singkat test case"]:
                        continue

                    if component and "password" in component.lower():
                        continue

                    # Determine parent TC ID
                    if raw_tc_id:
                        current_parent_tc_id = raw_tc_id
                        step_counter = 1
                    
                    if not current_parent_tc_id:
                        continue

                    # Get or Create TestCase (1 Record per unique test_case_id)
                    tc_obj = db.query(TestCase).filter(
                        TestCase.project_id == 1,
                        TestCase.test_case_id == current_parent_tc_id
                    ).first()

                    if not tc_obj:
                        # Find / Create module ID
                        mod_id = None
                        if module_name:
                            mod_obj = db.query(Module).filter(Module.name == module_name).first()
                            if not mod_obj:
                                mod_obj = Module(name=module_name)
                                db.add(mod_obj)
                                db.flush()
                            mod_id = mod_obj.id

                        sub_mod_id = None
                        if mod_id and component:
                            sub_mod = db.query(SubModule).filter(
                                SubModule.module_id == mod_id,
                                func.trim(func.lower(SubModule.name)) == component.strip().lower(),
                            ).first()
                            sub_mod_id = sub_mod.id if sub_mod else None

                        tc_obj = TestCase(
                            project_id=1,
                            module_id=mod_id,
                            sub_module_id=sub_mod_id,
                            test_case_id=current_parent_tc_id,
                            summary=raw_summary or current_parent_tc_id,
                            prerequisite=prereq,
                            stage=stage,
                            component=component,
                            case_description=desc,
                            sheet_name=clean_str(sheet_name),
                            import_file_name=clean_filename,
                            cycle=banner_cycle,
                            year=banner_year,
                            month=banner_month,
                            day=banner_day,
                        )
                        db.add(tc_obj)
                        db.flush()
                        results["test_cases_created"] += 1
                    else:
                        if raw_summary: tc_obj.summary = raw_summary
                        if prereq: tc_obj.prerequisite = prereq
                        tc_obj.sheet_name = clean_str(sheet_name)
                        tc_obj.import_file_name = clean_filename
                        if tc_obj.module_id and component and not tc_obj.sub_module_id:
                            sub_mod = db.query(SubModule).filter(
                                SubModule.module_id == tc_obj.module_id,
                                func.trim(func.lower(SubModule.name)) == component.strip().lower(),
                            ).first()
                            if sub_mod:
                                tc_obj.sub_module_id = sub_mod.id
                        if banner_cycle: tc_obj.cycle = banner_cycle
                        if banner_year: tc_obj.year = banner_year
                        if banner_month: tc_obj.month = banner_month
                        if banner_day: tc_obj.day = banner_day
                        results["test_cases_updated"] += 1

                    # Create TestStep if step_text available
                    if step_text:
                        step_obj = db.query(TestStep).filter(
                            TestStep.test_case_id == tc_obj.id,
                            TestStep.step_no == step_counter
                        ).first()

                        if not step_obj:
                            step_obj = TestStep(
                                test_case_id=tc_obj.id,
                                step_no=step_counter,
                                test_step=step_text,
                                expected_result=expected_text,
                            )
                            db.add(step_obj)
                            db.flush()
                            results["test_steps_created"] += 1

                        # Create Initial TestExecution & Step Result
                        exec_obj = import_executions.get(tc_obj.id)
                        if not exec_obj:
                            latest_no = db.query(func.max(TestExecution.execution_no)).filter(
                                TestExecution.test_case_id == tc_obj.id
                            ).scalar() or 0
                            exec_obj = TestExecution(
                                test_case_id=tc_obj.id,
                                tester_name=tester,
                                completion_testing_date=comp_date or date.today(),
                                execution_no=latest_no + 1,
                                sheet_name=clean_str(sheet_name),
                                import_file_name=clean_filename,
                            )
                            db.add(exec_obj)
                            db.flush()
                            import_executions[tc_obj.id] = exec_obj
                            results["executions_created"] += 1

                        # Map Excel Status to standard enum (Smart N/A & Status Auto-Detection)
                        st_clean = status_raw.upper()
                        ket_clean = (keterangan or '').upper()

                        if st_clean == "0":
                            norm_status = "PASS"
                        elif st_clean == "1":
                            norm_status = "FAIL"
                        elif any(k in st_clean for k in ["N/A", "NOT APP", "NOT_APP"]) or ket_clean.startswith("N/A") or " N/A " in ket_clean:
                            norm_status = "N/A"
                        elif any(k in st_clean for k in ["PASS", "OK", "BERHASIL", "DONE"]):
                            norm_status = "PASS"
                        elif any(k in st_clean for k in ["FAIL", "GAGAL", "BUG", "ERROR"]):
                            norm_status = "FAIL"
                        elif any(k in st_clean for k in ["BLOCK", "KENDALA"]):
                            norm_status = "BLOCKED"
                        elif any(k in st_clean for k in ["PROGRESS", "PROSES", "PENDING"]):
                            norm_status = "IN_PROGRESS"
                        else:
                            norm_status = "NOT_RUN"

                        sr_obj = TestStepResult(
                            execution_id=exec_obj.id,
                            test_step_id=step_obj.id,
                            status=norm_status,
                            keterangan=keterangan,
                        )
                        db.add(sr_obj)

                        step_counter += 1

                except Exception as row_err:
                    if "errors" not in results:
                        results["errors"] = []
                    results["errors"].append(f"Sheet {sheet_name} Row {row_idx}: {str(row_err)}")
                    continue

        db.flush()

        db.commit()

        return {
            "success": True,
            "message": (
                f"Import V2 Selesai dari {results['sheets_processed']} sheet "
                f"({', '.join(results['sheet_names'])}): {results['test_cases_created']} Test Cases baru, "
                f"{results['test_steps_created']} Test Steps, {results['executions_created']} Eksekusi dibuat."
            ),
            **results
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal memproses file Excel V2: {str(e)}")
