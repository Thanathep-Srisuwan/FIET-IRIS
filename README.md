# FIET-IRIS

FIET-IRIS (FIET Integrity Research Information System) คือระบบจัดการเอกสารและใบรับรองด้าน Research Integrity / IRB สำหรับคณะครุศาสตร์อุตสาหกรรมและเทคโนโลยี ใช้สำหรับอัปโหลด ติดตามอายุเอกสาร แจ้งเตือนผู้ใช้งาน จัดการประกาศ และดูภาพรวมสำหรับผู้บริหาร

## สถานะปัจจุบัน

- Frontend เป็น React + Vite + Tailwind CSS พร้อม light/dark theme ระดับ root
- ระบบจำค่า theme ด้วย `localStorage.theme` และ bootstrap `html.dark` ก่อน React render เพื่อลด flash
- ใช้ฟอนต์ `Noto Sans Thai` / `Noto Sans` เพื่อให้อ่านภาษาไทยชัดขึ้นทั้ง light และ dark mode
- ปรับ Sidebar, Topbar, landing, login, dashboard, documents, admin และ executive pages ให้รองรับ dark mode สม่ำเสมอขึ้น
- หน้า Admin สำคัญถูกออกแบบใหม่ ได้แก่ Announcements, Email Templates, Document Types, Settings, Users, Trash และ Logs
- Backend เป็น Express + SQL Server พร้อม JWT auth, upload files, notification, email scheduler และ audit logs

## Tech Stack

### Client

- React 18
- Vite 5
- Tailwind CSS
- React Router
- Axios
- Zustand
- Lucide React
- React Hot Toast
- React Quill
- XLSX / ExcelJS

### Server

- Node.js
- Express
- Microsoft SQL Server (`mssql`)
- JWT
- bcrypt
- multer
- nodemailer
- node-cron
- winston
- helmet / cors / express-rate-limit

## โครงสร้างโปรเจกต์

```text
FIET-IRIS/
|-- client/
|   |-- index.html
|   `-- src/
|       |-- components/
|       |   |-- common/          # ThemeToggle, NotificationPanel, StatCard, Skeleton
|       |   `-- layout/          # MainLayout, Sidebar, Topbar
|       |-- contexts/            # AuthContext, ThemeContext
|       |-- pages/
|       |   |-- admin/           # Users, Announcements, Doc Types, Settings, Email Templates, Trash, Logs
|       |   |-- auth/            # Login, Change Password
|       |   |-- dashboard/       # Role-based dashboards
|       |   |-- documents/       # Document list and upload
|       |   |-- executive/       # Overview, program summary, executive documents
|       |   `-- landing/
|       |-- services/            # API service layer
|       `-- utils/
|-- server/
|   `-- src/
|       |-- config/              # Database connection and seed
|       |-- controllers/
|       |-- middlewares/
|       |-- routes/
|       |-- schedulers/          # Document expiry / trash / email scheduler
|       |-- uploads/
|       `-- utils/
`-- SQL/                         # Initial schema and migrations
```

## Prerequisites

- Node.js 18 หรือใหม่กว่า
- npm
- Microsoft SQL Server
- SMTP account สำหรับส่งอีเมลแจ้งเตือน

## การติดตั้ง

ติดตั้ง dependencies ทั้ง root, server และ client:

```bash
npm run install:all
```

หรือแยกติดตั้ง:

```bash
npm install
cd server && npm install
cd ../client && npm install
```

## Database

สร้างฐานข้อมูล SQL Server แล้วรันไฟล์ SQL ตามลำดับ:

1. `SQL/ri_irb_database_v2.sql`
2. `SQL/migration_v3.sql`
3. `SQL/migration_trash.sql`
4. `SQL/migration_v4_settings.sql`
5. `SQL/migration_v5_performance_indexes.sql`
6. `SQL/migration_v6_programs.sql`
7. `SQL/migration_v7_affiliations.sql`
8. `SQL/migration_v8_academic_reference.sql`

หลังจากสร้าง schema แล้ว สามารถ seed ข้อมูลเริ่มต้นได้:

```bash
cd server
npm run seed
```

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

## การรันระหว่างพัฒนา

รัน client และ server พร้อมกันจาก root:

```bash
npm run dev
```

หรือรันแยก:

```bash
npm run dev:server
npm run dev:client
```

ค่าเริ่มต้น:

- Client: `http://localhost:5173`
- Server: `http://localhost:5000`
- Health check: `http://localhost:5000/api/health`

## การ Build

```bash
cd client
npm run build
```

ถ้าเครื่องมีปัญหา global npm path สามารถใช้ Vite โดยตรงจาก dependency ในโปรเจกต์:

```bash
cd client
node node_modules/vite/bin/vite.js build
```

## บัญชีทดสอบ

ถ้ารัน seed/test data ตาม SQL แล้ว สามารถใช้บัญชีตัวอย่างเหล่านี้:

| Role      | Email                        | Password     |
| --------- | ---------------------------- | ------------ |
| Admin     | `admin@kmutt.ac.th`          | `Admin@1234` |
| Student   | `student.test@kmutt.ac.th`   | `Test@1234`  |
| Advisor   | `advisor.test@kmutt.ac.th`   | `Test@1234`  |
| Executive | `executive.test@kmutt.ac.th` | `Test@1234`  |

## บทบาทผู้ใช้งาน

- `student`: อัปโหลดและติดตามเอกสารของตนเอง
- `advisor`: ดูแลและติดตามเอกสารของนักศึกษาในความรับผิดชอบ
- `staff`: ช่วยจัดการข้อมูลและเอกสารในระดับปฏิบัติการ
- `admin`: จัดการผู้ใช้ ประกาศ ประเภทเอกสาร การตั้งค่า เทมเพลตอีเมล ถังขยะ และ logs
- `executive`: ดูภาพรวม สรุปตามหลักสูตร และรายการเอกสารเพื่อประกอบการตัดสินใจ

## ฟีเจอร์หลัก

- Authentication ด้วย access token และ refresh token
- Role-based routing และ role-based dashboards
- Upload, preview, download และ delete เอกสาร
- Trash workflow สำหรับ restore และ permanent delete
- Notification center พร้อม unread/read state
- Announcement management พร้อม public/authenticated announcements และรูปภาพประกอบ
- Document type management พร้อมป้องกันการลบประเภทที่ถูกใช้งานอยู่
- System settings สำหรับชื่อระบบ ชื่อหน่วยงาน และค่าแจ้งเตือน
- Email template management ที่เชื่อมกับ settings และ scheduler
- Executive overview, program summary และ document explorer
- Audit logs และ admin statistics
- Light/dark theme ทั้ง public และ authenticated pages

## Theme System

Theme ถูกจัดการที่ client root ผ่าน `ThemeProvider` และ `useTheme()`:

- `client/src/contexts/ThemeContext.jsx`
- `client/src/components/common/ThemeToggle.jsx`
- `client/src/main.jsx`
- `client/index.html`

ค่า theme ใช้ key เดิมคือ `localStorage.theme` และรองรับค่า `light` / `dark` ถ้าไม่มีค่าใน storage ระบบจะใช้ค่าเริ่มต้นจาก `prefers-color-scheme`

## API Overview

Base path ของ API คือ `/api`

| Module                     | Path                 |
| -------------------------- | -------------------- |
| Auth                       | `/api/auth`          |
| Users                      | `/api/users`         |
| Documents                  | `/api/documents`     |
| Notifications              | `/api/notifications` |
| Announcements              | `/api/announcements` |
| Document Types             | `/api/doc-types`     |
| Executive                  | `/api/executive`     |
| Admin Stats                | `/api/admin`         |
| Settings / Email Templates | `/api/settings`      |
| Logs                       | `/api/logs`          |

## Scheduler และ Email

`server/src/schedulers/documentScheduler.js` จะทำงานเมื่อ server start และตั้งเวลาเช็กเอกสารทุกวันเวลา 08:00 ตามเวลาไทย เพื่อ:

- อัปเดตสถานะเอกสารใกล้หมดอายุ / หมดอายุ
- ส่ง notification และ email ตาม template
- ย้ายเอกสารเข้าถังขยะอัตโนมัติตามเงื่อนไข
- ลบถาวรเมื่อครบกำหนด
- บันทึก email logs

Email template และ system settings ถูกเก็บในฐานข้อมูล โดยมี fallback template ในโค้ดสำหรับกรณีที่ยังไม่ได้รัน migration

## แนวทางตรวจสอบหลังแก้ UI

- เปิด landing และ login แล้ว toggle theme ได้ก่อน login
- Login แล้วตรวจ Sidebar / Topbar / Dashboard / Documents
- ตรวจ Admin pages: Users, Announcements, Doc Types, Settings, Email Templates, Trash, Logs
- ตรวจ Executive pages: Overview, Program Summary, Documents
- Refresh หน้าแล้ว theme ยังจำค่าเดิม
- ลบ `localStorage.theme` แล้วตรวจว่าค่าเริ่มต้นตาม system preference
- ตรวจ mobile และ desktop ว่า navigation, modal, table และ form อ่านง่ายใน dark mode

## Notes

- โปรเจกต์นี้ยังใช้ Tailwind `darkMode: 'class'`
- การตั้งค่า theme อยู่ฝั่ง client เท่านั้น ยังไม่บันทึก preference ลงฐานข้อมูล
- ไฟล์ upload ถูก serve ผ่าน `/uploads`
- งาน build หลักอยู่ที่ `client`
