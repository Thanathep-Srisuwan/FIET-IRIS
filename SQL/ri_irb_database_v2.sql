-- ============================================================
--  ระบบจัดเก็บใบประกาศ RI/IRB
--  คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี (FIET) มจธ.
--  Database: MSSQL
--  Version: 2.0
--  เปลี่ยนแปลงจาก v1.0:
--    + เพิ่ม DOCUMENT_FILES table (รองรับหลายไฟล์ต่อ 1 เอกสาร)
--    + เพิ่ม project_category, version, parent_doc_id ใน DOCUMENTS
--    + เพิ่ม reason 'replaced_by_new' ใน DELETION_LOGS
--    * หมายเหตุ: project_category และ logic การส่งใหม่แทนของเก่า
--      ยังรอ confirm จากเจ้าหน้าที่ — column เป็น nullable ไว้ก่อน
-- ============================================================

USE master;
GO

IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'FIET_IRIS')
BEGIN
    CREATE DATABASE FIET_IRIS COLLATE Thai_CI_AS;
END
GO

USE FIET_IRIS;
GO

-- ============================================================
--  TABLE: USERS
-- ============================================================
IF OBJECT_ID('dbo.USERS', 'U') IS NOT NULL DROP TABLE dbo.USERS;
GO

CREATE TABLE dbo.USERS (
    user_id         INT             IDENTITY(1,1)   PRIMARY KEY,
    name            NVARCHAR(100)   NOT NULL,
    email           NVARCHAR(150)   NOT NULL UNIQUE,
    password_hash   NVARCHAR(255)   NOT NULL,
    role            NVARCHAR(10)    NOT NULL
                        CHECK (role IN ('student', 'advisor', 'admin')),
    advisor_id      INT             NULL,
    department      NVARCHAR(100)   NULL,
    phone           NVARCHAR(20)    NULL,
    is_active       BIT             NOT NULL DEFAULT 1,
    must_change_pw  BIT             NOT NULL DEFAULT 1,
    last_login      DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),
    updated_at      DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CHK_USERS_email
        CHECK (email LIKE '%@kmutt.ac.th'),

    CONSTRAINT CHK_USERS_advisor_role
        CHECK (
            (role = 'student'  AND advisor_id IS NOT NULL)
            OR (role IN ('advisor', 'admin') AND advisor_id IS NULL)
        )
);
GO

ALTER TABLE dbo.USERS
    ADD CONSTRAINT FK_USERS_advisor
    FOREIGN KEY (advisor_id) REFERENCES dbo.USERS(user_id);
GO

CREATE INDEX IDX_USERS_email   ON dbo.USERS(email);
CREATE INDEX IDX_USERS_role    ON dbo.USERS(role);
CREATE INDEX IDX_USERS_advisor ON dbo.USERS(advisor_id);
GO


-- ============================================================
--  TABLE: DOCUMENTS
--  + project_category  (nullable — รอ confirm จากเจ้าหน้าที่)
--  + version           (รองรับการส่งเอกสารใหม่แทนของเก่า)
--  + parent_doc_id     (FK กลับมาที่ doc เดิม)
--  - ย้าย file_path, file_name, file_size → DOCUMENT_FILES แทน
-- ============================================================
IF OBJECT_ID('dbo.DOCUMENTS', 'U') IS NOT NULL DROP TABLE dbo.DOCUMENTS;
GO

CREATE TABLE dbo.DOCUMENTS (
    doc_id              INT             IDENTITY(1,1)   PRIMARY KEY,
    user_id             INT             NOT NULL,
    doc_type            NVARCHAR(5)     NOT NULL
                            CHECK (doc_type IN ('RI', 'IRB')),

    -- [รอ confirm] ประเภทโครงการ: เร่งด่วน / ยกเว้น / ประเมิน
    -- nullable ไว้ก่อน เปิด NOT NULL เมื่อ confirm แล้ว
    project_category    NVARCHAR(15)    NULL
                            CHECK (project_category IN ('urgent', 'exempt', 'evaluation')),

    title               NVARCHAR(300)   NOT NULL,
    description         NVARCHAR(1000)  NULL,
    issue_date          DATE            NOT NULL,
    expire_date         DATE            NOT NULL,

    -- Version tracking สำหรับการส่งเอกสารใหม่แทนของเก่า
    -- [รอ confirm logic การทำลายเอกสาร]
    version             INT             NOT NULL DEFAULT 1,
    parent_doc_id       INT             NULL,   -- FK → DOCUMENTS (doc ก่อนหน้า)

    status              NVARCHAR(15)    NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'expiring_soon', 'expired', 'deleted')),
    deleted_at          DATETIME        NULL,
    created_at          DATETIME        NOT NULL DEFAULT GETDATE(),
    updated_at          DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT CHK_DOCUMENTS_dates
        CHECK (expire_date > issue_date),

    CONSTRAINT CHK_DOCUMENTS_version
        CHECK (version >= 1),

    CONSTRAINT FK_DOCUMENTS_user
        FOREIGN KEY (user_id) REFERENCES dbo.USERS(user_id),

    -- Self-referencing FK (doc ใหม่ → doc เดิม)
    CONSTRAINT FK_DOCUMENTS_parent
        FOREIGN KEY (parent_doc_id) REFERENCES dbo.DOCUMENTS(doc_id)
);
GO

CREATE INDEX IDX_DOCUMENTS_user_id       ON dbo.DOCUMENTS(user_id);
CREATE INDEX IDX_DOCUMENTS_status        ON dbo.DOCUMENTS(status);
CREATE INDEX IDX_DOCUMENTS_expire_date   ON dbo.DOCUMENTS(expire_date);
CREATE INDEX IDX_DOCUMENTS_doc_type      ON dbo.DOCUMENTS(doc_type);
CREATE INDEX IDX_DOCUMENTS_category      ON dbo.DOCUMENTS(project_category);
CREATE INDEX IDX_DOCUMENTS_parent_doc_id ON dbo.DOCUMENTS(parent_doc_id);
GO


-- ============================================================
--  TABLE: DOCUMENT_FILES  [ใหม่]
--  เก็บไฟล์แนบหลายไฟล์ต่อ 1 เอกสาร
--  file_type:
--    'main'        = ใบประกาศ RI/IRB หลัก
--    'certificate' = บันทึกข้อความรับรอง
--    'attachment'  = เอกสารแนบอื่นๆ
-- ============================================================
IF OBJECT_ID('dbo.DOCUMENT_FILES', 'U') IS NOT NULL DROP TABLE dbo.DOCUMENT_FILES;
GO

CREATE TABLE dbo.DOCUMENT_FILES (
    file_id         INT             IDENTITY(1,1)   PRIMARY KEY,
    doc_id          INT             NOT NULL,
    file_type       NVARCHAR(15)    NOT NULL
                        CHECK (file_type IN ('main', 'certificate', 'attachment')),
    file_name       NVARCHAR(255)   NOT NULL,   -- ชื่อที่แสดงให้ผู้ใช้เห็น
    file_path       NVARCHAR(500)   NOT NULL,   -- path จริงบน server
    file_size       INT             NOT NULL,   -- หน่วย bytes
    mime_type       NVARCHAR(100)   NULL,       -- เช่น application/pdf, image/jpeg
    uploaded_at     DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_DOCFILES_doc
        FOREIGN KEY (doc_id) REFERENCES dbo.DOCUMENTS(doc_id)
);
GO

CREATE INDEX IDX_DOCFILES_doc_id    ON dbo.DOCUMENT_FILES(doc_id);
CREATE INDEX IDX_DOCFILES_file_type ON dbo.DOCUMENT_FILES(doc_id, file_type);
GO


-- ============================================================
--  TABLE: NOTIFICATIONS
-- ============================================================
IF OBJECT_ID('dbo.NOTIFICATIONS', 'U') IS NOT NULL DROP TABLE dbo.NOTIFICATIONS;
GO

CREATE TABLE dbo.NOTIFICATIONS (
    notif_id        INT             IDENTITY(1,1)   PRIMARY KEY,
    user_id         INT             NOT NULL,
    doc_id          INT             NOT NULL,
    type            NVARCHAR(20)    NOT NULL
                        CHECK (type IN ('expiry_warning', 'expired', 'deleted', 'replaced')),
    message         NVARCHAR(500)   NOT NULL,
    channel         NVARCHAR(10)    NOT NULL DEFAULT 'both'
                        CHECK (channel IN ('in_app', 'email', 'both')),
    in_app_read     BIT             NOT NULL DEFAULT 0,
    in_app_read_at  DATETIME        NULL,
    email_sent      BIT             NOT NULL DEFAULT 0,
    email_sent_at   DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_NOTIFICATIONS_user
        FOREIGN KEY (user_id) REFERENCES dbo.USERS(user_id),

    CONSTRAINT FK_NOTIFICATIONS_doc
        FOREIGN KEY (doc_id) REFERENCES dbo.DOCUMENTS(doc_id)
);
GO

CREATE INDEX IDX_NOTIF_user_id     ON dbo.NOTIFICATIONS(user_id);
CREATE INDEX IDX_NOTIF_doc_id      ON dbo.NOTIFICATIONS(doc_id);
CREATE INDEX IDX_NOTIF_unread      ON dbo.NOTIFICATIONS(user_id, in_app_read);
GO


-- ============================================================
--  TABLE: EMAIL_LOGS
-- ============================================================
IF OBJECT_ID('dbo.EMAIL_LOGS', 'U') IS NOT NULL DROP TABLE dbo.EMAIL_LOGS;
GO

CREATE TABLE dbo.EMAIL_LOGS (
    log_id          INT             IDENTITY(1,1)   PRIMARY KEY,
    notif_id        INT             NOT NULL,
    to_email        NVARCHAR(150)   NOT NULL,
    subject         NVARCHAR(300)   NOT NULL,
    body            NVARCHAR(MAX)   NOT NULL,
    status          NVARCHAR(10)    NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'failed')),
    retry_count     INT             NOT NULL DEFAULT 0,
    error_message   NVARCHAR(500)   NULL,
    sent_at         DATETIME        NULL,
    created_at      DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_EMAIL_LOGS_notif
        FOREIGN KEY (notif_id) REFERENCES dbo.NOTIFICATIONS(notif_id)
);
GO

CREATE INDEX IDX_EMAIL_LOGS_status   ON dbo.EMAIL_LOGS(status);
CREATE INDEX IDX_EMAIL_LOGS_notif_id ON dbo.EMAIL_LOGS(notif_id);
GO


-- ============================================================
--  TABLE: DELETION_LOGS
--  + reason 'replaced_by_new' (รอ confirm)
-- ============================================================
IF OBJECT_ID('dbo.DELETION_LOGS', 'U') IS NOT NULL DROP TABLE dbo.DELETION_LOGS;
GO

CREATE TABLE dbo.DELETION_LOGS (
    log_id              INT             IDENTITY(1,1)   PRIMARY KEY,
    doc_id              INT             NOT NULL,
    deleted_by          INT             NULL,
    reason              NVARCHAR(20)    NOT NULL
                            CHECK (reason IN (
                                'auto_expired',
                                'manual_admin',
                                'replaced_by_new'   -- [รอ confirm] ส่งเอกสารใหม่แทน
                            )),
    new_doc_id          INT             NULL,   -- [รอ confirm] FK → doc ใหม่ที่มาแทน
    original_file_path  NVARCHAR(500)   NOT NULL,
    original_file_name  NVARCHAR(255)   NOT NULL,
    doc_title           NVARCHAR(300)   NOT NULL,
    owner_email         NVARCHAR(150)   NOT NULL,
    deleted_at          DATETIME        NOT NULL DEFAULT GETDATE(),

    CONSTRAINT FK_DELETION_LOGS_doc
        FOREIGN KEY (doc_id) REFERENCES dbo.DOCUMENTS(doc_id),

    CONSTRAINT FK_DELETION_LOGS_admin
        FOREIGN KEY (deleted_by) REFERENCES dbo.USERS(user_id),

    CONSTRAINT FK_DELETION_LOGS_new_doc
        FOREIGN KEY (new_doc_id) REFERENCES dbo.DOCUMENTS(doc_id)
);
GO

CREATE INDEX IDX_DELETION_LOGS_doc_id     ON dbo.DELETION_LOGS(doc_id);
CREATE INDEX IDX_DELETION_LOGS_deleted_at ON dbo.DELETION_LOGS(deleted_at);
GO


-- ============================================================
--  SEED DATA: Admin คนแรก
-- ============================================================
INSERT INTO dbo.USERS (name, email, password_hash, role, advisor_id, department, must_change_pw)
VALUES (
    N'ผู้ดูแลระบบ',
    'admin@kmutt.ac.th',
    '$2b$12$SbW.B5e.xKZccTu57h.pkugwsiT8qmqtPb7/DaeCTaM4OTd0VEevW',
    'admin',
    NULL,
    N'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี',
    0
);
GO


-- ============================================================
--  STORED PROCEDURE: อัปเดต status เอกสารอัตโนมัติ
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_UpdateDocumentStatus
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE dbo.DOCUMENTS
    SET status = 'expiring_soon', updated_at = GETDATE()
    WHERE status = 'active'
      AND expire_date <= DATEADD(DAY, 90, CAST(GETDATE() AS DATE))
      AND expire_date >  CAST(GETDATE() AS DATE);

    UPDATE dbo.DOCUMENTS
    SET status = 'expired', updated_at = GETDATE()
    WHERE status IN ('active', 'expiring_soon')
      AND expire_date <= CAST(GETDATE() AS DATE);

    SELECT
        SUM(CASE WHEN status = 'expiring_soon' THEN 1 ELSE 0 END) AS expiring_soon_count,
        SUM(CASE WHEN status = 'expired'       THEN 1 ELSE 0 END) AS expired_count
    FROM dbo.DOCUMENTS
    WHERE status IN ('expiring_soon', 'expired');
END;
GO


-- ============================================================
--  VIEW: เอกสารที่ต้องแจ้งเตือน (Scheduler)
-- ============================================================
CREATE OR ALTER VIEW dbo.v_ExpiringDocuments
AS
SELECT
    d.doc_id,
    d.title,
    d.doc_type,
    d.project_category,
    d.expire_date,
    d.status,
    d.version,
    DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) AS days_remaining,
    u.user_id,
    u.name      AS owner_name,
    u.email     AS owner_email,
    a.user_id   AS advisor_id,
    a.name      AS advisor_name,
    a.email     AS advisor_email
FROM dbo.DOCUMENTS d
JOIN dbo.USERS u  ON d.user_id    = u.user_id
LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
WHERE d.status IN ('active', 'expiring_soon')
  AND d.expire_date <= DATEADD(DAY, 90, CAST(GETDATE() AS DATE));
GO


-- ============================================================
--  VIEW: Unread in-app notifications (Frontend)
-- ============================================================
CREATE OR ALTER VIEW dbo.v_UnreadNotifications
AS
SELECT
    n.notif_id,
    n.user_id,
    n.doc_id,
    n.type,
    n.message,
    n.created_at,
    d.title       AS doc_title,
    d.doc_type,
    d.expire_date,
    d.project_category
FROM dbo.NOTIFICATIONS n
JOIN dbo.DOCUMENTS d ON n.doc_id = d.doc_id
WHERE n.in_app_read = 0
  AND n.channel IN ('in_app', 'both');
GO


-- ============================================================
--  VIEW: เอกสารพร้อมไฟล์แนบทั้งหมด (Frontend)
-- ============================================================
CREATE OR ALTER VIEW dbo.v_DocumentsWithFiles
AS
SELECT
    d.doc_id,
    d.user_id,
    d.doc_type,
    d.project_category,
    d.title,
    d.description,
    d.issue_date,
    d.expire_date,
    d.status,
    d.version,
    d.parent_doc_id,
    d.created_at,
    f.file_id,
    f.file_type,
    f.file_name,
    f.file_path,
    f.file_size,
    f.mime_type
FROM dbo.DOCUMENTS d
LEFT JOIN dbo.DOCUMENT_FILES f ON d.doc_id = f.doc_id
WHERE d.status != 'deleted';
GO

PRINT '====================================================';
PRINT ' FIET_RIIRB Database v2.0 สร้างสำเร็จ!';
PRINT '====================================================';
PRINT 'Tables   : USERS, DOCUMENTS, DOCUMENT_FILES,';
PRINT '           NOTIFICATIONS, EMAIL_LOGS, DELETION_LOGS';
PRINT 'Procs    : sp_UpdateDocumentStatus';
PRINT 'Views    : v_ExpiringDocuments, v_UnreadNotifications,';
PRINT '           v_DocumentsWithFiles';
PRINT '----------------------------------------------------';
PRINT '[รอ confirm] project_category, replaced_by_new logic';
PRINT '====================================================';
GO

SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_TYPE = 'BASE TABLE'
ORDER BY TABLE_NAME;

SELECT user_id, name, email, role, must_change_pw
FROM dbo.USERS;

ALTER LOGIN sa WITH PASSWORD = 'P@ssw0rd1234';
ALTER LOGIN sa ENABLE;

USE FIET_IRIS;

INSERT INTO dbo.USERS (name, email, password_hash, role, advisor_id, department, must_change_pw)
VALUES (
  N'อาจารย์ทดสอบ',
  'advisor.test@kmutt.ac.th',
  '$2b$12$q2r/4xnkynHYEYTMBUGp8eA6wNuogAEnq7o9dwle5OHsjBTInEF.2',
  'advisor',
  NULL,
  N'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี',
  0
);

SELECT user_id, name, email, role FROM dbo.USERS WHERE role = 'advisor';

INSERT INTO dbo.USERS (name, email, password_hash, role, advisor_id, department, must_change_pw)
VALUES (
  N'นักศึกษาทดสอบ',
  'student.test@kmutt.ac.th',
  '$2b$12$q2r/4xnkynHYEYTMBUGp8eA6wNuogAEnq7o9dwle5OHsjBTInEF.2',
  'student',
  1,   -- ← เปลี่ยนเป็น user_id ของ advisor ที่เพิ่งสร้าง
  N'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี',
  0
);

SELECT user_id, name, email, role, is_active FROM dbo.USERS;

UPDATE dbo.USERS 
SET password_hash = '$2b$12$/4oGtk0nYAkMtpivc6mB9.40kMThjhSKdzUDjoxTvzxcJHCJR5R7.'
WHERE email IN ('advisor.test@kmutt.ac.th', 'student.test@kmutt.ac.th');

UPDATE dbo.USERS
SET advisor_id = 2  -- user_id ของ advisor.test@kmutt.ac.th
WHERE email = 'student.test@kmutt.ac.th';

EXEC sp_rename 'dbo.USERS.branch', 'department', 'COLUMN';

SELECT user_id, name, email, must_change_pw, created_at
FROM dbo.USERS
ORDER BY created_at DESC;

ALTER TABLE dbo.USERS DROP CONSTRAINT CHK_USERS_advisor_role;

ALTER TABLE dbo.USERS ADD CONSTRAINT CHK_USERS_role
  CHECK (role IN ('student', 'advisor', 'admin', 'executive'));

ALTER TABLE dbo.USERS ADD CONSTRAINT CHK_USERS_advisor_role
  CHECK (
    (role = 'student' AND advisor_id IS NOT NULL)
    OR (role IN ('advisor', 'admin', 'executive') AND advisor_id IS NULL)
  );