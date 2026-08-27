from sqlalchemy import Column, Integer, String, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.database import Base


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    sub_modules = relationship("SubModule", back_populates="module")
    defects = relationship("Defect", back_populates="module")
    test_scripts = relationship("TestScript", back_populates="module")


class SubModule(Base):
    __tablename__ = "sub_modules"

    id = Column(Integer, primary_key=True, index=True)
    module_id = Column(Integer, ForeignKey("modules.id", ondelete="CASCADE"))
    name = Column(String(500), nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    module = relationship("Module", back_populates="sub_modules")
    defects = relationship("Defect", back_populates="sub_module")
    report_summary = relationship("ReportSummary", back_populates="sub_module")
    test_scripts = relationship("TestScript", back_populates="sub_module")


class Tester(Base):
    __tablename__ = "testers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class Defect(Base):
    __tablename__ = "defects"

    id = Column(Integer, primary_key=True, index=True)
    defect_id = Column(String(50), unique=True, nullable=False)
    module_id = Column(Integer, ForeignKey("modules.id"))
    sub_module_id = Column(Integer, ForeignKey("sub_modules.id"))
    summary = Column(Text)
    stage = Column(String(100), default="Testing: SIT")
    environment = Column(String(100), default="Development")
    description = Column(Text)
    issue_link = Column(String(255))
    impact_of_issue = Column(Text)
    level_of_defect = Column(String(50))
    scoring_level = Column(Integer)
    priority = Column(String(50))
    defect_criteria = Column(String(50), default="Defect")
    status = Column(String(50), default="Open")
    date_created = Column(Date)
    date_reopened = Column(Date)
    date_closed = Column(Date)
    aging = Column(Integer, default=0)
    created_by = Column(String(255))
    last_retested_by = Column(String(255))
    fixing_confirmed_by = Column(String(255))
    estimated_fix_date = Column(Date)
    fixing_review_status = Column(String(100))
    keterangan = Column(Text)
    retesting = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    module = relationship("Module", back_populates="defects")
    sub_module = relationship("SubModule", back_populates="defects")


class ReportSummary(Base):
    __tablename__ = "report_summary"

    id = Column(Integer, primary_key=True, index=True)
    sub_module_id = Column(Integer, ForeignKey("sub_modules.id"))
    total_defect = Column(Integer, default=0)
    total_non_defect = Column(Integer, default=0)
    total = Column(Integer, default=0)
    tester_id = Column(Integer, ForeignKey("testers.id"))
    non_defect_function_running_well = Column(Integer, default=0)
    non_defect_application_standards = Column(Integer, default=0)
    non_defect_user_preference = Column(Integer, default=0)
    non_defect_change_request = Column(Integer, default=0)
    non_defect_total = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now())

    sub_module = relationship("SubModule", back_populates="report_summary")


class DefectScoring(Base):
    __tablename__ = "defect_scoring"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(50), nullable=False)
    weight = Column(Integer, nullable=False)
    total_defect_today = Column(Integer, default=0)
    score_today = Column(Integer, default=0)
    total_closed = Column(Integer, default=0)
    total_open = Column(Integer, default=0)
    score_open = Column(Integer, default=0)
    updated_at = Column(DateTime, server_default=func.now())


class SitConfig(Base):
    __tablename__ = "sit_config"

    id = Column(Integer, primary_key=True, index=True)
    sit_date = Column(Date)
    project_name = Column(String(255), default="Procurement Management System")
    updated_at = Column(DateTime, server_default=func.now())


# ====================================================
# Arsitektur V2 Models (per Pengembangan.md)
# ====================================================

class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    project_name = Column(String(255), nullable=False)
    phase = Column(String(100), default="SIT")
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    test_cases = relationship("TestCase", back_populates="project")
    defects = relationship("DefectV2", back_populates="project")


class TestCase(Base):
    __tablename__ = "test_cases"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), default=1)
    module_id = Column(Integer, ForeignKey("modules.id"), nullable=True)
    test_case_id = Column(String(100), nullable=False)
    summary = Column(Text, nullable=False)
    prerequisite = Column(Text)
    stage = Column(String(100), default="Testing: SIT")
    component = Column(String(255))
    case_description = Column(Text)
    sheet_name = Column(Text, nullable=True)
    import_file_name = Column(Text, nullable=True)
    cycle = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    month = Column(Integer, nullable=True)
    day = Column(Integer, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="test_cases")
    module = relationship("Module")
    test_steps = relationship("TestStep", back_populates="test_case", cascade="all, delete-orphan", order_by="TestStep.step_no")
    test_executions = relationship("TestExecution", back_populates="test_case", cascade="all, delete-orphan", order_by="desc(TestExecution.execution_no)")
    defects = relationship("DefectV2", back_populates="test_case")


class TestStep(Base):
    __tablename__ = "test_steps"

    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    step_no = Column(Integer, nullable=False)
    test_step = Column(Text, nullable=False)
    expected_result = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    test_case = relationship("TestCase", back_populates="test_steps")
    step_results = relationship("TestStepResult", back_populates="test_step", cascade="all, delete-orphan")
    defects = relationship("DefectV2", back_populates="test_step")


class TestExecution(Base):
    __tablename__ = "test_executions"

    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False)
    tester_id = Column(Integer, ForeignKey("testers.id"), nullable=True)
    tester_name = Column(String(255))
    completion_testing_date = Column(Date, nullable=True)
    execution_no = Column(Integer, default=1)
    notes = Column(Text)
    sheet_name = Column(Text, nullable=True)
    import_file_name = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    test_case = relationship("TestCase", back_populates="test_executions")
    tester = relationship("Tester")
    step_results = relationship("TestStepResult", back_populates="execution", cascade="all, delete-orphan")


class TestStepResult(Base):
    __tablename__ = "test_step_results"

    id = Column(Integer, primary_key=True, index=True)
    execution_id = Column(Integer, ForeignKey("test_executions.id", ondelete="CASCADE"), nullable=False)
    test_step_id = Column(Integer, ForeignKey("test_steps.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="NOT_RUN")  # PASS, FAIL, BLOCKED, NOT_RUN, IN_PROGRESS
    keterangan = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    execution = relationship("TestExecution", back_populates="step_results")
    test_step = relationship("TestStep", back_populates="step_results")


class DefectV2(Base):
    __tablename__ = "defects_v2"

    id = Column(Integer, primary_key=True, index=True)
    defect_code = Column(String(100), nullable=False, unique=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), default=1)
    test_case_id = Column(Integer, ForeignKey("test_cases.id", ondelete="SET NULL"), nullable=True)
    test_step_id = Column(Integer, ForeignKey("test_steps.id", ondelete="SET NULL"), nullable=True)
    title = Column(Text, nullable=False)
    description = Column(Text)
    severity = Column(String(50), default="MAJOR")  # FATAL, MAJOR, MINOR, KOSMETIK
    priority = Column(String(50), default="HIGH")    # HIGHEST, HIGH, MEDIUM, LOW
    status = Column(String(50), default="OPEN")       # OPEN, IN_PROGRESS, READY_TO_TEST, RETEST, CLOSED, REJECTED, REOPEN
    assigned_to = Column(String(255))
    reported_by = Column(String(255))
    found_date = Column(Date)
    resolved_date = Column(Date, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    project = relationship("Project", back_populates="defects")
    test_case = relationship("TestCase", back_populates="defects")
    test_step = relationship("TestStep", back_populates="defects")



class TestScript(Base):
    __tablename__ = "test_scripts"

    id = Column(Integer, primary_key=True, index=True)
    test_case_id = Column(Text, index=True)
    module_id = Column(Integer, ForeignKey("modules.id"))
    sub_module_id = Column(Integer, ForeignKey("sub_modules.id"), nullable=True)
    summary = Column(Text)
    prerequisite = Column(Text)
    test_step = Column(Text)
    expected_result = Column(Text)
    stage = Column(Text, default="SIT")
    components = Column(Text)
    case_description = Column(Text)
    completion_date = Column(Date, nullable=True)
    tester = Column(Text)
    status_by_tester = Column(Text, default="Untested")
    keterangan = Column(Text)
    sheet_name = Column(Text, nullable=True)
    import_file_name = Column(Text, nullable=True)

    # Banner Metadata
    cycle = Column(Integer, nullable=True)
    year = Column(Integer, nullable=True)
    month = Column(Integer, nullable=True)
    day = Column(Integer, nullable=True)

    excel_step_count = Column(Integer, default=1)

    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    module = relationship("Module", back_populates="test_scripts")
    sub_module = relationship("SubModule", back_populates="test_scripts")

