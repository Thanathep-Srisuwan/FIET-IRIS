/* ============================================================
   FIET-IRIS Migration v7
   เพิ่ม field สังกัดของผู้ใช้: USERS.affiliation
   ============================================================ */

BEGIN TRY
  BEGIN TRANSACTION;

  IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('dbo.USERS') AND name = 'affiliation')
    ALTER TABLE dbo.USERS ADD affiliation NVARCHAR(100) NULL;

  UPDATE dbo.USERS
  SET affiliation = CASE
    WHEN role = 'executive' THEN N'สำนักงานคณบดี'
    WHEN program IN (N'สำนักงานคณบดี', N'คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี') THEN N'สำนักงานคณบดี'
    WHEN program IN (N'ครุศาสตร์เครื่องกล', N'ค.อ.บ. วิศวกรรมเครื่องกล (หลักสูตร 5 ปี)', N'ค.อ.ม. วิศวกรรมเครื่องกล') THEN N'ครุศาสตร์เครื่องกล'
    WHEN program IN (N'ครุศาสตร์โยธา', N'ค.อ.บ. วิศวกรรมโยธา (หลักสูตร 5 ปี)', N'ค.อ.ม. วิศวกรรมโยธา') THEN N'ครุศาสตร์โยธา'
    WHEN program IN (N'ครุศาสตร์ไฟฟ้า', N'ค.อ.บ. วิศวกรรมไฟฟ้า (หลักสูตร 5 ปี)', N'ค.อ.ม. วิศวกรรมไฟฟ้า') THEN N'ครุศาสตร์ไฟฟ้า'
    WHEN program IN (N'ครุศาสตร์อุตสาหการ', N'ค.อ.บ. วิศวกรรมอุตสาหการ (หลักสูตร 5 ปี)', N'ค.อ.ม. วิศวกรรมอุตสาหการ') THEN N'ครุศาสตร์อุตสาหการ'
    WHEN program IN (N'เทคโนโลยีและสื่อสารการศึกษา', N'เทคโนโลยีการศึกษาและสื่อสารมวลชน', N'ทล.บ. เทคโนโลยีดิจิทัลทางการศึกษาและสื่อสารมวลชน', N'ค.อ.ม. เทคโนโลยีดิจิทัลการเรียนรู้และสื่อสารมวลชน') THEN N'เทคโนโลยีและสื่อสารการศึกษา'
    WHEN program IN (N'เทคโนโลยีการพิมพ์และบรรจุภัณฑ์', N'วท.บ. เทคโนโลยีบรรจุภัณฑ์และการพิมพ์', N'วท.ม. เทคโนโลยีบรรจุภัณฑ์และนวัตกรรมการพิมพ์') THEN N'เทคโนโลยีการพิมพ์และบรรจุภัณฑ์'
    WHEN program IN (N'วิทยการคอมพิวเตอร์ประยุกต์และมัลติมีเดีย', N'วิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย', N'วท.บ. วิทยาการคอมพิวเตอร์ประยุกต์-มัลติมีเดีย', N'ค.อ.ม. คอมพิวเตอร์และเทคโนโลยีสารสนเทศ') THEN N'วิทยการคอมพิวเตอร์ประยุกต์และมัลติมีเดีย'
    ELSE affiliation
  END
  WHERE role IN ('admin', 'staff', 'advisor', 'executive')
    AND (affiliation IS NULL OR role = 'executive');

  UPDATE dbo.USERS
  SET program = NULL
  WHERE role IN ('admin', 'staff', 'advisor', 'executive');

  IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IDX_USERS_role_affiliation' AND object_id = OBJECT_ID('dbo.USERS'))
    CREATE INDEX IDX_USERS_role_affiliation ON dbo.USERS(role, affiliation);

  COMMIT TRANSACTION;
  PRINT 'Migration v7 completed: added USERS.affiliation.';
END TRY
BEGIN CATCH
  IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
  THROW;
END CATCH;
