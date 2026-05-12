/* ============================================================
   FIET-IRIS Migration v6
   เปลี่ยน field ข้อมูลผู้ใช้จาก USERS.department เป็น USERS.program
   และแปลงค่าจากสาขาวิชาเดิมเป็นชื่อหลักสูตรใหม่
   ============================================================ */

BEGIN TRY
  BEGIN TRANSACTION;

  IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.USERS') AND name = 'department')
     AND NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.USERS') AND name = 'program')
    EXEC sp_rename 'dbo.USERS.department', 'program', 'COLUMN';

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.USERS') AND name = 'program')
    ALTER TABLE dbo.USERS ADD program NVARCHAR(100) NULL;

  UPDATE dbo.USERS
  SET program = CASE
    WHEN degree_level = 'bachelor' AND program = N'เทคโนโลยีการพิมพ์และบรรจุภัณฑ์'
      THEN N'วท.บ. เทคโนโลยีบรรจุภัณฑ์และการพิมพ์'
    WHEN degree_level = 'bachelor' AND program = N'เทคโนโลยีอุตสาหกรรม'
      THEN N'ทล.บ. เทคโนโลยีอุตสาหกรรม'
    WHEN degree_level = 'bachelor' AND program IN (N'วิทยาการคอมพิวเตอร์ประยุกต์ – มัลติมีเดีย', N'วิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย')
      THEN N'วท.บ. วิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย'
    WHEN degree_level = 'bachelor' AND program = N'ครุศาสตร์เครื่องกล'
      THEN N'ค.อ.บ. วิศวกรรมเครื่องกล (หลักสูตร 5 ปี)'
    WHEN degree_level = 'bachelor' AND program = N'ครุศาสตร์ไฟฟ้า'
      THEN N'ค.อ.บ. วิศวกรรมไฟฟ้า (หลักสูตร 5 ปี)'
    WHEN degree_level = 'bachelor' AND program = N'ครุศาสตร์โยธา'
      THEN N'ค.อ.บ. วิศวกรรมโยธา (หลักสูตร 5 ปี)'
    WHEN degree_level = 'bachelor' AND program = N'ครุศาสตร์อุตสาหการ'
      THEN N'ค.อ.บ. วิศวกรรมอุตสาหการ (หลักสูตร 5 ปี)'
    WHEN degree_level = 'bachelor' AND program IN (N'เทคโนโลยีการศึกษาและสื่อสารมวลชน', N'เทคโนโลยีและสื่อสารการศึกษา')
      THEN N'ทล.บ. เทคโนโลยีดิจิทัลทางการศึกษาและสื่อสารมวลชน'

    WHEN degree_level = 'master' AND program = N'วิศวกรรมเครื่องกล'
      THEN N'ค.อ.ม. วิศวกรรมเครื่องกล'
    WHEN degree_level = 'master' AND program = N'วิศวกรรมไฟฟ้า'
      THEN N'ค.อ.ม. วิศวกรรมไฟฟ้า'
    WHEN degree_level = 'master' AND program = N'เทคโนโลยีการเรียนรู้และสื่อสารมวลชน'
      THEN N'ค.อ.ม. เทคโนโลยีดิจิทัลการเรียนรู้และสื่อสารมวลชน'
    WHEN degree_level = 'master' AND program = N'คอมพิวเตอร์และเทคโนโลยีสารสนเทศ'
      THEN N'ค.อ.ม. คอมพิวเตอร์และเทคโนโลยีสารสนเทศ'
    WHEN degree_level = 'master' AND program = N'วิศวกรรมโยธา'
      THEN N'ค.อ.ม. วิศวกรรมโยธา'
    WHEN degree_level = 'master' AND program = N'วิศวกรรมอุตสาหการ'
      THEN N'ค.อ.ม. วิศวกรรมอุตสาหการ'
    WHEN degree_level = 'master' AND program = N'เทคโนโลยีบรรจุภัณฑ์และนวัตกรรมการพิมพ์'
      THEN N'วท.ม. เทคโนโลยีบรรจุภัณฑ์และนวัตกรรมการพิมพ์'

    WHEN degree_level = 'doctoral' AND program = N'นวัตกรรมการเรียนรู้และเทคโนโลยี'
      THEN N'ปร.ด. นวัตกรรมการเรียนรู้และเทคโนโลยี'

    ELSE program
  END
  WHERE program IS NOT NULL;

  UPDATE dbo.USERS
  SET program = N'สำนักงานคณบดี'
  WHERE role = 'executive';

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_USERS_role_degree_program' AND object_id = OBJECT_ID('dbo.USERS'))
    CREATE INDEX IDX_USERS_role_degree_program ON dbo.USERS(role, degree_level, program);

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_USERS_advisor_degree_program' AND object_id = OBJECT_ID('dbo.USERS'))
    CREATE INDEX IDX_USERS_advisor_degree_program ON dbo.USERS(advisor_id, degree_level, program);

  COMMIT TRANSACTION;
  PRINT 'Migration v6 completed: renamed USERS.department to USERS.program and updated program names.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
