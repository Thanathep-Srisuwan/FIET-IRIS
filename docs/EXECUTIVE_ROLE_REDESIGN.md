# FIET-IRIS — Executive Role: UX/UI Redesign Plan

> **วันที่วิเคราะห์:** 2026-05-18  
> **ผู้วิเคราะห์:** Claude Code (claude-sonnet-4-6)  
> **สถานะ:** Draft — รอ Review และ Approve ก่อน Implement  
> **Branch เป้าหมาย:** `feature/executive-ui-redesign`

---

## สารบัญ

1. [ภาพรวมระบบปัจจุบัน (As-Is)](#1-ภาพรวมระบบปัจจุบัน-as-is)
2. [การวิเคราะห์ปัญหาและช่องว่าง (Gap Analysis)](#2-การวิเคราะห์ปัญหาและช่องว่าง)
3. [โครงสร้างระบบใหม่ (To-Be Architecture)](#3-โครงสร้างระบบใหม่-to-be-architecture)
4. [แผน Redesign ทีละหน้า](#4-แผน-redesign-ทีละหน้า)
   - [4.1 Overview Dashboard (P0)](#41-หน้า-overview-dashboard--execuiveoverview--p0)
   - [4.2 Program Summary (P0)](#42-หน้า-program-summary--execuiveprograms--p0)
   - [4.3 Documents Explorer (P1)](#43-หน้า-documents-explorer--execuivedocuments--p1)
   - [4.4 Approval Oversight — ใหม่ (P1)](#44-หน้า-approval-oversight--execuiveapprovals--ใหม่-p1)
   - [4.5 Advisor Overview — ใหม่ (P2)](#45-หน้า-advisor-overview--execuiveadvisors--ใหม่-p2)
   - [4.6 Announcements View — ใหม่ (P2)](#46-หน้า-announcements-view--execuiveannouncements--ใหม่-p2)
5. [การเปลี่ยนแปลง API (Backend)](#5-การเปลี่ยนแปลง-api-backend)
6. [การเปลี่ยนแปลง Navigation & Sidebar](#6-การเปลี่ยนแปลง-navigation--sidebar)
7. [Design System & Component Guidelines](#7-design-system--component-guidelines)
8. [แผนการ Implement (Roadmap)](#8-แผนการ-implement-roadmap)
9. [ข้อเสนอแนะเพิ่มเติม (Future Enhancements)](#9-ข้อเสนอแนะเพิ่มเติม)
10. [Appendix: โครงสร้างไฟล์ปัจจุบัน](#10-appendix-โครงสร้างไฟล์ปัจจุบัน)

---

## 1. ภาพรวมระบบปัจจุบัน (As-Is)

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite 5, React Router v6, Tailwind CSS, Zustand, Axios |
| Backend | Node.js + Express, MSSQL (SQL Server) |
| Auth | JWT (access 15m / refresh 7d), bcrypt |
| Charting | ไม่ใช้ library — ใช้ `div` HTML แทน |
| i18n | React Context (TH/EN สลับ real-time) |
| Icons | Lucide React |

### Role System

```
student  → advisor  → staff  → admin  → executive
  ↑ อัพโหลด    ↑ supervise  ↑ อนุมัติ  ↑ จัดการ   ↑ ดูภาพรวม
```

**Executive** — อ่านอย่างเดียว, เห็น analytics ระดับคณะ, **ไม่มีสิทธิ์แก้ไขหรืออนุมัติ**

### หน้าที่มีอยู่สำหรับ Executive (3 หน้า)

| หน้า | Route | ไฟล์ |
|------|-------|------|
| ภาพรวม | `/executive/overview` | `client/src/pages/executive/ExecutiveDashboard.jsx` (163 บรรทัด) |
| สรุปสาขา | `/executive/programs` | `client/src/pages/executive/ProgramSummaryPage.jsx` (194 บรรทัด) |
| เอกสาร | `/executive/documents` | `client/src/pages/executive/ExecutiveDocumentsPage.jsx` (541 บรรทัด) |

### API Endpoints ปัจจุบัน

| Endpoint | Method | Auth | คำอธิบาย |
|----------|--------|------|----------|
| `/api/executive/overview` | GET | admin, executive | ภาพรวม stats + trend 6 เดือน |
| `/api/executive/programs` | GET | admin, executive | สรุปรายสาขา |
| `/api/executive/branches` | GET | admin, executive | alias ของ programs |
| `/api/executive/documents` | GET | admin, executive | รายการเอกสารทั้งหมด (filter ได้) |

### ข้อมูลที่ Overview API ส่งกลับ

```json
{
  "stats": {
    "total_docs": 482,
    "active": 310,
    "expiring_soon": 89,
    "expired": 83,
    "ri_count": 328,
    "irb_count": 154
  },
  "users": {
    "total_users": 267,
    "students": 245,
    "advisors": 18,
    "staff": 4
  },
  "trend": [
    { "month": "2025-12", "count": 45, "ri": 30, "irb": 15 }
  ],
  "topExpiring": [
    { "program": "CPE", "expiring_count": 22 }
  ]
}
```

---

## 2. การวิเคราะห์ปัญหาและช่องว่าง

### 2.1 ปัญหาด้าน UI/UX ปัจจุบัน

| ปัญหา | หน้าที่กระทบ | ระดับ |
|-------|------------|-------|
| ใช้ inline styles ปนกับ Tailwind ทำให้ Dark Mode ทำงานไม่สมบูรณ์ | Overview | สูง |
| Chart เป็น `div` HTML ทั่วไป — ไม่มี tooltip, ไม่มี hover interaction | Overview | สูง |
| ไม่มี Date Range Filter — เห็นแค่ real-time snapshot | Overview, Programs | สูง |
| ไม่มี Trend เปรียบเทียบ — ไม่รู้ว่าตัวเลขดีขึ้นหรือแย่ลงจากเดือนที่แล้ว | Overview | กลาง |
| คลิก Program แล้วไม่ได้ข้อมูลเพิ่ม — ไม่มี drill-down | Programs | สูง |
| ไม่มี filter by Affiliation หรือ Degree Level ในหน้า Programs | Programs | กลาง |
| ไม่มี Pagination — โหลดเอกสารทั้งหมดพร้อมกัน (ช้าถ้าข้อมูลมาก) | Documents | กลาง |
| ExecDetailModal มีฟอร์ม upload version — **ผิด role ความรับผิดชอบ** | Documents | สูง |
| ไม่มี Loading skeleton — เห็นแค่ข้อความ "กำลังโหลด..." | ทุกหน้า | ต่ำ |
| ไม่มี Empty state ที่สวยงาม | ทุกหน้า | ต่ำ |

### 2.2 ฟีเจอร์ที่ขาดหายไป (Feature Gaps)

| ฟีเจอร์ที่ขาด | ผลกระทบ | ลำดับความสำคัญ |
|--------------|---------|--------------|
| **Approval Oversight** — ผู้บริหารไม่เห็น bottleneck ในกระบวนการอนุมัติ | สูง — ตัดสินใจกำกับดูแลไม่ได้ | P1 |
| **Advisor Performance View** — ไม่เห็นภาระงานอาจารย์ที่ปรึกษา | สูง — ประเมินอาจารย์ไม่ได้ | P2 |
| **Date Range Analytics** — ดูข้อมูลช่วงเวลาที่ต้องการไม่ได้ | กลาง — ไม่ยืดหยุ่น | P0 |
| **KPI Trend Comparison** — ไม่มีการเปรียบเทียบ period-over-period | กลาง — ไม่รู้ทิศทาง | P0 |
| **Critical Alerts Panel** — ไม่มีการแจ้งเตือนเชิงรุก | กลาง — ต้องค้นหาเอง | P1 |
| **Program Drill-down** — คลิก Program ไม่เห็นข้อมูลนักศึกษา | กลาง — ต้องสลับหน้า | P0 |
| **Announcements View** — ผู้บริหารไม่เห็นประกาศที่ออกไป | ต่ำ | P2 |
| **PDF Export / Print Report** — ส่งรายงานในที่ประชุมไม่ได้ | ต่ำ | P3 |

---

## 3. โครงสร้างระบบใหม่ (To-Be Architecture)

### 3.1 Navigation Structure ใหม่

```
Executive Sidebar
├── 📊  ภาพรวมระบบ              /executive/overview        [P0 Redesign]
├── 🏛️  สรุปรายสาขาวิชา         /executive/programs        [P0 Redesign]
├── 📋  เอกสารทั้งหมด            /executive/documents       [P1 Redesign]
├── ✅  สถานะการอนุมัติ          /executive/approvals   🆕  [P1 New]
├── 👨‍🏫  ภาพรวมอาจารย์ที่ปรึกษา   /executive/advisors    🆕  [P2 New]
└── 📢  ประกาศในระบบ            /executive/announcements 🆕  [P2 New]
```

### 3.2 Component Architecture

```
client/src/
├── pages/executive/
│   ├── ExecutiveDashboard.jsx        ← Redesign (P0)
│   ├── ProgramSummaryPage.jsx        ← Redesign (P0)
│   ├── ExecutiveDocumentsPage.jsx    ← Redesign (P1)
│   ├── ExecutiveApprovalsPage.jsx    🆕 New (P1)
│   ├── ExecutiveAdvisorsPage.jsx     🆕 New (P2)
│   └── ExecutiveAnnouncementsPage.jsx 🆕 New (P2)
│
├── components/executive/             🆕 Shared components
│   ├── KpiCard.jsx
│   ├── TrendBadge.jsx
│   ├── DateRangePicker.jsx
│   ├── ProgramDrillPanel.jsx
│   ├── AlertsPanel.jsx
│   └── ExecDetailModal.jsx           ← ย้ายมาจาก page (ตัด upload form ออก)
│
└── services/api.js                   ← เพิ่ม endpoint ใหม่
```

### 3.3 Server Architecture ใหม่

```
server/src/
├── routes/executive.routes.js        ← เพิ่ม routes ใหม่
└── controllers/executive.controller.js ← เพิ่ม functions ใหม่
```

---

## 4. แผน Redesign ทีละหน้า

---

### 4.1 หน้า Overview Dashboard (`/executive/overview`) — P0

#### สิ่งที่ต้องเปลี่ยนแปลง

**ลบออก:**
- Inline styles ทั้งหมด → แทนด้วย Tailwind classes
- StatCard component แบบเดิม → ใช้ KpiCard ใหม่
- Bar chart แบบ div → ใช้ Recharts StackedBarChart

**เพิ่มใหม่:**
- Date Range Picker (30d / 90d / 6m / 1y / Custom)
- TrendBadge บน KPI cards (แสดง `↑ 12%` vs period ก่อนหน้า)
- Critical Alerts Panel (เอกสารหมดอายุ ≤30 วัน, pending นาน, นักศึกษาไม่มีเอกสาร)
- Stacked Bar Chart พร้อม tooltip (RI vs IRB แยกสี)
- Staff count ใน Users Overview
- Approval Backlog Widget

#### Layout Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ภาพรวมระบบ FIET-IRIS                    [30d] [90d] [6m] [1y] [Custom ▼]│
│  ข้อมูล ณ วันที่ 18 พฤษภาคม 2569                                          │
├─────────────┬─────────────┬─────────────┬──────────────────────────────-─┤
│ เอกสารทั้งหมด│  ใช้งานได้  │  ใกล้หมดอายุ │     หมดอายุแล้ว               │
│    482      │  310  ↑5%  │   89  ↑12%  │     83  ↓3%                   │
│  total docs │  active    │  expiring   │     expired                   │
├─────────────┴─────────────┴─────────────┴───────────────────────────────┤
│                                                                          │
│   Stacked Bar Chart (Recharts)           │  ⚠ Critical Alerts            │
│   RI [██] IRB [░░]                       │  ─────────────────────────   │
│                                          │  ⚠ หมดอายุใน 7 วัน: 12 ฉบับ  │
│   Jan Feb Mar Apr May Jun               │  ⏳ Pending > 14 วัน: 3 ฉบับ  │
│                                          │  👤 ไม่มีเอกสาร: 5 คน         │
│   [tooltip on hover]                     │  ✅ อนุมัติวันนี้: 7 ฉบับ    │
├──────────────────────────────────────────┼──────────────────────────────┤
│  สัดส่วน RI / IRB                        │  ผู้ใช้งานในระบบ              │
│                                          │  ─────────────────────────   │
│  RI  [████████████░░░░] 68%  328 ฉบับ   │  นักศึกษา     245 คน  ████▌  │
│  IRB [████████░░░░░░░░] 32%  154 ฉบับ   │  อาจารย์       18 คน  ██     │
│                                          │  เจ้าหน้าที่    4 คน  ▌      │
│  [ดูรายละเอียด →]                        │  รวม 267 คน               │
├──────────────────────────────────────────┴──────────────────────────────┤
│  Top 3 สาขาที่มีเอกสารใกล้หมดอายุ                                        │
│  1. CPE  ████████████░░  22 ฉบับ   [ดูสาขา →]                           │
│  2. EE   █████████░░░░░  17 ฉบับ   [ดูสาขา →]                           │
│  3. ISE  ██████░░░░░░░░  11 ฉบับ   [ดูสาขา →]                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### KpiCard Component Spec

```jsx
// Props:
{
  label: string,          // "เอกสารทั้งหมด"
  value: number,          // 482
  previousValue: number,  // ค่าจาก period ก่อนหน้า (เพื่อคำนวณ trend)
  color: 'blue'|'green'|'orange'|'red',
  icon: LucideIcon,
  onClick?: () => void    // optional drill-down
}

// แสดง: value ใหญ่ + TrendBadge (↑12% / ↓3%)
// TrendBadge: เขียวถ้าดีขึ้น, แดงถ้าแย่ลง (ขึ้นอยู่กับ metric: expired ลดถือว่าดี)
```

#### API Changes ที่ต้องการ

```
GET /api/executive/overview?from=2025-11-01&to=2026-05-18

Response เพิ่ม:
{
  "stats": { ...เดิม..., "pending_approval": 23 },
  "comparison": {               ← ใหม่: ข้อมูล period ก่อนหน้า
    "total_docs": 460,
    "active": 295,
    "expiring_soon": 79,
    "expired": 86
  },
  "alerts": {                   ← ใหม่
    "expiring_7_days": 12,
    "pending_over_14_days": 3,
    "students_no_docs": 5,
    "approved_today": 7
  }
}
```

---

### 4.2 หน้า Program Summary (`/executive/programs`) — P0

#### สิ่งที่ต้องเปลี่ยนแปลง

**เพิ่มใหม่:**
- Filter bar: Affiliation dropdown + Degree Level dropdown
- View toggle: Bar chart / Heat Map
- Clickable rows → Side Panel (Program Drill-down)
- ใน Side Panel: รายชื่อนักศึกษา + เอกสารในสาขานั้น
- Export ที่ filter ตาม current selection

**ปรับปรุง:**
- Bar chart → ใช้ Recharts HorizontalBarChart พร้อม tooltip
- Sort buttons → ออกแบบใหม่ให้ชัดเจนขึ้น
- Table header → sortable columns (click เพื่อ sort)

#### Layout Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│  สรุปรายสาขาวิชา                                            [Export CSV] │
│  ภาพรวมเอกสารจำแนกตามสาขา                                               │
├──────────────────────────────────────────────────────────────────────────┤
│  [Affiliation: ทั้งหมด ▼]  [ระดับ: ทั้งหมด ▼]   เรียงตาม: [รวม▼]        │
│  View: [● แท่ง] [○ ตาราง Heat]                                           │
├──────────────────────────────────────────────────────────────────────────┤
│  แผนภูมิแท่ง (Recharts)                                                  │
│  CPE   [████████████ active][████ expiring][██ expired] 95 ฉบับ ▶        │
│  EE    [█████████ active][████ expiring][██ expired]    60 ฉบับ ▶        │
│  ISE   [████████ active][███ expiring][█ expired]       52 ฉบับ ▶        │
│  ME    [███████ active][██ expiring][█ expired]         41 ฉบับ ▶        │
│  ...                                                                      │
│  Legend: [■ ใช้งานได้] [■ ใกล้หมด] [■ หมดอายุ]                          │
├──────────────────────────────────────────────────────────────────────────┤
│  ตารางสรุป                                                                │
│  สาขา ↕ │ นักศึกษา ↕ │ รวม ↕ │ ใช้งาน ↕ │ ใกล้หมด ↕ │ หมด ↕ │ RI │ IRB│
│  CPE     │     45     │   95   │   65     │    22      │   8   │ 60 │ 35 │
│  EE      │     32     │   60   │   41     │    12      │   7   │ 45 │ 15 │
└──────────────────────────────────────────────────────────────────────────┘

Side Panel (เมื่อคลิก ▶ หรือ row):
┌─────────────────────────────────────────┐
│  ✕   สาขา CPE                           │
│      45 นักศึกษา · 95 เอกสาร           │
│  ────────────────────────────────────   │
│  [ค้นหาชื่อนักศึกษา...]                 │
│                                         │
│  นาย กนกวรรณ ใจดี         RI  ✓ active  │
│  นาง จิรา สุขใจ            IRB ⚠ expiring│
│  นาย ชัย มั่นคง            RI  ✗ expired │
│  ...                                    │
│                                         │
│  [ดูเอกสารทั้งหมดของสาขานี้ →]          │
└─────────────────────────────────────────┘
```

#### API Changes ที่ต้องการ

```
GET /api/executive/programs?affiliation=KMUTT&degree_level=master

เพิ่ม query params: affiliation, degree_level

GET /api/executive/programs/:program/students
Response:
{
  "program": "CPE",
  "students": [
    {
      "user_id": 1,
      "name": "นาย กนกวรรณ ใจดี",
      "student_id": "64070001",
      "doc_count": 2,
      "latest_status": "active",
      "latest_expire_date": "2026-12-31"
    }
  ]
}
```

---

### 4.3 หน้า Documents Explorer (`/executive/documents`) — P1

#### สิ่งที่ต้องเปลี่ยนแปลง

**ลบออก:**
- Upload Version form ใน ExecDetailModal — **ผู้บริหารไม่ควรอัพโหลดได้**

**เพิ่มใหม่:**
- Pagination (20 rows/page) — API รองรับอยู่แล้ว แต่ frontend ไม่ได้ใช้
- Approval status column — แสดง pending/approved/rejected
- Date range filter — กรองตาม issue_date หรือ expire_date
- Sort by columns — คลิก column header เพื่อ sort
- Total count display — "แสดง 20 จาก 482 เอกสาร"
- Bulk Export กับ filter ปัจจุบัน

**ปรับปรุง:**
- Filter layout — จัดให้เป็น 2 แถว (basic / advanced toggle)
- ExecDetailModal — แสดง approval history + timeline (ตัด upload ออก)
- Empty state — เพิ่ม illustration + ข้อความที่ชัดเจน

#### Layout Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│  เอกสารทั้งหมด                              แสดง 20 จาก 482  [Export ▼]  │
├──────────────────────────────────────────────────────────────────────────┤
│  [🔍 ค้นหาชื่อเอกสาร/เจ้าของ]  [ประเภท ▼]  [สถานะ ▼]  [ระดับ ▼]  [สาขา ▼]│
│  [▼ ตัวกรองเพิ่มเติม]                                                    │
│    ├── วันออก: [____] ถึง [____]                                          │
│    ├── วันหมด: [____] ถึง [____]                                          │
│    └── สถานะอนุมัติ: [ทั้งหมด ▼]                                          │
├──────────────────────────────────────────────────────────────────────────┤
│  ชื่อเอกสาร ↕  │ ประเภท │ เจ้าของ ↕ │ สาขา │ อาจารย์ │ วันหมด ↕ │ สถานะ│
│  วิจัย RI 2024  │  RI    │ นาย ก...  │ CPE  │ ดร.ข    │ 31/12/66 │ ✓    │
│  โครงการ IRB... │  IRB   │ นาง ข...  │ EE   │ ผศ.ค    │ 15/6/66  │ ⚠    │
├──────────────────────────────────────────────────────────────────────────┤
│  ← ก่อนหน้า    หน้า [1] 2 3 ... 25    ถัดไป →                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### ExecDetailModal ที่ปรับปรุงแล้ว

```
┌──────────────────────────────────────────────────────┐
│  RI  ● ใช้งานได้            ✕                        │
│  วิจัยเรื่อง...                                       │
├──────────────────────────────────────────────────────┤
│  วันออก: 01/01/2567  │  วันหมด: 31/12/2567           │
│                      │  เหลือ 226 วัน                │
├──────────────────────────────────────────────────────┤
│  เจ้าของเอกสาร                                       │
│  [👤] นาย กนกวรรณ ใจดี  64070001                    │
│       nk@mail.kmutt.ac.th                            │
│       อาจารย์ที่ปรึกษา: ดร. ข วิชาการ               │
├──────────────────────────────────────────────────────┤
│  สถานะการอนุมัติ                                     │
│  ✅ อนุมัติแล้ว — นาย Staff เมื่อ 15 ม.ค. 2567      │
│  หมายเหตุ: "ตรวจสอบแล้ว ถูกต้อง"                    │
├──────────────────────────────────────────────────────┤
│  ไฟล์แนบ (3 ไฟล์)                                    │
│  📄 research_ri_2024.pdf  v2  [Preview] [Download]  │
│  📄 certificate.pdf       v1  [Preview] [Download]  │
│  ▶ เวอร์ชันก่อนหน้า (2 ไฟล์)                         │
├──────────────────────────────────────────────────────┤
│  ประวัติ (Timeline)                                   │
│  📄 สร้างเอกสาร — 01/01/2567 โดย นาย ก              │
│  ☁  อัพโหลดไฟล์ v1 — 02/01/2567                    │
│  ✅ อนุมัติ — 15/01/2567 โดย นาย Staff              │
│  ☁  อัพโหลดไฟล์ v2 — 20/01/2567                    │
├──────────────────────────────────────────────────────┤
│                                          [ปิด]        │
└──────────────────────────────────────────────────────┘
```

**Note:** ลบ Upload Version form ออกจาก Modal — Executive อ่านอย่างเดียว

---

### 4.4 หน้า Approval Oversight (`/executive/approvals`) — ใหม่ P1

#### วัตถุประสงค์

ให้ผู้บริหารมองเห็น **bottleneck** ในกระบวนการอนุมัติ เพื่อสามารถติดตาม และประเมินประสิทธิภาพของ staff ได้ แต่ **ไม่มีสิทธิ์อนุมัติเอง** (view-only)

#### Layout Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│  สถานะการอนุมัติ                                 [30d ▼]   [Export CSV]  │
├──────────────────────────────────────────────────────────────────────────┤
│   📋 รอการอนุมัติ        ✅ อนุมัติแล้ว         ❌ ปฏิเสธ               │
│      23 ฉบับ               180 ฉบับ              12 ฉบับ                │
│   อัตราอนุมัติ: 93.8%    เวลาเฉลี่ย: 3.2 วัน                             │
├──────────────────────────────────────────────────────────────────────────┤
│  รออนุมัตินานที่สุด (Top 10)                                              │
│  ─────────────────────────────────────────────────────────────────       │
│  RI: วิจัยเรื่อง A...    นาย กนกวรรณ   รอ 18 วัน   Staff: นาย X  ⚠      │
│  IRB: โครงการ B...       นาง จิรา       รอ 12 วัน   Staff: นาย X  ⚠      │
│  RI: การศึกษา C...       นาย ชัย        รอ 8 วัน    Staff: นาง Y         │
│  ...                                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│  ปริมาณงาน Staff (Workload)                                               │
│  ─────────────────────────────────────────────────────────────────       │
│  นาย X  Pending: 12  [████████]  อนุมัติ: 45  ปฏิเสธ: 3  เฉลี่ย: 4.1d  │
│  นาง Y  Pending:  6  [████    ]  อนุมัติ: 89  ปฏิเสธ: 5  เฉลี่ย: 2.8d  │
│  นาย Z  Pending:  5  [███     ]  อนุมัติ: 46  ปฏิเสธ: 4  เฉลี่ย: 3.5d  │
├──────────────────────────────────────────────────────────────────────────┤
│  แนวโน้มการอนุมัติรายเดือน (Recharts Line Chart)                         │
│  [อนุมัติ] vs [ปฏิเสธ] แยกสี                                             │
└──────────────────────────────────────────────────────────────────────────┘
```

#### API ที่ต้องสร้างใหม่

```javascript
// server/src/routes/executive.routes.js
router.get('/approvals', authenticate, authorize('admin', 'executive'), getApprovalOverview)

// server/src/controllers/executive.controller.js
const getApprovalOverview = async (req, res) => {
  // Query 1: สรุปสถานะ
  SELECT
    SUM(CASE WHEN approval_status = 'pending'  THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN approval_status = 'approved' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN approval_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
    AVG(CASE WHEN approval_status IN ('approved','rejected')
        THEN DATEDIFF(DAY, created_at, approval_at)
        ELSE NULL END) AS avg_days
  FROM dbo.DOCUMENTS
  WHERE requires_approval = 1 AND status != 'deleted'

  // Query 2: Top pending (นานสุด)
  SELECT TOP 10
    d.doc_id, d.title, d.doc_type, d.created_at,
    DATEDIFF(DAY, d.created_at, GETDATE()) AS days_waiting,
    u.name AS owner_name,
    s.name AS staff_name
  FROM dbo.DOCUMENTS d
  JOIN dbo.USERS u ON d.user_id = u.user_id
  LEFT JOIN dbo.USERS s ON d.assigned_staff_id = s.user_id
  WHERE d.approval_status = 'pending'
  ORDER BY days_waiting DESC

  // Query 3: Staff workload
  SELECT
    s.user_id, s.name AS staff_name,
    SUM(CASE WHEN d.approval_status = 'pending'  THEN 1 ELSE 0 END) AS pending,
    SUM(CASE WHEN d.approval_status = 'approved' THEN 1 ELSE 0 END) AS approved,
    SUM(CASE WHEN d.approval_status = 'rejected' THEN 1 ELSE 0 END) AS rejected,
    AVG(DATEDIFF(DAY, d.created_at, d.approval_at)) AS avg_days
  FROM dbo.USERS s
  JOIN dbo.DOCUMENTS d ON d.approval_by = s.user_id
  WHERE s.role = 'staff'
  GROUP BY s.user_id, s.name
}
```

---

### 4.5 หน้า Advisor Overview (`/executive/advisors`) — ใหม่ P2

#### วัตถุประสงค์

ผู้บริหารประเมินภาระงานและประสิทธิภาพของอาจารย์ที่ปรึกษา — เห็นว่าอาจารย์คนไหนมีนักศึกษาที่เอกสารหมดอายุมาก และต้องติดตาม

#### Layout Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ภาพรวมอาจารย์ที่ปรึกษา                              [Export CSV]        │
├──────────────────────────────────────────────────────────────────────────┤
│  [🔍 ค้นหาชื่ออาจารย์]  [สาขา ▼]  เรียงตาม: [หมดอายุมากสุด ▼]           │
├──────────────────────────────────────────────────────────────────────────┤
│  อาจารย์ ↕       │ advisee ↕ │ เอกสารรวม │ ใช้งาน │ ใกล้หมด ↕ │ หมด ↕  │
│  ดร. กนกวรรณ     │    12     │    28      │   18   │     7    ⚠ │   3    │
│  ผศ. จิรา         │     8     │    19      │   15   │     3      │   1    │
│  รศ. ชัย          │    15     │    32      │   22   │     6      │   4    │
│  ...                                                                      │
├──────────────────────────────────────────────────────────────────────────┤
│  [คลิกอาจารย์เพื่อดูรายชื่อ advisee และเอกสาร]                           │
└──────────────────────────────────────────────────────────────────────────┘
```

#### API ที่ต้องสร้างใหม่

```javascript
// GET /api/executive/advisors
SELECT
  a.user_id, a.name AS advisor_name, a.email,
  COUNT(DISTINCT u.user_id)                                           AS advisee_count,
  COUNT(d.doc_id)                                                     AS total_docs,
  SUM(CASE WHEN d.status = 'active'        THEN 1 ELSE 0 END)       AS active,
  SUM(CASE WHEN d.status = 'expiring_soon' THEN 1 ELSE 0 END)       AS expiring_soon,
  SUM(CASE WHEN d.status = 'expired'       THEN 1 ELSE 0 END)       AS expired
FROM dbo.USERS a
JOIN dbo.USERS u        ON u.advisor_id = a.user_id AND u.is_active = 1
LEFT JOIN dbo.DOCUMENTS d ON d.user_id = u.user_id AND d.status != 'deleted'
WHERE a.role = 'advisor'
GROUP BY a.user_id, a.name, a.email
ORDER BY expiring_soon DESC

// GET /api/executive/advisors/:advisorId/advisees
SELECT
  u.user_id, u.name, u.student_id, u.program,
  COUNT(d.doc_id)                                               AS doc_count,
  MAX(d.status)                                                 AS latest_status,
  MIN(d.days_remaining)                                         AS min_days_remaining
FROM dbo.USERS u
LEFT JOIN dbo.DOCUMENTS d ON d.user_id = u.user_id AND d.status != 'deleted'
WHERE u.advisor_id = @advisorId
GROUP BY u.user_id, u.name, u.student_id, u.program
```

---

### 4.6 หน้า Announcements View (`/executive/announcements`) — ใหม่ P2

#### วัตถุประสงค์

ให้ผู้บริหารเห็นประกาศที่ออกในระบบ — เพื่อรู้ว่า Admin ประกาศอะไรไปบ้าง (view-only, ไม่สามารถสร้างหรือแก้ไขได้)

#### Layout Wireframe

```
┌──────────────────────────────────────────────────────────────────────────┐
│  ประกาศในระบบ                                                             │
├──────────────────────────────────────────────────────────────────────────┤
│  [ประกาศ active เท่านั้น ☑]  [ทุกประกาศ ○]                               │
├──────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │ [รูปภาพ]  ประกาศการต่ออายุเอกสาร RI/IRB ปี 2567          📌 Active│    │
│  │           15 พฤษภาคม 2569 · สร้างโดย Admin                    │    │
│  │           นักศึกษาที่เอกสารหมดอายุภายใน 90 วัน กรุณา...       │    │
│  └──────────────────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │          กำหนดการส่งเอกสาร IRB ภาคเรียนที่ 1/2567     ○ Inactive│    │
│  │          10 พฤษภาคม 2569 · สร้างโดย Admin                     │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

#### API ที่ใช้

ใช้ API เดิมที่มีอยู่แล้ว — `GET /api/announcements` (public หรือต้องตรวจสอบ auth)

---

## 5. การเปลี่ยนแปลง API (Backend)

### 5.1 ไฟล์: `server/src/routes/executive.routes.js`

```javascript
// เพิ่ม routes ใหม่
router.get('/overview',              authenticate, authorize('admin', 'executive'), getOverview)
router.get('/programs',              authenticate, authorize('admin', 'executive'), getProgramSummary)
router.get('/programs/:program/students', authenticate, authorize('admin', 'executive'), getProgramStudents) // ใหม่
router.get('/branches',              authenticate, authorize('admin', 'executive'), getProgramSummary)
router.get('/documents',             authenticate, authorize('admin', 'executive'), getAllDocuments)
router.get('/approvals',             authenticate, authorize('admin', 'executive'), getApprovalOverview)     // ใหม่
router.get('/advisors',              authenticate, authorize('admin', 'executive'), getAdvisorOverview)      // ใหม่
router.get('/advisors/:id/advisees', authenticate, authorize('admin', 'executive'), getAdvisorAdvisees)     // ใหม่
```

### 5.2 API Modifications สรุป

| Endpoint | การเปลี่ยนแปลง |
|----------|--------------|
| `GET /overview` | เพิ่ม `?from=&to=` params, เพิ่ม `comparison` และ `alerts` ใน response |
| `GET /programs` | เพิ่ม `?affiliation=&degree_level=` params |
| `GET /programs/:program/students` | **ใหม่** — students ในสาขา |
| `GET /documents` | เพิ่ม `approval_status`, `from_date`, `to_date` params, เพิ่ม total_count ใน response |
| `GET /approvals` | **ใหม่** — approval oversight |
| `GET /advisors` | **ใหม่** — advisor overview |
| `GET /advisors/:id/advisees` | **ใหม่** — advisees ของอาจารย์ |

### 5.3 client/src/services/api.js

```javascript
export const executiveService = {
  // เดิม
  getOverview:     (params) => api.get('/executive/overview', { params }),      // เพิ่ม params
  getPrograms:     (params) => api.get('/executive/programs', { params }),      // เพิ่ม params
  getDocuments:    (params) => api.get('/executive/documents', { params }),

  // ใหม่
  getProgramStudents: (program)   => api.get(`/executive/programs/${program}/students`),
  getApprovals:       (params)    => api.get('/executive/approvals', { params }),
  getAdvisors:        (params)    => api.get('/executive/advisors', { params }),
  getAdvisorAdvisees: (advisorId) => api.get(`/executive/advisors/${advisorId}/advisees`),
}
```

---

## 6. การเปลี่ยนแปลง Navigation & Sidebar

### 6.1 ไฟล์: `client/src/components/layout/Sidebar.jsx`

```javascript
// เปลี่ยน navByRole.executive จาก:
executive: [
  { to: '/executive/overview',   labelKey: 'nav.executiveOverview' },
  { to: '/executive/programs',   labelKey: 'nav.executivePrograms' },
  { to: '/executive/documents',  labelKey: 'nav.executiveDocuments' },
],

// เป็น:
executive: [
  { sectionKey: 'nav.sectionAnalytics' },
  { to: '/executive/overview',       labelKey: 'nav.executiveOverview' },
  { to: '/executive/programs',       labelKey: 'nav.executivePrograms' },
  { to: '/executive/documents',      labelKey: 'nav.executiveDocuments' },
  { sectionKey: 'nav.sectionOversight' },
  { to: '/executive/approvals',      labelKey: 'nav.executiveApprovals', badge: true },  // badge = pending count
  { to: '/executive/advisors',       labelKey: 'nav.executiveAdvisors' },
  { to: '/executive/announcements',  labelKey: 'nav.executiveAnnouncements' },
],
```

### 6.2 Badge สำหรับ Approvals

```javascript
// เพิ่ม useEffect ใน Sidebar.jsx สำหรับ executive role
useEffect(() => {
  if (user?.role !== 'executive') return
  executiveService.getApprovals()
    .then(({ data }) => setPendingApprovals(data?.summary?.pending ?? 0))
    .catch(() => {})
}, [user?.role])
```

### 6.3 getIcon() ใน Sidebar.jsx

```javascript
// เพิ่ม icons สำหรับ routes ใหม่
if (to === '/executive/approvals')     return <ClipboardCheck {...iconProps} />
if (to === '/executive/advisors')      return <Users {...iconProps} />
if (to === '/executive/announcements') return <Megaphone {...iconProps} />
```

### 6.4 App.jsx — เพิ่ม Routes ใหม่

```jsx
// เพิ่มใน Private Routes
<Route path="/executive/approvals"     element={<ExecutiveApprovalsPage />} />
<Route path="/executive/advisors"      element={<ExecutiveAdvisorsPage />} />
<Route path="/executive/announcements" element={<ExecutiveAnnouncementsPage />} />
```

---

## 7. Design System & Component Guidelines

### 7.1 หลักการออกแบบ

- **Tailwind-only**: ลบ inline styles ออกทั้งหมด ใช้ Tailwind class เท่านั้น เพื่อให้ Dark Mode ทำงานสมบูรณ์
- **Dark Mode**: ทุก component ต้องมี `dark:` variants
- **Brand Color**: `#42b5e1` (FIET Blue) → ใช้ `text-primary-500`, `bg-primary-500` ตาม Tailwind config ที่มี
- **Read-only Visual**: Executive UI ไม่มี form input ที่ submit — ทุก interactive element เป็นแค่ filter หรือ navigation

### 7.2 Shared Components ที่จะสร้าง

#### KpiCard.jsx
```jsx
// client/src/components/executive/KpiCard.jsx
// Props: label, value, previousValue, color, icon, subtitle, onClick
// แสดง value ใหญ่ + TrendBadge ถ้ามี previousValue
```

#### TrendBadge.jsx
```jsx
// client/src/components/executive/TrendBadge.jsx
// Props: current, previous, invertLogic (สำหรับ expired — ลดถือว่าดี)
// แสดง: ↑12% (เขียว) หรือ ↓3% (แดง) — กลับทิศถ้า invertLogic=true
```

#### DateRangePicker.jsx
```jsx
// client/src/components/executive/DateRangePicker.jsx
// Props: value, onChange
// Presets: 30d, 90d, 6m, 1y, Custom
// Custom: date input 2 ช่อง
```

#### ProgramDrillPanel.jsx
```jsx
// client/src/components/executive/ProgramDrillPanel.jsx
// Props: program, onClose
// Side panel แบบ slide-in จากขวา
// Fetch students ด้วย executiveService.getProgramStudents(program)
```

#### AlertsPanel.jsx
```jsx
// client/src/components/executive/AlertsPanel.jsx
// Props: alerts { expiring_7_days, pending_over_14_days, students_no_docs }
// แสดง critical items พร้อม link ไปยังหน้าที่เกี่ยวข้อง
```

### 7.3 Chart Library

ใช้ **Recharts** (ติดตั้งเพิ่ม: `npm install recharts`)

| Chart | ใช้ใน |
|-------|------|
| `BarChart` + `Bar` (stacked) | Overview trend, Programs bar chart |
| `LineChart` | Approvals trend over time |
| `ResponsiveContainer` | ทุก chart เพื่อ responsive |
| `Tooltip` | ทุก chart |
| `Legend` | ทุก chart |

```bash
# ติดตั้ง
cd client
npm install recharts
```

### 7.4 Status Badge Standard

```jsx
// ใช้ class-based (ไม่ใช้ inline style)
const statusClass = {
  active:        'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
  expiring_soon: 'bg-amber-50   text-amber-700   border border-amber-200   dark:bg-amber-950  dark:text-amber-300',
  expired:       'bg-red-50     text-red-700     border border-red-200     dark:bg-red-950    dark:text-red-300',
  pending:       'bg-sky-50     text-sky-700     border border-sky-200     dark:bg-sky-950    dark:text-sky-300',
  approved:      'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
  rejected:      'bg-red-50     text-red-700     border border-red-200     dark:bg-red-950    dark:text-red-300',
}
```

---

## 8. แผนการ Implement (Roadmap)

### Phase 0: Setup (ก่อนเริ่ม)

```bash
cd client && npm install recharts
git checkout -b feature/executive-ui-redesign
```

---

### Phase 1: P0 — Overview + Programs Redesign (~2.5 วัน)

#### Day 1: KPI Components + Overview Backend

**เช้า: Backend**
- [ ] แก้ `getOverview` controller — เพิ่ม `?from&to` query params
- [ ] เพิ่ม comparison period calculation ใน query
- [ ] เพิ่ม alerts query (expiring ≤7วัน, pending >14วัน, students no docs)
- [ ] Unit test ด้วย Postman: `GET /executive/overview?from=2026-01-01&to=2026-05-18`

**บ่าย: Frontend Components**
- [ ] สร้าง `KpiCard.jsx` — value + TrendBadge
- [ ] สร้าง `TrendBadge.jsx`
- [ ] สร้าง `DateRangePicker.jsx` — presets + custom date inputs
- [ ] สร้าง `AlertsPanel.jsx`

#### Day 2: Overview Page Redesign + Chart

- [ ] แก้ `ExecutiveDashboard.jsx`:
  - ลบ inline styles ทั้งหมด
  - ใช้ KpiCard แทน StatCard
  - ใช้ DateRangePicker — pass params ไปยัง API
  - แทน bar div chart ด้วย Recharts StackedBarChart (RI/IRB)
  - เพิ่ม AlertsPanel ด้านขวา
  - เพิ่ม Users breakdown ที่มี staff ด้วย
- [ ] ทดสอบ Dark Mode

#### Day 2-3: Programs Redesign + Drill-down

- [ ] สร้าง API `GET /executive/programs/:program/students`
- [ ] สร้าง `ProgramDrillPanel.jsx` — side panel slide-in
- [ ] แก้ `ProgramSummaryPage.jsx`:
  - เพิ่ม Affiliation + Degree Level filters
  - แทน bar chart ด้วย Recharts HorizontalBarChart
  - เพิ่ม sortable table headers
  - เพิ่ม clickable rows → ProgramDrillPanel
  - เพิ่ม View toggle (Bar / Heat Map)

---

### Phase 2: P1 — Documents Redesign + Approvals (2 วัน)

#### Day 3-4: Documents Redesign

- [ ] ลบ Upload Version form ออกจาก `ExecDetailModal`
- [ ] เพิ่ม Approval status column ในตาราง
- [ ] เพิ่ม Pagination component
- [ ] เพิ่ม Date range filter (issue_date / expire_date)
- [ ] ย้าย ExecDetailModal ไปไว้ใน `components/executive/`
- [ ] แก้ API `getAllDocuments` — เพิ่ม total_count, approval_status filter

#### Day 4: Approvals Page (ใหม่)

- [ ] สร้าง `getApprovalOverview` controller + SQL queries
- [ ] เพิ่ม route `GET /executive/approvals`
- [ ] สร้าง `ExecutiveApprovalsPage.jsx`:
  - Summary KPIs (pending, approved, rejected, avg days)
  - Top pending list (รอนานสุด)
  - Staff workload table
  - Approval trend line chart (Recharts)

---

### Phase 3: P2 — Advisor + Announcements + Navigation (~1.5 วัน)

#### Day 5: Advisor Overview (ใหม่)

- [ ] สร้าง `getAdvisorOverview` + `getAdvisorAdvisees` controllers
- [ ] เพิ่ม routes
- [ ] สร้าง `ExecutiveAdvisorsPage.jsx`
- [ ] Advisee drill-down side panel

#### Day 5-6: Announcements + Navigation Update

- [ ] สร้าง `ExecutiveAnnouncementsPage.jsx` (ใช้ API เดิม)
- [ ] แก้ `Sidebar.jsx` — เพิ่ม nav items ใหม่ พร้อม sections
- [ ] เพิ่ม pending badge สำหรับ Approvals menu item
- [ ] แก้ `getIcon()` ใน Sidebar
- [ ] แก้ `App.jsx` — เพิ่ม routes ใหม่

---

### Phase 4: P3 — Polish & Testing (~1 วัน)

- [ ] ทดสอบ Dark Mode ทุกหน้า
- [ ] ทดสอบ TH/EN language toggle
- [ ] ทดสอบ Responsive (mobile sidebar)
- [ ] ทดสอบ Loading states และ Error states
- [ ] ทดสอบ Empty states
- [ ] Review กับผู้ใช้งาน Executive จริง

---

### สรุป Timeline

| Phase | งาน | เวลา |
|-------|-----|------|
| Setup | Install recharts, create branch | 0.5 วัน |
| P0 | Overview + Programs redesign | 2.5 วัน |
| P1 | Documents redesign + Approvals page | 2 วัน |
| P2 | Advisors + Announcements + Navigation | 1.5 วัน |
| P3 | Polish + Testing | 1 วัน |
| **รวม** | | **~7.5 วัน** |

---

## 9. ข้อเสนอแนะเพิ่มเติม

### 9.1 Executive Summary Email (P3)

ส่งอีเมลสรุปรายสัปดาห์อัตโนมัติให้ผู้บริหาร ใช้ `node-cron` ที่มีอยู่แล้ว:

```javascript
// server/src/schedulers/executiveDigest.js
// ทุกวันจันทร์ เวลา 08:00
cron.schedule('0 8 * * 1', async () => {
  // ดึงข้อมูลสรุปสัปดาห์ที่ผ่านมา
  // ส่งอีเมลให้ users ที่ role = 'executive'
})
```

**สิ่งที่ include ในอีเมล:**
- เอกสารที่หมดอายุในสัปดาห์นี้: X ฉบับ
- เอกสาร pending อนุมัติ: X ฉบับ (นานสุด X วัน)
- สาขาที่มีปัญหา: CPE (22 ฉบับใกล้หมด)
- Link ไปยัง Executive Dashboard

### 9.2 Read-only Audit Log View (P3)

ให้ผู้บริหารดู admin/staff activity logs ได้ — เพิ่มความโปร่งใส

```javascript
// GET /api/executive/audit-logs (read-only view ของ admin logs)
// ต่างจาก /admin/logs ตรงที่ไม่มี action buttons
```

### 9.3 PDF/Print Report (P3)

```javascript
// ใช้ browser print API หรือ react-to-pdf
// ปุ่ม "พิมพ์รายงาน" ใน Overview page
// Format: สรุป KPI + charts + top programs
// ใช้นำเสนอในที่ประชุมคณะ
```

### 9.4 Alert Thresholds Settings (Future)

ให้ผู้บริหารตั้งค่า threshold ของตัวเอง:
- "แจ้งเตือนฉันถ้า expiring_soon > 20% ของ total"
- "แจ้งเตือนถ้า pending อนุมัติ > 14 วัน"

ต้องเพิ่ม table `EXECUTIVE_SETTINGS` หรือใช้ `SYSTEM_SETTINGS` ที่มีอยู่แล้ว

---

## 10. Appendix: โครงสร้างไฟล์ปัจจุบัน

### Frontend Executive Files

```
client/src/pages/executive/
├── ExecutiveDashboard.jsx          163 บรรทัด  — Overview (P0 Redesign)
├── ProgramSummaryPage.jsx          194 บรรทัด  — Programs (P0 Redesign)
└── ExecutiveDocumentsPage.jsx      541 บรรทัด  — Documents (P1 Redesign)
```

### Backend Executive Files

```
server/src/
├── routes/executive.routes.js       14 บรรทัด
└── controllers/executive.controller.js  161 บรรทัด
```

### Database Tables ที่เกี่ยวข้อง

| Table | สำคัญสำหรับ |
|-------|-----------|
| `DOCUMENTS` | เอกสาร, status, approval_status, approval_by, approval_at |
| `USERS` | role, advisor_id, program, degree_level, affiliation |
| `DOCUMENT_FILES` | ไฟล์แนบ, version |
| `DOC_TYPES` | requires_approval, approver_user_id |
| `ANNOUNCEMENTS` | ประกาศ |
| `DOCUMENT_COMMENTS` | ความคิดเห็น/หมายเหตุการอนุมัติ |

### SQL Migrations ที่ Apply แล้ว (ลำดับ)

```
1. ri_irb_database_v2.sql               — Base schema
2. migration_v3.sql                     — staff role, degree_level
3. migration_trash.sql                  — soft delete
4. migration_v4_settings.sql            — SYSTEM_SETTINGS
5. migration_v5_performance_indexes.sql — indexes
6. migration_v6_programs.sql            — programs
7. migration_v7_affiliations.sql        — affiliations
8. migration_v8_academic_reference.sql  — academic reference
9. migration_v9_approval_comments_faq.sql — approval workflow, comments, FAQ
```

### Dependencies ที่ต้องติดตั้งเพิ่ม

```bash
cd client
npm install recharts        # Chart library
```

---

*เอกสารนี้สร้างจากการวิเคราะห์โค้ดจริงใน FIET-IRIS repository*  
*อ้างอิง: `client/src/pages/executive/`, `server/src/controllers/executive.controller.js`, `client/src/components/layout/Sidebar.jsx`*
