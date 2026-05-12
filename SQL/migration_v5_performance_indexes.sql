/* FIET-IRIS performance indexes
   Run once on existing databases. All statements are idempotent. */

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_DOCUMENTS_status_expire_created' AND object_id = OBJECT_ID('dbo.DOCUMENTS'))
BEGIN
  CREATE INDEX IDX_DOCUMENTS_status_expire_created
  ON dbo.DOCUMENTS(status, expire_date, created_at)
  INCLUDE (doc_id, user_id, doc_type, title, no_expire);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_DOCUMENTS_status_user' AND object_id = OBJECT_ID('dbo.DOCUMENTS'))
BEGIN
  CREATE INDEX IDX_DOCUMENTS_status_user
  ON dbo.DOCUMENTS(status, user_id)
  INCLUDE (doc_id, expire_date, created_at, doc_type);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_USERS_role_degree_department' AND object_id = OBJECT_ID('dbo.USERS'))
BEGIN
  CREATE INDEX IDX_USERS_role_degree_department
  ON dbo.USERS(role, degree_level, department)
  INCLUDE (user_id, advisor_id, is_active, name, email, student_id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_USERS_advisor_degree_department' AND object_id = OBJECT_ID('dbo.USERS'))
BEGIN
  CREATE INDEX IDX_USERS_advisor_degree_department
  ON dbo.USERS(advisor_id, degree_level, department)
  INCLUDE (user_id, role, is_active);
END
GO

IF OBJECT_ID('dbo.DELETION_LOGS', 'U') IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_DELETION_LOGS_reason_deleted_at' AND object_id = OBJECT_ID('dbo.DELETION_LOGS'))
BEGIN
  CREATE INDEX IDX_DELETION_LOGS_reason_deleted_at
  ON dbo.DELETION_LOGS(reason, deleted_at)
  INCLUDE (doc_title, owner_email, original_file_name, deleted_by);
END
GO
