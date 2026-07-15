# การดูแลระบบ

[English](../en/OPERATIONS.md) | ภาษาไทย

คู่มือนี้อ้างอิง Docker Compose deployment ตาม [การติดตั้งใช้งาน](DEPLOYMENT.md)

## ตรวจสถานะประจำวัน

```bash
docker compose ps
docker compose logs --tail 100
curl -fsS http://127.0.0.1:8088/healthz
```

ระบบทำงานปกติเมื่อ:

- `api` และ `web` ทำงานและ healthy
- `/healthz` คืน `ok`
- `/api/tournament/teams` คืน JSON
- Public HTTPS URL เปิดได้โดยไม่มี certificate error

## Logs

```bash
docker compose logs -f
docker compose logs -f api
docker compose logs -f web
docker compose logs --since 30m api
```

กด `Ctrl+C` เพื่อหยุดติดตาม logs โดย containers ยังทำงานต่อ API response มี `x-request-id` ซึ่งใช้จับคู่กับบรรทัดใน API log ได้

## Restart และ rebuild

```bash
# Restart โดยไม่ build ใหม่
docker compose restart
docker compose restart api

# ปรับระบบให้ตรงกับ configuration
docker compose up -d

# Rebuild หลังแก้ code หรือ dependency
docker compose up -d --build

# หยุดและลบ containers/network ของ stack นี้
docker compose down
```

`docker compose down` ไม่ลบข้อมูลใน Supabase Cloud และไม่ลบ local images

## Checklist เมื่อระบบมีปัญหา

1. ใช้ `docker compose ps` หา container ที่ stopped, unhealthy หรือ restarting
2. อ่าน log ล่าสุด 100–200 บรรทัดของ service ที่มีปัญหา
3. ทดสอบ `/healthz` และ `/api` endpoint ผ่าน proxy จาก VPS โดยตรง
4. ตรวจ disk, memory, DNS และ outbound connectivity
5. ตรวจว่ามี production environment variables โดยไม่พิมพ์ค่า secret ลง shared log
6. Restart เฉพาะ service ที่มีปัญหาเมื่อ configuration ไม่ได้เปลี่ยน
7. Rollback หากปัญหาเริ่มทันทีหลัง deploy

## ปัญหาที่พบบ่อย

### Web container healthy แต่ public site เข้าไม่ได้

- ตรวจสถานะและ configuration ของ Host Nginx
- ยืนยันว่า proxy ไป `127.0.0.1:8088`
- ตรวจ firewall และ TLS certificate
- รัน `curl -I http://127.0.0.1:8088/` บน VPS โดยตรง

### เว็บเปิดได้แต่ API ใช้ไม่ได้

- ตรวจ `docker compose logs api` และ API health
- ยืนยันว่า web container resolve ชื่อ Compose service `api` ได้
- ตรวจ Supabase และ external-provider configuration
- ใช้ `requestId` จาก response หา error log ที่ตรงกัน

### ข้อมูลการเลือกหายหลัง restart

API กำลังใช้ in-memory fallback ให้ตั้ง `SUPABASE_URL` และ server key ที่ถูกต้องหนึ่งค่า แล้วตรวจว่ามีตาราง `participant_selections` และ migrations ครบ

### Fixtures หรือ standings แสดงข้อมูล static

ตรวจ `FOOTBALL_API_KEY`, league ID, season, provider quota และ outbound network ระบบตั้งใจใช้ static fallback เมื่อข้อมูล live ไม่พร้อม

### ข่าวเป็นรายการว่าง

RSS provider อาจเข้าไม่ได้หรือเปลี่ยน feed ระบบตั้งใจคืนรายการว่างเมื่อเกิด feed error

## ทรัพยากรและพื้นที่ disk

```bash
docker stats
docker system df
docker image ls
```

ลบ unused images หลังยืนยันว่าไม่ต้องใช้ rollback เท่านั้น หลีกเลี่ยง prune commands แบบกว้างระหว่างแก้ incident

## การปกป้องข้อมูล

- Supabase เก็บข้อมูลถาวรของแอป ต้องตั้ง backup/recovery แยกจาก Docker
- เก็บ VPS `.env` อย่างปลอดภัย และห้ามใส่ Git หรือ backup ทั่วไปที่ไม่เข้ารหัส
- ใช้ database migrations อย่างตั้งใจและสำรองข้อมูลก่อนเปลี่ยน schema แบบทำลายข้อมูล
- Containers เป็นของที่สร้างใหม่ได้ ไม่ควรถือเป็น backup

## ตรวจสอบหลัง Deploy

- Containers ทั้งสอง healthy
- Team list และ Participant session APIs ทำงาน
- เมื่อได้รับอนุญาตให้ทดสอบ production สามารถสร้าง เปลี่ยน และ reset test selection ได้
- Fixtures, standings, knockout และ news แสดงผล
- Mobile และ desktop layouts เปิดได้
- Host HTTPS และ certificate renewal ทำงานปกติ
