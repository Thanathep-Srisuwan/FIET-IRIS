const { sql } = require('../config/db')
const { AFFILIATIONS, DEAN_OFFICE, PROGRAMS_BY_DEGREE } = require('../constants/programs')

const ensureAcademicReferenceTables = async (pool) => {
  await pool.request().query(`
    IF OBJECT_ID('dbo.PROGRAMS', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.PROGRAMS (
        program_id INT IDENTITY(1,1) PRIMARY KEY,
        degree_level NVARCHAR(20) NOT NULL,
        program_name NVARCHAR(200) NOT NULL,
        is_active BIT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NULL
      );
      CREATE UNIQUE INDEX UX_PROGRAMS_degree_name ON dbo.PROGRAMS(degree_level, program_name);
    END

    IF OBJECT_ID('dbo.AFFILIATIONS', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.AFFILIATIONS (
        affiliation_id INT IDENTITY(1,1) PRIMARY KEY,
        affiliation_name NVARCHAR(200) NOT NULL UNIQUE,
        is_active BIT NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT GETDATE(),
        updated_at DATETIME NULL
      );
    END
  `)

  let sort = 1
  for (const [degree, programs] of Object.entries(PROGRAMS_BY_DEGREE)) {
    for (const program of programs) {
      await pool.request()
        .input('degree_level', sql.NVarChar, degree)
        .input('program_name', sql.NVarChar, program)
        .input('sort_order', sql.Int, sort++)
        .query(`
          IF NOT EXISTS (
            SELECT 1 FROM dbo.PROGRAMS
            WHERE degree_level = @degree_level AND program_name = @program_name
          )
          INSERT INTO dbo.PROGRAMS (degree_level, program_name, sort_order)
          VALUES (@degree_level, @program_name, @sort_order)
        `)
    }
  }

  for (let i = 0; i < AFFILIATIONS.length; i++) {
    await pool.request()
      .input('affiliation_name', sql.NVarChar, AFFILIATIONS[i])
      .input('sort_order', sql.Int, i + 1)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.AFFILIATIONS WHERE affiliation_name = @affiliation_name)
        INSERT INTO dbo.AFFILIATIONS (affiliation_name, sort_order)
        VALUES (@affiliation_name, @sort_order)
      `)
  }
}

const getAcademicReferenceOptions = async (pool) => {
  await ensureAcademicReferenceTables(pool)

  const programsResult = await pool.request().query(`
    SELECT degree_level, program_name
    FROM dbo.PROGRAMS
    WHERE is_active = 1
    ORDER BY sort_order, program_name
  `)

  const affiliationsResult = await pool.request().query(`
    SELECT affiliation_name
    FROM dbo.AFFILIATIONS
    WHERE is_active = 1
    ORDER BY sort_order, affiliation_name
  `)

  const programsByDegree = { bachelor: [], master: [], doctoral: [] }
  for (const row of programsResult.recordset) {
    if (!programsByDegree[row.degree_level]) programsByDegree[row.degree_level] = []
    programsByDegree[row.degree_level].push(row.program_name)
  }

  return {
    programsByDegree,
    programs: programsResult.recordset.map(row => row.program_name),
    affiliations: affiliationsResult.recordset.map(row => row.affiliation_name),
    deanOffice: DEAN_OFFICE,
  }
}

module.exports = {
  ensureAcademicReferenceTables,
  getAcademicReferenceOptions,
}
