# World Cup Festival 688

[English](README.md) | ภาษาไทย

World Cup Festival 688 เป็นเว็บติดตามฟุตบอลโลก 2026 ที่รองรับหลายขนาดหน้าจอ ผู้เข้าร่วมเลือกทีมชาติหนึ่งทีม ระบบจดจำผู้ใช้ผ่าน Device Identity บน browser เดิม และแสดงโปรแกรมแข่งขัน ตารางคะแนน รอบน็อกเอาต์ เจ้าของแต่ละทีม และข่าวสาร

## เทคโนโลยี

| ส่วน | เทคโนโลยี |
|---|---|
| Web | React 19, TypeScript, Vite, TanStack Query |
| API | Node.js, Express, TypeScript |
| ข้อมูล | Supabase PostgreSQL และ in-memory fallback สำหรับการพัฒนา |
| ข้อมูลการแข่งขัน | API-Football และ RSS |
| Production | Docker Compose และ Nginx |

## เริ่มใช้งานอย่างรวดเร็ว

ต้องมี Node.js 22 และ npm 10 หรือใหม่กว่า

```bash
npm install
npm run dev:api
```

เปิด terminal อีกหน้าต่าง:

```bash
npm run dev:web
```

เปิด `http://localhost:5173` ส่วน API health endpoint คือ `http://localhost:3001/health`

ก่อนพัฒนาบนเครื่อง ให้สร้าง `apps/api/.env` และ `apps/web/.env` ตาม [คู่มือการตั้งค่า](docs/th/CONFIGURATION.md)

## Docker

```bash
docker compose up -d --build
docker compose ps
```

เปิด `http://localhost:8088` และหยุดระบบด้วย `docker compose down`

## ตรวจสอบคุณภาพ

```bash
npm run lint
npm test
npm run build
```

## เอกสาร

| หัวข้อ | ภาษาไทย | English |
|---|---|---|
| การพัฒนา | [การพัฒนา](docs/th/DEVELOPMENT.md) | [Development](docs/en/DEVELOPMENT.md) |
| สถาปัตยกรรม | [สถาปัตยกรรม](docs/th/ARCHITECTURE.md) | [Architecture](docs/en/ARCHITECTURE.md) |
| คำศัพท์และกฎระบบ | [คำศัพท์และกฎระบบ](docs/th/DOMAIN.md) | [Domain](docs/en/DOMAIN.md) |
| การตั้งค่า | [การตั้งค่า](docs/th/CONFIGURATION.md) | [Configuration](docs/en/CONFIGURATION.md) |
| API | [API](docs/th/API.md) | [API](docs/en/API.md) |
| การติดตั้งใช้งาน | [การติดตั้งใช้งาน](docs/th/DEPLOYMENT.md) | [Deployment](docs/en/DEPLOYMENT.md) |
| การดูแลระบบ | [การดูแลระบบ](docs/th/OPERATIONS.md) | [Operations](docs/en/OPERATIONS.md) |
| การทดสอบ | [การทดสอบ](docs/th/TESTING.md) | [Testing](docs/en/TESTING.md) |

## โครงสร้าง repository

```text
apps/web/             React frontend
apps/api/             Express API
supabase/migrations/  Database migrations
docs/en/              เอกสารภาษาอังกฤษ
docs/th/              เอกสารภาษาไทย
Dockerfile.web        Production image ของ Web
Dockerfile.api        Production image ของ API
docker-compose.yml    Container stack สำหรับเครื่องและ VPS
nginx.conf            ให้บริการไฟล์เว็บและ proxy API
```

ห้าม commit ไฟล์ `.env` และห้ามส่ง server-side keys ผ่านตัวแปร `VITE_*`
