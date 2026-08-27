-- ====================================================
-- Dashboard SIT - Arsitektur V2 per Pengembangan.md
-- ====================================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    phase VARCHAR(100) DEFAULT 'SIT',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Test Cases Table (1 Record = 1 Skenario Pengujian)
CREATE TABLE IF NOT EXISTS test_cases (
    id SERIAL PRIMARY KEY,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    module_id INTEGER REFERENCES modules(id) ON DELETE SET NULL,
    test_case_id VARCHAR(100) NOT NULL,
    summary TEXT NOT NULL,
    prerequisite TEXT,
    stage VARCHAR(100) DEFAULT 'Testing: SIT',
    component VARCHAR(255),
    case_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_project_test_case UNIQUE (project_id, test_case_id)
);

-- 3. Test Steps Table (1 Test Case = Banyak Langkah Pengujian)
CREATE TABLE IF NOT EXISTS test_steps (
    id SERIAL PRIMARY KEY,
    test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
    step_no INTEGER NOT NULL,
    test_step TEXT NOT NULL,
    expected_result TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_test_case_step UNIQUE (test_case_id, step_no)
);

-- 4. Test Executions Table (Histori Eksekusi / Retest #1, #2...)
CREATE TABLE IF NOT EXISTS test_executions (
    id SERIAL PRIMARY KEY,
    test_case_id INTEGER REFERENCES test_cases(id) ON DELETE CASCADE,
    tester_id INTEGER REFERENCES testers(id) ON DELETE SET NULL,
    tester_name VARCHAR(255),
    completion_testing_date DATE,
    execution_no INTEGER DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Test Step Results Table (Status per Step pada suatu Eksekusi)
CREATE TABLE IF NOT EXISTS test_step_results (
    id SERIAL PRIMARY KEY,
    execution_id INTEGER REFERENCES test_executions(id) ON DELETE CASCADE,
    test_step_id INTEGER REFERENCES test_steps(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'NOT_RUN', -- PASS, FAIL, BLOCKED, NOT_RUN, IN_PROGRESS
    keterangan TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_execution_step UNIQUE (execution_id, test_step_id)
);

-- 6. Defects V2 Table (Defect Terikat ke Test Case & Test Step Spesifik)
CREATE TABLE IF NOT EXISTS defects_v2 (
    id SERIAL PRIMARY KEY,
    defect_code VARCHAR(100) NOT NULL UNIQUE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    test_case_id INTEGER REFERENCES test_cases(id) ON DELETE SET NULL,
    test_step_id INTEGER REFERENCES test_steps(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity VARCHAR(50) DEFAULT 'MAJOR', -- FATAL, MAJOR, MINOR, KOSMETIK
    priority VARCHAR(50) DEFAULT 'HIGH',  -- HIGHEST, HIGH, MEDIUM, LOW
    status VARCHAR(50) DEFAULT 'OPEN',     -- OPEN, IN_PROGRESS, READY_TO_TEST, RETEST, CLOSED, REJECTED, REOPEN
    assigned_to VARCHAR(255),
    reported_by VARCHAR(255),
    found_date DATE,
    resolved_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert Default Project
INSERT INTO projects (id, project_name, phase, description)
VALUES (1, 'Procurement Management System', 'Phase 2 - SIT', 'Main SIT Testing Project')
ON CONFLICT (id) DO NOTHING;

-- Indexes for maximum performance
CREATE INDEX IF NOT EXISTS idx_tc_project ON test_cases(project_id);
CREATE INDEX IF NOT EXISTS idx_ts_tc ON test_steps(test_case_id);
CREATE INDEX IF NOT EXISTS idx_te_tc ON test_executions(test_case_id);
CREATE INDEX IF NOT EXISTS idx_tsr_ex ON test_step_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_def_v2_tc ON defects_v2(test_case_id);
CREATE INDEX IF NOT EXISTS idx_def_v2_status ON defects_v2(status);
