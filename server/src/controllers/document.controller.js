const path = require('path')
const fs   = require('fs')
const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')
const { sendMail, permanentDeleteTemplate } = require('../utils/mailer')

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

const ensureTrashReasonColumn = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID('dbo.DOCUMENTS') AND name='trash_reason')
      ALTER TABLE dbo.DOCUMENTS ADD trash_reason NVARCHAR(500) NULL
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
    const {
      search, doc_type, status,
      page = 1, limit = 15,
      degree_level, advisor_id, owner_role, department,
      sort_by, sort_dir,
    } = req.query
    const { user_id, role } = req.user
    const parsedPage  = Math.max(1, parseInt(page)  || 1)
    const parsedLimit = Math.min(200, Math.max(1, parseInt(limit) || 15))
    const offset = (parsedPage - 1) * parsedLimit

    const pool = await getPool()

    // Collect params so we can reuse across count + data requests
    const filterParams = []
    const addParam = (name, type, value) => filterParams.push({ name, type, value })
    const applyParams = (req) => { filterParams.forEach(({ name, type, value }) => req.input(name, type, value)); return req }

    addParam('user_id', sql.Int, user_id)
    let where = "WHERE d.status NOT IN ('deleted','trashed')"

    if (role === 'student' || role === 'staff') {
      where += ' AND d.user_id = @user_id'
    } else if (role === 'advisor') {
      where += ' AND u.advisor_id = @user_id'
    }

    if (doc_type)     { where += ' AND d.doc_type = @doc_type';         addParam('doc_type',           sql.NVarChar, doc_type) }
    if (status)       { where += ' AND d.status = @status';             addParam('status',             sql.NVarChar, status) }
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
    if (department && (role === 'admin' || role === 'advisor')) {
      where += ' AND u.department = @department'
      addParam('department', sql.NVarChar, department)
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
        CASE WHEN d.no_expire = 1 THEN NULL ELSE DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) END AS days_remaining,
        u.user_id AS owner_id, u.name AS owner_name, u.email AS owner_email,
        u.student_id AS owner_student_id, u.role AS owner_role, u.degree_level AS owner_degree_level,
        u.department AS owner_department,
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

      const fileName = Buffer.from(file.originalname, 'latin1').toString('utf8')
      await pool.request()
        .input('doc_id',    sql.Int,      doc_id)
        .input('file_type', sql.NVarChar, fileType)
        .input('file_name', sql.NVarChar, fileName)
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

// GET /api/documents/summary — admin only
const getDocumentSummary = async (req, res) => {
  try {
    const pool = await getPool()
    const result = await pool.request().query(`
      SELECT
        u.role AS owner_role,
        u.degree_level,
        COUNT(*) AS total,
        SUM(CASE WHEN d.no_expire = 1 THEN 1 ELSE 0 END) AS no_expire_count,
        SUM(CASE WHEN d.no_expire = 0 AND DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) < 0 THEN 1 ELSE 0 END) AS expired,
        SUM(CASE WHEN d.no_expire = 0 AND DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) BETWEEN 0 AND 90 THEN 1 ELSE 0 END) AS expiring_soon
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      WHERE d.status NOT IN ('deleted','trashed')
      GROUP BY u.role, u.degree_level
    `)

    const init = () => ({ total: 0, expired: 0, expiring_soon: 0, no_expire_count: 0 })
    const groups = {
      all: init(), bachelor: init(), master: init(),
      doctoral: init(), advisor: init(), staff: init(),
    }

    const addTo = (key, row) => {
      groups[key].total          += parseInt(row.total)          || 0
      groups[key].expired        += parseInt(row.expired)        || 0
      groups[key].expiring_soon  += parseInt(row.expiring_soon)  || 0
      groups[key].no_expire_count += parseInt(row.no_expire_count) || 0
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

module.exports = {
  getDocuments, getDocument, createDocument, deleteDocument,
  getTrashedDocuments, restoreDocument, permanentDeleteDocument,
  bulkRestoreDocuments, bulkPermanentDeleteDocuments,
  downloadFile, previewFile, getDocumentSummary,
}
