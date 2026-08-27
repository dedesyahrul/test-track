from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime


# --- Module ---
class ModuleBase(BaseModel):
    name: str

class ModuleResponse(ModuleBase):
    id: int
    sub_module_count: Optional[int] = 0
    total_defects: Optional[int] = 0
    open_defects: Optional[int] = 0
    closed_defects: Optional[int] = 0

    class Config:
        from_attributes = True


# --- SubModule ---
class SubModuleResponse(BaseModel):
    id: int
    name: str
    module_id: int
    module_name: Optional[str] = None

    class Config:
        from_attributes = True


# --- Defect ---
class DefectBase(BaseModel):
    defect_id: str
    module_id: Optional[int] = None
    sub_module_id: Optional[int] = None
    summary: Optional[str] = None
    stage: Optional[str] = "Testing: SIT"
    environment: Optional[str] = "Development"
    description: Optional[str] = None
    issue_link: Optional[str] = None
    impact_of_issue: Optional[str] = None
    level_of_defect: Optional[str] = None
    scoring_level: Optional[int] = None
    priority: Optional[str] = None
    defect_criteria: Optional[str] = "Defect"
    status: Optional[str] = "Open"
    date_created: Optional[date] = None
    date_reopened: Optional[date] = None
    date_closed: Optional[date] = None
    aging: Optional[int] = 0
    created_by: Optional[str] = None
    last_retested_by: Optional[str] = None
    fixing_confirmed_by: Optional[str] = None
    estimated_fix_date: Optional[date] = None
    fixing_review_status: Optional[str] = None
    keterangan: Optional[str] = None
    retesting: Optional[str] = None


class DefectCreate(DefectBase):
    pass


class DefectUpdate(BaseModel):
    summary: Optional[str] = None
    status: Optional[str] = None
    level_of_defect: Optional[str] = None
    priority: Optional[str] = None
    fixing_review_status: Optional[str] = None
    date_closed: Optional[date] = None
    last_retested_by: Optional[str] = None
    fixing_confirmed_by: Optional[str] = None
    keterangan: Optional[str] = None
    retesting: Optional[str] = None


class DefectResponse(DefectBase):
    id: int
    module_name: Optional[str] = None
    sub_module_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --- Dashboard ---
class DashboardOverview(BaseModel):
    total_defects: int
    total_open: int
    total_closed: int
    total_non_defect: int
    total_under_review: int
    defect_rate: float
    resolution_rate: float
    avg_aging: float
    sit_date: Optional[str] = None
    project_name: Optional[str] = None


class DefectByLevel(BaseModel):
    level: str
    count: int
    weight: int
    score: int


class DefectByModule(BaseModel):
    module: str
    total: int
    open: int
    closed: int


class DefectByStatus(BaseModel):
    status: str
    count: int


class DefectTrend(BaseModel):
    date: str
    created: int
    closed: int
    cumulative_open: int


class TesterWorkload(BaseModel):
    tester: str
    created: int
    retested: int


class DefectScoringResponse(BaseModel):
    category: str
    weight: int
    total_closed: int
    total_open: int
    score_open: int


class PriorityDistribution(BaseModel):
    priority: str
    count: int


class AgingDistribution(BaseModel):
    range: str
    count: int


class ModuleDefectDetail(BaseModel):
    sub_module: str
    total_defect: int
    total_non_defect: int
    total: int


# --- Paginated response ---
class PaginatedDefects(BaseModel):
    items: List[DefectResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ====================================================
# Arsitektur V2 Schemas (per Pengembangan.md)
# ====================================================

class TestStepResultBase(BaseModel):
    test_step_id: int
    status: str = "NOT_RUN" # PASS, FAIL, BLOCKED, NOT_RUN
    keterangan: Optional[str] = None

class TestStepResultCreate(TestStepResultBase):
    pass

class TestStepResultResponse(TestStepResultBase):
    id: int
    execution_id: int
    test_step_text: Optional[str] = None
    expected_result_text: Optional[str] = None

    class Config:
        from_attributes = True


class TestStepBase(BaseModel):
    step_no: int
    test_step: str
    expected_result: Optional[str] = None

class TestStepCreate(TestStepBase):
    pass

class TestStepResponse(TestStepBase):
    id: int
    test_case_id: int

    class Config:
        from_attributes = True


class TestExecutionBase(BaseModel):
    test_case_id: int
    tester_id: Optional[int] = None
    tester_name: Optional[str] = None
    completion_testing_date: Optional[date] = None
    notes: Optional[str] = None

class TestExecutionCreate(TestExecutionBase):
    step_results: List[TestStepResultCreate] = []

class TestExecutionResponse(TestExecutionBase):
    id: int
    execution_no: int
    created_at: datetime
    step_results: List[TestStepResultResponse] = []

    class Config:
        from_attributes = True


class TestCaseBase(BaseModel):
    project_id: Optional[int] = 1
    module_id: Optional[int] = None
    test_case_id: str
    summary: str
    prerequisite: Optional[str] = None
    stage: Optional[str] = "Testing: SIT"
    component: Optional[str] = None
    case_description: Optional[str] = None
    sheet_name: Optional[str] = None
    import_file_name: Optional[str] = None
    cycle: Optional[int] = None
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None

class TestCaseCreate(TestCaseBase):
    steps: List[TestStepCreate] = []

class TestCaseResponse(TestCaseBase):
    id: int
    module_name: Optional[str] = None
    total_steps: int = 0
    calculated_status: str = "NOT RUN" # PASS, FAIL, BLOCKED, NOT RUN, IN PROGRESS
    last_tester: Optional[str] = None
    last_testing_date: Optional[date] = None
    created_at: datetime
    steps: List[TestStepResponse] = []
    latest_execution: Optional[TestExecutionResponse] = None

    class Config:
        from_attributes = True

class PaginatedTestCases(BaseModel):
    items: List[TestCaseResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class DefectV2Base(BaseModel):
    defect_code: str
    project_id: Optional[int] = 1
    test_case_id: Optional[int] = None
    test_step_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    severity: Optional[str] = "MAJOR"
    priority: Optional[str] = "HIGH"
    status: Optional[str] = "OPEN"
    assigned_to: Optional[str] = None
    reported_by: Optional[str] = None
    found_date: Optional[date] = None
    resolved_date: Optional[date] = None

class DefectV2Create(DefectV2Base):
    pass

class DefectV2Response(DefectV2Base):
    id: int
    test_case_code: Optional[str] = None
    test_case_summary: Optional[str] = None
    step_no: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True



# --- TestScript ---
class TestScriptBase(BaseModel):
    test_case_id: Optional[str] = None
    module_id: Optional[int] = None
    sub_module_id: Optional[int] = None
    summary: Optional[str] = None
    prerequisite: Optional[str] = None
    test_step: Optional[str] = None
    expected_result: Optional[str] = None
    stage: Optional[str] = "SIT"
    components: Optional[str] = None
    case_description: Optional[str] = None
    completion_date: Optional[date] = None
    tester: Optional[str] = None
    status_by_tester: Optional[str] = "Untested"
    keterangan: Optional[str] = None
    sheet_name: Optional[str] = None
    import_file_name: Optional[str] = None
    cycle: Optional[int] = None
    year: Optional[int] = None
    month: Optional[int] = None
    day: Optional[int] = None


class TestScriptCreate(TestScriptBase):
    pass


class TestScriptResponse(TestScriptBase):
    id: int
    module_name: Optional[str] = None
    sub_module_name: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PaginatedTestScripts(BaseModel):
    items: List[TestScriptResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class StatusBreakdownItem(BaseModel):
    status: str
    count: int
    percentage: float


class TestScriptStats(BaseModel):
    total: int
    total_steps: int = 0
    pass_count: int
    fail_count: int
    blocked_count: int
    untested_count: int
    in_progress_count: int
    not_run_count: int = 0
    pass_rate: float
    by_status: List[StatusBreakdownItem] = []


class CrossCheckStatusDetail(BaseModel):
    cases: int
    steps: int


class CrossCheckResult(BaseModel):
    total_records: int
    total_steps: int
    status_breakdown: dict
    duplicates: List[str] = []
    no_step_cases: List[str] = []
    no_test_case_id: int = 0
    integrity_ok: bool
    warnings: List[str] = []


