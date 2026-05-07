const path = require('path')
const fs   = require('fs')
const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

const ensureNoExpireColumn = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (
      SELECT 1 FROM sys.columns
      WHERE object_id = OBJECT_ID('dbo.DOCUMENTS') AND name = 'no_expire'
    )
    ALTER TABLE dbo.DOCUMENTS ADD no_expire BIT NOT NULL DEFAULT 0
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

// GET /api/documents
const getDocuments = async (req, res) => {
  try {
    const { search, doc_type, status, page = 1, limit = 20 } = req.query
    const { user_id, role } = req.user
    const offset = (page - 1) * limit
    const pool = await getPool()
    const r = pool.request()

    let where = "WHERE d.status NOT IN ('deleted','trashed')"
    r.input('user_id', sql.Int, user_id)

    if (role === 'student') {
      where += ' AND d.user_id = @user_id'
    } else if (role === 'advisor') {
      where += ' AND u.advisor_id = @user_id'
    }

    if (doc_type) { where += ' AND d.doc_type = @doc_type'; r.input('doc_type', sql.NVarChar, doc_type) }
    if (status)   { where += ' AND d.status = @status';   r.input('status',   sql.NVarChar, status)   }
    if (search)   { where += ' AND (d.title LIKE @search OR u.name LIKE @search)'; r.input('search', sql.NVarChar, `%${search}%`) }

    const result = await r.query(`
      SELECT
        d.doc_id, d.title, d.doc_type, d.description,
        d.issue_date, d.expire_date, d.no_expire, d.status, d.version,
        d.created_at, d.project_category,
        CASE WHEN d.no_expire = 1 THEN NULL ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) END AS days_remaining,
        u.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email,
        u.student_id AS owner_student_id,
        a.name AS advisor_name,
        (SELECT COUNT(*) FROM dbo.DOCUMENT_FILES f WHERE f.doc_id = d.doc_id) AS file_count
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
      ${where}
      ORDER BY d.created_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `)

    res.json({ documents: result.recordset, total: result.recordset.length, page: parseInt(page) })
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

    const result = await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`
        SELECT d.*, u.name AS owner_name, u.email AS owner_email,
               a.name AS advisor_name,
               CASE WHEN d.no_expire = 1 THEN NULL ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) END AS days_remaining
        FROM dbo.DOCUMENTS d
        JOIN dbo.USERS u ON d.user_id = u.user_id
        LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
        WHERE d.doc_id = @doc_id AND d.status NOT IN ('deleted','trashed')
      `)

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบเอกสาร' })

    const files = await pool.request()
      .input('doc_id', sql.Int, id)
      .query('SELECT * FROM dbo.DOCUMENT_FILES WHERE doc_id = @doc_id')

    res.json({ ...result.recordset[0], files: files.recordset })
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

    const docResult = await pool.request()
      .input('user_id',          sql.Int,      effectiveUserId)
      .input('doc_type',         sql.NVarChar, doc_type)
      .input('title',            sql.NVarChar, title)
      .input('description',      sql.NVarChar, description || null)
      .input('issue_date',       sql.Date,     issue_date)
      .input('expire_date',      sql.Date,     isNoExpire ? null : expire_date)
      .input('project_category', sql.NVarChar, project_category || null)
      .input('no_expire',        sql.Bit,      isNoExpire ? 1 : 0)
      .query(`
        INSERT INTO dbo.DOCUMENTS
          (user_id, doc_type, title, description, issue_date, expire_date, project_category, status, no_expire)
        OUTPUT INSERTED.doc_id
        VALUES (@user_id, @doc_type, @title, @description, @issue_date, @expire_date, @project_category, 'active', @no_expire)
      `)

    const doc_id = docResult.recordset[0].doc_id

    for (const file of req.files) {
      const fileType = file.fieldname === 'main' ? 'main'
        : file.fieldname === 'certificate' ? 'certificate' : 'attachment'

      await pool.request()
        .input('doc_id',    sql.Int,      doc_id)
        .input('file_type', sql.NVarChar, fileType)
        .input('file_name', sql.NVarChar, file.originalname)
        .input('file_path', sql.NVarChar, file.path)
        .input('file_size', sql.Int,      file.size)
        .input('mime_type', sql.NVarChar, file.mimetype)
        .query(`
          INSERT INTO dbo.DOCUMENT_FILES (doc_id, file_type, file_name, file_path, file_size, mime_type)
          VALUES (@doc_id, @file_type, @file_name, @file_path, @file_size, @mime_type)
        `)
    }

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
    const pool = await getPool()
    await ensureTrashedColumns(pool)

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

    await pool.request()
      .input('doc_id',  sql.Int, id)
      .input('user_id', sql.Int, user_id)
      .query(`
        UPDATE dbo.DOCUMENTS
        SET status='trashed', trashed_at=GETDATE(), trashed_by=@user_id, updated_at=GETDATE()
        WHERE doc_id=@doc_id
      `)

    logger.info(`Document trashed: ${id} by admin ${user_id}`)
    res.json({ message: 'ย้ายเอกสารไปถังขยะสำเร็จ' })
  } catch (err) {
    logger.error(`deleteDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/documents/trash — admin only
const getTrashedDocuments = async (req, res) => {
  try {
    const { search, doc_type, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    const pool = await getPool()
    await ensureTrashedColumns(pool)

    const r = pool.request()
    let where = "WHERE d.status = 'trashed'"
    if (doc_type) { where += ' AND d.doc_type = @doc_type'; r.input('doc_type', sql.NVarChar, doc_type) }
    if (search)   { where += ' AND (d.title LIKE @search OR u.name LIKE @search)'; r.input('search', sql.NVarChar, `%${search}%`) }

    const result = await r.query(`
      SELECT
        d.doc_id, d.title, d.doc_type, d.description,
        d.issue_date, d.expire_date, d.no_expire, d.status, d.version,
        d.trashed_at, d.trashed_by, d.created_at, d.project_category,
        u.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email,
        u.student_id AS owner_student_id,
        a.name AS advisor_name,
        tb.name AS trashed_by_name,
        (SELECT COUNT(*) FROM dbo.DOCUMENT_FILES f WHERE f.doc_id = d.doc_id) AS file_count
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
      LEFT JOIN dbo.USERS tb ON d.trashed_by = tb.user_id
      ${where}
      ORDER BY d.trashed_at DESC
      OFFSET ${offset} ROWS FETCH NEXT ${limit} ROWS ONLY
    `)

    res.json({ documents: result.recordset, total: result.recordset.length, page: parseInt(page) })
  } catch (err) {
    logger.error(`getTrashedDocuments: ${err.message}`)
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

    logger.info(`Document restored: ${id} by admin ${user_id} → ${restoreStatus}`)
    res.json({ message: 'กู้คืนเอกสารสำเร็จ', status: restoreStatus })
  } catch (err) {
    logger.error(`restoreDocument: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
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
        SELECT d.*, u.name AS owner_name, u.email AS owner_email
        FROM dbo.DOCUMENTS d
        JOIN dbo.USERS u ON d.user_id = u.user_id
        WHERE d.doc_id = @doc_id AND d.status = 'trashed'
      `)

    if (result.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบเอกสารในถังขยะ' })

    const doc = result.recordset[0]

    const files = await pool.request()
      .input('doc_id', sql.Int, id)
      .query('SELECT * FROM dbo.DOCUMENT_FILES WHERE doc_id = @doc_id')

    // ลบไฟล์จริงออกจาก server
    for (const f of files.recordset) {
      if (fs.existsSync(f.file_path)) fs.unlinkSync(f.file_path)
    }

    await pool.request()
      .input('doc_id', sql.Int, id)
      .query(`
        UPDATE dbo.DOCUMENTS
        SET status='deleted', deleted_at=GETDATE(), updated_at=GETDATE()
        WHERE doc_id=@doc_id
      `)

    const firstFile = files.recordset[0]
    await pool.request()
      .input('doc_id',             sql.Int,      id)
      .input('deleted_by',         sql.Int,      user_id)
      .input('reason',             sql.NVarChar, 'manual_admin')
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

// GET /api/documents/:id/files/:fileId/download
const downloadFile = async (req, res) => {
  try {
    const { id, fileId } = req.params
    const pool = await getPool()

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

module.exports = {
  getDocuments, getDocument, createDocument, deleteDocument,
  getTrashedDocuments, restoreDocument, permanentDeleteDocument,
  downloadFile, previewFile,
}
