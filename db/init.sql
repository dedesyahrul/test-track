-- =============================================
-- Dashboard SIT - PostgreSQL Schema
-- Normalized from MySQL dump (db_04)
-- =============================================

-- Modules table
CREATE TABLE IF NOT EXISTS modules (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sub-modules table
CREATE TABLE IF NOT EXISTS sub_modules (
    id SERIAL PRIMARY KEY,
    module_id INTEGER REFERENCES modules(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(module_id, name)
);

-- Testers table
CREATE TABLE IF NOT EXISTS testers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Defects table (main SIT tracking)
CREATE TABLE IF NOT EXISTS defects (
    id SERIAL PRIMARY KEY,
    defect_id VARCHAR(50) NOT NULL UNIQUE,
    module_id INTEGER REFERENCES modules(id),
    sub_module_id INTEGER REFERENCES sub_modules(id),
    summary TEXT,
    stage VARCHAR(100) DEFAULT 'Testing: SIT',
    environment VARCHAR(100) DEFAULT 'Development',
    description TEXT,
    issue_link VARCHAR(255),
    impact_of_issue TEXT,
    level_of_defect VARCHAR(50), -- Fatal, Major, Minor, Kosmetik
    scoring_level INTEGER, -- 25, 10, 2, 1
    priority VARCHAR(50), -- Highest, High, Medium, Low
    defect_criteria VARCHAR(50) DEFAULT 'Defect', -- Defect / Non-Defect
    status VARCHAR(50) DEFAULT 'Open', -- Open, Closed, Under Review, Confirmed, Re-Opened
    date_created DATE,
    date_reopened DATE,
    date_closed DATE,
    aging INTEGER DEFAULT 0,
    created_by VARCHAR(255),
    last_retested_by VARCHAR(255),
    fixing_confirmed_by VARCHAR(255),
    estimated_fix_date DATE,
    fixing_review_status VARCHAR(100), -- Done, Fix in Progress, Needs Attention, Review in Progress
    keterangan TEXT,
    retesting TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Report summary table (defect/non-defect per sub-module)
CREATE TABLE IF NOT EXISTS report_summary (
    id SERIAL PRIMARY KEY,
    sub_module_id INTEGER REFERENCES sub_modules(id),
    total_defect INTEGER DEFAULT 0,
    total_non_defect INTEGER DEFAULT 0,
    total INTEGER DEFAULT 0,
    tester_id INTEGER REFERENCES testers(id),
    non_defect_function_running_well INTEGER DEFAULT 0,
    non_defect_application_standards INTEGER DEFAULT 0,
    non_defect_user_preference INTEGER DEFAULT 0,
    non_defect_change_request INTEGER DEFAULT 0,
    non_defect_total INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Defect scoring summary
CREATE TABLE IF NOT EXISTS defect_scoring (
    id SERIAL PRIMARY KEY,
    category VARCHAR(50) NOT NULL, -- Fatal, Major, Minor, Kosmetik
    weight INTEGER NOT NULL, -- 25, 10, 2, 1
    total_defect_today INTEGER DEFAULT 0,
    score_today INTEGER DEFAULT 0,
    total_closed INTEGER DEFAULT 0,
    total_open INTEGER DEFAULT 0,
    score_open INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SIT configuration
CREATE TABLE IF NOT EXISTS sit_config (
    id SERIAL PRIMARY KEY,
    sit_date DATE,
    project_name VARCHAR(255) DEFAULT 'Procurement Management System',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_defects_module ON defects(module_id);
CREATE INDEX IF NOT EXISTS idx_defects_status ON defects(status);
CREATE INDEX IF NOT EXISTS idx_defects_level ON defects(level_of_defect);
CREATE INDEX IF NOT EXISTS idx_defects_criteria ON defects(defect_criteria);
CREATE INDEX IF NOT EXISTS idx_defects_date_created ON defects(date_created);
CREATE INDEX IF NOT EXISTS idx_sub_modules_module ON sub_modules(module_id);

-- =============================================
-- SEED DATA
-- =============================================

-- Insert Modules
INSERT INTO modules (name) VALUES
    ('Procurement Management PBJ'),
    ('Vendor Management'),
    ('Admin dan Tata Kelola'),
    ('Catalog Management By Contract dan E Commerce')
ON CONFLICT (name) DO NOTHING;

-- Insert Testers
INSERT INTO testers (name) VALUES
    ('Amanda'),
    ('Destra'),
    ('Clara'),
    ('Muamar')
ON CONFLICT (name) DO NOTHING;

-- Insert Sub-Modules for Procurement Management PBJ (module_id=1)
INSERT INTO sub_modules (module_id, name) VALUES
    (1, 'PBJ - Planning & Draft Persistence'),
    (1, 'PBJ - Budget Verification'),
    (1, 'PBJ - User Review & Approval'),
    (1, 'PBJ - Procurement Disposition & Assignment'),
    (1, 'PBJ - PACC Checklist & Document Decision'),
    (1, 'PBJ - Vendor Recommendation Eligibility'),
    (1, 'PBJ - Vendor Recommendation Accreditation, VCR & Win-Cap'),
    (1, 'PBJ - Vendor Count Rules by Procurement Method'),
    (1, 'PBJ - Aanwijzing Scheduling & Approval'),
    (1, 'PBJ - Aanwijzing Vendor Participation & BA'),
    (1, 'PBJ - Aanwijzing Vendor Withdrawal & Replacement'),
    (1, 'PBJ - HPS Draft, Seal & Confidentiality'),
    (1, 'PBJ - HPS Review, Budget Confirmation & PK HPS'),
    (1, 'PBJ 1T1S - Vendor Submission'),
    (1, 'PBJ 1T2S - Vendor Submission & Price Lock'),
    (1, 'PBJ 2T2S - Technical Submission Stage 1'),
    (1, 'PBJ 2T2S - Final BoQ & Price Submission Stage 2'),
    (1, 'PBJ 1T1S - Technical Evaluation'),
    (1, 'PBJ 1T2S - Technical Evaluation'),
    (1, 'PBJ 2T2S - Technical Evaluation'),
    (1, 'PBJ - e-Auction Bridge & Execution'),
    (1, 'PBJ - Price Evaluation, PK HPS & Winner'),
    (1, 'PBJ - Draft Nota Persetujuan'),
    (1, 'PBJ - QA Review'),
    (1, 'PBJ - Compliance Review & Revision Documents'),
    (1, 'PBJ - Pejabat Pemutus Decision'),
    (1, 'PBJ - SPK Creation & Internal Review'),
    (1, 'PBJ - SPK Vendor Signature, Revision & Withdrawal'),
    (1, 'PBJ - PKS Legal Draft & User Review'),
    (1, 'PBJ - PKS Contract Management, PA & Vendor Signature'),
    (1, 'PBJ - Contract Line Items, Value & Include Catalog'),
    (1, 'PBJ - SPK/PKS Saya & Document Access'),
    (1, 'PBJ - Monitoring, Termin & Work Progress'),
    (1, 'PBJ - BAST'),
    (1, 'PBJ - Invoice'),
    (1, 'PBJ - Payment & Procurement Closing'),
    (1, 'PBJ Sendiri - Planning, Approval & PACC'),
    (1, 'PBJ Sendiri - Execution & Method-Specific Flow'),
    (1, 'PBJ Sendiri - Contract, BAST & Payment'),
    (1, 'PBJ - Dashboard, List, Detail & History'),
    (1, 'PBJ - SLA, Aging & Notification'),
    (1, 'PBJ - RBAC, Assignment & Authorization'),
    (1, 'PBJ - IDOR, File Security & Confidentiality'),
    (1, 'PBJ - Audit Trail & Activity Log'),
    (1, 'PBJ - Concurrency, Idempotency & Data Integrity'),
    (1, 'PBJ - Cross-Method & Cross-Module Regression'),
    (1, 'PBJ - Vendor Participation Count & VCR (ON-04, ON-06)'),
    (1, 'PBJ - Vendor Win Cap & Distribution Rule (ON-07)')
ON CONFLICT (module_id, name) DO NOTHING;

-- Insert Sub-Modules for Vendor Management (module_id=2)
INSERT INTO sub_modules (module_id, name) VALUES
    (2, 'Vendor Registration - Disclaimer & Self Registration'),
    (2, 'Vendor Identity, Legal Documents & Bank Accounts'),
    (2, 'Vendor Registration Review, Blacklist & DRT Activation'),
    (2, 'Vendor Detail, History & Procurement Participation'),
    (2, 'Vendor Accreditation & Performance'),
    (2, 'Vendor Recommendation, Assign Vendor & VCR'),
    (2, 'Vendor On The Spot & Geolocation'),
    (2, 'Vendor SKN, Template & Download'),
    (2, 'Vendor Renewal, Status, Reports, Dashboard & Notification'),
    (2, 'Vendor Management RBAC, Security, Audit & Regression')
ON CONFLICT (module_id, name) DO NOTHING;

-- Insert Sub-Modules for Admin dan Tata Kelola (module_id=3)
INSERT INTO sub_modules (module_id, name) VALUES
    (3, 'Manajemen User'),
    (3, 'Manajemen Role & Permission'),
    (3, 'Master Data Organisasi - Divisi & Departemen'),
    (3, 'Master Data - Kalender Hari Libur'),
    (3, 'Master Data - Dokumen Wajib'),
    (3, 'Master Data - Banner'),
    (3, 'Account Request - Pengajuan & Persetujuan Akun'),
    (3, 'Alternate Assignment - Pengalihan PIC'),
    (3, 'Audit Trail & Keamanan Sesi'),
    (3, 'Verifikasi Tata Kelola - Gap Register')
ON CONFLICT (module_id, name) DO NOTHING;

-- Insert Sub-Modules for Catalog Management (module_id=4)
INSERT INTO sub_modules (module_id, name) VALUES
    (4, 'Catalog By-Contract - Auto-Generate & Pipeline IHS'),
    (4, 'Catalog By-Contract - Maintenance, Access & Purchase'),
    (4, 'Catalog E-Commerce - Vendor Item Registration & Maintenance'),
    (4, 'Catalog E-Commerce - VM Maker Verification'),
    (4, 'Catalog E-Commerce - VM Checker Review'),
    (4, 'Catalog E-Commerce - VM Approver Publication'),
    (4, 'Catalog Portal - Browse, Detail & Price Comparison'),
    (4, 'Catalog Purchase - User Maker'),
    (4, 'Catalog Purchase - User Checker, User Approver & Receipt'),
    (4, 'Catalog Order Fulfillment - Vendor, BAST, Invoice, Payment, Audit & Security')
ON CONFLICT (module_id, name) DO NOTHING;

-- Insert SIT Config
INSERT INTO sit_config (sit_date, project_name) VALUES
    ('2026-08-21', 'Procurement Management System');

-- Insert Defect Scoring Summary
INSERT INTO defect_scoring (category, weight, total_defect_today, score_today, total_closed, total_open, score_open) VALUES
    ('Fatal', 25, 0, 0, 22, 11, 275),
    ('Major', 10, 6, 60, 55, 70, 700),
    ('Minor', 2, 5, 10, 34, 51, 102),
    ('Kosmetik', 1, 1, 1, 4, 9, 9);

-- Insert Defects (from SIT table data)
INSERT INTO defects (defect_id, module_id, sub_module_id, summary, stage, environment, description, issue_link, level_of_defect, scoring_level, priority, defect_criteria, status, date_created, date_reopened, date_closed, aging, created_by, last_retested_by, fixing_confirmed_by, fixing_review_status, keterangan, retesting) VALUES
('Defect-1', 2, (SELECT id FROM sub_modules WHERE name='Vendor Registration - Disclaimer & Self Registration'), 'Seluruh Template dokumen tidak dapat di akses, ketika di unduh file tidak bisa dibuka', 'Testing: SIT', 'Development', 'Seluruh Template dokumen tidak dapat di akses, ketika di unduh file tidak bisa dibuka', 'VM-REG_10', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-04', 4, 'Amanda', 'Destra', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[04/08/2026] Destra (IT Testing): Defect Closed.', NULL),
('Defect-2', 2, (SELECT id FROM sub_modules WHERE name='Vendor Registration - Disclaimer & Self Registration'), 'Ketika klik "Kirim Pendaftaran" tidak berhasil dan muncul alert "PAC"', 'Testing: SIT', 'Development', 'Ketika klik "Kirim Pendaftaran" pada saat membuat vendor tidak berhasil dan muncul alert "PAC"', 'VM-REG_6', 'Fatal', 25, 'Highest', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-03', 3, 'Amanda', 'Destra', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[03/08/2026] Destra (IT Testing): Defect Closed.', NULL),
('Defect-3', 2, (SELECT id FROM sub_modules WHERE name='Vendor Registration - Disclaimer & Self Registration'), 'Saat ubah email Login, button Terverifikasi tidak berubah menjadi "Kirim OTP"', 'Testing: SIT', 'Development', 'Saat ubah email Login, button Terverifikasi tidak berubah menjadi "Kirim OTP", user harus refresh ulang page browser.', 'VM-REG_7', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Destra', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Destra (IT Testing): Defect Closed.', '*Retest 4/8/26 : masih terjadi bug'),
('Defect-4', 2, (SELECT id FROM sub_modules WHERE name='Vendor Registration - Disclaimer & Self Registration'), 'Selain dokumen tipe PDF seharusnya tidak bisa ter-upload', 'Testing: SIT', 'Development', 'Selain dokumen tipe PDF seharusnya tidak bisa ter-upload', 'VM-REG_6', 'Major', 10, 'High', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Destra', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Destra (IT Testing): Defect Closed.', NULL),
('Defect-5', 2, (SELECT id FROM sub_modules WHERE name='Vendor Registration - Disclaimer & Self Registration'), 'Alert menunjukan beberapa dokumen belum diunggah padahal sudah diunggah', 'Testing: SIT', 'Development', 'Setelah seluruh Dokumen Wajib diupload dan klik button "Kirim Pendaftaran" terdapat alert yang menunjukan beberapa dokumen belum diunggah', 'VM-REG_6', 'Fatal', 25, 'Highest', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-03', 3, 'Amanda', 'Destra', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[03/08/2026] Destra (IT Testing): Defect Closed.', NULL),
('Defect-6', 3, (SELECT id FROM sub_modules WHERE name='Manajemen User'), 'Field Department seharusnya dropdown berdasarkan Divisi yang dipilih', 'Testing: SIT', 'Development', 'Saat membuat New User, field Department seharusnya dropdown berdasarkan Divisi yang dipilih', 'ADM-USR_1', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-05', 5, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[05/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-7', 3, (SELECT id FROM sub_modules WHERE name='Manajemen User'), 'Akses URL /admin/user-management tidak redirect ke halaman portal vendor', 'Testing: SIT', 'Development', 'Saat mencoba akses langsung URL /admin/user-management melalui address bar browser, tidak sesuai expected result', 'ADM-USR_11', 'Minor', 2, 'Medium', 'Defect', 'Open', '2026-07-31', NULL, NULL, 21, 'Amanda', NULL, NULL, 'Needs Attention', '[31/07/2026] Amanda (IT Testing): Defect Created.', '*Retest 14/08/2026 Bug masih terjadi'),
('Defect-8', 3, (SELECT id FROM sub_modules WHERE name='Manajemen Role & Permission'), 'Create Role muncul alert Error: workspace code field is required', 'Testing: SIT', 'Development', 'Semua field mandatory telah diisi namun saat klik button "Create Role" muncul alert Error saving role', 'ADM-ROLE_1', 'Fatal', 25, 'Highest', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-05', 5, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[05/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-9', 3, (SELECT id FROM sub_modules WHERE name='Manajemen Role & Permission'), 'Permission Role Management tidak otomatis terupdate saat login', 'Testing: SIT', 'Development', 'Saat menambahkan permission pada Role Management, tidak otomatis terupdate saat dilakukan login', 'ADM-ROLE_2', 'Major', 10, 'High', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-10', 3, (SELECT id FROM sub_modules WHERE name='Manajemen Role & Permission'), 'Menonaktifkan Role dari fitur Edit, namun status Role masih aktif', 'Testing: SIT', 'Development', 'Menonaktifkan Role dari fitur Edit, namun status Role masih aktif', 'ADM-ROLE_6', 'Major', 10, 'High', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-11', 3, (SELECT id FROM sub_modules WHERE name='Manajemen Role & Permission'), 'User dengan role NonActive masih bisa mengakses fitur', 'Testing: SIT', 'Development', 'Login menggunakan user yang memiliki role yang telah NonActive, namun user tersebut masih bisa mengakses fitur fiturnya', 'ADM-ROLE_6', 'Major', 10, 'High', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-12', 3, (SELECT id FROM sub_modules WHERE name='Master Data Organisasi - Divisi & Departemen'), 'Delete divisi tidak menampilkan pesan warning user still assigned', 'Testing: SIT', 'Development', 'Saat delete divisi, sistem tidak menampilkan pesan "Cannot delete division: {N} user(s) still assigned to it."', 'ADM-ORG_3', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-13', 3, (SELECT id FROM sub_modules WHERE name='Master Data Organisasi - Divisi & Departemen'), 'Menu Manajemen Divisi duplicate dengan Master Divisi', 'Testing: SIT', 'Development', 'Menu Manajemen Divisi duplicate dengan Master Divisi, yang digunakan adalah Manajemen Divisi', 'ADM-ORG_1', 'Major', 10, 'High', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-14', 3, (SELECT id FROM sub_modules WHERE name='Master Data Organisasi - Divisi & Departemen'), 'Master Department perlu diubah menjadi Manajemen Department', 'Testing: SIT', 'Development', 'Master Department diubah menjadi Manajemen Department dan masuk ke Menu Administrasi', 'ADM-ORG_4', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-15', 3, (SELECT id FROM sub_modules WHERE name='Master Data Organisasi - Divisi & Departemen'), 'Delete departemen tidak menampilkan warning user aktif', 'Testing: SIT', 'Development', 'Setelah klik button delete, Sistem tidak menampilkan alert dan departemen terhapus dari daftar', 'ADM-ORG_6', 'Major', 10, 'High', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-16', 3, (SELECT id FROM sub_modules WHERE name='Master Data Organisasi - Divisi & Departemen'), 'Role Administrator masih bisa mengakses menu yang sudah di-edit', 'Testing: SIT', 'Development', 'Role Administrator sudah di edit bagian Manage Department Master, namun masih bisa mengakses menu tersebut', 'ADM-ORG_9', 'Major', 10, 'High', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-17', 3, (SELECT id FROM sub_modules WHERE name='Master Data - Kalender Hari Libur'), 'Import massal tanggal hari libur belum berfungsi', 'Testing: SIT', 'Development', 'Belum dapat melakukan Import massal tanggal hari libur', 'ADM-CAL_5', 'Major', 10, 'High', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-18', 3, (SELECT id FROM sub_modules WHERE name='Master Data - Kalender Hari Libur'), 'Icon nonaktifkan hari libur perlu diubah', 'Testing: SIT', 'Development', 'Icon nonaktifkan hari libur diubah', 'ADM-CAL_3', 'Kosmetik', 1, 'Low', 'Defect', 'Closed', '2026-07-31', NULL, '2026-08-06', 6, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[31/07/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-19', 3, (SELECT id FROM sub_modules WHERE name='Audit Trail & Keamanan Sesi'), 'Tampilan pada sistem dan FSD berbeda', 'Testing: SIT', 'Development', 'Tampilan pada sistem dan FSD berbeda', 'ADM-AUDIT_1', 'Minor', NULL, NULL, 'Non-Defect', 'Under Review', '2026-08-03', NULL, NULL, 18, 'Amanda', NULL, NULL, 'Review in Progress', NULL, NULL),
('Defect-20', 3, (SELECT id FROM sub_modules WHERE name='Audit Trail & Keamanan Sesi'), 'Audit Trail tidak mencatat activity unauthorized access', 'Testing: SIT', 'Development', 'Saat Procurement Maker mencoba mengakses menu yang bukan kewenangannya, tidak terdapat activity di Audit Trail', 'ADM-AUDIT_5', 'Major', 10, 'High', 'Defect', 'Open', '2026-08-03', NULL, NULL, 18, 'Amanda', NULL, NULL, 'Needs Attention', '[03/08/2026] Amanda (IT Testing): Defect Created.', NULL),
('Defect-21', 3, (SELECT id FROM sub_modules WHERE name='Audit Trail & Keamanan Sesi'), 'Admin bisa klik button logout saat sedang mengedit', 'Testing: SIT', 'Development', 'Saat Admin sedang mengedit di Manajemen Pengguna, admin bisa klik button logout', 'ADM-AUDIT_7', 'Minor', NULL, NULL, 'Non-Defect', 'Confirmed', '2026-08-03', NULL, '2026-08-04', 1, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[04/08/2026] Amanda (IT Testing): Defect Confirmed.', NULL),
('Defect-22', 3, (SELECT id FROM sub_modules WHERE name='Verifikasi Tata Kelola - Gap Register'), 'Dashboard Admin Security belum diakomodir', 'Testing: SIT', 'Development', 'Dashboard untuk user "Admin Security" belum diakomodir', 'ADM-GAP_1', 'Fatal', 25, 'Highest', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-06', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-23', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Field Diisi Oleh tidak sesuai dengan nama akun yang login', 'Testing: SIT', 'Development', 'Nama Akunnya AMANDA, tapi field Diisi Olehnya tertulis: BAGUS SETIAWAN', 'PBJ-PLAN_1', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-06', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-24', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Daftar Pengadaan sudah ada data padahal user baru dibuat', 'Testing: SIT', 'Development', 'Baru bikin user tapi di menu Daftar Pengadaan sudah ada 4 pengadaan yang berstatus DRAFT', 'PBJ-PLAN_1', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-06', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-25', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Refresh F5 menyebabkan web page blank', 'Testing: SIT', 'Development', 'Setelah status pengadaan menjadi DRAFT dan user melakukan refresh F5, web page jadi blank', 'PBJ-PLAN_1', 'Major', 10, 'High', 'Defect', 'Open', '2026-08-03', NULL, NULL, 18, 'Amanda', NULL, NULL, 'Needs Attention', '[03/08/2026] Amanda (IT Testing): Defect Created.', NULL),
('Defect-26', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Field Tipe Ikatan Kontrak tidak sesuai setelah status DRAFT', 'Testing: SIT', 'Development', 'Pengadaan sudah berstatus DRAFT, namun Field Tipe Ikatan Kontrak tidak sesuai dengan yang diisi sebelumnya', 'PBJ-PLAN_3', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-27', 4, (SELECT id FROM sub_modules WHERE name='Catalog E-Commerce - Vendor Item Registration & Maintenance'), 'Cursor typing keluar dari field setiap 1 huruf', 'Testing: SIT', 'Development', 'Pada field spesifikasi terstruktur - jenis barang saat typing cursor keluar dari field setiap 1 huruf', 'CAT-EC-VND_1', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Destra', NULL, NULL, 'Done', '[03/08/2026] Destra (IT Testing): Defect Created.\n[07/08/2026] Defect Closed.', NULL),
('Defect-28', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Daftar Item Kontrak Katalog (IHS) hilang saat status DRAFT', 'Testing: SIT', 'Development', 'Daftar Item Kontrak Katalog (IHS) hilang saat pengadaan berstatus DRAFT', 'PBJ-PLAN_3', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', NULL, NULL, 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Defect Closed.', NULL),
('Defect-29', 4, (SELECT id FROM sub_modules WHERE name='Catalog E-Commerce - Vendor Item Registration & Maintenance'), 'Reload page menyebabkan blank white', 'Testing: SIT', 'Development', 'Setelah mengisi field saat reload page (f5), page yang sudah terisi menjadi blank white', 'CAT-EC-VND_1', 'Major', 10, 'High', 'Defect', 'Open', '2026-08-03', NULL, NULL, 18, 'Destra', NULL, NULL, 'Fix in Progress', '[03/08/2026] Destra (IT Testing): Defect Created.', NULL),
('Defect-30', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Beberapa field hilang saat Edit Perencanaan setelah Simpan Draft', 'Testing: SIT', 'Development', 'User isi semua field mandatory, Simpan Draft, lalu klik Edit Perencanaan beberapa field jadi hilang', 'PBJ-PLAN_3', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', NULL, NULL, 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Defect Closed.', NULL),
('Defect-31', 3, (SELECT id FROM sub_modules WHERE name='Manajemen User'), 'User name di pojok kanan atas tidak sesuai', 'Testing: SIT', 'Development', 'User name yg ditampilan di pojok kanan atas tidak sesuai', NULL, 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-04', 1, 'Destra', 'Destra', 'Vendor IT', 'Done', '[03/08/2026] Destra (IT Testing): Defect Created.\n[04/08/2026] Destra (IT Testing): Defect Closed.', NULL),
('Defect-32', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Daftar Pengadaan menampilkan contoh bawaan aplikasi', 'Testing: SIT', 'Development', 'Daftar Pengadaan masih menampilkan contoh Pengadaan bawaan aplikasi', 'PBJ-PLAN_12', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-06', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-33', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Qty input seharusnya tidak bisa decimal', 'Testing: SIT', 'Development', 'Saat input Qty Mandatory dan Qty Optional seharusnya tidak bisa decimal', 'PBJ-PLAN_20', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-06', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-34', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Kalimat validation perlu lebih user friendly', 'Testing: SIT', 'Development', 'Ubah kalimat validation ketika Nilai Kontrak > Nilai Anggaran menjadi lebih user Friendly', 'PBJ-PLAN_24', 'Kosmetik', 1, 'Low', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-35', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Perubahan QTY IHS tidak tercatat di riwayat aktivitas', 'Testing: SIT', 'Development', 'Setelah mengubah QTY Total pada IHS, tidak tercatat pada riwayat aktivitas', 'PBJ-PLAN_29', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-36', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Budget Verification'), 'Pengadaan DRAFT masuk ke List Unit Accounting', 'Testing: SIT', 'Development', 'Pengadaan yang berstatus DRAFT masuk ke List Daftar Pengadaan pada Role Unit Accounting', 'PBJ-BUD_1', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-06', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-37', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Budget Verification'), 'Field hilang saat pengadaan status Harus direvisi', 'Testing: SIT', 'Development', 'Divisi User, Kebutuhan Pemenang, Lama Kontrak (bulan), Timeline Pengadaan hilang inputannya ketika pengadaan berstatus "Harus direvisi"', 'PBJ-BUD_4', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-38', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Budget Verification'), 'Tidak ada catatan field mana yang harus direvisi', 'Testing: SIT', 'Development', 'Ketika pengadaan terdapat revisi oleh Unit Accounting, user maker tidak diketahui field yang mana yang di revisi', 'PBJ-BUD_4', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-06', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-39', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Budget Verification'), 'Field revisi tidak berubah di sisi Unit Accounting', 'Testing: SIT', 'Development', 'User Maker telah melakukan perubahan pada field yang di revisi, namun saat login sebagai Unit Accounting field tidak berubah', 'PBJ-BUD_4', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-06', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[06/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-40', 4, (SELECT id FROM sub_modules WHERE name='Catalog E-Commerce - Vendor Item Registration & Maintenance'), 'Upload dokumen registrasi vendor gagal', 'Testing: SIT', 'Development', 'Upload dokument registrasi vendor gagal, sehingga case catalog management tidak bisa dilanjutkan', 'CAT-EC-VND_2', 'Fatal', 25, 'Highest', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-03', 0, 'Destra', 'Destra', 'Vendor IT', 'Done', '[03/08/2026] Destra (IT Testing): Defect Created.\n[03/08/2026] Destra (IT Testing): Defect Closed.', NULL),
('Defect-41', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Budget Verification'), 'Button Tinjau Sekarang tidak bisa diklik pada user Checker', 'Testing: SIT', 'Development', 'Button "Tinjau Sekarang" tidak bisa diklik pada user Checker', 'PBJ-USR-APR_1', 'Major', 10, 'High', 'Defect', 'Open', '2026-08-03', NULL, NULL, 18, 'Amanda', NULL, NULL, 'Needs Attention', '[03/08/2026] Amanda (IT Testing): Defect Created.', NULL),
('Defect-42', 2, (SELECT id FROM sub_modules WHERE name='Vendor Registration - Disclaimer & Self Registration'), 'Akses URL vendor tanpa login tidak redirect ke halaman login', 'Testing: SIT', 'Development', 'Akses alamat vendor tanpa login tidak redirect ke halaman login', 'VM-REG_16', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-05', 2, 'Destra', 'Destra', 'Vendor IT', 'Done', '[03/08/2026] Destra (IT Testing): Defect Created.\n[05/08/2026] Destra (IT Testing): Defect Closed.', NULL),
('Defect-43', 1, (SELECT id FROM sub_modules WHERE name='PBJ - User Review & Approval'), 'Permohonan Pengadaan hanya muncul yang 1 divisi saja', 'Testing: SIT', 'Development', 'Permohonan Pengadaan yang muncul pada user checker dan approval adalah yang 1 divisi saja', 'PBJ-USR-APR_4', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-12', 9, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[12/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-44', 1, (SELECT id FROM sub_modules WHERE name='PBJ - User Review & Approval'), 'Tidak dapat klik Kirim Ulang Permohonan saat diminta Revisi', 'Testing: SIT', 'Development', 'Tidak dapat klik button "Kirim Ulang Permohonan" pada user Maker saat pengadaan diminta Revisi oleh User Checker', 'PBJ-USR-APR_8', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-45', 2, (SELECT id FROM sub_modules WHERE name='Vendor Registration - Disclaimer & Self Registration'), 'VM Maker tidak muncul daftar vendor menunggu verifikasi', 'Testing: SIT', 'Development', 'Pada VM Maker tidak muncul daftar vendor yang statusnya menunggu verifikasi VM Maker', 'VM-REG_18', 'Fatal', 25, 'Highest', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-05', 2, 'Destra', 'Destra', 'Vendor IT', 'Done', '[03/08/2026] Destra (IT Testing): Defect Created.\n[05/08/2026] Destra (IT Testing): Defect Closed.', NULL),
('Defect-46', 1, (SELECT id FROM sub_modules WHERE name='PBJ - User Review & Approval'), 'Button Tolak tidak ada pada user Approval Divisi', 'Testing: SIT', 'Development', 'Pada user Approval Divisi tidak terdapat button "Tolak" seharusnya terdapat button tersebut', 'PBJ-USR-APR_10', 'Fatal', 25, 'Highest', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-47', 1, (SELECT id FROM sub_modules WHERE name='PBJ - User Review & Approval'), 'Aktivitas user tidak tercatat di riwayat aktivitas', 'Testing: SIT', 'Development', 'Setiap aktivitas untuk user maker, checker, approver tidak tercatat pada riwayat aktivitas', 'PBJ-USR-APR_13', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-48', 1, (SELECT id FROM sub_modules WHERE name='PBJ - User Review & Approval'), 'User Maker tidak bisa klik Kirim Ulang Permohonan', 'Testing: SIT', 'Development', 'User Maker tidak bisa klik button "Kirim Ulang Permohonan"', NULL, 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-03', NULL, '2026-08-07', 4, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[03/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-49', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Gagal memuat Data Draft saat edit Perencanaan', 'Testing: SIT', 'Development', 'Saat ingin mengedit Perencanaan terdapat information "Gagal memuat Data Draft. Coba Lagi"', 'PBJ-PLAN_1', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-07', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[04/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL),
('Defect-50', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Simpan DRAF error pada Tipe Catalog = Catalog', 'Testing: SIT', 'Development', 'Sudah input lengkap field mandatory, namun saat Klik button "Simpan DRAF" muncul error', 'PBJ-PLAN_1', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-07', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[04/08/2026] Amanda (IT Testing): Defect Created.\n[07/08/2026] Amanda (IT Testing): Defect Closed.', NULL);

-- Insert more defects (continued)
INSERT INTO defects (defect_id, module_id, sub_module_id, summary, stage, environment, description, issue_link, level_of_defect, scoring_level, priority, defect_criteria, status, date_created, date_reopened, date_closed, aging, created_by, last_retested_by, fixing_confirmed_by, fixing_review_status, keterangan, retesting) VALUES
('Defect-51', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'Kebutuhan Pemenang hilang setelah pengadaan di simpan', 'Testing: SIT', 'Development', 'Kebutuhan Pemenang hilang setelah pengadaan di simpan', 'PBJ-PLAN_1', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-07', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[04/08/2026] Defect Created.\n[07/08/2026] Defect Closed.', NULL),
('Defect-52', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Planning & Draft Persistence'), 'User maker hanya bisa melihat pengadaan 1 divisi', 'Testing: SIT', 'Development', 'Pengguna user maker hanya bisa memilih, melihat dan membuat pengadaan yang 1 divisi dengannya', NULL, 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-07', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[04/08/2026] Defect Created.\n[07/08/2026] Defect Closed.', NULL),
('Defect-53', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Procurement Disposition & Assignment'), 'Procurement Approver tidak bisa klik Kembalikan ke User Maker', 'Testing: SIT', 'Development', 'Login as Procurement Approver namun tidak bisa klik button "Kembalikan ke User Maker"', NULL, 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-12', 8, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[04/08/2026] Defect Created.\n[12/08/2026] Defect Closed.', NULL),
('Defect-54', 1, (SELECT id FROM sub_modules WHERE name='PBJ - User Review & Approval'), 'Kepala Divisi User tidak dapat menyetujui Pengadaan', 'Testing: SIT', 'Development', 'Kepala Divisi User tidak dapat menyetujui Pengadaan', NULL, 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-07', 3, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[04/08/2026] Defect Created.\n[07/08/2026] Defect Closed.', NULL),
('Defect-55', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Procurement Disposition & Assignment'), 'Procurement Maker tidak bisa Revisi daftar dokumen pada tahap PACC', 'Testing: SIT', 'Development', 'Procurement Maker tidak dapat melakukan Revisi pada saat tahap PACC, untuk merevisi daftar dokumen', NULL, 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-12', 8, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[04/08/2026] Defect Created.\n[12/08/2026] Defect Closed.', NULL),
('Defect-56', 2, (SELECT id FROM sub_modules WHERE name='Vendor Identity, Legal Documents & Bank Accounts'), 'Refresh page vendor detail menyebabkan white blank', 'Testing: SIT', 'Development', 'Saat lihat detail vendor, lalu hit refresh page tampilan menjadi white blank', 'VM-DATA_1', 'Minor', 2, 'Medium', 'Defect', 'Open', '2026-08-04', NULL, NULL, 17, 'Destra', NULL, NULL, 'Fix in Progress', '[04/08/2026] Destra (IT Testing): Defect Created.', NULL),
('Defect-57', 2, (SELECT id FROM sub_modules WHERE name='Vendor Identity, Legal Documents & Bank Accounts'), 'Data credential duplicate masih tembus untuk no pengurus dan no pic', 'Testing: SIT', 'Development', 'Pada regist vendor, data credential yang duplicate masih tembus untuk no pengurus, no pic', 'VM-DATA_3', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-05', 1, 'Destra', NULL, NULL, 'Done', '[04/08/2026] Destra (IT Testing): Defect Created.\n[05/08/2026] Defect Closed.', NULL),
('Defect-58', 1, (SELECT id FROM sub_modules WHERE name='PBJ - Procurement Disposition & Assignment'), 'Button approval revise oleh PA tidak ada', 'Testing: SIT', 'Development', 'Untuk flow terdapat Revisi oleh PM, dan membutuhkan approval revise oleh PA tidak terdapat button approvalnya', NULL, 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-12', 8, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[04/08/2026] Defect Created.\n[12/08/2026] Defect Closed.', NULL),
('Defect-59', 2, (SELECT id FROM sub_modules WHERE name='Vendor Identity, Legal Documents & Bank Accounts'), 'Stopper duplicate Email Pengurus & Email PIC belum sesuai', 'Testing: SIT', 'Development', 'Stopper dan notif pada duplicate Email Pengurus & Email PIC belum sesuai', 'VM-DATA_9', 'Major', 10, 'High', 'Defect', 'Closed', '2026-08-04', NULL, '2026-08-05', 1, 'Destra', NULL, NULL, 'Done', '[04/08/2026] Destra (IT Testing): Defect Created.\n[05/08/2026] Defect Closed.', NULL),
('Defect-60', 3, (SELECT id FROM sub_modules WHERE name='Manajemen Role & Permission'), 'Notifikasi muncul error padahal berhasil membuat role', 'Testing: SIT', 'Development', 'Berhasil membuat role baru, namun notification yang muncul adalah "Error Saving role: Role Code Already Exist"', 'ADM-ROLE_1', 'Minor', 2, 'Medium', 'Defect', 'Closed', '2026-08-05', NULL, '2026-08-18', 13, 'Amanda', 'Amanda', 'Vendor IT', 'Done', '[05/08/2026] Defect Created.\n[18/08/2026] Defect Closed.', NULL);

-- Insert Report Summary data
INSERT INTO report_summary (sub_module_id, total_defect, total_non_defect, total, non_defect_function_running_well, non_defect_application_standards, non_defect_user_preference, non_defect_change_request, non_defect_total)
SELECT sm.id, 
    CASE sm.name
        WHEN 'PBJ - Planning & Draft Persistence' THEN 22
        WHEN 'PBJ - Budget Verification' THEN 5
        WHEN 'PBJ - User Review & Approval' THEN 7
        WHEN 'PBJ - Procurement Disposition & Assignment' THEN 4
        WHEN 'PBJ - PACC Checklist & Document Decision' THEN 10
        WHEN 'PBJ - Vendor Recommendation Eligibility' THEN 2
        WHEN 'PBJ - Vendor Recommendation Accreditation, VCR & Win-Cap' THEN 3
        WHEN 'PBJ - Vendor Count Rules by Procurement Method' THEN 6
        WHEN 'PBJ - Aanwijzing Scheduling & Approval' THEN 12
        WHEN 'PBJ - Aanwijzing Vendor Participation & BA' THEN 4
        WHEN 'PBJ - Aanwijzing Vendor Withdrawal & Replacement' THEN 1
        WHEN 'PBJ - HPS Draft, Seal & Confidentiality' THEN 13
        WHEN 'PBJ - HPS Review, Budget Confirmation & PK HPS' THEN 3
        WHEN 'PBJ 1T1S - Vendor Submission' THEN 3
        WHEN 'PBJ 1T2S - Vendor Submission & Price Lock' THEN 7
        WHEN 'PBJ 2T2S - Technical Submission Stage 1' THEN 2
        WHEN 'PBJ 2T2S - Final BoQ & Price Submission Stage 2' THEN 5
        WHEN 'PBJ 1T1S - Technical Evaluation' THEN 1
        WHEN 'PBJ 1T2S - Technical Evaluation' THEN 3
        WHEN 'PBJ 2T2S - Technical Evaluation' THEN 9
        WHEN 'PBJ - e-Auction Bridge & Execution' THEN 12
        WHEN 'PBJ - Price Evaluation, PK HPS & Winner' THEN 2
        WHEN 'PBJ - Draft Nota Persetujuan' THEN 11
        WHEN 'PBJ - QA Review' THEN 9
        WHEN 'PBJ - Compliance Review & Revision Documents' THEN 7
        WHEN 'Vendor Registration - Disclaimer & Self Registration' THEN 7
        WHEN 'Vendor Identity, Legal Documents & Bank Accounts' THEN 11
        WHEN 'Vendor Registration Review, Blacklist & DRT Activation' THEN 14
        WHEN 'Vendor On The Spot & Geolocation' THEN 1
        WHEN 'Vendor SKN, Template & Download' THEN 6
        WHEN 'Vendor Renewal, Status, Reports, Dashboard & Notification' THEN 1
        WHEN 'Catalog E-Commerce - Vendor Item Registration & Maintenance' THEN 12
        WHEN 'Catalog E-Commerce - VM Maker Verification' THEN 2
        WHEN 'Catalog E-Commerce - VM Checker Review' THEN 2
        WHEN 'Catalog E-Commerce - VM Approver Publication' THEN 2
        WHEN 'Catalog Portal - Browse, Detail & Price Comparison' THEN 3
        WHEN 'Catalog Purchase - User Maker' THEN 3
        WHEN 'Manajemen User' THEN 3
        WHEN 'Manajemen Role & Permission' THEN 7
        WHEN 'Master Data Organisasi - Divisi & Departemen' THEN 6
        WHEN 'Master Data - Kalender Hari Libur' THEN 3
        WHEN 'Master Data - Dokumen Wajib' THEN 1
        WHEN 'Alternate Assignment - Pengalihan PIC' THEN 2
        WHEN 'Audit Trail & Keamanan Sesi' THEN 1
        WHEN 'Verifikasi Tata Kelola - Gap Register' THEN 1
        ELSE 0
    END as total_defect,
    CASE sm.name
        WHEN 'PBJ - HPS Draft, Seal & Confidentiality' THEN 2
        WHEN 'PBJ - e-Auction Bridge & Execution' THEN 2
        WHEN 'PBJ - Draft Nota Persetujuan' THEN 1
        WHEN 'PBJ - Compliance Review & Revision Documents' THEN 2
        WHEN 'Catalog E-Commerce - Vendor Item Registration & Maintenance' THEN 1
        WHEN 'Audit Trail & Keamanan Sesi' THEN 2
        ELSE 0
    END as total_non_defect,
    0 as total,
    0, 0, 0, 0, 0
FROM sub_modules sm;

-- Update totals
UPDATE report_summary SET total = total_defect + total_non_defect;
