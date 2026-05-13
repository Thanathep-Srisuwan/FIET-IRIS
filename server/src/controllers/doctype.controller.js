const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')

const ensureTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DOC_TYPES' AND xtype='U')
    BEGIN
      CREATE TABLE dbo.DOC_TYPES (
        type_id    INT IDENTITY(1,1) PRIMARY KEY,
        type_code  NVARCHAR(50)  NOT NULL,
        type_name  NVARCHAR(255) NOT NULL,
        is_active  BIT DEFAULT 1,
        sort_order INT DEFAULT 0,
        created_at DATETIME DEFAULT GETDATE()
      )
      INSERT INTO dbo.DOC_TYPES (type_code, type_name, sort_order)
      VALUES ('RI', 'RI - Research Integrity', 1),
             ('IRB', 'IRB - Institutional Review Board', 2)
    END
  `)
}

const ensureCategoriesTable = async (pool) => {
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='DOC_TYPE_CATEGORIES' AND xtype='U')
    BEGIN
      CREATE TABLE dbo.DOC_TYPE_CATEGORIES (
        category_id   INT IDENTITY(1,1) PRIMARY KEY,
        type_id       INT NOT NULL,
        category_code NVARCHAR(50)  NOT NULL,
        category_name NVARCHAR(255) NOT NULL,
        sort_order    INT DEFAULT 0,
        is_active     BIT DEFAULT 1,
        created_at    DATETIME DEFAULT GETDATE(),
        FOREIGN KEY (type_id) REFERENCES dbo.DOC_TYPES(type_id)
      )
      -- seed RI existing categories (urgent=ทฤษฎี, exempt=ปฏิบัติ)
      INSERT INTO dbo.DOC_TYPE_CATEGORIES (type_id, category_code, category_name, sort_order)
      SELECT t.type_id, 'urgent', N'ทฤษฎี', 1 FROM dbo.DOC_TYPES t WHERE t.type_code = 'RI'
      UNION ALL
      SELECT t.type_id, 'exempt', N'ปฏิบัติ', 2 FROM dbo.DOC_TYPES t WHERE t.type_code = 'RI'
    END
  `)
}

// GET /api/doc-types
const getAll = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureTable(pool)
    const result = await pool.request().query(`
      SELECT type_id, type_code, type_name, sort_order, created_at
      FROM dbo.DOC_TYPES
      WHERE is_active = 1
      ORDER BY sort_order, type_code
    `)
    res.json(result.recordset)
  } catch (err) {
    logger.error(`getDocTypes: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/doc-types (admin only)
const create = async (req, res) => {
  try {
    const { type_code, type_name, sort_order = 0 } = req.body
    if (!type_code?.trim() || !type_name?.trim())
      return res.status(400).json({ message: 'กรุณากรอกรหัสและชื่อประเภท' })

    const pool = await getPool()
    await ensureTable(pool)

    const code = type_code.trim().toUpperCase()
    const existing = await pool.request()
      .input('type_code', sql.NVarChar(50), code)
      .query('SELECT type_id FROM dbo.DOC_TYPES WHERE type_code = @type_code AND is_active = 1')
    if (existing.recordset.length > 0)
      return res.status(400).json({ message: 'รหัสประเภทนี้มีอยู่แล้ว' })

    await pool.request()
      .input('type_code',  sql.NVarChar(50),  code)
      .input('type_name',  sql.NVarChar(255), type_name.trim())
      .input('sort_order', sql.Int,           parseInt(sort_order) || 0)
      .query(`
        INSERT INTO dbo.DOC_TYPES (type_code, type_name, sort_order)
        VALUES (@type_code, @type_name, @sort_order)
      `)
    res.status(201).json({ message: 'เพิ่มประเภทเอกสารสำเร็จ' })
  } catch (err) {
    logger.error(`createDocType: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// DELETE /api/doc-types/:id (admin only)
const remove = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()

    const used = await pool.request()
      .input('type_id', sql.Int, id)
      .query(`
        SELECT COUNT(*) AS cnt
        FROM dbo.DOCUMENTS d
        JOIN dbo.DOC_TYPES t ON d.doc_type = t.type_code
        WHERE t.type_id = @type_id AND d.status != 'deleted'
      `)
    if (used.recordset[0].cnt > 0)
      return res.status(400).json({ message: 'ไม่สามารถลบได้ เนื่องจากมีเอกสารที่ใช้ประเภทนี้อยู่' })

    await pool.request()
      .input('type_id', sql.Int, id)
      .query('UPDATE dbo.DOC_TYPES SET is_active = 0 WHERE type_id = @type_id')
    res.json({ message: 'ลบประเภทเอกสารสำเร็จ' })
  } catch (err) {
    logger.error(`deleteDocType: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/doc-types/all-categories
const getAllCategoriesGrouped = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureTable(pool)
    await ensureCategoriesTable(pool)
    const result = await pool.request().query(`
      SELECT c.category_id, c.type_id, t.type_code, c.category_code, c.category_name, c.sort_order
      FROM dbo.DOC_TYPE_CATEGORIES c
      JOIN dbo.DOC_TYPES t ON c.type_id = t.type_id
      WHERE c.is_active = 1 AND t.is_active = 1
      ORDER BY t.sort_order, t.type_code, c.sort_order, c.category_name
    `)
    // group by type_code
    const grouped = {}
    for (const row of result.recordset) {
      if (!grouped[row.type_code]) grouped[row.type_code] = []
      grouped[row.type_code].push(row)
    }
    res.json(grouped)
  } catch (err) {
    logger.error(`getAllCategoriesGrouped: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// GET /api/doc-types/:id/categories
const getCategoriesForType = async (req, res) => {
  try {
    const { id } = req.params
    const pool = await getPool()
    await ensureCategoriesTable(pool)
    const result = await pool.request()
      .input('type_id', sql.Int, id)
      .query(`
        SELECT category_id, category_code, category_name, sort_order, created_at
        FROM dbo.DOC_TYPE_CATEGORIES
        WHERE type_id = @type_id AND is_active = 1
        ORDER BY sort_order, category_name
      `)
    res.json(result.recordset)
  } catch (err) {
    logger.error(`getCategoriesForType: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// POST /api/doc-types/:id/categories (admin only)
const createCategory = async (req, res) => {
  try {
    const { id } = req.params
    const { category_code, category_name, sort_order = 0 } = req.body

    if (!category_code?.trim() || !category_name?.trim())
      return res.status(400).json({ message: 'กรุณากรอกรหัสและชื่อประเภทโครงการ' })

    const pool = await getPool()
    await ensureCategoriesTable(pool)

    const code = category_code.trim().toUpperCase()

    // ตรวจสอบว่า type_id นี้มีอยู่
    const typeCheck = await pool.request()
      .input('type_id', sql.Int, id)
      .query('SELECT type_id FROM dbo.DOC_TYPES WHERE type_id = @type_id AND is_active = 1')
    if (typeCheck.recordset.length === 0)
      return res.status(404).json({ message: 'ไม่พบประเภทเอกสารนี้' })

    // ตรวจสอบ code ซ้ำในประเภทเดียวกัน
    const existing = await pool.request()
      .input('type_id', sql.Int, id)
      .input('category_code', sql.NVarChar(50), code)
      .query('SELECT category_id FROM dbo.DOC_TYPE_CATEGORIES WHERE type_id = @type_id AND category_code = @category_code AND is_active = 1')
    if (existing.recordset.length > 0)
      return res.status(400).json({ message: 'รหัสประเภทโครงการนี้มีอยู่แล้ว' })

    await pool.request()
      .input('type_id',       sql.Int,          id)
      .input('category_code', sql.NVarChar(50),  code)
      .input('category_name', sql.NVarChar(255), category_name.trim())
      .input('sort_order',    sql.Int,           parseInt(sort_order) || 0)
      .query(`
        INSERT INTO dbo.DOC_TYPE_CATEGORIES (type_id, category_code, category_name, sort_order)
        VALUES (@type_id, @category_code, @category_name, @sort_order)
      `)
    res.status(201).json({ message: 'เพิ่มประเภทโครงการสำเร็จ' })
  } catch (err) {
    logger.error(`createCategory: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// DELETE /api/doc-types/:id/categories/:catId (admin only)
const removeCategory = async (req, res) => {
  try {
    const { catId } = req.params
    const pool = await getPool()

    await pool.request()
      .input('category_id', sql.Int, catId)
      .query('UPDATE dbo.DOC_TYPE_CATEGORIES SET is_active = 0 WHERE category_id = @category_id')
    res.json({ message: 'ลบประเภทโครงการสำเร็จ' })
  } catch (err) {
    logger.error(`removeCategory: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = { getAll, create, remove, getAllCategoriesGrouped, getCategoriesForType, createCategory, removeCategory }
