# การทดสอบ

[English](../en/TESTING.md) | ภาษาไทย

Repository ใช้ Vitest สำหรับ API และ Web โดย Web tests รันด้วย jsdom และ Testing Library ส่วน API tests รันใน Node environment

## ตรวจสอบทั้งหมด

รันจาก root ของ repository:

```powershell
npm run lint
npm test
npm run build
docker compose build
```

| คำสั่ง | สิ่งที่ตรวจสอบ |
|---|---|
| `npm run lint` | TypeScript checks ของทั้งสอง workspaces |
| `npm test` | API และ Web tests ทั้งหมด |
| `npm run build` | Production compilation ของทั้งสอง workspaces |
| `docker compose build` | Container build files และ production packaging |

## ทดสอบแต่ละ Workspace

```powershell
npm test --workspace api
npm test --workspace web
npm run lint --workspace api
npm run lint --workspace web
```

รัน Vitest เฉพาะไฟล์โดยส่ง path หลัง `--`:

```powershell
npm test --workspace api -- src/routes/participant.test.ts
npm test --workspace web -- src/lib/deviceIdentity.test.ts
```

## พื้นที่ที่มี Automated tests ปัจจุบัน

API tests ครอบคลุม participant routes, tournament routes, API-Football mapping/cache และ knockout projection ส่วน Web tests ครอบคลุม device identity, queries, selection UI, layouts, tab loading/error states, swipe, fixtures, knockout และ table presentation

Automated tests ไม่ได้แทนการตรวจ live providers, Supabase permissions, browser, mobile device, Docker networking หรือ VPS HTTPS

## Manual smoke test

1. เปิดแอปด้วย browser profile ใหม่
2. ค้นหาและเลือกทีมที่ยังว่างพร้อมกรอก Display Name
3. Refresh และยืนยันว่าระบบคืน Participant เดิม
4. ตรวจ Knockout, Fixtures, Table และ News tabs
5. เปลี่ยนทีมและยืนยันว่าทีมเดิมกลับมาว่าง
6. Reset device และยืนยันว่าการเลือกถูกปล่อย
7. ลองเลือกทีมเดียวกันจากสอง browser profiles และยืนยันว่า request ที่สองเกิด conflict
8. ตรวจหน้าจอมือถือแคบและ desktop

## Docker smoke test

```powershell
docker compose up -d --build
docker compose ps
```

ตรวจสอบ:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8088/healthz
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8088/
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8088/api/tournament/teams
```

แล้วหยุด test stack:

```powershell
docker compose down
```

## ก่อน Merge หรือ Deploy

- ตรวจ diff และไม่รวม local changes ที่ไม่เกี่ยวข้อง
- ยืนยันว่าไม่มี `.env`, keys, logs หรือ generated build output ถูก stage
- รัน full verification commands
- ตรวจ database migrations แยกต่างหาก
- อัปเดตเอกสารทั้งอังกฤษและไทยเมื่อ behavior หรือคำสั่งเปลี่ยน
- ทำ post-deployment checks ตาม [การดูแลระบบ](OPERATIONS.md)
