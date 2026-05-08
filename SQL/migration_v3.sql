-- ============================================================
--  FIET-IRIS Migration v3.0
--  รองรับ: ป.โท, ป.เอก, เจ้าหน้าที่ (staff role)
--  Idempotent — รันซ้ำได้ไม่มีผลข้างเคียง
-- ============================================================

USE FIET_IRIS;
GO

-- ── 1. เพิ่ม degree_level ใน USERS ──────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('dbo.USERS') AND name = 'degree_level'
)
BEGIN
    ALTER TABLE dbo.USERS
        ADD degree_level NVARCHAR(20) NULL;
    PRINT 'Added column: USERS.degree_level';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.USERS')
      AND name = 'CHK_USERS_degree_level'
)
BEGIN
    ALTER TABLE dbo.USERS
        ADD CONSTRAINT CHK_USERS_degree_level
        CHECK (degree_level IN ('bachelor', 'master', 'doctoral'));
    PRINT 'Added constraint: CHK_USERS_degree_level';
END
GO

-- ── 2. เพิ่ม staff ใน role CHECK ────────────────────────────────────────────
-- ลบ constraint เก่าก่อน แล้วสร้างใหม่ (ชื่ออาจต่างกันตาม DB state)

-- ลบ constraint ทุกชื่อที่เป็นไปได้
DECLARE @roleConst NVARCHAR(256)
SELECT @roleConst = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.USERS')
  AND CHARINDEX('role', definition) > 0
  AND name LIKE '%CHK_USERS_role%'
IF @roleConst IS NOT NULL
    EXEC('ALTER TABLE dbo.USERS DROP CONSTRAINT [' + @roleConst + ']')
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.USERS')
      AND name = 'CHK_USERS_role_v3'
)
BEGIN
    ALTER TABLE dbo.USERS
        ADD CONSTRAINT CHK_USERS_role_v3
        CHECK (role IN ('student', 'advisor', 'admin', 'executive', 'staff'));
    PRINT 'Added constraint: CHK_USERS_role_v3 (includes staff)';
END
GO

-- ── 3. อัปเดต advisor_role constraint รองรับ staff ──────────────────────────
-- staff ไม่ต้องมี advisor_id (เหมือน advisor/admin/executive)

DECLARE @advConst NVARCHAR(256)
SELECT @advConst = name
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.USERS')
  AND name LIKE '%CHK_USERS_advisor_role%'
IF @advConst IS NOT NULL
    EXEC('ALTER TABLE dbo.USERS DROP CONSTRAINT [' + @advConst + ']')
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID('dbo.USERS')
      AND name = 'CHK_USERS_advisor_role_v3'
)
BEGIN
    ALTER TABLE dbo.USERS
        ADD CONSTRAINT CHK_USERS_advisor_role_v3
        CHECK (
            (role = 'student'  AND advisor_id IS NOT NULL)
            OR (role IN ('advisor', 'admin', 'executive', 'staff') AND advisor_id IS NULL)
        );
    PRINT 'Added constraint: CHK_USERS_advisor_role_v3 (includes staff)';
END
GO

-- ── 4. ตรวจสอบผลลัพธ์ ────────────────────────────────────────────────────────
SELECT
    COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'USERS'
ORDER BY ORDINAL_POSITION;

SELECT name, definition
FROM sys.check_constraints
WHERE parent_object_id = OBJECT_ID('dbo.USERS');

PRINT '====================================================';
PRINT ' Migration v3.0 เสร็จสิ้น';
PRINT ' - degree_level (bachelor/master/doctoral)';
PRINT ' - staff role';
PRINT '====================================================';
GO
