const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

const ensureCommentsTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID('dbo.DOCUMENT_COMMENTS') AND type='U')
    BEGIN
      CREATE TABLE dbo.DOCUMENT_COMMENTS (
        comment_id   INT            IDENTITY(1,1) PRIMARY KEY,
        doc_id       INT            NOT NULL,
        user_id      INT            NOT NULL,
        content      NVARCHAR(2000) NOT NULL,
        created_at   DATETIME       NOT NULL DEFAULT GETDATE(),
        updated_at   DATETIME       NOT NULL DEFAULT GETDATE(),
        CONSTRAINT FK_DOCCOMMENTS_doc  FOREIGN KEY (doc_id)  REFERENCES dbo.DOCUMENTS(doc_id) ON DELETE CASCADE,
        CONSTRAINT FK_DOCCOMMENTS_user FOREIGN KEY (user_id) REFERENCES dbo.USERS(user_id)
      );
      CREATE INDEX IDX_DOCCOMMENTS_doc  ON dbo.DOCUMENT_COMMENTS(doc_id);
      CREATE INDEX IDX_DOCCOMMENTS_user ON dbo.DOCUMENT_COMMENTS(user_id);
    END
  `)
}

// ตรวจสิทธิ์เข้าถึงเอกสาร (เจ้าของ, อาจารย์ที่ปรึกษา, admin)
const canAccessDocument = async (pool, docId, user) => {
  const { user_id, role } = user
  if (role === 'admin') return true

  const result = await pool.request()
    .input('doc_id',  sql.Int, docId)
    .input('user_id', sql.Int, user_id)
    .query(`
      SELECT d.doc_id
      FROM dbo.DOCUMENTS d
      JOIN dbo.USERS u ON d.user_id = u.user_id
      WHERE d.doc_id = @doc_id
        AND d.status NOT IN ('deleted','trashed')
        AND (
          d.user_id = @user_id
          OR u.advisor_id = @user_id
        )
    `)
  return result.recordset.length > 0
}

// GET /api/documents/:docId/comments
const getComments = async (req, res) => {
  try {
    const { docId } = req.params
    const pool = await getPool()
    await ensureCommentsTable(pool)

    if (!(await canAccessDocument(pool, parseInt(docId), req.user)))
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงเอกสารนี้' })

    const result = await pool.request()
      .input('doc_id', sql.Int, docId)
      .query(`
        SELECT
          c.comment_id, c.doc_id, c.content, c.created_at, c.updated_at,
          u.user_id, u.name AS user_name, u.role AS user_role,
          u.profile_image_url
        FROM dbo.DOCUMENT_COMMENTS c
        JOIN dbo.USERS u ON c.user_id = u.user_id
        WHERE c.doc_id = @doc_id
        ORDER BY c.created_at ASC
      `)

    res.json({ comments: result.recordset })
  } catch (err) {
    logger.error(`getComments: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/documents/:docId/comments
const createComment = async (req, res) => {
  try {
    const { docId } = req.params
    const { user_id } = req.user
    const { content } = req.body

    if (!content?.trim())
      return res.status(400).json({ message: 'กรุณากรอกข้อความ' })
    if (content.trim().length > 2000)
      return res.status(400).json({ message: 'ข้อความยาวเกินไป (สูงสุด 2000 ตัวอักษร)' })

    const pool = await getPool()
    await ensureCommentsTable(pool)

    if (!(await canAccessDocument(pool, parseInt(docId), req.user)))
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึงเอกสารนี้' })

    const result = await pool.request()
      .input('doc_id',  sql.Int,      docId)
      .input('user_id', sql.Int,      user_id)
      .input('content', sql.NVarChar, content.trim())
      .query(`
        INSERT INTO dbo.DOCUMENT_COMMENTS (doc_id, user_id, content)
        OUTPUT INSERTED.comment_id, INSERTED.created_at
        VALUES (@doc_id, @user_id, @content)
      `)

    const { comment_id, created_at } = result.recordset[0]

    const userResult = await pool.request()
      .input('user_id', sql.Int, user_id)
      .query('SELECT name, role, profile_image_url FROM dbo.USERS WHERE user_id=@user_id')

    const u = userResult.recordset[0]

    res.status(201).json({
      comment: {
        comment_id,
        doc_id: parseInt(docId),
        content: content.trim(),
        created_at,
        updated_at: created_at,
        user_id,
        user_name: u.name,
        user_role: u.role,
        profile_image_url: u.profile_image_url,
      },
    })
  } catch (err) {
    logger.error(`createComment: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/documents/:docId/comments/:commentId
const updateComment = async (req, res) => {
  try {
    const { docId, commentId } = req.params
    const { user_id, role } = req.user
    const { content } = req.body

    if (!content?.trim())
      return res.status(400).json({ message: 'กรุณากรอกข้อความ' })

    const pool = await getPool()
    await ensureCommentsTable(pool)

    const existing = await pool.request()
      .input('comment_id', sql.Int, commentId)
      .input('doc_id',     sql.Int, docId)
      .query('SELECT user_id FROM dbo.DOCUMENT_COMMENTS WHERE comment_id=@comment_id AND doc_id=@doc_id')

    if (existing.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบความคิดเห็น' })

    if (existing.recordset[0].user_id !== user_id && role !== 'admin')
      return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไขความคิดเห็นนี้' })

    await pool.request()
      .input('comment_id', sql.Int,      commentId)
      .input('content',    sql.NVarChar, content.trim())
      .query(`
        UPDATE dbo.DOCUMENT_COMMENTS
        SET content=@content, updated_at=GETDATE()
        WHERE comment_id=@comment_id
      `)

    res.json({ message: 'แก้ไขความคิดเห็นสำเร็จ' })
  } catch (err) {
    logger.error(`updateComment: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// DELETE /api/documents/:docId/comments/:commentId
const deleteComment = async (req, res) => {
  try {
    const { docId, commentId } = req.params
    const { user_id, role } = req.user
    const pool = await getPool()
    await ensureCommentsTable(pool)

    const existing = await pool.request()
      .input('comment_id', sql.Int, commentId)
      .input('doc_id',     sql.Int, docId)
      .query('SELECT user_id FROM dbo.DOCUMENT_COMMENTS WHERE comment_id=@comment_id AND doc_id=@doc_id')

    if (existing.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบความคิดเห็น' })

    if (existing.recordset[0].user_id !== user_id && role !== 'admin')
      return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบความคิดเห็นนี้' })

    await pool.request()
      .input('comment_id', sql.Int, commentId)
      .query('DELETE FROM dbo.DOCUMENT_COMMENTS WHERE comment_id=@comment_id')

    res.json({ message: 'ลบความคิดเห็นสำเร็จ' })
  } catch (err) {
    logger.error(`deleteComment: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getComments, createComment, updateComment, deleteComment }
