# การติดตั้งใช้งาน

[English](../en/DEPLOYMENT.md) | ภาษาไทย

Docker Compose เป็นรูปแบบ production ที่รองรับสำหรับ repository นี้ โดยรันสอง services:

```text
Host Nginx / HTTPS (แนะนำบน VPS)
  -> 127.0.0.1:8088
  -> web container (Nginx + React)
  -> api container (Node.js :3001, ใช้ภายในเท่านั้น)
  -> Supabase Cloud / API-Football / RSS
```

## สิ่งที่ต้องมี

- Docker Engine พร้อม Compose plugin
- Repository บนเครื่องปลายทาง
- Production `.env` ที่ root ของ repository
- Supabase project ที่รัน migrations ทั้งสองไฟล์แล้ว
- Host reverse proxy และ TLS certificate สำหรับ public HTTPS

ไม่ต้องใช้ PM2 เมื่อ API รันใน Docker เพราะ Compose จัดการ restart ด้วย `restart: unless-stopped`

## Production environment

สร้าง `.env` ที่ root ของ repository โดยอย่างน้อยต้องตรวจค่าต่อไปนี้:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
FOOTBALL_API_KEY=
FOOTBALL_WORLD_CUP_LEAGUE_ID=1
FOOTBALL_WORLD_CUP_SEASON=2026
WEB_BIND_ADDRESS=127.0.0.1
WEB_PORT=8088
```

ห้ามนำ development `.env` ไปเขียนทับ production file ที่มีอยู่ อ่านรายละเอียดใน [การตั้งค่า](CONFIGURATION.md)

## Deploy ครั้งแรก

```bash
cd /var/www/World-Cup-Final-688
docker compose build
docker compose up -d
docker compose ps
```

สถานะที่ถูกต้องคือทั้ง `api` และ `web` แสดง `Up` และ healthy

ตรวจจาก host:

```bash
curl -fsS http://127.0.0.1:8088/healthz
curl -I http://127.0.0.1:8088/
curl -fsS http://127.0.0.1:8088/api/tournament/teams
```

## Host Nginx

ให้ container bind ที่ `127.0.0.1:8088` และจบ public HTTPS ที่ Nginx บน host ตัวอย่าง proxy ขั้นต่ำ:

```nginx
location / {
    proxy_pass http://127.0.0.1:8088;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

ตรวจ syntax ของ Host Nginx ก่อน reload ทุกครั้ง ส่วนการออกและต่ออายุ certificate ยังเป็นหน้าที่ของ host

## อัปเดตระบบ

1. ตรวจว่า containers ปัจจุบัน healthy และบันทึก commit ที่ deploy อยู่
2. สำรองหรือยืนยันการกู้ Supabase ก่อนเปลี่ยน schema
3. ดึง code revision ที่ต้องการ
4. รักษา production `.env` เดิม
5. Build และปรับ stack ให้ตรงกับ Compose

```bash
git pull --ff-only origin main
docker compose up -d --build
docker compose ps
docker compose logs --tail 100
```

หลัง deploy ทุกครั้งให้รัน verification requests ซ้ำ

## หลักการ rollback

เก็บ Git revision ที่ใช้งานได้และ images เดิมไว้จนกว่าจะตรวจ release ใหม่เสร็จ หาก release มีปัญหา ให้ deploy revision ที่ใช้งานได้แล้ว rebuild หรือใช้ image ที่มี version ชัดเจนจาก registry ห้ามใช้ `git reset --hard` บน VPS ที่ยังมี local changes ซึ่งไม่ได้ตรวจสอบ

หากต้องการ rollback ที่ทำซ้ำได้ ขั้นต่อไปคือใช้ CI ติด tag images ทั้งสองด้วย Git commit SHA และส่งเข้า private registry

## การออกแบบ Container build

- `Dockerfile.web` build React ด้วย Node.js แล้วคัดลอกเฉพาะ `dist` ไป Nginx
- `Dockerfile.api` build API bundle, ติดตั้ง production dependencies และรันด้วย non-root user `node`
- `.dockerignore` ตัด `.env`, Git data, dependencies, logs, build output และเอกสารออก
- Nginx proxy `/api/`, จอง `/ws`, รองรับ SPA fallback และไม่ cache `index.html` กับ `sw.js` ระยะยาว

## เปิด container โดยตรง

สำหรับทดสอบใน trusted LAN เท่านั้น ให้ตั้ง:

```env
WEB_BIND_ADDRESS=0.0.0.0
WEB_PORT=8088
```

ไม่ควรใช้ HTTP ที่เปิดตรงเป็น production สาธารณะ ควรมี firewall และ HTTPS reverse proxy
