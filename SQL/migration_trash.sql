-- ============================================================
--  Migration: เพิ่ม status 'trashed' และ column trashed_at/trashed_by
--  รัน script นี้ 1 ครั้งบน database FIET_RIIRB
-- ============================================================

-- 1. เพิ่ม column trashed_at
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'trashed_at'
)
  ALTER TABLE dbo.DOCUMENTS ADD trashed_at DATETIME NULL;
GO

-- 2. เพิ่ม column trashed_by
IF NOT EXISTS (
  SELECT 1 FROM sys.columns
  WHERE object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'trashed_by'
)
  ALTER TABLE dbo.DOCUMENTS ADD trashed_by INT NULL;
GO

-- 3. แก้ไข CHECK constraint บน status ให้รองรับ 'trashed'
--    (ลบ constraint เดิมที่ generate ชื่ออัตโนมัติ แล้วสร้างใหม่)
DECLARE @constraintName NVARCHAR(200)

SELECT @constraintName = cc.name
FROM sys.check_constraints cc
JOIN sys.columns c ON cc.parent_object_id = c.object_id
                   AND cc.parent_column_id = c.column_id
WHERE cc.parent_object_id = OBJECT_ID('dbo.DOCUMENTS')
  AND c.name = 'status'

IF @constraintName IS NOT NULL
BEGIN
  EXEC('ALTER TABLE dbo.DOCUMENTS DROP CONSTRAINT [' + @constraintName + ']')
  PRINT 'Dropped old status constraint: ' + @constraintName
END

-- สร้าง constraint ใหม่ที่รองรับ trashed
IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID('dbo.DOCUMENTS')
    AND name = 'CHK_DOCUMENTS_status'
)
BEGIN
  ALTER TABLE dbo.DOCUMENTS
  ADD CONSTRAINT CHK_DOCUMENTS_status
  CHECK (status IN ('active', 'expiring_soon', 'expired', 'deleted', 'trashed'))
  PRINT 'Created new status constraint with trashed'
END
GO

PRINT 'Migration สำเร็จ: trashed_at, trashed_by columns + status constraint updated'
GO
