const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

const ensureFaqTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT 1 FROM sys.objects WHERE object_id=OBJECT_ID('dbo.FAQ_ITEMS') AND type='U')
    BEGIN
      CREATE TABLE dbo.FAQ_ITEMS (
        faq_id      INT            IDENTITY(1,1) PRIMARY KEY,
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
  `)
}

// GET /api/faq — ทุก role ที่ login แล้ว
const getFaq = async (req, res) => {
  try {
    const { category, include_inactive } = req.query
    const { role } = req.user
    const pool = await getPool()
    await ensureFaqTable(pool)

    const showAll = include_inactive === '1' && role === 'admin'

    let where = showAll ? '1=1' : 'f.is_active = 1'
    const params = []

    if (category) {
      where += ' AND f.category = @category'
      params.push({ name: 'category', type: sql.NVarChar, value: category })
    }

    const req2 = pool.request()
    params.forEach(p => req2.input(p.name, p.type, p.value))

    const result = await req2.query(`
      SELECT
        f.faq_id, f.question, f.answer, f.category,
        f.sort_order, f.is_active, f.created_at, f.updated_at,
        u.name AS created_by_name
      FROM dbo.FAQ_ITEMS f
      LEFT JOIN dbo.USERS u ON f.created_by = u.user_id
      WHERE ${where}
      ORDER BY f.sort_order ASC, f.created_at ASC
    `)

    // จัดกลุ่มตาม category
    const categories = []
    const catMap = {}
    for (const row of result.recordset) {
      const cat = row.category || 'ทั่วไป'
      if (!catMap[cat]) {
        catMap[cat] = []
        categories.push(cat)
      }
      catMap[cat].push(row)
    }

    res.json({
      faqs: result.recordset,
      grouped: categories.map(c => ({ category: c, items: catMap[c] })),
    })
  } catch (err) {
    logger.error(`getFaq: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/faq — admin only
const createFaq = async (req, res) => {
  try {
    const { question, answer, category, sort_order, is_active } = req.body
    const { user_id } = req.user

    if (!question?.trim() || !answer?.trim())
      return res.status(400).json({ message: 'กรุณากรอกคำถามและคำตอบ' })

    const pool = await getPool()
    await ensureFaqTable(pool)

    const result = await pool.request()
      .input('question',   sql.NVarChar, question.trim())
      .input('answer',     sql.NVarChar, answer.trim())
      .input('category',   sql.NVarChar, category?.trim() || null)
      .input('sort_order', sql.Int,      parseInt(sort_order) || 0)
      .input('is_active',  sql.Bit,      is_active === false || is_active === 0 ? 0 : 1)
      .input('created_by', sql.Int,      user_id)
      .query(`
        INSERT INTO dbo.FAQ_ITEMS (question, answer, category, sort_order, is_active, created_by)
        OUTPUT INSERTED.faq_id
        VALUES (@question, @answer, @category, @sort_order, @is_active, @created_by)
      `)

    res.status(201).json({ message: 'เพิ่มคำถามสำเร็จ', faq_id: result.recordset[0].faq_id })
  } catch (err) {
    logger.error(`createFaq: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// PUT /api/faq/:id — admin only
const updateFaq = async (req, res) => {
  try {
    const { id } = req.params
    const { question, answer, category, sort_order, is_active } = req.body

    if (!question?.trim() || !answer?.trim())
      return res.status(400).json({ message: 'กรุณากรอกคำถามและคำตอบ' })

    const pool = await getPool()
    await ensureFaqTable(pool)

    const existing = await pool.request()
      .input('faq_id', sql.Int, id)
      .query('SELECT faq_id FROM dbo.FAQ_ITEMS WHERE faq_id=@faq_id')

    if (existing.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบรายการ FAQ' })

    await pool.request()
      .input('faq_id',     sql.Int,      id)
      .input('question',   sql.NVarChar, question.trim())
      .input('answer',     sql.NVarChar, answer.trim())
      .input('category',   sql.NVarChar, category?.trim() || null)
      .input('sort_order', sql.Int,      parseInt(sort_order) || 0)
      .input('is_active',  sql.Bit,      is_active === false || is_active === 0 ? 0 : 1)
      .query(`
        UPDATE dbo.FAQ_ITEMS
        SET question=@question, answer=@answer, category=@category,
            sort_order=@sort_order, is_active=@is_active, updated_at=GETDATE()
        WHERE faq_id=@faq_id
      `)

    res.json({ message: 'อัปเดต FAQ สำเร็จ' })
  } catch (err) {
    logger.error(`updateFaq: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// DELETE /api/faq/:id — admin only
const deleteFaq = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()
    await ensureFaqTable(pool)

    const existing = await pool.request()
      .input('faq_id', sql.Int, id)
      .query('SELECT faq_id FROM dbo.FAQ_ITEMS WHERE faq_id=@faq_id')

    if (existing.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบรายการ FAQ' })

    await pool.request()
      .input('faq_id', sql.Int, id)
      .query('DELETE FROM dbo.FAQ_ITEMS WHERE faq_id=@faq_id')

    res.json({ message: 'ลบ FAQ สำเร็จ' })
  } catch (err) {
    logger.error(`deleteFaq: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getFaq, createFaq, updateFaq, deleteFaq }
