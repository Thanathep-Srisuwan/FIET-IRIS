# FIET-IRIS

**FIET Integrity Research Information System**  
ระบบจัดเก็บใบประกาศ RI/IRB — คณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี มจธ.

---

## Tech Stack

| Layer     | เทคโนโลยี                      |
| --------- | ------------------------------ |
| Frontend  | React 18 + Vite + Tailwind CSS |
| Backend   | Node.js + Express              |
| Database  | MSSQL (SQL Server)             |
| Auth      | JWT (Access + Refresh Token)   |
| Scheduler | node-cron                      |
| Email     | Nodemailer + Winston           |

## โครงสร้างโปรเจ็ค

```
FIET-IRIS/
├── client/                  # React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # StatCard, NotificationPanel
│   │   │   └── layout/      # Sidebar, Topbar, MainLayout
│   │   ├── pages/
│   │   │   ├── landing/     # LandingPage (หน้าแรก)
│   │   │   ├── auth/        # LoginPage, ChangePasswordPage
│   │   │   ├── dashboard/   # DashboardPage (router), StudentDashboard, AdvisorDashboard, AdminDashboard, StaffDashboard
│   │   │   ├── documents/   # DocumentsPage, UploadPage
│   │   │   ├── admin/       # AdminUsersPage, AdminLogsPage, AdminAnnouncementsPage, AdminDocTypesPage, AdminTrashPage
│   │   │   └── executive/   # ExecutiveDashboard, BranchSummaryPage, ExecutiveDocumentsPage
│   │   ├── services/        # api.js (axios)
│   │   └── stores/          # authStore.js (Zustand)
│   └── package.json
│
├── server/                  # Express Backend
│   ├── src/
│   │   ├── config/          # db.js, seed.js
│   │   ├── controllers/     # Business logic แยกตาม resource
│   │   ├── middlewares/     # auth.js, validate.js
│   │   ├── routes/          # API routes แยกตาม resource
│   │   ├── schedulers/      # documentScheduler.js (node-cron)
│   │   ├── utils/           # logger.js (Winston), mailer.js
│   │   └── app.js           # Express entry point
│   ├── uploads/
│   │   ├── ri/              # ไฟล์ RI
│   │   ├── irb/             # ไฟล์ IRB
│   │   └── announcements/   # รูปภาพประกาศ
│   └── package.json
│
└── README.md
```

## เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies

```bash
# ติดตั้งทุก layer พร้อมกัน (แนะนำ)
npm run install:all

# หรือติดตั้งแยก
npm install
cd server && npm install
cd client && npm install
```

### 2. ตั้งค่า Environment

```bash
cp server/.env.example server/.env
# แก้ไขค่าใน server/.env ให้ตรงกับระบบ
```

### 3. รัน Database Script

```
รัน ri_irb_database_v2.sql ใน SSMS ก่อน
```

### 4. Seed Admin คนแรก

```bash
cd server && npm run seed
```

### 5. รันระบบ

```bash
# รัน Frontend + Backend พร้อมกัน (จาก root)
npm run dev
```

## API Endpoints

### Auth

| Method | Endpoint                  | คำอธิบาย        |
| ------ | ------------------------- | --------------- |
| POST   | /api/auth/login           | เข้าสู่ระบบ    |
| POST   | /api/auth/logout          | ออกจากระบบ      |
| POST   | /api/auth/refresh         | Refresh token   |
| PUT    | /api/auth/change-password | เปลี่ยนรหัสผ่าน |

### Documents

| Method | Endpoint                              | คำอธิบาย                         | สิทธิ์      |
| ------ | ------------------------------------- | --------------------------------- | ----------- |
| GET    | /api/documents                        | ดูรายการเอกสาร                   | ทุก role    |
| GET    | /api/documents/:id                    | ดูเอกสารรายชิ้น                  | ทุก role    |
| POST   | /api/documents                        | อัปโหลดเอกสาร (multipart/form-data, max 5 files, 10 MB) | ทุก role |
| DELETE | /api/documents/:id                    | ย้ายเอกสารไปถังขยะ               | admin       |
| GET    | /api/documents/:id/files/:fileId/download | ดาวน์โหลดไฟล์                | ทุก role    |
| GET    | /api/documents/:id/files/:fileId/preview  | พรีวิวไฟล์                   | ทุก role    |
| GET    | /api/documents/summary                | สรุปสถิติเอกสาร                  | admin       |
| GET    | /api/documents/trash                  | ดูเอกสารในถังขยะ                 | admin       |
| PUT    | /api/documents/:id/restore            | กู้คืนเอกสาร                     | admin       |
| DELETE | /api/documents/:id/permanent          | ลบถาวร                           | admin       |
| PUT    | /api/documents/trash/bulk-restore     | กู้คืนหลายเอกสารพร้อมกัน        | admin       |
| DELETE | /api/documents/trash/bulk-permanent   | ลบถาวรหลายเอกสารพร้อมกัน        | admin       |

### Users

| Method | Endpoint                    | คำอธิบาย                    | สิทธิ์ |
| ------ | --------------------------- | --------------------------- | ------ |
| GET    | /api/users                  | ดูรายชื่อผู้ใช้ทั้งหมด     | admin  |
| GET    | /api/users/search           | ค้นหาผู้ใช้                 | admin  |
| GET    | /api/users/advisors         | ดูรายชื่ออาจารย์ที่ปรึกษา   | ทุก role |
| POST   | /api/users                  | สร้างผู้ใช้ใหม่             | admin  |
| POST   | /api/users/import           | Import ผู้ใช้จาก Excel      | admin  |
| PUT    | /api/users/:id              | แก้ไขข้อมูลผู้ใช้           | admin  |
| PATCH  | /api/users/:id/toggle       | เปิด/ปิดบัญชีผู้ใช้         | admin  |
| POST   | /api/users/:id/reset-password | รีเซ็ตรหัสผ่าน            | admin  |
| DELETE | /api/users/bulk             | ลบผู้ใช้หลายคนพร้อมกัน      | admin  |
| PATCH  | /api/users/bulk/toggle      | เปิด/ปิดบัญชีหลายคนพร้อมกัน | admin |

### Notifications

| Method | Endpoint                      | คำอธิบาย                    |
| ------ | ----------------------------- | --------------------------- |
| GET    | /api/notifications            | ดูการแจ้งเตือนทั้งหมด       |
| GET    | /api/notifications/unread     | ดูการแจ้งเตือนที่ยังไม่อ่าน |
| PUT    | /api/notifications/read-all   | อ่านทั้งหมด                 |
| PUT    | /api/notifications/:id/read   | อ่านรายการ                   |

### Announcements

| Method | Endpoint                       | คำอธิบาย               | สิทธิ์  |
| ------ | ------------------------------ | ----------------------- | ------- |
| GET    | /api/announcements/public      | ดูประกาศสาธารณะ (ไม่ต้อง login) | - |
| GET    | /api/announcements             | ดูประกาศทั้งหมด         | ทุก role |
| POST   | /api/announcements             | สร้างประกาศ (รูปภาพ max 5 MB) | admin |
| PUT    | /api/announcements/read-all    | อ่านทั้งหมด             | ทุก role |
| PUT    | /api/announcements/:id/read    | อ่านรายการ              | ทุก role |
| DELETE | /api/announcements/:id         | ลบประกาศ               | admin   |

### Doc Types

| Method | Endpoint            | คำอธิบาย                  | สิทธิ์  |
| ------ | ------------------- | ------------------------- | ------- |
| GET    | /api/doc-types      | ดูประเภทเอกสารทั้งหมด     | ทุก role |
| POST   | /api/doc-types      | เพิ่มประเภทเอกสาร         | admin   |
| DELETE | /api/doc-types/:id  | ลบประเภทเอกสาร            | admin   |

### Executive

| Method | Endpoint                   | คำอธิบาย                        | สิทธิ์            |
| ------ | -------------------------- | ------------------------------- | ----------------- |
| GET    | /api/executive/overview    | ภาพรวมสถิติทั้งระบบ             | admin, executive  |
| GET    | /api/executive/branches    | สรุปสถิติตามสาขา                | admin, executive  |
| GET    | /api/executive/documents   | ดูเอกสารทั้งหมดในระบบ           | admin, executive  |

### Admin

| Method | Endpoint           | คำอธิบาย            | สิทธิ์ |
| ------ | ------------------ | ------------------- | ------ |
| GET    | /api/admin/stats   | สถิติภาพรวม admin   | admin  |
| GET    | /api/logs/deletions | ประวัติการลบเอกสาร | admin  |

## Roles

| Role      | สิทธิ์                                              |
| --------- | --------------------------------------------------- |
| student   | อัปโหลด/ดูเอกสารของตัวเอง                         |
| advisor   | ดูเอกสารของนักศึกษาในที่ปรึกษา                     |
| staff     | อัปโหลด/ดูเอกสารของตัวเอง (บุคลากร)               |
| executive | ดูภาพรวมสถิติและเอกสารทั้งระบบ                     |
| admin     | จัดการทุกอย่างในระบบ                               |

## Scheduler (node-cron)

ระบบรันทุกวัน **08:00 น. (เวลาไทย)** และทันทีเมื่อ server เริ่มต้น:

1. อัปเดตสถานะเอกสารผ่าน `sp_UpdateDocumentStatus`
2. ย้ายเอกสารหมดอายุไปถังขยะโดยอัตโนมัติ
3. ลบถาวรเอกสารที่อยู่ในถังขยะนานเกิน **30 วัน** (พร้อมส่ง email + in-app notification)
4. ส่ง email + in-app notification เตือนเอกสารที่ใกล้หมดอายุ

## Email && Password สำหรับเทสระบบ

### Admin

```
Email   : admin@kmutt.ac.th
Password: Admin@1234
```

### Student

```
Email   : student.test@kmutt.ac.th
Password: Test@1234
```

### Advisor

```
Email   : advisor.test@kmutt.ac.th
Password: Test@1234
```

### Executive

```
Email   : executive.test@kmutt.ac.th
Password: Test@1234
```
