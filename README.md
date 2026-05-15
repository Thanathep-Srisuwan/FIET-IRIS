# FIET-IRIS

**FIET-IRIS** (FIET Integrity Research Information System) คือระบบจัดการเอกสารและใบรับรองด้าน Research Integrity / IRB สำหรับคณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี มหาวิทยาลัยเทคโนโลยีพระจอมเกล้าธนบุรี รองรับการอัปโหลด ติดตามอายุ อนุมัติ และจัดการเอกสารผ่านระบบบทบาทผู้ใช้งาน 5 ระดับ

---

## Tech Stack

### Client
- React 18 + Vite 5
- Tailwind CSS (dark mode: class)
- React Router v6
- Axios + Zustand
- Lucide React, React Hot Toast, React Quill
- XLSX / ExcelJS

### Server
- Node.js + Express
- Microsoft SQL Server (`mssql`)
- JWT (access token 15m + refresh token 7d)
- bcrypt, multer, nodemailer, node-cron, winston
- helmet, cors, express-rate-limit

---

## โครงสร้างโปรเจกต์

```text
FIET-IRIS/
├── client/
│   └── src/
│       ├── components/
│       │   ├── common/          # ThemeToggle, LanguageToggle, NotificationPanel, StatCard, Skeleton
│       │   ├── layout/          # MainLayout, Sidebar, Topbar
│       │   └── profile/         # ImageCropModal
│       ├── contexts/            # LanguageContext (TH/EN i18n), ThemeContext
│       ├── hooks/               # useDebouncedValue, useAcademicOptions
│       ├── pages/
│       │   ├── admin/           # Users, Announcements, Doc Types, Programs, FAQ, Settings,
│       │   │                    # Email Templates, Trash, Logs, Activity Log
│       │   ├── advisor/         # AdvisorAdviseesPage
│       │   ├── auth/            # Login, ChangePassword
│       │   ├── dashboard/       # AdminDashboard, StudentDashboard, AdvisorDashboard,
│       │   │                    # StaffDashboard
│       │   ├── documents/       # DocumentsPage, UploadPage
│       │   ├── executive/       # ExecutiveDashboard, ProgramSummaryPage, ExecutiveDocumentsPage
│       │   ├── help/            # HelpPage (FAQ)
│       │   ├── landing/         # LandingPage
│       │   ├── profile/         # ProfilePage
│       │   ├── staff/           # StaffApprovalsPage
│       │   └── student/         # StudentTrashPage, StudentTasksPage, StudentActivityPage
│       ├── services/            # api.js (service layer รวมทุก endpoint)
│       ├── stores/              # authStore (Zustand)
│       └── constants/           # programs.js
├── server/
│   └── src/
│       ├── config/              # db.js, seed.js (admin), seed-staff.js (staff)
│       ├── controllers/         # auth, user, document, doctype, staff, admin,
│       │                        # announcement, faq, log, notification, settings,
│       │                        # executive, comment, reference
│       ├── middlewares/         # auth.js (authenticate, authorize), validate.js
│       ├── routes/              # index.js + per-module routes
│       ├── schedulers/          # documentScheduler.js
│       ├── uploads/             # ไฟล์ที่ user อัปโหลด
│       └── utils/               # logger.js, mail.js, emailTemplates.js
└── SQL/                         # Schema + migrations ตามลำดับ
```

---

## Prerequisites

- Node.js 18+
- Microsoft SQL Server
- SMTP account สำหรับส่งอีเมล

---

## การติดตั้ง

```bash
# ติดตั้ง dependencies ทั้งหมดพร้อมกัน
npm run install:all

# หรือแยกติดตั้ง
npm install
cd server && npm install
cd ../client && npm install
```

---

## Database Setup

รัน SQL ตามลำดับ:

```
SQL/ri_irb_database_v2.sql          ← schema หลัก
SQL/migration_v3.sql
SQL/migration_trash.sql
SQL/migration_v4_settings.sql       ← SYSTEM_SETTINGS, EMAIL_TEMPLATES
SQL/migration_v5_performance_indexes.sql
SQL/migration_v6_programs.sql
SQL/migration_v7_affiliations.sql
SQL/migration_v8_academic_reference.sql
SQL/migration_v9_approval_comments_faq.sql ← approval workflow, comments, FAQ
```

Seed บัญชีเริ่มต้น:

```bash
cd server

# สร้าง Admin
npm run seed

# สร้าง Staff (สำหรับทดสอบ)
npm run seed:staff
```

---

## Environment Variables

สร้างไฟล์ `server/.env`:

```env
PORT=5000
CLIENT_URL=http://localhost:5173

DB_SERVER=localhost
DB_PORT=1433
DB_NAME=FIET_IRIS
DB_USER=your_db_user
DB_PASSWORD=your_db_password

JWT_SECRET=change_this_access_secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=change_this_refresh_secret
JWT_REFRESH_EXPIRES_IN=7d

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your_mail_user
MAIL_PASS=your_mail_password
MAIL_FROM="FIET-IRIS <noreply@example.com>"
```

---

## การรัน

```bash
# รัน client + server พร้อมกัน
npm run dev

# หรือแยกรัน
npm run dev:server
npm run dev:client
```

- Client: `http://localhost:5173`
- Server: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

---

## การ Build

```bash
cd client
npm run build

# กรณีมีปัญหา global path
node node_modules/vite/bin/vite.js build
```

---

## บัญชีทดสอบ

| Role      | Email                        | Password     | หมายเหตุ                   |
| --------- | ---------------------------- | ------------ | -------------------------- |
| Admin     | `admin@kmutt.ac.th`          | `Admin@1234` | สร้างจาก `npm run seed`    |
| Staff     | `staff@kmutt.ac.th`          | `Staff@1234` | สร้างจาก `npm run seed:staff` |
| Student   | `student.test@kmutt.ac.th`   | `Test@1234`  | ข้อมูลตัวอย่าง             |
| Advisor   | `advisor.test@kmutt.ac.th`   | `Test@1234`  | ข้อมูลตัวอย่าง             |
| Executive | `executive.test@kmutt.ac.th` | `Test@1234`  | ข้อมูลตัวอย่าง             |

---

## บทบาทผู้ใช้งาน

### Student
- อัปโหลดและติดตามเอกสารของตนเอง
- รับแจ้งเตือนเมื่อเอกสารใกล้หมดอายุ / หมดอายุ
- ดูสถานะการอนุมัติ พร้อมเหตุผลเมื่อถูกปฏิเสธ
- อัปโหลดเวอร์ชันใหม่เพื่อแก้ไขเอกสารที่ถูกปฏิเสธ
- ย้ายเอกสารไปถังขยะและกู้คืนเองได้

### Advisor (อาจารย์ที่ปรึกษา)
- ดูรายชื่อนักศึกษาในความรับผิดชอบพร้อมสถานะเอกสาร
- เปิด drawer ดูเอกสารรายคน พร้อม badge อนุมัติ / ถูกปฏิเสธ (แสดงเหตุผล)
- เข้าถึงหน้า Documents แยก panel ระหว่างเอกสารนักศึกษา / เอกสารของตนเอง

### Staff (เจ้าหน้าที่)
- **Dashboard**: แสดงสถิติ (รออนุมัติ, อนุมัติเดือนนี้, ปฏิเสธเดือนนี้, ประเภทที่รับผิดชอบ) + คิวรออนุมัติแบบ quick action
- **คิวอนุมัติ** (`/staff/approvals`): ตาราง pending queue พร้อม checkbox batch select, filter ตามประเภทเอกสาร + search
  - อนุมัติ / ปฏิเสธรายบุคคล พร้อมกล่อง note
  - Batch approve / reject พร้อม confirm modal
  - Tab **ประวัติการอนุมัติ**: ดูรายการที่ตนเองเคยดำเนินการแล้ว กรองด้วยสถานะ approved/rejected
- Sidebar แสดง badge จำนวนเอกสารรออนุมัติแบบ live

Staff ถูก assign ให้รับผิดชอบประเภทเอกสาร (`DOC_TYPES.approver_user_id = staff.user_id`)

### Admin
- จัดการผู้ใช้: สร้าง, แก้ไข, เปลี่ยน role, reset password, นำเข้า CSV, ลบหลายรายการ
- จัดการประกาศ (public/authenticated), ประเภทเอกสาร, หลักสูตร, FAQ
- **ประเภทเอกสาร**: กำหนด `requires_approval` และ `approver_user_id` (staff) — แสดง warning เมื่อมีประเภทที่ต้องอนุมัติแต่ยังไม่มี approver
- ถังขยะระบบ, Audit logs, Activity logs
- System settings: ชื่อระบบ, หน่วยงาน, ค่าแจ้งเตือน
- Email template management (เชื่อมกับ SYSTEM_SETTINGS)
- ส่งออกข้อมูลเป็น Excel

### Executive (ผู้บริหาร)
- ดูภาพรวม dashboard สถิติ
- สรุปตามหลักสูตรและระดับปริญญา
- Document explorer แบบ read-only

---

## ฟีเจอร์หลัก

| หมวด | ฟีเจอร์ |
|------|---------|
| **Auth** | JWT access + refresh token, must_change_pw flow, rate limiting |
| **เอกสาร** | Upload (PDF/ภาพ/แนบไฟล์), preview, download, version history, timeline |
| **อนุมัติ** | Approval workflow ต่อประเภทเอกสาร, single/batch approve/reject พร้อม note |
| **ถังขยะ** | Soft delete → restore / permanent delete (admin, student self-restore) |
| **แจ้งเตือน** | Notification center (unread/read), Email scheduler รายวัน 08:00 |
| **ความคิดเห็น** | Comment ต่อเอกสาร (admin, owner, advisor) พร้อมลบได้ |
| **FAQ** | Admin จัดการ Q&A, แสดงในหน้า Help |
| **ประกาศ** | Public/authenticated announcements พร้อมรูปภาพ |
| **การตั้งค่า** | System settings + Email templates เก็บในฐานข้อมูล |
| **Profile** | แก้ไขโปรไฟล์ + อัปโหลดรูป profile (crop modal) |
| **i18n** | สลับภาษา TH/EN แบบ real-time ผ่าน LanguageContext |
| **Theme** | Light/Dark mode จำค่าด้วย localStorage (ไม่ flash) |
| **Excel Export** | ส่งออกรายการเอกสารแยกตาม role / degree / หลักสูตร |

---

## Approval Workflow

```
นักศึกษาอัปโหลดเอกสาร
    ↓
ระบบตรวจ DOC_TYPES.requires_approval
    ↓ (ถ้า requires_approval = true)
สถานะ = "pending" → Staff ที่ assign ได้รับแจ้งเตือน
    ↓
Staff อนุมัติ / ปฏิเสธ (พร้อม note)
    ↓
นักศึกษาเห็น badge สถานะใน DocumentsPage
    ↓ (ถ้าถูกปฏิเสธ)
แสดง rejection note + CTA อัปโหลดเวอร์ชันใหม่
```

---

## API Overview

Base path: `/api`

| Module             | Path                  | หมายเหตุ                          |
| ------------------ | --------------------- | --------------------------------- |
| Auth               | `/api/auth`           | login, refresh, logout            |
| Users              | `/api/users`          | CRUD, import, bulk ops            |
| Documents          | `/api/documents`      | upload, approve, reject, bulk ops |
| Notifications      | `/api/notifications`  |                                   |
| Announcements      | `/api/announcements`  |                                   |
| Document Types     | `/api/doc-types`      |                                   |
| FAQ                | `/api/faq`            |                                   |
| Staff              | `/api/staff`          | stats, history                    |
| Admin Stats        | `/api/admin`          |                                   |
| Settings           | `/api/settings`       | system settings + email templates |
| Logs               | `/api/logs`           | audit + activity logs             |
| Executive          | `/api/executive`      |                                   |
| Reference          | `/api/reference`      | academic year, advisors           |

---

## Scheduler

`server/src/schedulers/documentScheduler.js` รันทุกวันเวลา **08:00 (Asia/Bangkok)**:

1. อัปเดตสถานะเอกสารใกล้หมดอายุ / หมดอายุ
2. ส่ง notification + email แจ้งเตือนตาม template
3. ย้ายเอกสารเข้าถังขยะอัตโนมัติตามเงื่อนไข
4. ลบถาวรเมื่อครบกำหนด
5. บันทึก email logs

Email template ดึงจาก `EMAIL_TEMPLATES` ในฐานข้อมูล — fallback เป็น hardcoded template หากยังไม่ได้รัน migration

---

## Theme System

- `client/src/contexts/ThemeContext.jsx` + `ThemeToggle`
- ใช้ `localStorage.theme` (`light` / `dark`)
- Script ใน `index.html` set `html.dark` ก่อน React render → ไม่มี flash
- Fallback ตาม `prefers-color-scheme`

## Internationalization (i18n)

- `client/src/contexts/LanguageContext.jsx`
- รองรับ TH / EN แบบ real-time ผ่าน `t('section.key')` dot-notation
- `LanguageToggle` component ใน Topbar

---

## แนวทางทดสอบหลัง Deploy

- [ ] Landing + Login: toggle theme ก่อน login ได้
- [ ] Admin: สร้าง user ทุก role, assign approver ให้ doc type
- [ ] Staff: login → Dashboard → คิว → อนุมัติ/ปฏิเสธ → ดู History tab
- [ ] Student: อัปโหลดเอกสาร type ที่ต้องอนุมัติ → เห็น pending badge → ถูกปฏิเสธเห็น note + upload CTA
- [ ] Advisor: เปิด drawer นักศึกษา → เห็น badge อนุมัติ/ปฏิเสธ
- [ ] Admin: Doc Types page → ประเภทที่ไม่มี approver แสดง warning banner + row badge
- [ ] Scheduler: ตรวจ server log 08:00 ว่าทำงาน
- [ ] Refresh หน้า → theme จำค่าเดิม
- [ ] Mobile: sidebar, modal, table อ่านง่าย

---

## Notes

- ไฟล์ upload serve ผ่าน `/uploads`
- theme อยู่ฝั่ง client — ยังไม่บันทึกลงฐานข้อมูล
- งาน build หลักอยู่ที่ `client/`
- `must_change_pw = 1` บังคับเปลี่ยนรหัสผ่านครั้งแรกสำหรับ user ที่ admin สร้าง (seed accounts ตั้งเป็น `0`)
