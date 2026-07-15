# สถาปัตยกรรมระบบ

[English](../en/ARCHITECTURE.md) | ภาษาไทย

## ภาพรวมระบบ

```text
Browser
  |
  v
React/Vite web
  |
  | HTTP /api/*
  v
Express API
  |-- Supabase Cloud (ข้อมูลการเลือกทีม)
  |-- API-Football (โปรแกรมแข่งขันและตารางคะแนน)
  `-- RSS feed (ข่าว)
```

ใน production Nginx ให้บริการไฟล์ React ที่ build แล้ว และ proxy `/api/*` ไปยัง API container โดยค่าเริ่มต้น Docker เปิด web container ที่ `127.0.0.1:8088` ส่วน API อยู่ใน Compose network ภายในที่ port `3001`

## Web application

`apps/web` รับผิดชอบการแสดงผลและสถานะใน browser

- `App.tsx` เลือกแสดงสถานะโหลด session, หน้าเลือกทีม หรือ Home View
- `useParticipantSession` ทำให้ local storage และ API session ตรงกัน
- TanStack Query โหลดข้อมูลการแข่งขันและ Participant
- Home tabs โหลด module แบบ lazy สำหรับ Knockout, Fixtures, Table และ News
- `src/lib/api.ts` เป็น HTTP client contract ที่ใช้งานจริง

Web application ต้องไม่ได้รับ Supabase server keys หรือ external API secrets เพราะค่าที่ขึ้นต้นด้วย `VITE_` จะถูกฝังลงในไฟล์ที่ browser ดาวน์โหลดได้

## API application

`apps/api` รับผิดชอบ validation, กฎการเลือกทีม, external data และ persistence

- `server.ts` ตั้งค่า CORS, JSON parsing, request IDs, logging, routes, 404 และ centralized error handling
- `selectionService.ts` ประสาน Supabase, in-memory fallback, เจ้าของทีม และข้อมูลการแข่งขัน
- `apiFootballService.ts` โหลดและ cache fixtures/standings แบบ live
- `knockoutProjectionService.ts` คำนวณรอบน็อกเอาต์จากตารางและผลการแข่งขัน
- `rssService.ts` โหลดและ cache ข่าวเป็นเวลา 15 นาที

## ข้อมูลและ fallback

- ข้อมูลการเลือกทีมถูกบันทึกใน Supabase เมื่อตั้งค่า `SUPABASE_URL` และ server key ครบ
- หากตั้งค่า Supabase ไม่ครบ ระบบใช้ in-memory selection store ซึ่งเหมาะสำหรับการพัฒนาเท่านั้น
- หาก API-Football ไม่ได้ตั้งค่าหรือใช้ข้อมูลไม่ได้ ระบบกลับไปใช้ fixtures และ standings แบบ static
- Knockout projection กลับไปใช้ข้อมูล static เมื่อการโหลด live fixtures ล้มเหลว
- หาก RSS ล้มเหลว endpoint ข่าวจะคืนรายการว่าง

## Containers

| Service | Runtime | หน้าที่ |
|---|---|---|
| `web` | Nginx Alpine | ให้บริการ React, SPA fallback, proxy `/api` และ health endpoint |
| `api` | Node.js 22 Alpine | รัน Express API ที่ bundle แล้ว |

ทั้งสอง images ใช้ multi-stage build โดยคัดลอกเฉพาะ web build output และ API bundle ไปยัง runtime stage ที่เล็กกว่า

## ขอบเขต notification ปัจจุบัน

Repository มีโครงสำหรับ push notification และ WebSocket ทั้งฝั่ง client/service และ Nginx จอง path `/ws` ไว้ แต่ Express server ที่ทำงานจริง mount เฉพาะ health, tournament และ participant routers เท่านั้น push routes และ WebSocket upgrade server ยังไม่ทำงาน ให้ถือว่า notification ยังไม่สมบูรณ์จนกว่าจะเชื่อมต่อฝั่ง server และทดสอบครบ
