-- Migration v9: Document Approval, Comments, and FAQ
-- Run this against the FIET-IRIS database

-- ============================================================
-- 1. Document Approval Status columns
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='approval_status')
  ALTER TABLE dbo.DOCUMENTS ADD approval_status NVARCHAR(20) NOT NULL DEFAULT 'pending';

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='approval_by')
  ALTER TABLE dbo.DOCUMENTS ADD approval_by INT NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='approval_at')
  ALTER TABLE dbo.DOCUMENTS ADD approval_at DATETIME NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='approval_note')
  ALTER TABLE dbo.DOCUMENTS ADD approval_note NVARCHAR(1000) NULL;

-- Back-fill existing active/expiring_soon/expired docs as approved
UPDATE dbo.DOCUMENTS
SET approval_status = 'approved'
WHERE status IN ('active','expiring_soon','expired')
  AND approval_status = 'pending';

-- Index for approval status filtering
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='IDX_DOCUMENTS_approval_status')
  CREATE INDEX IDX_DOCUMENTS_approval_status ON dbo.DOCUMENTS(approval_status);

-- ============================================================
-- 4. Expand NOTIFICATIONS.type CHECK to include approval types
-- ============================================================
IF NOT EXISTS (
  SELECT 1 FROM sys.check_constraints
  WHERE parent_object_id = OBJECT_ID('dbo.NOTIFICATIONS') AND name = 'CHK_NOTIFICATIONS_type_v2'
)
BEGIN
  DECLARE @cn NVARCHAR(200)
  SELECT @cn = cc.name
  FROM sys.check_constraints cc
  JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
  WHERE cc.parent_object_id = OBJECT_ID('dbo.NOTIFICATIONS') AND c.name = 'type'
  IF @cn IS NOT NULL
    EXEC('ALTER TABLE dbo.NOTIFICATIONS DROP CONSTRAINT [' + @cn + ']')
  ALTER TABLE dbo.NOTIFICATIONS
  ADD CONSTRAINT CHK_NOTIFICATIONS_type_v2
  CHECK (type IN ('expiry_warning','expired','deleted','replaced','approved','rejected'))
END

-- ============================================================
-- 2. Document Comments table
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID('dbo.DOCUMENT_COMMENTS') AND type='U')
BEGIN
  CREATE TABLE dbo.DOCUMENT_COMMENTS (
    comment_id   INT           IDENTITY(1,1) PRIMARY KEY,
    doc_id       INT           NOT NULL,
    user_id      INT           NOT NULL,
    content      NVARCHAR(2000) NOT NULL,
    created_at   DATETIME      NOT NULL DEFAULT GETDATE(),
    updated_at   DATETIME      NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_DOCCOMMENTS_doc  FOREIGN KEY (doc_id)  REFERENCES dbo.DOCUMENTS(doc_id) ON DELETE CASCADE,
    CONSTRAINT FK_DOCCOMMENTS_user FOREIGN KEY (user_id) REFERENCES dbo.USERS(user_id)
  );
  CREATE INDEX IDX_DOCCOMMENTS_doc  ON dbo.DOCUMENT_COMMENTS(doc_id);
  CREATE INDEX IDX_DOCCOMMENTS_user ON dbo.DOCUMENT_COMMENTS(user_id);
END

-- ============================================================
-- 3. FAQ Items table
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID('dbo.FAQ_ITEMS') AND type='U')
BEGIN
  CREATE TABLE dbo.FAQ_ITEMS (
    faq_id      INT           IDENTITY(1,1) PRIMARY KEY,
    question    NVARCHAR(500)  NOT NULL,
    answer      NVARCHAR(MAX)  NOT NULL,
    category    NVARCHAR(100)  NULL,
    sort_order  INT            NOT NULL DEFAULT 0,
    is_active   BIT            NOT NULL DEFAULT 1,
    created_by  INT            NULL,
    created_at  DATETIME       NOT NULL DEFAULT GETDATE(),
    updated_at  DATETIME       NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_FAQ_createdby FOREIGN KEY (created_by) REFERENCES dbo.USERS(user_id)
  );
  CREATE INDEX IDX_FAQ_active ON dbo.FAQ_ITEMS(is_active, sort_order);
END
