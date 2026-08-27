from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.database import get_db
from app.models.models import TestScript, Module, SubModule
from app.schemas.schemas import (
    TestScriptResponse, TestScriptCreate, PaginatedTestScripts, TestScriptStats,
    CrossCheckResult
)
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from io import BytesIO
from datetime import datetime, date
from typing import List, Optional
import math
import re

router = APIRouter()

HEADER_ROW_TEST_SCRIPT = [
    "Test Case ID #", "Test Case Summary (Name)", "Prerequisite / Test Data",
    "Test Step", "Expected Result", "Stage", "Components",
    "Case Description", "Completion Testing Date", "Tester",
    "Status by Tester", "Keterangan"
]


def clean_str(val) -> Optional[str]:
    if val is None:
        return None
    s = str(val).strip()
    if s == "" or s == "None" or s.startswith("="):
        return None
    return s


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


def count_steps(text: Optional[str]) -> int:
    """Hitung jumlah langkah dalam field test_step.
    Parsing per baris non-kosong.
    Jika ada baris bernomor (1., 2., dst), hitung baris bernomor saja.
    Jika tidak, hitung jumlah baris non-kosong.
    """
    if not text or not text.strip():
        return 0
    lines = [l.strip() for l in str(text).split('\n') if l.strip()]
    
    import re
    numbered_lines = [l for l in lines if re.match(r'^\d+[\.\)]\s', l)]
    if numbered_lines:
        return len(numbered_lines)
    
    bullet_lines = [l for l in lines if re.match(r'^[\-\•\*\>]\s', l)]
    if bullet_lines:
        return len(bullet_lines)
        
    return max(1, len(lines))


def clean_file_name(file_name: str) -> str:
    """Remove file extension (.xlsx, .xls, .csv) from filename."""
    if not file_name:
        return "Dokumen Excel"
    fn = file_name.strip()
    return re.sub(r'\.(xlsx|xls|csv)$', '', fn, flags=re.IGNORECASE)


def get_or_create_module(db: Session, module_name: str) -> int:
    module_name = module_name.strip()
    mod = db.query(Module).filter(Module.name == module_name).first()
    if mod:
        return mod.id
    new_mod = Module(name=module_name)
    db.add(new_mod)
    db.flush()
    return new_mod.id


def get_or_create_sub_module(db: Session, module_id: int, sub_module_name: str) -> int:
    sub_module_name = sub_module_name.strip()
    sub = db.query(SubModule).filter(
        SubModule.module_id == module_id,
        SubModule.name == sub_module_name
    ).first()
    if sub:
        return sub.id
    new_sub = SubModule(module_id=module_id, name=sub_module_name)
    db.add(new_sub)
    db.flush()
    return new_sub.id


@router.get("/", response_model=PaginatedTestScripts)
def get_test_scripts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    module_id: Optional[int] = None,
    sub_module_id: Optional[int] = None,
    tester: Optional[str] = None,
    stage: Optional[str] = None,
    components: Optional[str] = None,
    cycle: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(TestScript)

    if status:
        query = query.filter(TestScript.status_by_tester == status)
    if module_id:
        query = query.filter(TestScript.module_id == module_id)
    if sub_module_id:
        query = query.filter(TestScript.sub_module_id == sub_module_id)
    if tester:
        query = query.filter(TestScript.tester == tester)
    if stage:
        query = query.filter(TestScript.stage == stage)
    if components:
        query = query.filter(TestScript.components == components)
    if cycle is not None:
        query = query.filter(TestScript.cycle == cycle)
    if date_from:
        query = query.filter(TestScript.completion_date >= date_from)
    if date_to:
        query = query.filter(TestScript.completion_date <= date_to)
    if search:
        s_filter = f"%{search}%"
        query = query.filter(
            or_(
                TestScript.test_case_id.ilike(s_filter),
                TestScript.summary.ilike(s_filter),
                TestScript.case_description.ilike(s_filter),
                TestScript.test_step.ilike(s_filter),
                TestScript.expected_result.ilike(s_filter),
            )
        )

    total = query.count()
    offset = (page - 1) * page_size
    items_raw = query.order_by(TestScript.id.desc()).offset(offset).limit(page_size).all()

    items = []
    for item in items_raw:
        mod = db.query(Module).filter(Module.id == item.module_id).first() if item.module_id else None
        sub = db.query(SubModule).filter(SubModule.id == item.sub_module_id).first() if item.sub_module_id else None
        items.append(TestScriptResponse(
            id=item.id,
            test_case_id=item.test_case_id,
            module_id=item.module_id,
            sub_module_id=item.sub_module_id,
            module_name=mod.name if mod else None,
            sub_module_name=sub.name if sub else None,
            summary=item.summary,
            prerequisite=item.prerequisite,
            test_step=item.test_step,
            expected_result=item.expected_result,
            stage=item.stage,
            components=item.components,
            case_description=item.case_description,
            completion_date=item.completion_date,
            tester=item.tester,
            status_by_tester=item.status_by_tester,
            keterangan=item.keterangan,
            sheet_name=item.sheet_name,
            import_file_name=item.import_file_name,
            cycle=item.cycle,
            year=item.year,
            month=item.month,
            day=item.day,
            created_at=item.created_at,
        ))

    return PaginatedTestScripts(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=math.ceil(total / page_size) if total > 0 else 1
    )


@router.get("/stats", response_model=TestScriptStats)
def get_test_script_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(TestScript.id)).scalar() or 0

    pass_cnt = db.query(func.count(TestScript.id)).filter(
        or_(
            TestScript.status_by_tester.ilike("pass%"),
            TestScript.status_by_tester.ilike("berhasil%"),
            TestScript.status_by_tester.ilike("ok%"),
            TestScript.status_by_tester.ilike("done%")
        )
    ).scalar() or 0

    fail_cnt = db.query(func.count(TestScript.id)).filter(
        or_(
            TestScript.status_by_tester.ilike("fail%"),
            TestScript.status_by_tester.ilike("gagal%"),
            TestScript.status_by_tester.ilike("bug%")
        )
    ).scalar() or 0

    blocked_cnt = db.query(func.count(TestScript.id)).filter(
        or_(
            TestScript.status_by_tester.ilike("block%"),
            TestScript.status_by_tester.ilike("terkendala%")
        )
    ).scalar() or 0

    untested_cnt = db.query(func.count(TestScript.id)).filter(
        or_(
            TestScript.status_by_tester.ilike("untested%"),
            TestScript.status_by_tester.ilike("belum%")
        )
    ).scalar() or 0

    not_run_cnt = db.query(func.count(TestScript.id)).filter(
        or_(
            TestScript.status_by_tester.ilike("not run%"),
            TestScript.status_by_tester.ilike("not_run%"),
            TestScript.status_by_tester.ilike("belum dijalankan%")
        )
    ).scalar() or 0

    in_prog_cnt = db.query(func.count(TestScript.id)).filter(
        or_(
            TestScript.status_by_tester.ilike("in prog%"),
            TestScript.status_by_tester.ilike("proses%")
        )
    ).scalar() or 0

    pass_rate = (pass_cnt / total * 100) if total > 0 else 0.0

    # Hitung total_steps: sum semua langkah dari field excel_step_count
    all_steps_data = db.query(TestScript.excel_step_count).all()
    total_steps = sum((row[0] or 1) for row in all_steps_data)

    # Dynamic status breakdown per unique status string in DB
    raw_statuses = db.query(
        TestScript.status_by_tester, func.count(TestScript.id)
    ).group_by(TestScript.status_by_tester).all()

    by_status = [
        {
            "status": s[0] if s[0] else "Untested",
            "count": s[1],
            "percentage": round((s[1] / total * 100), 1) if total > 0 else 0.0
        }
        for s in raw_statuses
    ]

    return TestScriptStats(
        total=total,
        total_steps=total_steps,
        pass_count=pass_cnt,
        fail_count=fail_cnt,
        blocked_count=blocked_cnt,
        untested_count=untested_cnt,
        not_run_count=not_run_cnt,
        in_progress_count=in_prog_cnt,
        pass_rate=round(pass_rate, 1),
        by_status=by_status
    )


@router.get("/statuses")
def get_unique_statuses(db: Session = Depends(get_db)):
    """Get unique list of Status by Tester currently in database."""
    statuses = db.query(TestScript.status_by_tester).filter(
        TestScript.status_by_tester.isnot(None)
    ).distinct().order_by(TestScript.status_by_tester).all()
    return [s[0] for s in statuses if s[0]]


@router.get("/filter-options")
def get_test_script_filter_options(db: Session = Depends(get_db)):
    """Get unique values for all Test Script filter dropdowns."""
    statuses = db.query(TestScript.status_by_tester).filter(
        TestScript.status_by_tester.isnot(None)
    ).distinct().order_by(TestScript.status_by_tester).all()

    stages = db.query(TestScript.stage).filter(
        TestScript.stage.isnot(None)
    ).distinct().order_by(TestScript.stage).all()

    testers = db.query(TestScript.tester).filter(
        TestScript.tester.isnot(None)
    ).distinct().order_by(TestScript.tester).all()

    components = db.query(TestScript.components).filter(
        TestScript.components.isnot(None)
    ).distinct().order_by(TestScript.components).all()

    cycles = db.query(TestScript.cycle).filter(
        TestScript.cycle.isnot(None)
    ).distinct().order_by(TestScript.cycle).all()

    min_date = db.query(func.min(TestScript.completion_date)).scalar()
    max_date = db.query(func.max(TestScript.completion_date)).scalar()

    return {
        "statuses": [s[0] for s in statuses if s[0]],
        "stages": [s[0] for s in stages if s[0]],
        "testers": [t[0] for t in testers if t[0]],
        "components": [c[0] for c in components if c[0]],
        "cycles": [c[0] for c in cycles if c[0] is not None],
        "date_range": {
            "min": str(min_date) if min_date else None,
            "max": str(max_date) if max_date else None,
        }
    }


@router.get("/template")
def download_test_script_template():
    wb = Workbook()
    ws = wb.active
    ws.title = "Test Script"

    title_font = Font(name="Calibri", bold=True, size=12)
    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin")
    )

    # Write Banner
    ws.cell(row=1, column=1, value="Test Script Document").font = Font(name="Calibri", bold=True, size=14)
    ws.cell(row=1, column=5, value="Cycle").font = title_font
    ws.cell(row=1, column=6, value=1)
    ws.cell(row=1, column=7, value="Year").font = title_font
    ws.cell(row=1, column=8, value=2026)

    ws.cell(row=2, column=1, value="Module").font = title_font
    ws.cell(row=2, column=2, value="Catalog E-Commerce - Vendor Item Registration & Maintenance")
    ws.cell(row=2, column=5, value="Month").font = title_font
    ws.cell(row=2, column=6, value=8)

    ws.cell(row=3, column=1, value="Phase/Stage").font = title_font
    ws.cell(row=3, column=2, value="SIT")
    ws.cell(row=3, column=5, value="Day").font = title_font
    ws.cell(row=3, column=6, value=1)

    # Table Header at Row 6
    for col_idx, h in enumerate(HEADER_ROW_TEST_SCRIPT, 1):
        cell = ws.cell(row=6, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    # Sample Data at Row 7
    sample = [
        "TC-CAT-001", "Verifikasi Form Registrasi Barang Vendor",
        "User vendor sudah login di Portal",
        "1. Masuk menu Katalog E-Commerce\n2. Klik Tambah Barang\n3. Isi form spesifikasi",
        "Form tersimpan dan berstatus Menunggu Verifikasi VM",
        "SIT", "Vendor Item Registration",
        "Memastikan vendor dapat mendaftarkan barang baru",
        "2026-08-01", "Amanda", "Pass", "Berhasil diuji tanpa kendala"
    ]
    data_font = Font(name="Calibri", size=10)
    for col_idx, val in enumerate(sample, 1):
        cell = ws.cell(row=7, column=col_idx, value=val)
        cell.font = data_font
        cell.border = thin_border

    widths = [16, 35, 30, 45, 45, 12, 25, 35, 20, 15, 18, 30]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=6, column=i).column_letter].width = w

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=template_test_script.xlsx"}
    )


@router.post("/import/excel")
async def import_test_script_excel(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="File harus berformat .xlsx atau .xls")

    original_filename = file.filename

    try:
        contents = await file.read()
        wb = load_workbook(BytesIO(contents), data_only=True)

        results = {
            "total_rows": 0,
            "imported": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [],
            "sheets_processed": 0,
            "sheet_names": [],
            "modules_created": [],
        }

        # Non-test script sheet names to skip automatically
        IGNORED_SHEETS = [
            "home", "beranda", "cover", "index", "summary", "dashboard",
            "info", "guide", "panduan", "table of contents", "toc",
            "rekap", "rekapitulasi", "pembobotan", "list user", "list_user",
            "user list", "user_list", "list-user", "users", "kredensial", "credential"
        ]

        # Process ALL sheets in workbook
        for sheet_name in wb.sheetnames:
            s_name_clean = sheet_name.strip().lower()

            # 1. Skip non-data sheets by name
            if s_name_clean in IGNORED_SHEETS or any(ign in s_name_clean for ign in ["home", "cover", "toc", "index"]):
                continue

            ws = wb[sheet_name]

            # 2. Check if sheet actually contains test script header/data (scan rows 1-12)
            has_test_script_structure = False
            data_start_row = 7  # Default if banner exists

            for r in range(1, min(ws.max_row + 1, 15)):
                val_a = str(ws.cell(row=r, column=1).value or "").strip().lower()
                val_b = str(ws.cell(row=r, column=2).value or "").strip().lower()

                if "test case id" in val_a or "test case summary" in val_b or "summary" in val_b or "prerequisite" in str(ws.cell(row=r, column=3).value or "").lower():
                    has_test_script_structure = True
                    data_start_row = r + 1
                    break

            # If sheet doesn't look like a Test Script sheet, skip it
            if not has_test_script_structure:
                # Secondary check: check if row 7 column 1 or 2 has content
                val_r7_a = clean_str(ws.cell(row=7, column=1).value)
                val_r7_b = clean_str(ws.cell(row=7, column=2).value)
                if not val_r7_a and not val_r7_b:
                    continue

            results["sheets_processed"] += 1
            results["sheet_names"].append(sheet_name)

            # Extract Banner Metadata & Header Title (Rows 1-5, Columns A-G)
            banner_cycle = None
            banner_year = None
            banner_month = None
            banner_day = None
            banner_module = None
            banner_stage = None
            banner_header_title = None

            # Read Title / Header Description from Row 1-4, Columns D-G
            header_texts = []
            for r in range(1, 5):
                for c in range(4, 8):  # Column D to G
                    cell_v = clean_str(ws.cell(row=r, column=c).value)
                    if cell_v and not any(k in cell_v.lower() for k in ["cycle", "year", "month", "day", "stage", "phase"]):
                        header_texts.append(cell_v)

            if header_texts:
                banner_header_title = " - ".join(header_texts)

            # Metadata key-value scanning
            for r in range(1, min(ws.max_row + 1, 7)):
                for c in range(1, 10):
                    val_cell = str(ws.cell(row=r, column=c).value or "").strip()
                    val_lower = val_cell.lower()

                    if "module" in val_lower or "modul" in val_lower:
                        next_val = clean_str(ws.cell(row=r, column=c+1).value)
                        if next_val and next_val.lower() not in ["document", "name", "nama", "code"]:
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

            # Priority for Module Name: Banner Module (Row 1-5) as Primary Modul, Sheet Name as fallback
            module_name = banner_module or clean_str(sheet_name) or "General Module"

            # Detect Data Start Row (default to Row 7, or right after header)
            data_start_row = 7
            for r in range(1, min(ws.max_row + 1, 15)):
                val_a = str(ws.cell(row=r, column=1).value or "").strip().lower()
                val_b = str(ws.cell(row=r, column=2).value or "").strip().lower()
                if "test case id" in val_a or "test case summary" in val_b or "summary" in val_b:
                    data_start_row = r + 1
                    break

            current_parent_tc_id = None
            current_parent_summary = None

            for row_idx in range(data_start_row, ws.max_row + 1):
                raw_tc_id = clean_str(ws.cell(row=row_idx, column=1).value)
                raw_summary = clean_str(ws.cell(row=row_idx, column=2).value)
                prereq = clean_str(ws.cell(row=row_idx, column=3).value)
                step = clean_str(ws.cell(row=row_idx, column=4).value)
                expected = clean_str(ws.cell(row=row_idx, column=5).value)
                stage = clean_str(ws.cell(row=row_idx, column=6).value) or banner_stage or "SIT"
                components_val = clean_str(ws.cell(row=row_idx, column=7).value)
                description = clean_str(ws.cell(row=row_idx, column=8).value)
                comp_date = parse_date(ws.cell(row=row_idx, column=9).value)
                tester = clean_str(ws.cell(row=row_idx, column=10).value)
                status = clean_str(ws.cell(row=row_idx, column=11).value) or "Untested"
                keterangan = clean_str(ws.cell(row=row_idx, column=12).value)

                # Skip completely empty rows
                if not raw_tc_id and not raw_summary and not step and not expected and not status:
                    continue

                # Skip header row leftovers
                if raw_summary and raw_summary.lower() in ["test case summary (name)", "summary", "test case id #", "<nama/deskripsi singkat test case"]:
                    continue

                # Skip user credential / password table rows only
                if components_val and "password" in components_val.lower():
                    continue

                # Track parent TC ID and Summary for merged cells in Excel
                if raw_tc_id:
                    current_parent_tc_id = raw_tc_id
                if raw_summary:
                    current_parent_summary = raw_summary

                tc_id = raw_tc_id or current_parent_tc_id or f"TC-GEN-{row_idx}"
                summary = raw_summary or current_parent_summary or f"Test Step #{row_idx}"

                # Unique DB Lookup Key for each row in Excel to guarantee 100% data entry
                # If merged row without TC ID, use unique key incorporating row index
                db_lookup_id = raw_tc_id if raw_tc_id else f"{tc_id}_row{row_idx}"

                results["total_rows"] += 1

                components = components_val or clean_str(sheet_name) or "General Test Script"

                # Determine Module & Sub-Module ID
                module_id = None
                if module_name:
                    module_id = get_or_create_module(db, module_name)
                    if module_name not in results["modules_created"]:
                        results["modules_created"].append(module_name)

                sub_module_id = None
                if components and module_id:
                    sub_module_id = get_or_create_sub_module(db, module_id, components)

                # Check existing TestScript by db_lookup_id
                existing = db.query(TestScript).filter(TestScript.test_case_id == db_lookup_id).first()
                if existing:
                    existing.summary = summary
                    existing.prerequisite = prereq
                    existing.test_step = step
                    existing.expected_result = expected
                    existing.stage = stage
                    existing.components = components
                    existing.case_description = description
                    existing.completion_date = comp_date
                    existing.tester = tester
                    existing.status_by_tester = status
                    existing.keterangan = keterangan
                    existing.sheet_name = clean_str(sheet_name)
                    existing.import_file_name = original_filename
                    existing.excel_step_count = 1
                    if module_id: existing.module_id = module_id
                    if sub_module_id: existing.sub_module_id = sub_module_id
                    if banner_cycle: existing.cycle = banner_cycle
                    if banner_year: existing.year = banner_year
                    if banner_month: existing.month = banner_month
                    if banner_day: existing.day = banner_day
                    results["updated"] += 1
                else:
                    new_ts = TestScript(
                        test_case_id=db_lookup_id,
                        module_id=module_id,
                        sub_module_id=sub_module_id,
                        summary=summary,
                        prerequisite=prereq,
                        test_step=step,
                        expected_result=expected,
                        stage=stage,
                        components=components,
                        case_description=description,
                        completion_date=comp_date,
                        tester=tester,
                        status_by_tester=status,
                        keterangan=keterangan,
                        sheet_name=clean_str(sheet_name),
                        import_file_name=original_filename,
                        cycle=banner_cycle,
                        year=banner_year,
                        month=banner_month,
                        day=banner_day,
                        excel_step_count=1
                    )
                    db.add(new_ts)
                    results["imported"] += 1

        db.commit()

        return {
            "success": True,
            "message": (
                f"Import Test Script selesai dari {results['sheets_processed']} sheet "
                f"({', '.join(results['sheet_names'])}): {results['imported']} baru, "
                f"{results['updated']} di-update, {results['skipped']} dilewati."
            ),
            **results
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Gagal memproses file: {str(e)}")


@router.get("/export")
def export_test_scripts(
    status: Optional[str] = None,
    module_id: Optional[int] = None,
    sub_module_id: Optional[int] = None,
    tester: Optional[str] = None,
    stage: Optional[str] = None,
    components: Optional[str] = None,
    cycle: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Export filtered Test Scripts to Excel.
    Formated with Document Banner (Row 1-5) & Table Data (Row 7+)
    Ideal for sending Fail/Blocked test scripts to Vendor for fixing.
    """
    query = db.query(TestScript)

    if status:
        query = query.filter(TestScript.status_by_tester == status)
    if module_id:
        query = query.filter(TestScript.module_id == module_id)
    if sub_module_id:
        query = query.filter(TestScript.sub_module_id == sub_module_id)
    if tester:
        query = query.filter(TestScript.tester == tester)
    if stage:
        query = query.filter(TestScript.stage == stage)
    if components:
        query = query.filter(TestScript.components == components)
    if cycle is not None:
        query = query.filter(TestScript.cycle == cycle)
    if date_from:
        query = query.filter(TestScript.completion_date >= date_from)
    if date_to:
        query = query.filter(TestScript.completion_date <= date_to)
    if search:
        s_filter = f"%{search}%"
        query = query.filter(
            or_(
                TestScript.test_case_id.ilike(s_filter),
                TestScript.summary.ilike(s_filter),
                TestScript.case_description.ilike(s_filter),
                TestScript.test_step.ilike(s_filter),
                TestScript.expected_result.ilike(s_filter),
            )
        )

    scripts = query.order_by(TestScript.id.desc()).all()

    wb = Workbook()
    ws = wb.active
    ws.title = "Test Script"

    title_font = Font(name="Calibri", bold=True, size=12)
    header_font = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
    header_fill = PatternFill(start_color="1E3A5F", end_color="1E3A5F", fill_type="solid")
    thin_border = Border(
        left=Side(style="thin"), right=Side(style="thin"),
        top=Side(style="thin"), bottom=Side(style="thin")
    )

    # Determine module name for banner
    mod_name = "Semua Module"
    if module_id:
        mod_obj = db.query(Module).filter(Module.id == module_id).first()
        if mod_obj:
            mod_name = mod_obj.name

    today_now = date.today()

    # Write Banner (Row 1 - 3)
    ws.cell(row=1, column=1, value="Test Script Document").font = Font(name="Calibri", bold=True, size=14, color="1E3A5F")
    ws.cell(row=1, column=5, value="Cycle").font = title_font
    ws.cell(row=1, column=6, value=cycle or 1)
    ws.cell(row=1, column=7, value="Year").font = title_font
    ws.cell(row=1, column=8, value=today_now.year)

    ws.cell(row=2, column=1, value="Module").font = title_font
    ws.cell(row=2, column=2, value=mod_name)
    ws.cell(row=2, column=5, value="Month").font = title_font
    ws.cell(row=2, column=6, value=today_now.month)

    ws.cell(row=3, column=1, value="Phase/Stage").font = title_font
    ws.cell(row=3, column=2, value=stage or "SIT")
    ws.cell(row=3, column=5, value="Day").font = title_font
    ws.cell(row=3, column=6, value=today_now.day)

    if status:
        ws.cell(row=4, column=1, value=f"Filter Status: {status}").font = Font(name="Calibri", bold=True, color="CC0000", size=11)

    # Table Header at Row 6
    for col_idx, h in enumerate(HEADER_ROW_TEST_SCRIPT, 1):
        cell = ws.cell(row=6, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    # Fills for status highlights
    fail_fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
    pass_fill = PatternFill(start_color="D1FAE5", end_color="D1FAE5", fill_type="solid")
    block_fill = PatternFill(start_color="FFEDD5", end_color="FFEDD5", fill_type="solid")
    data_font = Font(name="Calibri", size=10)

    # Write Table Data (Row 7+)
    for row_idx, s in enumerate(scripts, 7):
        st_lower = (s.status_by_tester or '').lower()
        row_vals = [
            s.test_case_id, s.summary, s.prerequisite, s.test_step, s.expected_result,
            s.stage, s.components, s.case_description,
            str(s.completion_date) if s.completion_date else "",
            s.tester, s.status_by_tester, s.keterangan
        ]
        for col_idx, val in enumerate(row_vals, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = data_font
            cell.border = thin_border

            # Highlight status column (Column K = 11)
            if col_idx == 11:
                cell.alignment = Alignment(horizontal="center", vertical="center")
                if st_lower.startswith("fail") or st_lower.startswith("gagal"):
                    cell.fill = fail_fill
                    cell.font = Font(name="Calibri", bold=True, color="991B1B")
                elif st_lower.startswith("pass") or st_lower.startswith("berhasil") or st_lower.startswith("ok"):
                    cell.fill = pass_fill
                    cell.font = Font(name="Calibri", bold=True, color="065F46")
                elif st_lower.startswith("block") or st_lower.startswith("kendala"):
                    cell.fill = block_fill
                    cell.font = Font(name="Calibri", bold=True, color="9A3412")

    widths = [16, 35, 30, 45, 45, 12, 25, 35, 20, 15, 18, 30]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=6, column=i).column_letter].width = w

    ws.freeze_panes = "A7"

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    filename_status = f"_{status}" if status else ""
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Test_Script{filename_status}_{today_now.strftime('%Y%m%d')}.xlsx"}
    )


@router.get("/export-rekap")
def export_test_script_rekap(
    status: Optional[str] = None,
    module_id: Optional[int] = None,
    sub_module_id: Optional[int] = None,
    tester: Optional[str] = None,
    stage: Optional[str] = None,
    components: Optional[str] = None,
    cycle: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    search: Optional[str] = None,
    page: Optional[int] = None,
    page_size: Optional[int] = None,
    db: Session = Depends(get_db)
):
    """
    Export Rekap Test Script Excel per Modul & Sheet/Components.
    Accepts all query filters from UI without error.
    """
    query = db.query(TestScript)
    if status:
        query = query.filter(TestScript.status_by_tester == status)
    if module_id:
        query = query.filter(TestScript.module_id == module_id)
    if sub_module_id:
        query = query.filter(TestScript.sub_module_id == sub_module_id)
    if tester:
        query = query.filter(TestScript.tester == tester)
    if stage:
        query = query.filter(TestScript.stage == stage)
    if components:
        query = query.filter(TestScript.components == components)
    if cycle is not None:
        query = query.filter(TestScript.cycle == cycle)
    if date_from:
        query = query.filter(TestScript.completion_date >= date_from)
    if date_to:
        query = query.filter(TestScript.completion_date <= date_to)
    if search:
        s_filter = f"%{search}%"
        query = query.filter(
            or_(
                TestScript.test_case_id.ilike(s_filter),
                TestScript.summary.ilike(s_filter),
                TestScript.case_description.ilike(s_filter),
                TestScript.test_step.ilike(s_filter),
                TestScript.expected_result.ilike(s_filter),
            )
        )

    all_scripts = query.all()

    # Group by (File Name -> Module Name -> Test Script / Sheet Name)
    grouped = {}
    for s in all_scripts:
        file_name = clean_file_name(s.import_file_name)
        mod_name = s.module.name if s.module else "Tanpa Modul"
        ts_name = s.sheet_name or s.components or (s.sub_module.name if s.sub_module else "General Test Script")
        
        if file_name not in grouped:
            grouped[file_name] = {}
        if mod_name not in grouped[file_name]:
            grouped[file_name][mod_name] = {}
        if ts_name not in grouped[file_name][mod_name]:
            grouped[file_name][mod_name][ts_name] = []
            
        grouped[file_name][mod_name][ts_name].append(s)

    wb = Workbook()
    ws = wb.active
    ws.title = "Rekap Test Script"

    # Styles
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
    not_run_fill = PatternFill(start_color="F8FAFC", end_color="F8FAFC", fill_type="solid")

    headers = [
        "No", "Nama File Import", "Modul", "Test Script", "Total Test Script",
        "Jumlah Testing", "FAIL", "Not Run", "N/A", "PASS", "Fixing",
        "Keterangan Temuan"
    ]

    for col_idx, h in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=h)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        cell.border = thin_border

    row_num = 2
    no_counter = 1

    tot_total_steps = 0
    tot_jumlah_testing = 0
    tot_fail = 0
    tot_not_run = 0
    tot_na = 0
    tot_pass = 0
    tot_fixing = 0

    # Iteration over nested grouping (File -> Module -> Test Script)
    for file_name, modules_dict in grouped.items():
        file_start_row = row_num

        for mod_name, ts_dict in modules_dict.items():
            mod_start_row = row_num

            # Natural sort Test Script names (Module_1, Module_2 ... Module_10)
            sorted_ts_keys = sorted(ts_dict.keys(), key=lambda x: int(re.findall(r'\d+', x)[0]) if re.findall(r'\d+', x) else 9999)

            for ts_name in sorted_ts_keys:
                items = ts_dict[ts_name]
                total_steps_group = sum((item.excel_step_count or 1) for item in items)

                cnt_fail_steps = 0
                cnt_not_run_steps = 0
                cnt_na_steps = 0
                cnt_pass_steps = 0
                cnt_fixing_steps = 0
                fail_details = []
                detail_no = 1

                for item in items:
                    st = (item.status_by_tester or '').strip().lower()
                    step_count = item.excel_step_count or 1

                    if st.startswith("fail") or st.startswith("gagal") or st.startswith("bug"):
                        cnt_fail_steps += step_count
                        if item.test_step:
                            step_lines = [l.strip() for l in item.test_step.split('\n') if l.strip()]
                            for step_line in step_lines:
                                fail_details.append(
                                    f"{detail_no}. [{item.test_case_id or 'TC'}] {step_line}"
                                    + (f" ({item.keterangan})" if item.keterangan else "")
                                )
                                detail_no += 1
                        else:
                            fail_details.append(
                                f"{detail_no}. [{item.test_case_id or 'TC'}] {item.summary or ''}"
                                + (f" — {item.keterangan}" if item.keterangan else "")
                            )
                            detail_no += 1

                    elif st.startswith("not run") or st.startswith("not_run") or \
                         st.startswith("untested") or st.startswith("belum") or st == "":
                        cnt_not_run_steps += step_count
                    elif st == "n/a" or st.startswith("not app"):
                        cnt_na_steps += step_count
                    elif st.startswith("pass") or st.startswith("ok") or \
                         st.startswith("berhasil") or st.startswith("done"):
                        cnt_pass_steps += step_count
                    elif st.startswith("fix") or st.startswith("in prog") or st.startswith("proses"):
                        cnt_fixing_steps += step_count
                    else:
                        cnt_not_run_steps += step_count

                jumlah_testing = total_steps_group - cnt_not_run_steps
                keterangan_temuan = "\n".join(fail_details) if fail_details else "-"

                tot_total_steps += total_steps_group
                tot_jumlah_testing += jumlah_testing
                tot_fail += cnt_fail_steps
                tot_not_run += cnt_not_run_steps
                tot_na += cnt_na_steps
                tot_pass += cnt_pass_steps
                tot_fixing += cnt_fixing_steps

                row_vals = [
                    no_counter,
                    file_name,
                    mod_name,
                    ts_name,
                    total_steps_group,
                    jumlah_testing,
                    cnt_fail_steps,
                    cnt_not_run_steps,
                    cnt_na_steps,
                    cnt_pass_steps,
                    cnt_fixing_steps,
                    keterangan_temuan
                ]

                for col_idx, val in enumerate(row_vals, 1):
                    cell = ws.cell(row=row_num, column=col_idx, value=val)
                    cell.font = data_font
                    cell.border = thin_border

                    if col_idx == 1:
                        cell.alignment = Alignment(horizontal="center", vertical="center")
                    elif col_idx in [2, 3]:
                        cell.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
                    elif col_idx in [5, 6, 7, 8, 9, 10, 11]:
                        cell.alignment = Alignment(horizontal="center", vertical="center")
                    elif col_idx == 12:
                        cell.alignment = Alignment(horizontal="left", vertical="top", wrap_text=True)
                    else:
                        cell.alignment = Alignment(horizontal="left", vertical="center")

                    if col_idx == 7 and cnt_fail_steps > 0:
                        cell.fill = fail_fill
                        cell.font = Font(name="Calibri", bold=True, color="991B1B")
                    if col_idx == 10 and cnt_pass_steps > 0:
                        cell.fill = pass_fill
                        cell.font = Font(name="Calibri", bold=True, color="065F46")
                    if col_idx == 8 and cnt_not_run_steps > 0:
                        cell.fill = not_run_fill

                row_num += 1
                no_counter += 1

    # Write Summary Row at Bottom
    summary_vals = [
        "TOTAL", "", "", "", tot_total_steps, tot_jumlah_testing,
        tot_fail, tot_not_run, tot_na, tot_pass, tot_fixing, ""
    ]
    for col_idx, val in enumerate(summary_vals, 1):
        cell = ws.cell(row=row_num, column=col_idx, value=val)
        cell.font = bold_font
        cell.border = thin_border
        cell.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
        if col_idx in [1, 5, 6, 7, 8, 9, 10, 11]:
            cell.alignment = Alignment(horizontal="center", vertical="center")

    ws.merge_cells(start_row=row_num, start_column=1, end_row=row_num, end_column=4)

    widths = [6, 25, 30, 20, 16, 16, 10, 10, 10, 10, 10, 55]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    widths = [6, 25, 30, 16, 16, 10, 10, 10, 10, 10, 55]
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=i).column_letter].width = w

    ws.freeze_panes = "A2"

    output = BytesIO()
    wb.save(output)
    output.seek(0)

    today_str = date.today().strftime('%Y%m%d')
    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=Rekap_Test_Script_{today_str}.xlsx"}
    )


@router.get("/cross-check")
def cross_check_test_scripts(db: Session = Depends(get_db)):
    """
    Cross-check integritas data Test Script di database:
    - Total records & total steps
    - Breakdown status (cases & steps)
    - Duplikat test_case_id
    - Test case tanpa test_step
    - Test case tanpa test_case_id (auto-generated)
    """
    all_scripts = db.query(TestScript).all()
    total_records = len(all_scripts)

    # Hitung total steps
    total_steps = sum((s.excel_step_count or 1) for s in all_scripts)

    # Breakdown per status (cases + steps)
    status_map = {}
    for s in all_scripts:
        st_raw = (s.status_by_tester or 'Untested').strip()
        step_cnt = s.excel_step_count or 1
        if st_raw not in status_map:
            status_map[st_raw] = {"cases": 0, "steps": 0}
        status_map[st_raw]["cases"] += 1
        status_map[st_raw]["steps"] += step_cnt

    # Grup status ke kategori standar
    grouped_status = {
        "PASS": {"cases": 0, "steps": 0},
        "FAIL": {"cases": 0, "steps": 0},
        "NOT RUN": {"cases": 0, "steps": 0},
        "N/A": {"cases": 0, "steps": 0},
        "BLOCKED": {"cases": 0, "steps": 0},
        "FIXING": {"cases": 0, "steps": 0},
        "OTHER": {"cases": 0, "steps": 0},
    }
    for st_raw, counts in status_map.items():
        st = st_raw.lower()
        if st.startswith("pass") or st.startswith("ok") or st.startswith("berhasil") or st.startswith("done"):
            grouped_status["PASS"]["cases"] += counts["cases"]
            grouped_status["PASS"]["steps"] += counts["steps"]
        elif st.startswith("fail") or st.startswith("gagal") or st.startswith("bug"):
            grouped_status["FAIL"]["cases"] += counts["cases"]
            grouped_status["FAIL"]["steps"] += counts["steps"]
        elif st.startswith("block") or st.startswith("terkendala"):
            grouped_status["BLOCKED"]["cases"] += counts["cases"]
            grouped_status["BLOCKED"]["steps"] += counts["steps"]
        elif st == "n/a" or st.startswith("not app"):
            grouped_status["N/A"]["cases"] += counts["cases"]
            grouped_status["N/A"]["steps"] += counts["steps"]
        elif st.startswith("fix") or st.startswith("in prog") or st.startswith("proses"):
            grouped_status["FIXING"]["cases"] += counts["cases"]
            grouped_status["FIXING"]["steps"] += counts["steps"]
        elif st.startswith("not run") or st.startswith("untested") or st.startswith("belum") or st == "":
            grouped_status["NOT RUN"]["cases"] += counts["cases"]
            grouped_status["NOT RUN"]["steps"] += counts["steps"]
        else:
            grouped_status["OTHER"]["cases"] += counts["cases"]
            grouped_status["OTHER"]["steps"] += counts["steps"]

    # Deteksi duplikat test_case_id
    from collections import Counter
    tc_ids = [s.test_case_id for s in all_scripts if s.test_case_id]
    id_counts = Counter(tc_ids)
    duplicates = [tc_id for tc_id, cnt in id_counts.items() if cnt > 1]

    # Test case tanpa test_step
    no_step_cases = [
        s.test_case_id or f"(id={s.id})"
        for s in all_scripts
        if not s.test_step or not s.test_step.strip()
    ]

    # Test case tanpa test_case_id (auto-generated TC-GEN-*)
    no_tc_id_count = sum(
        1 for s in all_scripts
        if not s.test_case_id or str(s.test_case_id).startswith("TC-GEN-")
    )

    # Periksa integritas
    warnings = []
    if duplicates:
        warnings.append(f"Ditemukan {len(duplicates)} duplikat test_case_id: {', '.join(duplicates[:10])}{'...' if len(duplicates) > 10 else ''}")
    if no_step_cases:
        warnings.append(f"Ditemukan {len(no_step_cases)} test case tanpa test_step")
    if no_tc_id_count > 0:
        warnings.append(f"Ditemukan {no_tc_id_count} test case dengan ID auto-generated (TC-GEN-*)")

    # Verifikasi jumlah (sum by_status cases == total)
    total_by_status = sum(v["cases"] for v in grouped_status.values())
    if total_by_status != total_records:
        warnings.append(f"WARNING: Sum breakdown status ({total_by_status}) != total records ({total_records})")

    integrity_ok = len(duplicates) == 0 and len(warnings) == 0

    return {
        "total_records": total_records,
        "total_steps": total_steps,
        "avg_steps_per_case": round(total_steps / total_records, 2) if total_records > 0 else 0,
        "status_breakdown": grouped_status,
        "raw_status_breakdown": status_map,
        "duplicates": duplicates,
        "no_step_cases": no_step_cases[:50],  # Limit 50
        "no_step_cases_count": len(no_step_cases),
        "no_test_case_id": no_tc_id_count,
        "integrity_ok": integrity_ok,
        "warnings": warnings,
    }
