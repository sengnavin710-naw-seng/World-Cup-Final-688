# การตั้งค่า

[English](../en/CONFIGURATION.md) | ภาษาไทย

## ไฟล์ environment

| บริบท | ไฟล์ | หน้าที่ |
|---|---|---|
| พัฒนา API บนเครื่อง | `apps/api/.env` | API process อ่านเมื่อรัน workspace script |
| พัฒนา Web บนเครื่อง | `apps/web/.env` | Vite อ่านตอนเริ่มหรือ build |
| Docker Compose | `.env` | ส่งค่าเข้า API service และใช้แทนค่าใน Compose |
| ตัวอย่าง | `.env.example` | เก็บเฉพาะชื่อตัวแปร ห้ามใส่ secrets จริง |

หลังแก้ environment file ให้ restart process ที่เกี่ยวข้อง ค่า `VITE_*` เป็นค่าในช่วง build จึงต้อง rebuild web assets/image

## ตัวแปรของ API

| ตัวแปร | จำเป็น | Secret | ค่าเริ่มต้น/พฤติกรรม |
|---|---:|---:|---|
| `PORT` | ไม่ | ไม่ | `3001` |
| `SUPABASE_URL` | เมื่อใช้ข้อมูลถาวร | ไม่ | ค่าว่างจะใช้ in-memory fallback |
| `SUPABASE_SECRET_KEY` | เมื่อใช้ข้อมูลถาวร | ใช่ | ชื่อ server key ที่ระบบเลือกใช้ก่อน |
| `SUPABASE_SERVICE_ROLE_KEY` | ตัวเลือกสำรอง | ใช่ | ใช้เมื่อไม่มี `SUPABASE_SECRET_KEY` |
| `FOOTBALL_API_BASE_URL` | ไม่ | ไม่ | `https://v3.football.api-sports.io` |
| `FOOTBALL_API_KEY` | เมื่อใช้ข้อมูล live | ใช่ | หากไม่มีจะใช้ข้อมูล static |
| `FOOTBALL_WORLD_CUP_LEAGUE_ID` | เมื่อใช้ข้อมูล live | ไม่ | ไม่มีค่า league ID โดยอัตโนมัติ |
| `FOOTBALL_WORLD_CUP_SEASON` | ไม่ | ไม่ | `2026` |
| `FOOTBALL_API_CACHE_TTL_MS` | ไม่ | ไม่ | cache ผลการแข่งขัน `15000` milliseconds |
| `FOOTBALL_API_STANDINGS_CACHE_TTL_MS` | ไม่ | ไม่ | cache ตารางคะแนน `300000` milliseconds |
| `CORS_EXTRA_ORIGINS` | ไม่ | ไม่ | origins เพิ่มเติม คั่นด้วย comma |

`SUPABASE_SECRET_KEY` และ `SUPABASE_SERVICE_ROLE_KEY` เป็นสิทธิ์ฝั่ง server ห้ามส่งไปยัง browser

ตัวอย่าง `apps/api/.env`:

```env
PORT=3001
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SECRET_KEY=YOUR_SERVER_KEY
FOOTBALL_API_BASE_URL=https://v3.football.api-sports.io
FOOTBALL_API_KEY=YOUR_API_KEY
FOOTBALL_WORLD_CUP_LEAGUE_ID=1
FOOTBALL_WORLD_CUP_SEASON=2026
FOOTBALL_API_CACHE_TTL_MS=15000
FOOTBALL_API_STANDINGS_CACHE_TTL_MS=300000
CORS_EXTRA_ORIGINS=
```

## ตัวแปรของ Web

| ตัวแปร | จำเป็น | ค่าเริ่มต้น/พฤติกรรม |
|---|---:|---|
| `VITE_API_BASE_URL` | ไม่ | ค่าว่างหมายถึงเรียก same-origin เช่น `/api/...` |
| `VITE_BRAND_NAME` | ไม่ | `World Cup Festival 688` |

ตัวอย่าง `apps/web/.env` สำหรับเรียก API บนเครื่องโดยตรง:

```env
VITE_API_BASE_URL=http://localhost:3001
VITE_BRAND_NAME=World Cup Festival 688
```

Docker production build กำหนด `VITE_API_BASE_URL` เป็นค่าว่างโดยตั้งใจ เพื่อให้ browser เรียก domain เดียวกันและให้ Nginx proxy `/api/` ไป API service

## ตัวแปรที่ใช้เฉพาะ Compose

| ตัวแปร | ค่าเริ่มต้น | หน้าที่ |
|---|---|---|
| `WEB_BIND_ADDRESS` | `127.0.0.1` | Host interface ที่เปิด web container |
| `WEB_PORT` | `8088` | Host port ที่ map ไป Nginx port 80 |

ใช้ `WEB_BIND_ADDRESS=0.0.0.0` เฉพาะเมื่อต้องการให้เครื่องอื่นเชื่อมต่อ container โดยตรง บน VPS ที่มี host reverse proxy ควรใช้ `127.0.0.1`

## กฎด้านความปลอดภัย

- `.env` และ `.env` ของแต่ละ workspace ต้องไม่เข้า Git
- ห้ามใส่ server secrets ในตัวแปร `VITE_*` เพราะมองเห็นได้ใน JavaScript ของ browser
- เก็บ production secrets ไว้บน VPS หรือ secret manager โดยเฉพาะ
- เปลี่ยน key ทันทีหากปรากฏใน commit, screenshot, terminal transcript หรือ frontend bundle
