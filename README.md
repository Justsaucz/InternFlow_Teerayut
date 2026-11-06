# 🎓 InternFlow — Internship & CWIE Management Platform
### แพลตฟอร์มบริหารจัดการการฝึกงานและสหกิจศึกษาครบวงจร (Cooperative and Work-Integrated Education)

[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.0-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.0-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini API](https://img.shields.io/badge/Google_Gemini-AI_Analysis-8E75C3?logo=google&logoColor=white)](https://ai.google.dev/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

---

## 📌 บทนำและภาพรวมของระบบ (Overview)

**InternFlow** คือแพลตฟอร์มเว็บแอปพลิเคชันยุคใหม่ (Cloud-Native Web Application) ที่พัฒนาขึ้นเพื่อปฏิวัติและยกระดับกระบวนการบริหารจัดการ **การฝึกงานและสหกิจศึกษา (CWIE - Cooperative and Work-Integrated Education)** ให้เป็นมาตรฐานเดียวกันทั้งระบบ โดยเชื่อมโยง 3 ภาคส่วนหลักเข้าด้วยกัน: **นักศึกษา (Students)**, **สถานประกอบการ/นายจ้าง (Company HR & Mentors)** และ **อาจารย์/ฝ่ายวิชาการ (Academic Advisors & University Coordinators)**

### 💡 ปัญหาเดิมที่ระบบนี้แก้ไข (Problems Solved)
1. **การค้นหาและยื่นใบสมัครกระจัดกระจาย:** ขาดศูนย์กลางข้อมูลตำแหน่งงานฝึกงานที่ระบุรายละเอียดค่าตอบแทน โหมดการทำงาน (On-site, Hybrid, Remote) และทักษะอย่างโปร่งใส
2. **ปัญหานักศึกษา "กั๊กที่ฝึกงาน" (Placement Hoarding):** เมื่อนักศึกษาผ่านการคัดเลือกหลายบริษัท แต่นิ่งเฉยไม่สละสิทธิ์ ทำให้บริษัทอื่นเสียโอกาสและเพื่อนนักศึกษาคนอื่นเสียสิทธิ์
3. **การคัดกรองเอกสารและผลงานที่ใช้เวลานาน:** HR ต้องเปิดอ่านไฟล์ Portfolio/PDF หลายหน้าโดยไม่มีเครื่องมือช่วยวิเคราะห์ความสอดคล้องกับคุณสมบัติของตำแหน่งงาน
4. **สมุดบันทึกการฝึกงาน (Logbook) ขาดความโปร่งใส:** การบันทึกเวลาฝึกงานมักทำแบบกระดาษหรือสรุปย้อนหลังตอนสิ้นสุดเทอม ตรวจสอบได้ยากว่าปฏิบัติงานจริงหรือไม่
5. **การประเมินผลสหกิจศึกษาล่าช้า:** ขาดแบบประเมินผลมาตรฐานและระบบออกใบรับรองผลการฝึกงานที่เป็นทางการและตรวจสอบได้ทันที

---

## 🚀 ฟังก์ชันการทำงานหลัก (Key Features)

### 1. 🎓 สำหรับนักศึกษา (Student Subsystem)
- **ศูนย์ค้นหาและคัดกรองตำแหน่งงาน (Job Search & Filter):** ค้นหาตำแหน่งฝึกงานตามคีย์เวิร์ด, ทักษะที่ต้องการ, ช่วงค่าตอบแทนรายเดือน (Monthly Allowance), และโหมดการทำงาน (`On-site`, `Remote / WFH`, `Hybrid`)
- **การยื่นใบสมัครพร้อมเอกสารแนบหลายรูปแบบ (Rich Multi-Attachment Application):** แนบไฟล์หลักฐานได้หลากหลายรายการ (Resume, CV, Transcript, Portfolio) และระบุลิงก์ผลงานภายนอก (GitHub, Figma, Google Drive)
- **ประวัติผลงานต่อเนื่อง (Continuous Evidence History):** ส่งงานหรืออัปเดตเวอร์ชันของ Evidence ได้อย่างต่อเนื่อง โดยประวัติเวอร์ชันเดิมจะถูกเก็บรักษาไว้อย่างปลอดภัย (Immutable Versioning)
- **ระบบติดตามสถานะใบสมัครแบบเรียลไทม์ (Live Application Tracking Pipeline):**
  $$\text{PENDING} \longrightarrow \text{REVIEWING} \longrightarrow \text{INTERVIEW\_SCHEDULED} \longrightarrow \text{ACCEPTED} \longrightarrow \text{COMMITTED}$$
  *(หากไม่ผ่านการคัดกรอง สถานะจะปรับเป็น `REJECTED`)*
- **กลไกป้องกันการกั๊กที่ฝึกงาน (Single Placement Exclusivity Engine):**
  - นักศึกษาอาจได้รับข้อเสนอหลายบริษัท (`ACCEPTED`) แต่สามารถกดยืนยันรับสิทธิ์เข้าฝึกงานได้เพียง **1 ที่เท่านั้น (`COMMITTED`)**
  - เมื่อกด Commit ระบบจะทำ **Atomic Transaction** เพื่อปฏิเสธและยกเลิกใบสมัครในบริษัทอื่นโดยอัตโนมัติทันที
- **สมุดบันทึกการทำงานรายวัน (Daily CWIE Logbook):**
  - ปลดล็อกให้บันทึกได้เฉพาะเมื่อได้รับการยืนยันบรรจุเข้าฝึกงานแล้ว (`COMMITTED`)
  - บันทึกงานวันละ 8.0 ชั่วโมง ระบุโหมดการทำงาน, งานที่ทำสำเร็จ, ปัญหาที่พบ, แนวทางแก้ไข และแนบไฟล์หลักฐาน (Timesheet, Code snippet, Design screenshot)
  - **ระบบตรวจจับการลงย้อนหลัง (Backdated Audit Flag):** ระบบจะตรวจจับและติด Flag แจ้งเตือนอัตโนมัติหากบันทึกข้อมูลย้อนหลังเกินเกณฑ์ เพื่อความโปร่งใส
- **แบบทดสอบคัดกรองเบื้องต้น (Practical Screening Questionnaire):** ทำแบบทดสอบที่บริษัทมอบหมาย (คำถามเชิงข้อเขียน Text และโจทย์จำลองภารกิจ Task)
- **กระบวนการขอถอนตัวอย่างมีขั้นตอน (Controlled Cancellation Workflow):** ป้องกันการละทิ้งงานกลางคัน โดยนักศึกษาต้องส่งคำขอ `CANCEL_REQUESTED` เพื่อให้ฝ่ายบุคคลอนุมัติ `CANCELLED`

---

### 2. 🏢 สำหรับสถานประกอบการและพี่เลี้ยง (Company HR & Mentor Subsystem)
- **การจัดการตำแหน่งงานฝึกงาน (Job Post Management):** ประกาศรับสมัคร, แก้ไขข้อมูล, ปิดรับสมัคร, ระบุสวัสดิการ, วันเวลาทำงาน และกำหนดคำถามคัดกรอง
- **พื้นที่คัดกรองผู้สมัคร (Applicant Screening Workspace):** หน้าจอตรวจสอบข้อมูลผู้สมัครแบบเจาะลึก ดูประวัติการศึกษา, ทักษะ, เอกสารแนบ, คำตอบของแบบทดสอบ, และการวิเคราะห์ผลงาน
- **ระบบ AI วิเคราะห์สรุปแฟ้มสะสมผลงาน (Google Gemini Portfolio & Evidence Summarization):**
  - ใช้โมเดล **Google Gemini API** (`gemini-3.5-flash-lite` / `gemini-2.5-flash`) อ่านและสรุปสาระสำคัญจากเอกสาร PDF/รูปภาพที่นักศึกษาแนบ
  - ทำการเปรียบเทียบสิ่งที่พบในเอกสารกับ **Job Requirements** ของตำแหน่งงานอย่างตรงไปตรงมา
  - คำนึงถึงความเป็นส่วนตัว (Privacy-first): แสดงข้อความชี้แจงและขอความยินยอม (Disclosed Consent) ก่อนส่งเอกสารวิเคราะห์, ระบบบันทึก Cache ตาม Hash ของไฟล์เพื่อประหยัด Quota และป้องกันการเรียกซ้ำ
- **ระบบสร้างแบบทดสอบคัดกรองอัจฉริยะ (Questionnaire Drafting with AI):**
  - HR สามารถพิมพ์คำถามเอง หรือให้ AI ช่วยร่างแบบทดสอบ 1–10 ข้อ โดยอิงจากหัวข้อ, รายละเอียดงาน และความรับผิดชอบจริงของตำแหน่ง
  - มีระบบ Relevance Verification ตรวจสอบความสมเหตุสมผลของตัวเลือกและคำตอบ ไม่สร้างคำถามหลอกที่ไร้สาระ
- **ระบบนัดหมายการสัมภาษณ์ (Interview Coordination):** กำหนดวัน เวลา สถานที่สัมภาษณ์จริง หรือแนบลิงก์ Video Conference (Google Meet, Zoom, Microsoft Teams) พร้อมส่งแจ้งเตือนให้นักศึกษา
- **ลิ้นชักตรวจและรับรองสมุดบันทึกงาน (Slide-Over Logbook Inspection Drawer):** พี่เลี้ยงสามารถตรวจสมุดงานรายวันของนักศึกษาได้ทันที ให้คะแนน 1–5 ดาว, พิมพ์คำแนะนำ (Feedback) และกดยืนยันการลงเวลา (Digital Sign-Off)
- **แบบประเมินผลการฝึกงานมาตรฐาน (3-Category Evaluation Rubric):**
  ประเมินผลงานนักศึกษาตามเกณฑ์ 3 มิติ (1–5 ดาว):
  1. *Work Quality & Technical Competence* (คุณภาพงานและความสามารถทางเทคนิค)
  2. *Punctuality & Reliability* (ความตรงต่อเวลาและความรับผิดชอบ)
  3. *Teamwork & Communication* (การทำงานร่วมกับผู้อื่นและการสื่อสาร)
- **ระบบออกใบรับรองและรายงานสหกิจศึกษา (Official Printable CWIE Certificate):**
  สร้างรายงานสรุปผลการฝึกงานที่เป็นทางการ พร้อมสรุปจำนวนชั่วโมงที่ได้รับการรับรอง, คะแนนประเมินของพี่เลี้ยง, และจัดรูปแบบให้พิมพ์หรือบันทึกเป็น PDF ได้ทันที (`window.print()`)

---

### 3. 🛡️ ความปลอดภัยและระบบสนับสนุนส่วนกลาง (Security & Core Subsystems)
- **ระบบยืนยันตัวตนผ่านอีเมล (Email Verification):** ส่งลิงก์ยืนยันตัวตนแบบ Single-use อายุ 24 ชั่วโมงไปยังอีเมลของผู้สมัครใหม่ก่อนเปิดใช้งานระบบเต็มรูปแบบ
- **ระบบกู้คืนรหัสผ่านที่ปลอดภัย (Secure Password Recovery):** สร้าง Cryptographic Token แบบ Hash สำหรับรีเซ็ตรหัสผ่าน มีอายุ 30 นาที และเมื่อเปลี่ยนรหัสผ่านจะทำการเพิ่ม Session Version เพื่อยกเลิก JWT เดิมทันที
- **ระบบแจ้งเตือนแบบเรียลไทม์ภายในแอป (In-App Notifications):** มีกระดิ่งแจ้งเตือนพร้อมตัวเลขนับข้อความที่ยังไม่ได้อ่าน อัปเดตทุก 30 วินาทีและเมื่อสลับหน้าต่างกลับมา แจ้งเตือนทั้งสถานะใบสมัคร, การนัดสัมภาษณ์, การส่งงาน, และการตรวจรับรอง
- **การปกป้องความเป็นส่วนตัวของเกรดเฉลี่ย (GPA & Academic Privacy Masking):** ข้อมูลผลการเรียนจะถูก Mask ซ่อนไว้จากสาธารณะ และเปิดเผยเฉพาะบริษัทที่นักศึกษายื่นสมัครเท่านั้น
- **รองรับสองภาษา (Bilingual Support):** สลับภาษาไทยและภาษาอังกฤษ (TH/EN) ได้ทันทีตลอดการใช้งาน

---

## 🛠️ เทคโนโลยีที่ใช้ในโครงการ (Tech Stack)

```mermaid
flowchart TD
    subgraph Frontend["Frontend Layer (React 19 + Vite)"]
        UI["React 19 / TypeScript"]
        TW["Tailwind CSS v4"]
        Icons["Lucide React"]
        Context["Language & Auth Context"]
    end

    subgraph Backend["Backend Layer (Node.js + Express 5)"]
        API["Express 5 REST API"]
        Auth["JWT + Bcrypt Auth & RBAC"]
        PrismaORM["Prisma 7 ORM"]
        GeminiService["Google Gemini API Service"]
        MailService["SMTP Mailer (Nodemailer)"]
    end

    subgraph Database["Database & Services"]
        PG[("PostgreSQL 16 Database")]
        Storage["Local / AWS S3 File Storage"]
        Gemini["Google Gemini 3.5 Flash-Lite / 2.5 Flash"]
        Mail["Mailpit / SMTP Server"]
    end

    Frontend -->|HTTP / REST API| Backend
    Backend -->|Prisma Client| PG
    Backend -->|File Uploads| Storage
    Backend -->|SDK @google/genai| Gemini
    Backend -->|Account Mail| Mail
```

| เลเยอร์ | เทคโนโลยี | รายละเอียด |
|---|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4 | สถาปัตยกรรม SPA ประสิทธิภาพสูง โหลดเร็ว สไตล์โมเดิร์น Responsive |
| **Backend** | Node.js, Express 5, TypeScript | RESTful API พร้อม Type-Safety, Middleware ตรวจสอบสิทธิ์ (RBAC) |
| **Database & ORM**| PostgreSQL 16, Prisma 7 | ระบบฐานข้อมูลเชิงสัมพันธ์ ออกแบบ Schema รองรับ Integrity และ Migration |
| **Generative AI** | Google Gemini API (`@google/genai`) | ใช้โมเดล `gemini-3.5-flash-lite` ในการวิเคราะห์ PDF และร่างข้อสอบคัดกรอง |
| **Email Service** | Nodemailer / Mailpit / SMTP | ระบบส่งอีเมลยืนยันตัวตนและกู้คืนรหัสผ่าน รองรับ Mailpit สำหรับการทดสอบในเครื่อง |
| **File Storage** | Multipart Storage / S3-compatible | จัดเก็บไฟล์ CV, Resume, ภาพผลงาน และหลักฐาน Logbook อย่างเป็นระบบ |
| **Container** | Docker, Docker Compose | คอนฟิกไฟล์ Dockerfile และ docker-compose.yml สำหรับรันทุก Service อย่างสะดวก |

---

## 👥 บัญชีทดสอบที่พร้อมใช้งาน (Demo Accounts)

ระบบมาพร้อมกับบัญชีทดสอบที่เตรียมไว้ให้ในคำสั่ง Seed เพื่อความสะดวกในการตรวจงานและทดลองใช้งาน:

### 🔑 บัญชีมาตรฐาน (Default Accounts)
> รหัสผ่านของทุกบัญชีในหมวดนี้คือ: **`password123`**

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน | ข้อมูลและสถานะบัญชี |
|---|---|---|---|
| **Company HR** | `hr@techcorp.com` | `password123` | Sarah Jenkins — TechCorp Solutions (มีตำแหน่งงานเปิดรับและผู้สมัคร) |
| **Company HR** | `hr@innovate.co` | `password123` | David Chen — Innovate Labs (บริษัทสาย AI & Data) |
| **Student** | `student@internflow.com` | `password123` | Alex Rivers — นักศึกษาชั้นปีที่ 4 SIIT ม.ธรรมศาสตร์ (มีประวัติสมัครและ Logbook) |

### 🧪 บัญชีทดสอบฟีเจอร์ Screening & Account Mail (Teerayut Demo Accounts)
> รหัสผ่านของบัญชีทดสอบชุดนี้คือ: **`InternFlowDemo2026!`**

| บทบาท (Role) | อีเมล (Email) | รหัสผ่าน | ข้อมูลและสถานะบัญชี |
|---|---|---|---|
| **Company HR** | `teerayut.hr.demo@example.test` | `InternFlowDemo2026!` | บัญชีสำหรับทดสอบตรวจ Evidence, Portfolio AI, และแบบสอบถาม |
| **Student** | `teerayut.student.demo@example.test` | `InternFlowDemo2026!` | บัญชีนักศึกษาที่มีการส่ง Evidence และทำแบบทดสอบคัดกรองไว้ครบถ้วน |

---

## 💻 คู่มือการติดตั้งและเปิดใช้งานในเครื่อง (Local Setup Guide)

### สิ่งที่ต้องเตรียม (Prerequisites)
- **Node.js**: เวอร์ชั่น 20 ขึ้นไป (`node -v`)
- **npm**: เวอร์ชั่น 10 ขึ้นไป
- **Docker & Docker Compose**: สำหรับรัน PostgreSQL และ Mailpit (แนะนำ)
- **Git**

---

### วิธีที่ 1: รันแบบแยก Service (Manual Local Development)

#### 1. สตาร์ทฐานข้อมูล PostgreSQL
หากมี Docker ให้รันคำสั่ง:
```bash
docker compose up -d postgres mailpit
```
*(ฐานข้อมูลจะเปิดที่พอร์ต `5432` และหน้าตรวจอีเมล Mailpit Web UI จะอยู่ที่ `http://localhost:8025`)*

#### 2. ติดตั้งและเริ่มทำงานฝั่ง Backend
```bash
cd backend

# ติดตั้ง Dependencies
npm install

# คัดลอกไฟล์ Environment Variables
cp .env.example .env
# (แก้ไขค่า DATABASE_URL หรือ GEMINI_API_KEY ใน .env ตามความต้องการ)

# รัน Migration ฐานข้อมูล
npx prisma migrate dev

# Seed ข้อมูลตั้งต้นสำหรับทดสอบ
npm run seed

# รัน Backend Server
npm run dev
```
> Backend API จะเริ่มทำงานที่: `http://localhost:4000` (หรือพอร์ตที่กำหนดใน `.env`)

#### 3. ติดตั้งและเริ่มทำงานฝั่ง Frontend (เปิดอีก Terminal หนึ่ง)
```bash
cd frontend

# ติดตั้ง Dependencies
npm install

# รัน Frontend Development Server
npm run dev
```
> Frontend Application จะเริ่มทำงานที่: `http://localhost:3000` (หรือ `http://localhost:5173`)

---

### วิธีที่ 2: รันทั้งหมดผ่าน Docker Compose (All-in-One)

```bash
# สั่งสร้าง Container และรันทุก Service ในเบื้องหลัง
docker compose up -d --build
```

**บริการที่เปิดใช้งาน:**
- **Frontend Web App:** `http://localhost:3000`
- **Backend API:** `http://localhost:4000`
- **Mailpit Web UI (กล่องจดหมายทดสอบ):** `http://localhost:8025`
- **Health Check Endpoint:** `http://localhost:4000/api/health`

---

## ⚙️ ตัวแปรสภาพแวดล้อมสำคัญ (Environment Variables)

ไฟล์ `backend/.env.example` มีตัวแปรสำคัญดังนี้:

```dotenv
# Port & Environment
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# PostgreSQL Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/internflow?schema=public"

# Authentication Security
JWT_SECRET="your-super-secret-jwt-key"
JWT_EXPIRES_IN="7d"

# Google Gemini API (สำหรับฟีเจอร์ AI Portfolio Analysis & Question Drafting)
GEMINI_API_KEY=""
GEMINI_MODEL="gemini-3.5-flash-lite"

# Email Configuration (สำหรับ Verification และ Reset Password)
SMTP_HOST=127.0.0.1
SMTP_PORT=1025
SMTP_USER=""
SMTP_PASS=""
EMAIL_FROM="InternFlow <no-reply@internflow.local>"
```

---

## 📡 สรุปเส้นทาง REST API สำคัญ (Core REST API Endpoints)

| หมวดหมู่ | Method | Endpoint | สิทธิ์ (Role) | รายละเอียด |
|---|---|---|---|---|
| **Auth** | `POST` | `/api/auth/register` | Public | ลงทะเบียนผู้ใช้ใหม่ (Student หรือ Company HR) |
| | `POST` | `/api/auth/login` | Public | เข้าสู่ระบบและรับ JWT Token |
| | `GET` | `/api/auth/verify-email` | Public | ยืนยันอีเมลผ่าน Verification Token |
| | `POST` | `/api/account/forgot-password` | Public | ขอรับลิงก์กู้คืนรหัสผ่านทางอีเมล |
| | `POST` | `/api/account/reset-password` | Public | ตั้งรหัสผ่านใหม่ด้วย Reset Token |
| **Jobs** | `GET` | `/api/jobs` | Public | ค้นหาและดูรายการตำแหน่งงานที่เปิดรับ |
| | `POST` | `/api/jobs` | Company HR | สร้างประกาศรับสมัครงานใหม่ |
| | `PUT` | `/api/jobs/:id` | Company HR | แก้ไขรายละเอียดงาน |
| | `DELETE`| `/api/jobs/:id` | Company HR | ลบประกาศรับสมัครงาน |
| **Applications**| `POST` | `/api/applications` | Student | ยื่นใบสมัครงานพร้อมเอกสารแนบ |
| | `GET` | `/api/applications/my` | Student | ดูรายการใบสมัครทั้งหมดของตนเอง |
| | `GET` | `/api/applications/company` | Company HR | ดูรายการผู้สมัครของบริษัทตนเอง |
| | `PATCH`| `/api/applications/:id/status`| HR / Student| เปลี่ยนสถานะใบสมัคร หรือยืนยันรับสิทธิ์ (`COMMITTED`) |
| **Screening** | `GET` | `/api/screening/applications/:id/summary` | HR | สรุปวิเคราะห์ผลงานและ Requirement Coverage ด้วย Gemini |
| | `POST` | `/api/screening/jobs/:id/draft-questions` | HR | ให้ AI ช่วยร่างคำถามคัดกรองเบื้องต้น |
| **Logbook** | `POST` | `/api/logbook` | Student | บันทึกการทำงานรายวัน (ระบุชั่วโมง, งาน, ปัญหา, หลักฐาน) |
| | `GET` | `/api/logbook/my` | Student | เรียกดูบันทึกงานและเกจชั่วโมงสะสม |
| | `PUT` | `/api/logbook/:id/approve` | Company Mentor | พี่เลี้ยงตรวจงาน ให้ดาว และลงนามรับรอง |
| **Evaluations**| `GET` | `/api/evaluations/company` | Company HR | รายชื่อนักศึกษาในสังกัดและสถานะการประเมิน |
| | `POST` | `/api/evaluations/submit` | Company HR | ส่งคะแนนประเมิน 3 มิติ และความคิดเห็น |
| | `GET` | `/api/evaluations/report/:studentId` | Authenticated | ข้อมูลสำหรับออกใบรับรองและรายงาน CWIE ทางการ |
| **Notifications**| `GET` | `/api/notifications` | Authenticated | รายการการแจ้งเตือนแบบเรียลไทม์ของผู้ใช้ |

---

## 📁 โครงสร้างโปรเจกต์ (Project Directory Structure)

```text
InternFlow/
├── backend/                       # Node.js + Express + Prisma API
│   ├── prisma/
│   │   ├── schema.prisma          # Schema ฐานข้อมูลโมเดลผู้ใช้, งาน, ใบสมัคร, Logbook, แบบประเมิน
│   │   └── migrations/            # ประวัติ Migration ของระบบ
│   ├── src/
│   │   ├── config/                # ค่าคอนฟิกสภาพแวดล้อม
│   │   ├── lib/                   # โมดูล AI (Gemini), อีเมล (Mail), และตรรกะคัดกรอง (Screening)
│   │   ├── middleware/            # Auth JWT, Role-Based Access Control, Error Handling
│   │   ├── routes/                # Endpoint Routing แยกตาม Resource
│   │   └── scripts/               # Script สำหรับ Seed ข้อมูลและทดสอบ Flow
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                      # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── public/                    # Static Assets
│   ├── src/
│   │   ├── components/            # Reusable UI Components, Modal, Navbar, Notifications
│   │   ├── context/               # AuthContext, LanguageContext (TH/EN)
│   │   ├── pages/
│   │   │   ├── student/           # หน้าค้นหางาน, ใบสมัคร, สมุดบันทึก Logbook, โปรไฟล์นักศึกษา
│   │   │   ├── company/           # หน้าจัดการงาน, รายชื่อผู้สมัคร, การประเมินผล, โปรไฟล์บริษัท
│   │   │   ├── ScreeningWorkspace.tsx # พื้นที่คัดกรองและตรวจผลงานผู้สมัครแบบละเอียด
│   │   │   ├── Login.tsx / Register.tsx / AccountRecovery.tsx
│   │   │   └── Home.tsx / Dashboard.tsx
│   │   └── utils/                 # ฟังก์ชันคำนวณชั่วโมง, ตัวกรองงาน, ตัวช่วยวิเคราะห์
│   ├── Dockerfile
│   └── package.json
│
├── docs/                          # เอกสารรายงาน, แผนภาพสถาปัตยกรรม, ER Diagram, Flowcharts
├── docker-compose.yml             # คอนฟิกรันระบบฐานข้อมูลและเว็บแบบครบชุด
├── KICKOFF.md                     # แผนเริ่มต้นโครงการและข้อกำหนดทางเทคนิค
└── README.md                      # เอกสารอธิบายภาพรวมโครงการและการใช้งาน (ไฟล์นี้)
```

---

## 🏫 ข้อมูลรายวิชาและผู้พัฒนา (Course & Attribution)

โครงการนี้เป็นส่วนหนึ่งของรายวิชา **DES424 Cloud-based Application Development**  
สถาบันเทคโนโลยีนานาชาติสิรินธร (SIIT) มหาวิทยาลัยธรรมศาสตร์ (Thammasat University)  
ภาคการศึกษาที่ 1 ปีการศึกษา 2569 (Semester 1, Academic Year 2026)

---

## 📄 ลิขสิทธิ์ (License)

โครงการนี้เผยแพร่ภายใต้สัญญาอนุญาต [MIT License](LICENSE) สามารถนำไปศึกษาและต่อยอดได้ตามเงื่อนไขของสัญญาอนุญาต
