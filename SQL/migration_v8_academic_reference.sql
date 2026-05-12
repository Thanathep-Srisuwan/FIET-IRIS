/* ============================================================
   FIET-IRIS Migration v8
   ย้ายรายชื่อหลักสูตร/สังกัดไปเป็น reference data ใน DB
   ============================================================ */

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
GO

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
GO

MERGE dbo.PROGRAMS AS target
USING (VALUES
  (N'bachelor', N'วท.บ. เทคโนโลยีบรรจุภัณฑ์และการพิมพ์', 1),
  (N'bachelor', N'ทล.บ. เทคโนโลยีอุตสาหกรรม', 2),
  (N'bachelor', N'วท.บ. วิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย', 3),
  (N'bachelor', N'ค.อ.บ. วิศวกรรมเครื่องกล (หลักสูตร 5 ปี)', 4),
  (N'bachelor', N'ค.อ.บ. วิศวกรรมไฟฟ้า (หลักสูตร 5 ปี)', 5),
  (N'bachelor', N'ค.อ.บ. วิศวกรรมโยธา (หลักสูตร 5 ปี)', 6),
  (N'bachelor', N'ค.อ.บ. วิศวกรรมอุตสาหการ (หลักสูตร 5 ปี)', 7),
  (N'bachelor', N'ทล.บ. เทคโนโลยีดิจิทัลทางการศึกษาและสื่อสารมวลชน', 8),
  (N'master', N'ค.อ.ม. วิศวกรรมเครื่องกล', 101),
  (N'master', N'ค.อ.ม. วิศวกรรมไฟฟ้า', 102),
  (N'master', N'ค.อ.ม. เทคโนโลยีดิจิทัลการเรียนรู้และสื่อสารมวลชน', 103),
  (N'master', N'ค.อ.ม. คอมพิวเตอร์และเทคโนโลยีสารสนเทศ', 104),
  (N'master', N'ค.อ.ม. วิศวกรรมโยธา', 105),
  (N'master', N'ค.อ.ม. วิศวกรรมอุตสาหการ', 106),
  (N'master', N'วท.ม. เทคโนโลยีบรรจุภัณฑ์และนวัตกรรมการพิมพ์', 107),
  (N'doctoral', N'ปร.ด. นวัตกรรมการเรียนรู้และเทคโนโลยี', 201)
) AS source (degree_level, program_name, sort_order)
ON target.degree_level = source.degree_level AND target.program_name = source.program_name
WHEN NOT MATCHED THEN
  INSERT (degree_level, program_name, sort_order)
  VALUES (source.degree_level, source.program_name, source.sort_order);
GO

MERGE dbo.AFFILIATIONS AS target
USING (VALUES
  (N'สำนักงานคณบดี', 1),
  (N'ครุศาสตร์เครื่องกล', 2),
  (N'ครุศาสตร์โยธา', 3),
  (N'ครุศาสตร์ไฟฟ้า', 4),
  (N'ครุศาสตร์อุตสาหการ', 5),
  (N'เทคโนโลยีและสื่อสารการศึกษา', 6),
  (N'เทคโนโลยีการพิมพ์และบรรจุภัณฑ์', 7),
  (N'วิทยการคอมพิวเตอร์ประยุกต์และมัลติมีเดีย', 8)
) AS source (affiliation_name, sort_order)
ON target.affiliation_name = source.affiliation_name
WHEN NOT MATCHED THEN
  INSERT (affiliation_name, sort_order)
  VALUES (source.affiliation_name, source.sort_order);
GO
