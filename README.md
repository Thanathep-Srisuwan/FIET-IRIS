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
| Email     | Nodemailer                     |

## โครงสร้างโปรเจ็ค

```
FIET-IRIS/
├── client/                  # React + Vite Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/      # Shared components
│   │   │   └── layout/      # Sidebar, Topbar, MainLayout
│   │   ├── pages/
│   │   │   ├── auth/        # Login, ChangePassword
│   │   │   ├── dashboard/   # Dashboard
│   │   │   ├── documents/   # Documents, Upload
│   │   │   └── admin/       # AdminUsers, AdminLogs
│   │   ├── services/        # API calls (axios)
│   │   ├── stores/          # Zustand state management
│   │   └── utils/
│   └── package.json
│
├── server/                  # Express Backend
│   ├── src/
│   │   ├── config/          # db.js, seed.js
│   │   ├── controllers/     # Business logic
│   │   ├── middlewares/     # auth.js, validate.js
│   │   ├── routes/          # API routes
│   │   ├── schedulers/      # node-cron jobs
│   │   ├── utils/           # logger.js, mailer.js
│   │   └── app.js           # Express entry point
│   ├── uploads/
│   │   ├── ri/              # ไฟล์ RI
│   │   └── irb/             # ไฟล์ IRB
│   └── package.json
│
└── README.md
```

## เริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies

```bash
# Root
npm install

# Server
cd server && npm install

# Client
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

| Method | Endpoint                  | คำอธิบาย                 |
| ------ | ------------------------- | ------------------------ |
| POST   | /api/auth/login           | เข้าสู่ระบบ              |
| POST   | /api/auth/logout          | ออกจากระบบ               |
| PUT    | /api/auth/change-password | เปลี่ยนรหัสผ่าน          |
| POST   | /api/auth/refresh         | Refresh token            |
| GET    | /api/documents            | ดูรายการเอกสาร           |
| POST   | /api/documents            | อัปโหลดเอกสาร            |
| DELETE | /api/documents/:id        | ลบเอกสาร                 |
| GET    | /api/notifications/unread | ดูการแจ้งเตือน           |
| GET    | /api/users                | ดูรายชื่อผู้ใช้ (admin)  |
| POST   | /api/users/import         | Import จาก Excel (admin) |

## Roles

| Role    | สิทธิ์                         |
| ------- | ------------------------------ |
| student | อัปโหลด/ดูเอกสารของตัวเอง      |
| advisor | ดูเอกสารของนักศึกษาในที่ปรึกษา |
| admin   | จัดการทุกอย่างในระบบ           |

### 6. Email && Password สำหรับเทสระบบ

### Admin

```Email
admin@kmutt.ac.th
```

```Password
Admin@1234
```

### Student

```Email
student.test@kmutt.ac.th
```

```Password
Test@1234
```

### Advisor

```Email
advisor.test@kmutt.ac.th
```

```Password
Test@1234
```

### Executive

```Email
executive.test@kmutt.ac.th
```

```Password
Test@1234
```
