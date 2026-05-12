const { getPool, sql } = require('../config/db')
const logger = require('../utils/logger')
const { getAcademicReferenceOptions, ensureAcademicReferenceTables } = require('../utils/academicReference')

const getAcademicOptions = async (req, res) => {
  try {
    const pool = await getPool()
    const options = await getAcademicReferenceOptions(pool)
    res.json(options)
  } catch (err) {
    logger.error(`getAcademicOptions: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// Programs CRUD (admin only)

const getPrograms = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureAcademicReferenceTables(pool)
    const result = await pool.request().query(`
      SELECT program_id, degree_level, program_name, is_active, sort_order, created_at, updated_at
      FROM dbo.PROGRAMS
      ORDER BY sort_order, degree_level, program_name
    `)
    res.json(result.recordset)
  } catch (err) {
    logger.error(`getPrograms: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

const createProgram = async (req, res) => {
  const { degree_level, program_name, sort_order } = req.body
  const name = program_name?.trim()
  if (!degree_level || !name) {
    return res.status(400).json({ message: 'กรุณากรอกระดับและชื่อหลักสูตร' })
  }
  if (!['bachelor', 'master', 'doctoral'].includes(degree_level)) {
    return res.status(400).json({ message: 'ระดับการศึกษาไม่ถูกต้อง' })
  }
  try {
    const pool = await getPool()
    const exists = await pool.request()
      .input('degree_level', sql.NVarChar, degree_level)
      .input('program_name', sql.NVarChar, name)
      .query(`SELECT 1 FROM dbo.PROGRAMS WHERE degree_level = @degree_level AND program_name = @program_name`)
    if (exists.recordset.length > 0) {
      return res.status(409).json({ message: 'ชื่อหลักสูตรนี้มีอยู่แล้วในระดับเดียวกัน' })
    }
    const maxSort = await pool.request().query(`SELECT ISNULL(MAX(sort_order), 0) AS m FROM dbo.PROGRAMS`)
    const nextSort = (maxSort.recordset[0].m || 0) + 1
    const result = await pool.request()
      .input('degree_level', sql.NVarChar, degree_level)
      .input('program_name', sql.NVarChar, name)
      .input('sort_order', sql.Int, Number.isInteger(sort_order) ? sort_order : nextSort)
      .query(`
        INSERT INTO dbo.PROGRAMS (degree_level, program_name, sort_order)
        OUTPUT INSERTED.*
        VALUES (@degree_level, @program_name, @sort_order)
      `)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    logger.error(`createProgram: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

const updateProgram = async (req, res) => {
  const { id } = req.params
  const { program_name, degree_level, sort_order, is_active } = req.body
  const name = program_name?.trim()
  if (!name) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อหลักสูตร' })
  }
  try {
    const pool = await getPool()
    const found = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT * FROM dbo.PROGRAMS WHERE program_id = @id`)
    if (found.recordset.length === 0) {
      return res.status(404).json({ message: 'ไม่พบหลักสูตร' })
    }
    const current = found.recordset[0]
    const newDegree = degree_level ?? current.degree_level
    const dup = await pool.request()
      .input('degree_level', sql.NVarChar, newDegree)
      .input('program_name', sql.NVarChar, name)
      .input('id', sql.Int, id)
      .query(`SELECT 1 FROM dbo.PROGRAMS WHERE degree_level = @degree_level AND program_name = @program_name AND program_id != @id`)
    if (dup.recordset.length > 0) {
      return res.status(409).json({ message: 'ชื่อหลักสูตรนี้มีอยู่แล้วในระดับเดียวกัน' })
    }
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('program_name', sql.NVarChar, name)
      .input('degree_level', sql.NVarChar, newDegree)
      .input('sort_order', sql.Int, sort_order !== undefined ? sort_order : current.sort_order)
      .input('is_active', sql.Bit, is_active !== undefined ? (is_active ? 1 : 0) : current.is_active)
      .query(`
        UPDATE dbo.PROGRAMS
        SET program_name = @program_name,
            degree_level = @degree_level,
            sort_order   = @sort_order,
            is_active    = @is_active,
            updated_at   = GETDATE()
        OUTPUT INSERTED.*
        WHERE program_id = @id
      `)
    res.json(result.recordset[0])
  } catch (err) {
    logger.error(`updateProgram: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

const deleteProgram = async (req, res) => {
  const { id } = req.params
  try {
    const pool = await getPool()
    const found = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT program_name FROM dbo.PROGRAMS WHERE program_id = @id`)
    if (found.recordset.length === 0) {
      return res.status(404).json({ message: 'ไม่พบหลักสูตร' })
    }
    const { program_name } = found.recordset[0]
    const inUse = await pool.request()
      .input('program_name', sql.NVarChar, program_name)
      .query(`SELECT COUNT(*) AS cnt FROM dbo.USERS WHERE program = @program_name`)
    if (inUse.recordset[0].cnt > 0) {
      return res.status(409).json({ message: `ไม่สามารถลบได้ มีผู้ใช้ ${inUse.recordset[0].cnt} คนอยู่ในหลักสูตรนี้` })
    }
    await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM dbo.PROGRAMS WHERE program_id = @id`)
    res.json({ message: 'ลบหลักสูตรสำเร็จ' })
  } catch (err) {
    logger.error(`deleteProgram: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

// Affiliations CRUD (admin only)

const getAffiliations = async (req, res) => {
  try {
    const pool = await getPool()
    await ensureAcademicReferenceTables(pool)
    const result = await pool.request().query(`
      SELECT affiliation_id, affiliation_name, is_active, sort_order, created_at, updated_at
      FROM dbo.AFFILIATIONS
      ORDER BY sort_order, affiliation_name
    `)
    res.json(result.recordset)
  } catch (err) {
    logger.error(`getAffiliations: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

const createAffiliation = async (req, res) => {
  const { affiliation_name, sort_order } = req.body
  const name = affiliation_name?.trim()
  if (!name) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อสังกัด' })
  }
  try {
    const pool = await getPool()
    const exists = await pool.request()
      .input('affiliation_name', sql.NVarChar, name)
      .query(`SELECT 1 FROM dbo.AFFILIATIONS WHERE affiliation_name = @affiliation_name`)
    if (exists.recordset.length > 0) {
      return res.status(409).json({ message: 'ชื่อสังกัดนี้มีอยู่แล้ว' })
    }
    const maxSort = await pool.request().query(`SELECT ISNULL(MAX(sort_order), 0) AS m FROM dbo.AFFILIATIONS`)
    const nextSort = (maxSort.recordset[0].m || 0) + 1
    const result = await pool.request()
      .input('affiliation_name', sql.NVarChar, name)
      .input('sort_order', sql.Int, Number.isInteger(sort_order) ? sort_order : nextSort)
      .query(`
        INSERT INTO dbo.AFFILIATIONS (affiliation_name, sort_order)
        OUTPUT INSERTED.*
        VALUES (@affiliation_name, @sort_order)
      `)
    res.status(201).json(result.recordset[0])
  } catch (err) {
    logger.error(`createAffiliation: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

const updateAffiliation = async (req, res) => {
  const { id } = req.params
  const { affiliation_name, sort_order, is_active } = req.body
  const name = affiliation_name?.trim()
  if (!name) {
    return res.status(400).json({ message: 'กรุณากรอกชื่อสังกัด' })
  }
  try {
    const pool = await getPool()
    const found = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT * FROM dbo.AFFILIATIONS WHERE affiliation_id = @id`)
    if (found.recordset.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสังกัด' })
    }
    const current = found.recordset[0]
    const dup = await pool.request()
      .input('affiliation_name', sql.NVarChar, name)
      .input('id', sql.Int, id)
      .query(`SELECT 1 FROM dbo.AFFILIATIONS WHERE affiliation_name = @affiliation_name AND affiliation_id != @id`)
    if (dup.recordset.length > 0) {
      return res.status(409).json({ message: 'ชื่อสังกัดนี้มีอยู่แล้ว' })
    }
    const result = await pool.request()
      .input('id', sql.Int, id)
      .input('affiliation_name', sql.NVarChar, name)
      .input('sort_order', sql.Int, sort_order !== undefined ? sort_order : current.sort_order)
      .input('is_active', sql.Bit, is_active !== undefined ? (is_active ? 1 : 0) : current.is_active)
      .query(`
        UPDATE dbo.AFFILIATIONS
        SET affiliation_name = @affiliation_name,
            sort_order       = @sort_order,
            is_active        = @is_active,
            updated_at       = GETDATE()
        OUTPUT INSERTED.*
        WHERE affiliation_id = @id
      `)
    res.json(result.recordset[0])
  } catch (err) {
    logger.error(`updateAffiliation: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

const deleteAffiliation = async (req, res) => {
  const { id } = req.params
  try {
    const pool = await getPool()
    const found = await pool.request()
      .input('id', sql.Int, id)
      .query(`SELECT affiliation_name FROM dbo.AFFILIATIONS WHERE affiliation_id = @id`)
    if (found.recordset.length === 0) {
      return res.status(404).json({ message: 'ไม่พบสังกัด' })
    }
    const { affiliation_name } = found.recordset[0]
    const inUse = await pool.request()
      .input('affiliation_name', sql.NVarChar, affiliation_name)
      .query(`SELECT COUNT(*) AS cnt FROM dbo.USERS WHERE affiliation = @affiliation_name`)
    if (inUse.recordset[0].cnt > 0) {
      return res.status(409).json({ message: `ไม่สามารถลบได้ มีผู้ใช้ ${inUse.recordset[0].cnt} คนอยู่ในสังกัดนี้` })
    }
    await pool.request()
      .input('id', sql.Int, id)
      .query(`DELETE FROM dbo.AFFILIATIONS WHERE affiliation_id = @id`)
    res.json({ message: 'ลบสังกัดสำเร็จ' })
  } catch (err) {
    logger.error(`deleteAffiliation: ${err.message}`)
    res.status(500).json({ message: 'เกิดข้อผิดพลาดภายในระบบ' })
  }
}

module.exports = {
  getAcademicOptions,
  getPrograms,
  createProgram,
  updateProgram,
  deleteProgram,
  getAffiliations,
  createAffiliation,
  updateAffiliation,
  deleteAffiliation,
}
