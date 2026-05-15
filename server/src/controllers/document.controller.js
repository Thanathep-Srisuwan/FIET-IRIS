const path = require('path')
const fs   = require('fs')
const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')
const { sendMail, permanentDeleteTemplate } = require('../utils/mailer')

const ensureUserProgramColumn = async (pool) => {
  await pool.request().query(`
    IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='department')
       AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='program')
      EXEC sp_rename 'dbo.USERS.department', 'program', 'COLUMN';
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.USERS') AND name='program')
      ALTER TABLE dbo.USERS ADD program NVARCHAR(100) NULL;
  `)
}

const ensureNoExpireColumn = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'no_expire'
    )
    ALTER TABLE dbo.DOCUMENTS ADD no_expire BIT NOT NULL DEFAULT 0

    IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'expire_date' AND is_nullable = 0
    )
    BEGIN
      DECLARE @dateConstraint NVARCHAR(200)
      SELECT @dateConstraint = cc.name
      FROM sys.check_constraints cc
      WHERE cc.parent_object_id = OBJECT_ID('dbo.DOCUMENTS')
        AND cc.definition LIKE '%expire_date%'

      IF @dateConstraint IS NOT NULL
        EXEC('ALTER TABLE dbo.DOCUMENTS DROP CONSTRAINT [' + @dateConstraint + ']')

      ALTER TABLE dbo.DOCUMENTS ALTER COLUMN expire_date DATE NULL

      IF NOT EXISTS (
        SELECT 1 FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'CHK_DOCUMENTS_dates_nullable'
      )
      ALTER TABLE dbo.DOCUMENTS
      ADD CONSTRAINT CHK_DOCUMENTS_dates_nullable
      CHECK (expire_date IS NULL OR expire_date >= issue_date)
    END
  `)
}

const ensureTrashedColumns = async (pool) => {
  // เพิ่ม column trashed_at
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='trashed_at')
      ALTER TABLE dbo.DOCUMENTS ADD trashed_at DATETIME NULL
  `)
  // เพิ่ม column trashed_by
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='trashed_by')
      ALTER TABLE dbo.DOCUMENTS ADD trashed_by INT NULL
  `)
  // แก้ CHECK constraint บน status ให้รองรับ 'trashed'
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'CHK_DOCUMENTS_status'
    )
    BEGIN
      DECLARE @cn NVARCHAR(200)
      SELECT @cn = cc.name
      FROM sys.check_constraints cc
      JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
      WHERE cc.parent_object_id = OBJECT_ID('dbo.DOCUMENTS') AND c.name = 'status'
      IF @cn IS NOT NULL
        EXEC('ALTER TABLE dbo.DOCUMENTS DROP CONSTRAINT [' + @cn + ']')
      ALTER TABLE dbo.DOCUMENTS
      ADD CONSTRAINT CHK_DOCUMENTS_status
      CHECK (status IN ('active', 'expiring_soon', 'expired', 'deleted', 'trashed'))
    END
  `)
}

const ensureTrashReasonColumn = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='trash_reason')
      ALTER TABLE dbo.DOCUMENTS ADD trash_reason NVARCHAR(500) NULL
  `)
}

const ensureNotificationsTypeConstraint = async (pool) => {
  // Expand NOTIFICATIONS.type CHECK to include approval types
  await pool.request().query(`
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
  `)
}

const ensureApprovalColumns = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='approval_status')
      ALTER TABLE dbo.DOCUMENTS ADD approval_status NVARCHAR(20) NOT NULL DEFAULT 'pending'
  `)
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='approval_by')
      ALTER TABLE dbo.DOCUMENTS ADD approval_by INT NULL
  `)
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='approval_at')
      ALTER TABLE dbo.DOCUMENTS ADD approval_at DATETIME NULL
  `)
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='approval_note')
      ALTER TABLE dbo.DOCUMENTS ADD approval_note NVARCHAR(1000) NULL
  `)
}

const ensureDocTypeColumn = async (pool) => {
  // Drop hardcoded CHECK constraint on doc_type (RI/IRB only) if column is still narrow
  await pool.request().query(`
    IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'doc_type' AND max_length < 100
    )
    BEGIN
      DECLARE @cn NVARCHAR(200)
      SELECT @cn = cc.name
      FROM sys.check_constraints cc
      JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
      WHERE cc.parent_object_id = OBJECT_ID('dbo.DOCUMENTS') AND c.name = 'doc_type'
      IF @cn IS NOT NULL
        EXEC('ALTER TABLE dbo.DOCUMENTS DROP CONSTRAINT [' + @cn + ']')
    END
  `)
  // Widen doc_type to NVARCHAR(50) to match DOC_TYPES.type_code
  await pool.request().query(`
    IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'doc_type' AND max_length < 100
    )
      ALTER TABLE dbo.DOCUMENTS ALTER COLUMN doc_type NVARCHAR(50) NOT NULL
  `)
}

const ensureProjectCategoryConstraintDropped = async (pool) => {
  // Drop the old hardcoded CHECK on project_category ('urgent','exempt','evaluation')
  // because categories are now managed dynamically via DOC_TYPE_CATEGORIES table
  await pool.request().query(`
    DECLARE @cn NVARCHAR(200)
    SELECT @cn = cc.name
    FROM sys.check_constraints cc
    JOIN sys.columns c ON cc.parent_object_id = c.object_id AND cc.parent_column_id = c.column_id
    WHERE cc.parent_object_id = OBJECT_ID('dbo.DOCUMENTS') AND c.name = 'project_category'
    IF @cn IS NOT NULL
      EXEC('ALTER TABLE dbo.DOCUMENTS DROP CONSTRAINT [' + @cn + ']')
  `)
  // Widen project_category to NVARCHAR(50) to match DOC_TYPE_CATEGORIES.category_code
  await pool.request().query(`
    IF EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'project_category' AND max_length < 100
    )
      ALTER TABLE dbo.DOCUMENTS ALTER COLUMN project_category NVARCHAR(50) NULL
  `)
}

const ensureDocumentVersioningSchema = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENT_FILES') AND name='version_no')
      ALTER TABLE dbo.DOCUMENT_FILES ADD version_no INT NOT NULL DEFAULT 1

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENT_FILES') AND name='is_current')
      ALTER TABLE dbo.DOCUMENT_FILES ADD is_current BIT NOT NULL DEFAULT 1

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENT_FILES') AND name='uploaded_by')
      ALTER TABLE dbo.DOCUMENT_FILES ADD uploaded_by INT NULL

    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENT_FILES') AND name='replaced_at')
      ALTER TABLE dbo.DOCUMENT_FILES ADD replaced_at DATETIME NULL

    IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name='IDX_DOCFILES_current' AND object_id=OBJECT_ID('dbo.DOCUMENT_FILES'))
      CREATE INDEX IDX_DOCFILES_current ON dbo.DOCUMENT_FILES(doc_id, file_type, is_current, version_no)
  `)

  await pool.request().query(`
    IF OBJECT_ID('dbo.DOCUMENT_TIMELINE', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.DOCUMENT_TIMELINE (
        timeline_id INT IDENTITY(1,1) PRIMARY KEY,
        doc_id INT NOT NULL,
        actor_id INT NULL,
        event_type NVARCHAR(40) NOT NULL,
        title NVARCHAR(200) NOT NULL,
        detail NVARCHAR(1000) NULL,
        metadata NVARCHAR(MAX) NULL,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_DOCTIMELINE_doc FOREIGN KEY (doc_id) REFERENCES dbo.DOCUMENTS(doc_id),
        CONSTRAINT FK_DOCTIMELINE_actor FOREIGN KEY (actor_id) REFERENCES dbo.USERS(user_id)
      )
      CREATE INDEX IDX_DOCTIMELINE_doc_created ON dbo.DOCUMENT_TIMELINE(doc_id, created_at DESC)
    END
  `)
}

const logDocumentTimeline = async (pool, { doc_id, actor_id = null, event_type, title, detail = null, metadata = null }) => {
  try {
    await ensureDocumentVersioningSchema(pool)
    await pool.request()
      .input('doc_id', sql.Int, doc_id)
      .input('actor_id', sql.Int, actor_id)
      .input('event_type', sql.NVarChar, event_type)
      .input('title', sql.NVarChar, title)
      .input('detail', sql.NVarChar, detail)
      .input('metadata', sql.NVarChar, metadata ? JSON.stringify(metadata) : null)
      .query(`
        INSERT INTO dbo.DOCUMENT_TIMELINE (doc_id, actor_id, event_type, title, detail, metadata)
        VALUES (@doc_id, @actor_id, @event_type, @title, @detail, @metadata)
      `)
  } catch (err) {
    logger.error(`logDocumentTimeline: ${err.message}`)
  }
}

const getAccessibleDocument = async (pool, docId, user) => {
  await ensureUserProgramColumn(pool)
  const result = await pool.request()
    .input('doc_id', sql.Int, docId)
    .input('user_id', sql.Int, user.user_id)
    .input('role', sql.NVarChar, user.role)
    .query(`
      SELECT d.*, u.name AS owner_name, u.email AS owner_email,
             u.student_id AS owner_student_id, u.role AS owner_role,
             u.degree_level AS owner_degree_level, u.program AS owner_program,
             u.affiliation AS owner_affiliation,
             a.name AS advisor_name,
             CASE WHEN d.no_expire = 1 THEN NULL ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) END AS days_remaining
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
      WHERE d.doc_id = @doc_id
        AND d.status NOT IN ('deleted','trashed')
        AND (
          @user_id = d.user_id
          OR @role IN ('admin','executive')
          OR EXISTS (SELECT 1 FROM dbo.USERS owner WHERE owner.user_id = d.user_id AND owner.advisor_id = @user_id)
        )
    `)
  return result.recordset[0] || null
}

// GET /api/documents
const getDocuments = async (req, res) => {
  try {
    const {
      search, doc_type, status,
      approval_status,
      page = 1, limit = 15,
      degree_level, advisor_id, owner_role,
      sort_by, sort_dir,
      student_id,
    } = req.query
    const program = req.query.program || req.query.department
    const { user_id, role } = req.user
    const parsedPage  = Math.max(1, parseInt(page)  || 1)
    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit) || 15))
    const offset = (parsedPage - 1) * parsedLimit

    const pool = await getPool()
    await ensureUserProgramColumn(pool)
    await ensureNoExpireColumn(pool)
    await ensureTrashedColumns(pool)
    await ensureDocTypeColumn(pool)
    await ensureProjectCategoryConstraintDropped(pool)
    await ensureDocumentVersioningSchema(pool)
    await ensureApprovalColumns(pool)

    // Collect params so we can reuse across count + data requests
    const filterParams = []
    const addParam = (name, type, value) => filterParams.push({ name, type, value })
    const applyParams = (req) => { filterParams.forEach(({ name, type, value }) => req.input(name, type, value)); return req }

    addParam('user_id', sql.Int, user_id)
    let where = "WHERE d.status NOT IN ('deleted','trashed')"

    const isAdvisorOwnScope  = role === 'advisor' && (owner_role === 'advisor' || req.query.scope === 'mine')
    const isStaffApproverScope = role === 'staff' && req.query.scope === 'approver'

    if (role === 'student' || (role === 'staff' && !isStaffApproverScope) || isAdvisorOwnScope) {
      where += ' AND d.user_id = @user_id'
    } else if (isStaffApproverScope) {
      // staff เห็นเฉพาะเอกสาร pending ของ doc type ที่ตัวเองเป็น approver
      where += `
        AND ISNULL(d.approval_status,'pending') = 'pending'
        AND EXISTS (
          SELECT 1 FROM dbo.DOC_TYPES dt
          WHERE dt.type_code = d.doc_type
            AND dt.approver_user_id = @user_id
            AND dt.requires_approval = 1
            AND dt.is_active = 1
        )`
    } else if (role === 'advisor') {
      where += ' AND u.advisor_id = @user_id'
      if (student_id) {
        where += ' AND d.user_id = @student_id'
        addParam('student_id', sql.Int, parseInt(student_id))
      }
    }

    if (doc_type)     { where += ' AND d.doc_type = @doc_type';         addParam('doc_type',           sql.NVarChar, doc_type) }
    if (status)       { where += ' AND d.status = @status';             addParam('status',             sql.NVarChar, status) }
    if (approval_status) {
      where += " AND ISNULL(d.approval_status, 'pending') = @approval_status"
      addParam('approval_status', sql.NVarChar, approval_status)
    }
    if (search)       { where += ' AND (d.title LIKE @search OR u.name LIKE @search OR u.student_id LIKE @search)'; addParam('search', sql.NVarChar, `%${search}%`) }
    if (degree_level) {
      // NULL degree_level is treated as 'bachelor' (matches summary fallback logic)
      where += degree_level === 'bachelor'
        ? ' AND (u.degree_level = @degree_level OR u.degree_level IS NULL)'
        : ' AND u.degree_level = @degree_level'
      addParam('degree_level', sql.NVarChar, degree_level)
    }
    if (advisor_id && (role === 'admin' || role === 'executive')) {
      where += ' AND u.advisor_id = @filter_advisor_id'
      addParam('filter_advisor_id', sql.Int, parseInt(advisor_id))
    }
    if (owner_role && role === 'admin') {
      where += ' AND u.role = @owner_role'
      addParam('owner_role', sql.NVarChar, owner_role)
    }
    if (program && (role === 'admin' || role === 'advisor')) {
      where += ' AND u.program = @program'
      addParam('program', sql.NVarChar, program)
    }

    const sortMap = {
      title: 'd.title', doc_type: 'd.doc_type',
      issue_date: 'd.issue_date', expire_date: 'd.expire_date',
      owner_name: 'u.name', created_at: 'd.created_at',
      days_remaining: 'd.expire_date',
    }
    const sortCol = sortMap[sort_by] || 'd.created_at'
    const sortDirection = sort_dir === 'asc' ? 'ASC' : 'DESC'

    const countResult = await applyParams(pool.request()).query(`
      SELECT COUNT(*) AS total
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      ${where}
    `)

    const result = await applyParams(pool.request()).query(`
      SELECT
        d.doc_id, d.title, d.doc_type, d.description,
        d.issue_date, d.expire_date, d.no_expire, d.status, d.version,
        d.created_at, d.project_category,
        ISNULL(d.approval_status, 'pending') AS approval_status,
        d.approval_note, d.approval_at,
        CASE WHEN d.no_expire = 1 THEN NULL ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) END AS days_remaining,
        u.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email,
        u.student_id AS owner_student_id, u.role AS owner_role, u.degree_level AS owner_degree_level,
        u.program AS owner_program,
        a.name AS advisor_name, a.user_id AS advisor_id,
        (SELECT COUNT(*) FROM dbo.DOCUMENT_FILES f WHERE f.doc_id = d.doc_id) AS file_count
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
      ${where}
      ORDER BY ${sortCol} ${sortDirection}
      OFFSET ${offset} ROWS FETCH NEXT ${parsedLimit} ROWS ONLY
    `)

    res.json({
      documents: result.recordset,
      total: countResult.recordset[0].total,
      page: parsedPage,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`getDocuments: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/documents/:id
const getDocument = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()
    await ensureUserProgramColumn(pool)
    await ensureNoExpireColumn(pool)
    await ensureTrashedColumns(pool)
    await ensureDocumentVersioningSchema(pool)

    const doc = await getAccessibleDocument(pool, id, req.user)

    if (!doc)
      return res.status(404).json({ message: 'ไม่พบเอกสาร' })

    const files = await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`
        SELECT f.*, u.name AS uploaded_by_name
        FROM dbo.DOCUMENT_FILES f
        LEFT JOIN dbo.USERS u ON f.uploaded_by = u.user_id
        WHERE f.doc_id = @doc_id
        ORDER BY f.file_type, f.version_no DESC, f.uploaded_at DESC
      `)

    const timeline = await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`
        SELECT t.*, u.name AS actor_name, u.role AS actor_role
        FROM dbo.DOCUMENT_TIMELINE t
        LEFT JOIN dbo.USERS u ON t.actor_id = u.user_id
        WHERE t.doc_id = @doc_id
        ORDER BY t.created_at DESC, t.timeline_id DESC
      `)

    res.json({ ...doc, files: files.recordset, timeline: timeline.recordset })
  } catch (err) {
    logger.error(`getDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/documents
const createDocument = async (req, res) => {
  try {
    const { title, description, doc_type, issue_date, expire_date, project_category, target_user_id, no_expire } = req.body
    const { user_id, role } = req.user
    const isNoExpire = no_expire === '1' || no_expire === true || no_expire === 1

    if (!title || !doc_type || !issue_date || (!expire_date && !isNoExpire))
      return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' })
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: 'กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์' })

    const effectiveUserId = (role === 'admin' && target_user_id) ? parseInt(target_user_id) : user_id

    const pool = await getPool()
    await ensureNoExpireColumn(pool)
    await ensureTrashedColumns(pool)
    await ensureDocTypeColumn(pool)
    await ensureProjectCategoryConstraintDropped(pool)
    await ensureApprovalColumns(pool)

    // ตรวจสอบว่า doc type นี้ต้องการ approval หรือไม่
    const docTypeRow = await pool.request()
      .input('type_code', sql.NVarChar, doc_type)
      .query('SELECT requires_approval FROM dbo.DOC_TYPES WHERE type_code = @type_code AND is_active = 1')
    const requiresApproval = docTypeRow.recordset[0]?.requires_approval ?? false

    // admin อัปโหลดแทน หรือ doc type ไม่ต้องการ approval → อนุมัติอัตโนมัติ
    const initialApproval = (role === 'admin' || !requiresApproval) ? 'approved' : 'pending'

    const docResult = await pool.request()
      .input('user_id',          sql.Int,      effectiveUserId)
      .input('doc_type',         sql.NVarChar, doc_type)
      .input('title',            sql.NVarChar, title)
      .input('description',      sql.NVarChar, description || null)
      .input('issue_date',       sql.Date,     issue_date)
      .input('expire_date',      sql.Date,     isNoExpire ? null : expire_date)
      .input('project_category', sql.NVarChar, project_category || null)
      .input('no_expire',        sql.Bit,      isNoExpire ? 1 : 0)
      .input('approval_status',  sql.NVarChar, initialApproval)
      .query(`
        INSERT INTO dbo.DOCUMENTS
          (user_id, doc_type, title, description, issue_date, expire_date, project_category, status, no_expire, approval_status)
        OUTPUT INSERTED.doc_id
        VALUES (@user_id, @doc_type, @title, @description, @issue_date, @expire_date, @project_category, 'active', @no_expire, @approval_status)
      `)

    const doc_id = docResult.recordset[0].doc_id

    for (const file of req.files) {
      const fileType = file.fieldname === 'main' ? 'main'
        : file.fieldname === 'certificate' ? 'certificate' : 'attachment'

      const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
      await pool.request()
        .input('doc_id',    sql.Int,      doc_id)
        .input('file_type', sql.NVarChar, fileType)
        .input('file_name', sql.NVarChar, fileName)
        .input('file_path', sql.NVarChar, file.path)
        .input('file_size', sql.Int,      file.size)
        .input('mime_type', sql.NVarChar, file.mimetype)
        .input('uploaded_by', sql.Int, user_id)
        .query(`
          INSERT INTO dbo.DOCUMENT_FILES (doc_id, file_type, file_name, file_path, file_size, mime_type, version_no, is_current, uploaded_by)
          VALUES (@doc_id, @file_type, @file_name, @file_path, @file_size, @mime_type, 1, 1, @uploaded_by)
        `)
    }

    await logDocumentTimeline(pool, {
      doc_id,
      actor_id: user_id,
      event_type: 'created',
      title: 'สร้างเอกสาร',
      detail: `สร้างเอกสาร "${title}" พร้อมไฟล์แนบ ${req.files.length} ไฟล์`,
      metadata: { file_count: req.files.length, owner_id: effectiveUserId },
    })

    logger.info(`Document created: ${doc_id} by user ${user_id} for user ${effectiveUserId}`)
    res.status(201).json({ message: 'อัปโหลดเอกสารสำเร็จ', doc_id })
  } catch (err) {
    logger.error(`createDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// DELETE /api/documents/:id — ย้ายไปถังขยะ (admin only)
const deleteDocument = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.user
    const { reason } = req.body
    const pool = await getPool()
    await ensureTrashedColumns(pool)
    await ensureTrashReasonColumn(pool)

    const result = await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`
        SELECT d.*, u.name AS owner_name, u.email AS owner_email
        FROM dbo.DOCUMENTS d
        JOIN dbo.USERS u ON d.user_id = u.user_id
        WHERE d.doc_id = @doc_id AND d.status NOT IN ('deleted','trashed')
      `)

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบเอกสาร หรือเอกสารอยู่ในถังขยะแล้ว' })

    const trashReason = reason?.trim() || 'ลบโดยผู้ดูแลระบบ'

    await pool.request()
      .input('doc_id',       sql.Int,      id)
      .input('user_id',      sql.Int,      user_id)
      .input('trash_reason', sql.NVarChar, trashReason)
      .query(`
        UPDATE dbo.DOCUMENTS
        SET status='trashed', trashed_at=GETDATE(), trashed_by=@user_id,
            trash_reason=@trash_reason, updated_at=GETDATE()
        WHERE doc_id=@doc_id
      `)

    await logDocumentTimeline(pool, {
      doc_id: parseInt(id),
      actor_id: user_id,
      event_type: 'trashed',
      title: 'ย้ายเอกสารไปถังขยะ',
      detail: trashReason,
    })

    logger.info(`Document trashed: ${id} by admin ${user_id} reason="${trashReason}"`)
    res.json({ message: 'ย้ายเอกสารไปถังขยะสำเร็จ' })
  } catch (err) {
    logger.error(`deleteDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/documents/trash — admin only
const getTrashedDocuments = async (req, res) => {
  try {
    const { search, doc_type, degree_level, date_from, date_to, page = 1, limit = 20 } = req.query
    const parsedPage  = Math.max(1, parseInt(page) || 1)
    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit) || 20))
    const offset = (parsedPage - 1) * parsedLimit
    const pool = await getPool()
    await ensureNoExpireColumn(pool)
    await ensureTrashedColumns(pool)
    await ensureTrashReasonColumn(pool)

    const buildWhere = (r) => {
      let where = "WHERE d.status = 'trashed'"
      if (doc_type)     { where += ' AND d.doc_type = @doc_type';    r.input('doc_type', sql.NVarChar, doc_type) }
      if (search)       { where += ' AND (d.title LIKE @search OR u.name LIKE @search OR u.student_id LIKE @search)'; r.input('search', sql.NVarChar, `%${search}%`) }
      if (degree_level) {
        where += degree_level === 'bachelor'
          ? ' AND (u.degree_level = @degree_level OR u.degree_level IS NULL)'
          : ' AND u.degree_level = @degree_level'
        r.input('degree_level', sql.NVarChar, degree_level)
      }
      if (date_from) { where += ' AND CAST(d.trashed_at AS DATE) >= @date_from'; r.input('date_from', sql.Date, date_from) }
      if (date_to)   { where += ' AND CAST(d.trashed_at AS DATE) <= @date_to';   r.input('date_to',   sql.Date, date_to) }
      return where
    }

    const countR = pool.request()
    const where  = buildWhere(countR)
    const countResult = await countR.query(`
      SELECT COUNT(*) AS total
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      ${where}
    `)

    const dataR = pool.request()
    buildWhere(dataR)
    const result = await dataR.query(`
      SELECT
        d.doc_id, d.title, d.doc_type, d.description,
        d.issue_date, d.expire_date, d.no_expire, d.status, d.version,
        d.trashed_at, d.trashed_by, d.trash_reason, d.created_at, d.project_category,
        DATEADD(DAY, 30, d.trashed_at) AS trash_expires_at,
        DATEDIFF(DAY, CAST(GETDATE() AS DATE), CAST(DATEADD(DAY, 30, d.trashed_at) AS DATE)) AS days_until_purge,
        u.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email,
        u.student_id AS owner_student_id, u.degree_level AS owner_degree_level,
        a.name AS advisor_name,
        tb.name AS trashed_by_name,
        (SELECT COUNT(*) FROM dbo.DOCUMENT_FILES f WHERE f.doc_id = d.doc_id) AS file_count
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
      LEFT JOIN dbo.USERS tb ON d.trashed_by = tb.user_id
      ${where}
      ORDER BY d.trashed_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${parsedLimit} ROWS ONLY
    `)

    res.json({
      documents: result.recordset,
      total: countResult.recordset[0].total,
      page: parsedPage,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`getTrashedDocuments: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/documents/trash/bulk-restore — admin only
const bulkRestoreDocuments = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'กรุณาระบุรายการเอกสาร' })

    const pool = await getPool()
    const paramNames = ids.map((_, i) => `@id${i}`).join(',')
    const r = pool.request()
    ids.forEach((id, i) => r.input(`id${i}`, sql.Int, parseInt(id)))

    await r.query(`
      UPDATE dbo.DOCUMENTS
      SET
        status = CASE
          WHEN no_expire = 1 THEN 'active'
          WHEN expire_date < CAST(GETDATE() AS DATE) THEN 'expired'
          WHEN expire_date <= DATEADD(DAY, 90, CAST(GETDATE() AS DATE)) THEN 'expiring_soon'
          ELSE 'active'
        END,
        trashed_at = NULL,
        trashed_by = NULL,
        updated_at = GETDATE()
      WHERE doc_id IN (${paramNames}) AND status = 'trashed'
    `)

    logger.info(`Bulk restored: [${ids.join(',')}]`)
    res.json({ message: `กู้คืนสำเร็จ ${ids.length} รายการ` })
  } catch (err) {
    logger.error(`bulkRestoreDocuments: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// DELETE /api/documents/trash/bulk-permanent — admin only
const bulkPermanentDeleteDocuments = async (req, res) => {
  try {
    const { ids } = req.body
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ message: 'กรุณาระบุรายการเอกสาร' })

    const pool = await getPool()
    const { user_id } = req.user
    const paramNames = ids.map((_, i) => `@id${i}`).join(',')

    const docsR = pool.request()
    ids.forEach((id, i) => docsR.input(`id${i}`, sql.Int, parseInt(id)))
    const docsResult = await docsR.query(`
      SELECT d.doc_id, d.title, d.doc_type, d.trash_reason,
             u.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      WHERE d.doc_id IN (${paramNames}) AND d.status = 'trashed'
    `)

    const adminResult = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query('SELECT name FROM dbo.USERS WHERE user_id = @user_id')
    const adminName = adminResult.recordset[0]?.name || 'ผู้ดูแลระบบ'

    for (const doc of docsResult.recordset) {
      const filesResult = await pool.request()
        .input('doc_id', sql.Int, doc.doc_id)
        .query('SELECT * FROM dbo.DOCUMENT_FILES WHERE doc_id = @doc_id')

      // แจ้งเจ้าของก่อนลบ
      await notifyOwnerPermanentDelete(pool, {
        doc_id:       doc.doc_id,
        owner_id:     doc.owner_id,
        owner_name:   doc.owner_name,
        owner_email:  doc.owner_email,
        doc_type:     doc.doc_type,
        title:        doc.title,
        deletedByName: adminName,
        reason:       doc.trash_reason || 'ลบถาวรโดยผู้ดูแลระบบ (กลุ่ม)',
      })

      for (const f of filesResult.recordset) {
        if (fs.existsSync(f.file_path)) fs.unlinkSync(f.file_path)
      }

      await pool.request()
        .input('doc_id', sql.Int, doc.doc_id)
        .query(`UPDATE dbo.DOCUMENTS SET status='deleted', deleted_at=GETDATE(), updated_at=GETDATE() WHERE doc_id=@doc_id`)

      const firstFile = filesResult.recordset[0]
      await pool.request()
        .input('doc_id',             sql.Int,      doc.doc_id)
        .input('deleted_by',         sql.Int,      user_id)
        .input('reason',             sql.NVarChar, doc.trash_reason || 'bulk_admin')
        .input('original_file_path', sql.NVarChar, firstFile?.file_path || '')
        .input('original_file_name', sql.NVarChar, firstFile?.file_name || '')
        .input('doc_title',          sql.NVarChar, doc.title)
        .input('owner_email',        sql.NVarChar, doc.owner_email)
        .query(`
          INSERT INTO dbo.DELETION_LOGS
            (doc_id, deleted_by, reason, original_file_path, original_file_name, doc_title, owner_email)
          VALUES (@doc_id, @deleted_by, @reason, @original_file_path, @original_file_name, @doc_title, @owner_email)
        `)
    }

    logger.info(`Bulk permanent delete: [${ids.join(',')}] by admin ${user_id}`)
    res.json({ message: `ลบถาวรสำเร็จ ${docsResult.recordset.length} รายการ` })
  } catch (err) {
    logger.error(`bulkPermanentDeleteDocuments: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/documents/:id/restore — admin only
const restoreDocument = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.user
    const pool = await getPool()

    const result = await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`SELECT * FROM dbo.DOCUMENTS WHERE doc_id=@doc_id AND status='trashed'`)

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบเอกสารในถังขยะ' })

    const doc = result.recordset[0]

    // คำนวณ status ที่เหมาะสมหลัง restore
    let restoreStatus = 'active'
    if (!doc.no_expire && doc.expire_date) {
      const expireDate = new Date(doc.expire_date)
      const today = new Date(); today.setHours(0, 0, 0, 0)
      if (expireDate < today) {
        restoreStatus = 'expired'
      } else if (expireDate <= new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)) {
        restoreStatus = 'expiring_soon'
      }
    }

    await pool.request()
      .input('doc_id', sql.Int, id)
      .input('status', sql.NVarChar, restoreStatus)
      .query(`
        UPDATE dbo.DOCUMENTS
        SET status=@status, trashed_at=NULL, trashed_by=NULL, updated_at=GETDATE()
        WHERE doc_id=@doc_id
      `)

    await logDocumentTimeline(pool, {
      doc_id: parseInt(id),
      actor_id: user_id,
      event_type: 'restored',
      title: 'กู้คืนเอกสาร',
      detail: `กู้คืนเอกสารกลับเป็นสถานะ ${restoreStatus}`,
    })

    logger.info(`Document restored: ${id} by admin ${user_id} → ${restoreStatus}`)
    res.json({ message: 'กู้คืนเอกสารสำเร็จ', status: restoreStatus })
  } catch (err) {
    logger.error(`restoreDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// helper: ส่งการแจ้งเตือนและอีเมลให้เจ้าของเมื่อถูกลบถาวร
const notifyOwnerPermanentDelete = async (pool, { doc_id, owner_id, owner_name, owner_email, doc_type, title, deletedByName, reason }) => {
  try {
    const message = `เอกสาร ${doc_type} "${title}" ถูกลบออกจากระบบถาวรแล้ว เหตุผล: ${reason}`
    await pool.request()
      .input('user_id', sql.Int,      owner_id)
      .input('doc_id',  sql.Int,      doc_id)
      .input('type',    sql.NVarChar, 'deleted')
      .input('message', sql.NVarChar, message)
      .input('channel', sql.NVarChar, 'both')
      .query(`
        INSERT INTO dbo.NOTIFICATIONS (user_id, doc_id, type, message, channel)
        VALUES (@user_id, @doc_id, @type, @message, @channel)
      `)

    const template = permanentDeleteTemplate({ name: owner_name, docTitle: title, docType: doc_type, reason, deletedBy: deletedByName })
    await sendMail({ to: owner_email, ...template })
  } catch (err) {
    logger.error(`notifyOwnerPermanentDelete: ${err.message}`)
  }
}

// DELETE /api/documents/:id/permanent — ลบถาวร admin only
const permanentDeleteDocument = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.user
    const pool = await getPool()

    const result = await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`
        SELECT d.*, u.name AS owner_name, u.email AS owner_email,
               u.user_id AS owner_id,
               tb.name AS admin_name
        FROM dbo.DOCUMENTS d
        JOIN dbo.USERS u ON d.user_id = u.user_id
        LEFT JOIN dbo.USERS tb ON d.trashed_by = tb.user_id
        WHERE d.doc_id = @doc_id AND d.status = 'trashed'
      `)

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบเอกสารในถังขยะ' })

    const doc = result.recordset[0]
    const deleteReason = doc.trash_reason || 'ลบถาวรโดยผู้ดูแลระบบ'

    const files = await pool.request()
      .input('doc_id', sql.Int, id)
      .query('SELECT * FROM dbo.DOCUMENT_FILES WHERE doc_id = @doc_id')

    // แจ้งเจ้าของก่อนลบ (doc ยังอยู่ใน DB ณ จุดนี้)
    await notifyOwnerPermanentDelete(pool, {
      doc_id:       doc.doc_id,
      owner_id:     doc.owner_id,
      owner_name:   doc.owner_name,
      owner_email:  doc.owner_email,
      doc_type:     doc.doc_type,
      title:        doc.title,
      deletedByName: doc.admin_name || 'ผู้ดูแลระบบ',
      reason:       deleteReason,
    })

    for (const f of files.recordset) {
      if (fs.existsSync(f.file_path)) fs.unlinkSync(f.file_path)
    }

    await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`UPDATE dbo.DOCUMENTS SET status='deleted', deleted_at=GETDATE(), updated_at=GETDATE() WHERE doc_id=@doc_id`)

    const firstFile = files.recordset[0]
    await pool.request()
      .input('doc_id',             sql.Int,      id)
      .input('deleted_by',         sql.Int,      user_id)
      .input('reason',             sql.NVarChar, deleteReason)
      .input('original_file_path', sql.NVarChar, firstFile?.file_path || '')
      .input('original_file_name', sql.NVarChar, firstFile?.file_name || '')
      .input('doc_title',          sql.NVarChar, doc.title)
      .input('owner_email',        sql.NVarChar, doc.owner_email)
      .query(`
        INSERT INTO dbo.DELETION_LOGS
          (doc_id, deleted_by, reason, original_file_path, original_file_name, doc_title, owner_email)
        VALUES (@doc_id, @deleted_by, @reason, @original_file_path, @original_file_name, @doc_title, @owner_email)
      `)

    logger.info(`Document permanently deleted: ${id} by admin ${user_id}`)
    res.json({ message: 'ลบเอกสารถาวรสำเร็จ' })
  } catch (err) {
    logger.error(`permanentDeleteDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/documents/:id/files/version — เพิ่มไฟล์เวอร์ชันใหม่ให้เอกสารเดิม
const uploadFileVersion = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.user
    const { file_type = 'attachment', note } = req.body
    const allowedTypes = ['main', 'certificate', 'attachment']

    if (!allowedTypes.includes(file_type))
      return res.status(400).json({ message: 'ประเภทไฟล์ไม่ถูกต้อง' })
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ message: 'กรุณาแนบไฟล์อย่างน้อย 1 ไฟล์' })

    const pool = await getPool()
    await ensureNoExpireColumn(pool)
    await ensureTrashedColumns(pool)
    await ensureDocumentVersioningSchema(pool)

    const doc = await getAccessibleDocument(pool, id, req.user)
    if (!doc) return res.status(404).json({ message: 'ไม่พบเอกสาร' })

    const versionResult = await pool.request()
      .input('doc_id', sql.Int, id)
      .input('file_type', sql.NVarChar, file_type)
      .query(`
        SELECT ISNULL(MAX(version_no), 0) + 1 AS next_version
        FROM dbo.DOCUMENT_FILES
        WHERE doc_id = @doc_id AND file_type = @file_type
      `)
    const nextVersion = versionResult.recordset[0]?.next_version || 1

    await pool.request()
      .input('doc_id', sql.Int, id)
      .input('file_type', sql.NVarChar, file_type)
      .query(`
        UPDATE dbo.DOCUMENT_FILES
        SET is_current = 0, replaced_at = GETDATE()
        WHERE doc_id = @doc_id AND file_type = @file_type AND is_current = 1
      `)

    for (const file of req.files) {
      const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
      await pool.request()
        .input('doc_id', sql.Int, id)
        .input('file_type', sql.NVarChar, file_type)
        .input('file_name', sql.NVarChar, fileName)
        .input('file_path', sql.NVarChar, file.path)
        .input('file_size', sql.Int, file.size)
        .input('mime_type', sql.NVarChar, file.mimetype)
        .input('version_no', sql.Int, nextVersion)
        .input('uploaded_by', sql.Int, user_id)
        .query(`
          INSERT INTO dbo.DOCUMENT_FILES
            (doc_id, file_type, file_name, file_path, file_size, mime_type, version_no, is_current, uploaded_by)
          VALUES
            (@doc_id, @file_type, @file_name, @file_path, @file_size, @mime_type, @version_no, 1, @uploaded_by)
        `)
    }

    await pool.request()
      .input('doc_id', sql.Int, id)
      .query('UPDATE dbo.DOCUMENTS SET updated_at = GETDATE() WHERE doc_id = @doc_id')

    const typeLabel = file_type === 'main' ? 'เอกสารหลัก'
      : file_type === 'certificate' ? 'บันทึกข้อความรับรอง' : 'ไฟล์แนบ'

    await logDocumentTimeline(pool, {
      doc_id: parseInt(id),
      actor_id: user_id,
      event_type: 'file_version_uploaded',
      title: `เพิ่มเวอร์ชันไฟล์ ${typeLabel}`,
      detail: note || `อัปโหลดเวอร์ชัน ${nextVersion} จำนวน ${req.files.length} ไฟล์`,
      metadata: { file_type, version_no: nextVersion, file_count: req.files.length },
    })

    logger.info(`Document file version uploaded: doc=${id} type=${file_type} v=${nextVersion} by user ${user_id}`)
    res.status(201).json({ message: 'เพิ่มเวอร์ชันไฟล์สำเร็จ', version_no: nextVersion })
  } catch (err) {
    logger.error(`uploadFileVersion: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/documents/:id/timeline
const getDocumentTimeline = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()
    await ensureNoExpireColumn(pool)
    await ensureTrashedColumns(pool)
    await ensureDocumentVersioningSchema(pool)

    const doc = await getAccessibleDocument(pool, id, req.user)
    if (!doc) return res.status(404).json({ message: 'ไม่พบเอกสาร' })

    const result = await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`
        SELECT t.*, u.name AS actor_name, u.role AS actor_role
        FROM dbo.DOCUMENT_TIMELINE t
        LEFT JOIN dbo.USERS u ON t.actor_id = u.user_id
        WHERE t.doc_id = @doc_id
        ORDER BY t.created_at DESC, t.timeline_id DESC
      `)

    res.json(result.recordset)
  } catch (err) {
    logger.error(`getDocumentTimeline: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/documents/:id/files/:fileId/download
const downloadFile = async (req, res) => {
  try {
    const { id, fileId } = req.params
    const pool = await getPool()
    await ensureNoExpireColumn(pool)
    await ensureTrashedColumns(pool)
    await ensureDocumentVersioningSchema(pool)

    const doc = await getAccessibleDocument(pool, id, req.user)
    if (!doc) return res.status(404).json({ message: 'ไม่พบเอกสาร' })

    const result = await pool.request()
      .input('file_id', sql.Int, fileId)
      .input('doc_id',  sql.Int, id)
      .query('SELECT * FROM dbo.DOCUMENT_FILES WHERE file_id=@file_id AND doc_id=@doc_id')

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบไฟล์' })

    const file = result.recordset[0]
    if (!fs.existsSync(file.file_path))
      return res.status(404).json({ message: 'ไม่พบไฟล์บน server' })

    res.download(file.file_path, file.file_name)
  } catch (err) {
    logger.error(`downloadFile: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/documents/:id/files/:fileId/preview
const previewFile = async (req, res) => {
  try {
    const { id, fileId } = req.params
    const pool = await getPool()
    await ensureNoExpireColumn(pool)
    await ensureTrashedColumns(pool)
    await ensureDocumentVersioningSchema(pool)

    const doc = await getAccessibleDocument(pool, id, req.user)
    if (!doc) return res.status(404).json({ message: 'ไม่พบเอกสาร' })

    const result = await pool.request()
      .input('file_id', sql.Int, fileId)
      .input('doc_id',  sql.Int, id)
      .query('SELECT * FROM dbo.DOCUMENT_FILES WHERE file_id=@file_id AND doc_id=@doc_id')

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบไฟล์' })

    const file = result.recordset[0]
    if (!fs.existsSync(file.file_path))
      return res.status(404).json({ message: 'ไม่พบไฟล์บน server' })

    res.setHeader('Content-Type', file.mime_type)
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file.file_name)}"`)
    fs.createReadStream(file.file_path).pipe(res)
  } catch (err) {
    logger.error(`previewFile: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/documents/summary — admin only
const getDocumentSummary = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureNoExpireColumn(pool)
    await ensureTrashedColumns(pool)

    const result = await pool.request().query(`
      SELECT
        u.role AS owner_role,
        u.degree_level,
        COUNT(*) AS total,
        SUM(CASE WHEN d.no_expire = 1 THEN 1 ELSE 0 END) AS no_expire_count,
        SUM(CASE WHEN d.no_expire = 0 AND DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) < 0 THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN d.no_expire = 0 AND DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) BETWEEN 0 AND 90 THEN 1 ELSE 0 END) AS expiring_soon,
        SUM(CASE WHEN ver.doc_id IS NOT NULL THEN 1 ELSE 0 END) AS updated_count
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      LEFT JOIN (
        SELECT DISTINCT doc_id FROM dbo.DOCUMENT_FILES WHERE version_no > 1
      ) ver ON ver.doc_id = d.doc_id
      WHERE d.status NOT IN ('deleted','trashed')
      GROUP BY u.role, u.degree_level
    `)

    const init = () => ({ total: 0, expired: 0, expiring_soon: 0, no_expire_count: 0, updated_count: 0 })
    const groups = {
      all: init(), bachelor: init(), master: init(),
      doctoral: init(), advisor: init(), staff: init(),
    }

    const addTo = (key, row) => {
      groups[key].total           += parseInt(row.total)           || 0
      groups[key].expired         += parseInt(row.expired)         || 0
      groups[key].expiring_soon   += parseInt(row.expiring_soon)   || 0
      groups[key].no_expire_count += parseInt(row.no_expire_count) || 0
      groups[key].updated_count   += parseInt(row.updated_count)   || 0
    }

    for (const row of result.recordset) {
      addTo('all', row)
      if (row.owner_role === 'student') {
        const lvl = row.degree_level || 'bachelor'
        addTo(groups[lvl] ? lvl : 'bachelor', row)
      } else if (row.owner_role === 'advisor') {
        addTo('advisor', row)
      } else if (row.owner_role === 'staff') {
        addTo('staff', row)
      }
    }

    res.json(groups)
  } catch (err) {
    logger.error(`getDocumentSummary: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/documents/my-trash — student/staff เห็นขยะของตัวเอง
const getMyTrashedDocuments = async (req, res) => {
  try {
    const { user_id } = req.user
    const { search, doc_type, page = 1, limit = 20 } = req.query
    const parsedPage  = Math.max(1, parseInt(page) || 1)
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 20))
    const offset = (parsedPage - 1) * parsedLimit
    const pool = await getPool()
    await ensureTrashedColumns(pool)
    await ensureTrashReasonColumn(pool)

    const filterParams = []
    const addParam = (name, type, value) => filterParams.push({ name, type, value })
    const applyParams = (req) => { filterParams.forEach(({ name, type, value }) => req.input(name, type, value)); return req }

    addParam('user_id', sql.Int, user_id)
    let where = "WHERE d.status = 'trashed' AND d.user_id = @user_id"
    if (doc_type) { where += ' AND d.doc_type = @doc_type'; addParam('doc_type', sql.NVarChar, doc_type) }
    if (search)   { where += ' AND d.title LIKE @search';   addParam('search',   sql.NVarChar, `%${search}%`) }

    const countResult = await applyParams(pool.request()).query(`
      SELECT COUNT(*) AS total FROM dbo.DOCUMENTS d ${where}
    `)

    const result = await applyParams(pool.request()).query(`
      SELECT
        d.doc_id, d.title, d.doc_type, d.status,
        d.issue_date, d.expire_date, d.no_expire,
        d.trashed_at, d.trash_reason,
        DATEADD(DAY, 30, d.trashed_at) AS trash_expires_at,
        DATEDIFF(DAY, GETDATE(), DATEADD(DAY, 30, d.trashed_at)) AS days_until_purge,
        (SELECT COUNT(*) FROM dbo.DOCUMENT_FILES f WHERE f.doc_id = d.doc_id) AS file_count
      FROM dbo.DOCUMENTS d
      ${where}
      ORDER BY d.trashed_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${parsedLimit} ROWS ONLY
    `)

    res.json({
      documents: result.recordset,
      total: countResult.recordset[0].total,
      page: parsedPage,
      limit: parsedLimit,
    })
  } catch (err) {
    logger.error(`getMyTrashedDocuments: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/documents/my-trash/:id/restore — student/staff กู้เอกสารของตัวเอง
const selfRestoreDocument = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.user
    const pool = await getPool()
    await ensureTrashedColumns(pool)
    await ensureNoExpireColumn(pool)

    const result = await pool.request()
      .input('doc_id',  sql.Int, id)
      .input('user_id', sql.Int, user_id)
      .query(`
        SELECT doc_id, expire_date, no_expire
        FROM dbo.DOCUMENTS
        WHERE doc_id = @doc_id AND user_id = @user_id AND status = 'trashed'
      `)

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบเอกสารในถังขยะของคุณ' })

    const doc = result.recordset[0]
    let newStatus = 'active'
    if (!doc.no_expire && doc.expire_date) {
      const daysLeft = Math.ceil((new Date(doc.expire_date) - new Date()) / 86400000)
      if (daysLeft < 0) newStatus = 'expired'
      else if (daysLeft <= 90) newStatus = 'expiring_soon'
    }

    await pool.request()
      .input('doc_id',  sql.Int,      id)
      .input('status',  sql.NVarChar, newStatus)
      .query(`
        UPDATE dbo.DOCUMENTS
        SET status=@status, trashed_at=NULL, trashed_by=NULL, trash_reason=NULL, updated_at=GETDATE()
        WHERE doc_id=@doc_id
      `)

    await logDocumentTimeline(pool, {
      doc_id: parseInt(id),
      actor_id: user_id,
      event_type: 'restored',
      title: 'กู้คืนเอกสารโดยเจ้าของ',
      detail: 'เจ้าของเอกสารกู้คืนเอกสารจากถังขยะ',
    })

    res.json({ message: 'กู้คืนเอกสารสำเร็จ' })
  } catch (err) {
    logger.error(`selfRestoreDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// helper: check if user can approve/reject a document (admin or assigned staff approver)
const canApproveDoc = async (pool, docId, user) => {
  if (user.role === 'admin') return true
  if (user.role !== 'staff') return false
  const r = await pool.request()
    .input('doc_id',  sql.Int, docId)
    .input('user_id', sql.Int, user.user_id)
    .query(`
      SELECT 1
      FROM dbo.DOCUMENTS d
      JOIN dbo.DOC_TYPES dt ON d.doc_type = dt.type_code
      WHERE d.doc_id = @doc_id
        AND dt.approver_user_id = @user_id
        AND dt.requires_approval = 1
        AND dt.is_active = 1
    `)
  return r.recordset.length > 0
}

// PUT /api/documents/:id/approve — admin หรือ staff approver
const approveDocument = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.user
    const { note } = req.body
    const pool = await getPool()
    await ensureApprovalColumns(pool)
    await ensureNotificationsTypeConstraint(pool)

    if (!(await canApproveDoc(pool, id, req.user)))
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์อนุมัติเอกสารประเภทนี้' })

    const result = await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`
        SELECT d.doc_id, d.title, d.user_id, u.email AS owner_email, u.name AS owner_name
        FROM dbo.DOCUMENTS d
        JOIN dbo.USERS u ON d.user_id = u.user_id
        WHERE d.doc_id = @doc_id AND d.status NOT IN ('deleted','trashed')
      `)

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบเอกสาร' })

    const doc = result.recordset[0]

    await pool.request()
      .input('doc_id',       sql.Int,      id)
      .input('approval_by',  sql.Int,      user_id)
      .input('approval_note',sql.NVarChar, note?.trim() || null)
      .query(`
        UPDATE dbo.DOCUMENTS
        SET approval_status='approved', approval_by=@approval_by,
            approval_at=GETDATE(), approval_note=@approval_note, updated_at=GETDATE()
        WHERE doc_id=@doc_id
      `)

    await logDocumentTimeline(pool, {
      doc_id: parseInt(id),
      actor_id: user_id,
      event_type: 'approved',
      title: 'อนุมัติเอกสาร',
      detail: note?.trim() || 'เอกสารได้รับการอนุมัติแล้ว',
    })

    // แจ้งเจ้าของ
    await pool.request()
      .input('user_id',  sql.Int,      doc.user_id)
      .input('doc_id',   sql.Int,      parseInt(id))
      .input('type',     sql.NVarChar, 'approved')
      .input('message',  sql.NVarChar, `เอกสาร "${doc.title}" ได้รับการอนุมัติแล้ว${note?.trim() ? ': ' + note.trim() : ''}`)
      .query(`
        INSERT INTO dbo.NOTIFICATIONS (user_id, doc_id, type, message, channel)
        VALUES (@user_id, @doc_id, @type, @message, 'in_app')
      `)

    logger.info(`Document approved: ${id} by admin ${user_id}`)
    res.json({ message: 'อนุมัติเอกสารสำเร็จ' })
  } catch (err) {
    logger.error(`approveDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/documents/:id/reject — admin หรือ staff approver
const rejectDocument = async (req, res) => {
  try {
    const { id } = req.params
    const { user_id } = req.user
    const { note } = req.body
    const pool = await getPool()
    await ensureApprovalColumns(pool)
    await ensureNotificationsTypeConstraint(pool)

    if (!(await canApproveDoc(pool, id, req.user)))
      return res.status(403).json({ message: 'คุณไม่มีสิทธิ์ปฏิเสธเอกสารประเภทนี้' })

    const result = await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`
        SELECT d.doc_id, d.title, d.user_id, u.email AS owner_email
        FROM dbo.DOCUMENTS d
        JOIN dbo.USERS u ON d.user_id = u.user_id
        WHERE d.doc_id = @doc_id AND d.status NOT IN ('deleted','trashed')
      `)

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบเอกสาร' })

    const doc = result.recordset[0]

    await pool.request()
      .input('doc_id',       sql.Int,      id)
      .input('approval_by',  sql.Int,      user_id)
      .input('approval_note',sql.NVarChar, note?.trim() || null)
      .query(`
        UPDATE dbo.DOCUMENTS
        SET approval_status='rejected', approval_by=@approval_by,
            approval_at=GETDATE(), approval_note=@approval_note, updated_at=GETDATE()
        WHERE doc_id=@doc_id
      `)

    await logDocumentTimeline(pool, {
      doc_id: parseInt(id),
      actor_id: user_id,
      event_type: 'rejected',
      title: 'ปฏิเสธเอกสาร',
      detail: note?.trim() || 'เอกสารถูกปฏิเสธ',
    })

    await pool.request()
      .input('user_id',  sql.Int,      doc.user_id)
      .input('doc_id',   sql.Int,      parseInt(id))
      .input('type',     sql.NVarChar, 'rejected')
      .input('message',  sql.NVarChar, `เอกสาร "${doc.title}" ถูกปฏิเสธ${note?.trim() ? ': ' + note.trim() : ' กรุณาติดต่อผู้ดูแลระบบ'}`)
      .query(`
        INSERT INTO dbo.NOTIFICATIONS (user_id, doc_id, type, message, channel)
        VALUES (@user_id, @doc_id, @type, @message, 'in_app')
      `)

    logger.info(`Document rejected: ${id} by admin ${user_id}`)
    res.json({ message: 'ปฏิเสธเอกสารสำเร็จ' })
  } catch (err) {
    logger.error(`rejectDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = {
  getDocuments, getDocument, createDocument, deleteDocument,
  getTrashedDocuments, restoreDocument, permanentDeleteDocument,
  bulkRestoreDocuments, bulkPermanentDeleteDocuments,
  uploadFileVersion, getDocumentTimeline,
  downloadFile, previewFile, getDocumentSummary,
  getMyTrashedDocuments, selfRestoreDocument,
  approveDocument, rejectDocument,
}
