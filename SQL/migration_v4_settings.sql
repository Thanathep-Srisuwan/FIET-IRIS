-- ============================================================
--  Migration v4: System Settings & Email Templates
--  แทนที่ค่า hard-coded ทั้งหมดให้ Admin จัดการได้เอง
-- ============================================================

-- ============================================================
--  SYSTEM_SETTINGS
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'SYSTEM_SETTINGS')
BEGIN
    CREATE TABLE dbo.SYSTEM_SETTINGS (
        setting_key   NVARCHAR(100) NOT NULL,
        setting_value NVARCHAR(MAX),
        setting_type  NVARCHAR(20)  NOT NULL DEFAULT 'string',
        description   NVARCHAR(500),
        updated_at    DATETIME      DEFAULT GETDATE(),
        updated_by    INT           NULL REFERENCES dbo.USERS(user_id),
        CONSTRAINT PK_SYSTEM_SETTINGS PRIMARY KEY (setting_key)
    );
END;
GO

-- ============================================================
--  EMAIL_TEMPLATES
-- ============================================================
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'EMAIL_TEMPLATES')
BEGIN
    CREATE TABLE dbo.EMAIL_TEMPLATES (
        template_key  NVARCHAR(100) NOT NULL,
        subject       NVARCHAR(500),
        body_html     NVARCHAR(MAX),
        variables     NVARCHAR(MAX),
        description   NVARCHAR(500),
        updated_at    DATETIME      DEFAULT GETDATE(),
        updated_by    INT           NULL REFERENCES dbo.USERS(user_id),
        CONSTRAINT PK_EMAIL_TEMPLATES PRIMARY KEY (template_key)
    );
END;
GO

-- ============================================================
--  Default settings (MERGE = idempotent)
-- ============================================================
MERGE dbo.SYSTEM_SETTINGS AS target
USING (VALUES
    ('system_name',          'FIET-IRIS',                             'string', N'ชื่อย่อระบบ (แสดงในอีเมล, header)'),
    ('system_full_name',     'Integrity Research Information System', 'string', N'ชื่อเต็มระบบ'),
    ('org_name',             N'คณะ FIET มจธ.',                       'string', N'ชื่อองค์กร/คณะ (แสดงท้ายอีเมล)'),
    ('expiry_warning_days',  '90',                                    'number', N'จำนวนวันก่อนหมดอายุที่เริ่มแสดง expiring_soon'),
    ('trash_retention_days', '30',                                    'number', N'จำนวนวันที่เก็บในถังขยะก่อนลบถาวร')
) AS source (setting_key, setting_value, setting_type, description)
ON target.setting_key = source.setting_key
WHEN NOT MATCHED THEN
    INSERT (setting_key, setting_value, setting_type, description)
    VALUES (source.setting_key, source.setting_value, source.setting_type, source.description);
GO

-- ============================================================
--  Default email templates (MERGE = idempotent)
-- ============================================================
MERGE dbo.EMAIL_TEMPLATES AS target
USING (VALUES
    (
        'expiry_warning',
        N'[{{system_name}}] ใบประกาศ {{docType}} ของท่านใกล้หมดอายุใน {{daysRemaining}} วัน',
        N'<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <h2 style="color: #d97706;">&#9888;&#65039; แจ้งเตือนใบประกาศใกล้หมดอายุ</h2>
  <p>เรียน คุณ{{name}}</p>
  <p>ใบประกาศ <strong>{{docType}}</strong> ของท่านชื่อ <strong>&quot;{{docTitle}}&quot;</strong>
     จะหมดอายุในอีก <strong>{{daysRemaining}} วัน</strong> (วันที่ {{expireDate}})</p>
  <p>กรุณาดำเนินการต่ออายุหรืออัปโหลดเอกสารใหม่ก่อนวันหมดอายุ</p>
  <a href="{{clientUrl}}/documents"
     style="display:inline-block;background:#1d4ed8;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;margin:8px 0;">
    เข้าสู่ระบบ {{system_name}}
  </a>
  <p style="color:#6b7280;font-size:12px;margin-top:24px;">
    อีเมลนี้ส่งโดยอัตโนมัติจากระบบ {{system_name}} {{org_name}}
  </p>
</div>',
        N'["name","docTitle","docType","expireDate","daysRemaining","system_name","org_name","clientUrl"]',
        N'อีเมลแจ้งเตือนเอกสารใกล้หมดอายุ'
    ),
    (
        'permanent_delete',
        N'[{{system_name}}] เอกสาร {{docType}} ของท่านถูกลบออกจากระบบถาวรแล้ว',
        N'<div style="font-family: sans-serif; max-width: 600px; margin: auto;">
  <h2 style="color: #dc2626;">&#128465;&#65039; แจ้งเตือน: เอกสารถูกลบถาวร</h2>
  <p>เรียน คุณ{{name}}</p>
  <p>เอกสาร <strong>{{docType}}</strong> ชื่อ <strong>&quot;{{docTitle}}&quot;</strong>
     ถูกลบออกจากระบบถาวรแล้ว และ<strong>ไม่สามารถกู้คืนได้อีกต่อไป</strong></p>
  <table style="border-collapse:collapse;width:100%;margin:16px 0;">
    <tr style="background:#f8fafc;">
      <td style="padding:8px 12px;font-size:13px;color:#64748b;width:120px;">ดำเนินการโดย</td>
      <td style="padding:8px 12px;font-size:13px;color:#1e293b;">{{deletedBy}}</td>
    </tr>
    <tr>
      <td style="padding:8px 12px;font-size:13px;color:#64748b;">เหตุผล</td>
      <td style="padding:8px 12px;font-size:13px;color:#1e293b;">{{reason}}</td>
    </tr>
  </table>
  <p style="color:#6b7280;font-size:13px;">
    หากคุณมีข้อสงสัยเกี่ยวกับการลบเอกสารนี้ กรุณาติดต่อผู้ดูแลระบบ
  </p>
  <p style="color:#6b7280;font-size:12px;margin-top:24px;">
    อีเมลนี้ส่งโดยอัตโนมัติจากระบบ {{system_name}} {{org_name}}
  </p>
</div>',
        N'["name","docTitle","docType","reason","deletedBy","system_name","org_name"]',
        N'อีเมลแจ้งเตือนเอกสารถูกลบถาวร'
    )
) AS source (template_key, subject, body_html, variables, description)
ON target.template_key = source.template_key
WHEN NOT MATCHED THEN
    INSERT (template_key, subject, body_html, variables, description)
    VALUES (source.template_key, source.subject, source.body_html, source.variables, source.description);
GO

-- ============================================================
--  อัปเดต SP ให้อ่าน expiry_warning_days จาก SYSTEM_SETTINGS
-- ============================================================
CREATE OR ALTER PROCEDURE dbo.sp_UpdateDocumentStatus
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @expiry_days INT = 90;
    SELECT @expiry_days = CAST(setting_value AS INT)
    FROM dbo.SYSTEM_SETTINGS
    WHERE setting_key = 'expiry_warning_days';

    UPDATE dbo.DOCUMENTS
    SET status = 'expiring_soon', updated_at = GETDATE()
    WHERE status = 'active'
      AND expire_date <= DATEADD(DAY, @expiry_days, CAST(GETDATE() AS DATE))
      AND expire_date >  CAST(GETDATE() AS DATE);

    UPDATE dbo.DOCUMENTS
    SET status = 'expired', updated_at = GETDATE()
    WHERE status IN ('active', 'expiring_soon')
      AND expire_date <= CAST(GETDATE() AS DATE);

    SELECT
        SUM(CASE WHEN status = 'expiring_soon' THEN 1 ELSE 0 END) AS expiring_soon_count,
        SUM(CASE WHEN status = 'expired'       THEN 1 ELSE 0 END) AS expired_count
    FROM dbo.DOCUMENTS
    WHERE status IN ('expiring_soon', 'expired');
END;
GO

-- ============================================================
--  อัปเดต View ให้อ่าน expiry_warning_days จาก SYSTEM_SETTINGS
-- ============================================================
CREATE OR ALTER VIEW dbo.v_ExpiringDocuments
AS
SELECT
    d.doc_id,
    d.title,
    d.doc_type,
    d.project_category,
    d.expire_date,
    d.status,
    d.version,
    DATEDIFF(DAY, CAST(GETDATE() AS DATE), d.expire_date) AS days_remaining,
    u.user_id,
    u.name      AS owner_name,
    u.email     AS owner_email,
    a.user_id   AS advisor_id,
    a.name      AS advisor_name,
    a.email     AS advisor_email
FROM dbo.DOCUMENTS d
JOIN dbo.USERS u  ON d.user_id    = u.user_id
LEFT JOIN dbo.USERS a ON u.advisor_id = a.user_id
WHERE d.status IN ('active', 'expiring_soon')
  AND d.expire_date <= DATEADD(DAY,
    CAST((SELECT setting_value FROM dbo.SYSTEM_SETTINGS WHERE setting_key = 'expiry_warning_days') AS INT),
    CAST(GETDATE() AS DATE));
GO
