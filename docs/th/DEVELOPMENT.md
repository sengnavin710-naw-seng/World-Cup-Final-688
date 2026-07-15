# การพัฒนาบนเครื่อง

[English](../en/DEVELOPMENT.md) | ภาษาไทย

## สิ่งที่ต้องติดตั้ง

- แนะนำ Node.js 22
- npm 10 หรือใหม่กว่า
- Supabase project สำหรับเก็บข้อมูลการเลือกทีมร่วมกันแบบถาวร
- API-Football key สำหรับ fixtures และ standings แบบ live
- Docker Desktop เฉพาะเมื่อต้องการทดสอบ production container setup

## ติดตั้ง dependencies

รันจาก root ของ repository:

```powershell
npm ci
```

ใช้ `npm install` เมื่อตั้งใจเปลี่ยน dependencies และ commit ทั้ง `package.json` กับ `package-lock.json` เมื่อเวอร์ชัน dependency เปลี่ยน

## ตั้งค่า

สร้างไฟล์ที่ไม่เข้า Git ดังนี้:

- `apps/api/.env` สำหรับ API process บนเครื่อง
- `apps/web/.env` สำหรับ Vite

ใช้ `.env.example` เป็นรายการตัวแปร และอ่าน [คู่มือการตั้งค่า](CONFIGURATION.md) ก่อนเพิ่ม secrets

เตรียม Supabase โดยรัน migrations ตามลำดับชื่อไฟล์:

```text
supabase/migrations/20260530_create_selection_records.sql
supabase/migrations/20260530_enable_rls_for_participant_selections.sql
```

Server key ใช้เฉพาะใน API ส่วน browser ไม่เชื่อมตารางที่ป้องกันไว้โดยตรง

## รันบนเครื่อง

Terminal 1 — API:

```powershell
npm run dev:api
```

ตรวจสอบ:

```text
http://localhost:3001/health
```

Terminal 2 — Web:

```powershell
npm run dev:web
```

เปิด:

```text
http://localhost:5173
```

Vite development server proxy `/api` ไป `http://localhost:3001` หากตั้ง `VITE_API_BASE_URL=http://localhost:3001` จะเป็นการเรียก API โดยตรงและ API CORS allow-list ต้องอนุญาต web origin

## ทดสอบจากอุปกรณ์อื่น

เปิด Vite ทุก interfaces:

```powershell
npm run dev:host
```

ใช้ `ipconfig` หา private IPv4 ของคอมพิวเตอร์ แล้วเปิด `http://YOUR_IP:5173` จากอุปกรณ์ที่เชื่อม trusted network เดียวกัน

วิธีที่ง่ายที่สุดสำหรับโทรศัพท์คือปล่อย `VITE_API_BASE_URL` ว่าง เพื่อใช้ Vite `/api` proxy หาก firewall ขอสิทธิ์ ให้เปิด Node.js เฉพาะ trusted private networks

คอมพิวเตอร์และโทรศัพท์ต้องใช้ Wi-Fi วงเดียวกัน หากโทรศัพท์เชื่อมผ่าน Mobile Data หรือ VPN ให้ปิดชั่วคราว และควรรัน `ipconfig` ใหม่หลังเปลี่ยน Wi-Fi เพราะ IPv4 ของคอมพิวเตอร์อาจเปลี่ยนได้

### Windows Firewall

หากโทรศัพท์เชื่อมต่อไม่ได้ ให้เปิด PowerShell แบบ Administrator แล้วอนุญาตเฉพาะพอร์ตของ Vite บนเครือข่าย Private ที่ไว้ใจได้และเฉพาะวง LAN เดียวกัน:

```powershell
$port = 5173
$ruleName = "World Cup Festival 688 Vite $port Private LAN"
New-NetFirewallRule -DisplayName $ruleName -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port -Profile Private -RemoteAddress LocalSubnet
```

เมื่อไม่ต้องการกฎนี้แล้ว ให้ลบด้วยคำสั่ง:

```powershell
Remove-NetFirewallRule -DisplayName $ruleName
```

ไม่ควรสร้าง inbound rule นี้เมื่อใช้ Wi-Fi สาธารณะ

### เมื่อพอร์ต 5173 ถูกใช้งานอยู่

ตรวจสอบ listener ก่อนหยุด process ใด ๆ:

```powershell
Get-NetTCPConnection -LocalPort 3001,5173,5174 -State Listen
```

Docker อาจเป็นเจ้าของพอร์ตผ่าน port proxy ได้เช่นกัน:

```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

อย่าหยุด process หรือ container ที่ยังไม่ทราบว่าเป็นของโปรเจ็กใด ให้หยุด dev server เก่าที่ทราบแน่ด้วย `Ctrl + C` หรือเปิด web workspace ของโปรเจ็กนี้ด้วยพอร์ตอื่น:

```powershell
npm run dev --workspace web -- --host 0.0.0.0 --port 5174
```

จากโทรศัพท์ให้เปิด `http://YOUR_IP:5174` และกำหนด `$port = 5174` ตอนสร้าง Private-LAN firewall rule

ตรวจสอบว่าพอร์ตที่เลือกแสดงโปรเจ็กนี้ ไม่ใช่ Vite application อื่น:

```powershell
(Invoke-WebRequest -Uri "http://localhost:5174" -UseBasicParsing).Content
```

HTML ที่ได้ควรมี `<title>World Cup Festival 688</title>`

## คำสั่งของ workspace

| คำสั่ง | หน้าที่ |
|---|---|
| `npm run dev:web` | เปิด Vite บนเครื่อง |
| `npm run dev:host` | เปิด Vite ที่ `0.0.0.0:5173` |
| `npm run dev:api` | เปิด API พร้อม file watching |
| `npm run lint` | Type-check ทั้งสอง workspaces |
| `npm test` | รัน Vitest ทั้งหมด |
| `npm run build` | Build ทั้งสอง workspaces |

หากต้องการรันเฉพาะ workspace ให้ใช้ `--workspace web` หรือ `--workspace api` เช่น:

```powershell
npm test --workspace api
npm run build --workspace web
```

## โครงสร้างโปรเจกต์

```text
apps/api/src/data/       ข้อมูลการแข่งขันแบบ static
apps/api/src/routes/     Express route handlers
apps/api/src/services/   Business logic และ external providers
apps/web/src/components/ UI และ tab modules
apps/web/src/hooks/      Session, query, gesture และ notification hooks
apps/web/src/lib/        API client, types, identity และ query helpers
supabase/migrations/     Database schema และ access-control migrations
```

## ปัญหาที่พบบ่อย

- ติดต่อ API ไม่ได้: ตรวจว่า `npm run dev:api` ทำงาน และใช้ `Invoke-RestMethod http://localhost:3001/health` ตรวจสอบ
- ข้อมูลการเลือกไม่ถาวร: ตรวจ Supabase URL/key และ migrations หากไม่มีระบบจะใช้ memory โดยตั้งใจ
- โทรศัพท์เปิด UI ได้แต่ API ใช้ไม่ได้: ใช้ `VITE_API_BASE_URL` ค่าว่างร่วมกับ `dev:host` หรือตั้ง API origin ที่เข้าถึงได้พร้อม `CORS_EXTRA_ORIGINS`
- โทรศัพท์เปิด UI ไม่ได้: ตรวจ IPv4 ปัจจุบัน พอร์ตของ Vite กฎ Private-LAN firewall และยืนยันว่าอุปกรณ์ทั้งสองใช้ Wi-Fi ที่ไว้ใจได้วงเดียวกัน
- พอร์ตถูกใช้งานอยู่: หา process หรือ Docker container ที่เป็นเจ้าของก่อน หยุดเฉพาะเมื่อเป็นของโปรเจ็กนี้ มิฉะนั้นให้ใช้พอร์ตอื่น
- แก้แล้วไม่เปลี่ยน: restart Vite หลังแก้ environment และ rebuild หลังเปลี่ยน dependency หรือ production image

หยุด development server ที่ทำงานใน terminal ด้วย `Ctrl + C`
