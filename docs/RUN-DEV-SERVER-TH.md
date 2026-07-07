# คู่มือรันโปรเจ็กและเปิด Dev Server

โปรเจ็กนี้ใช้ npm workspaces และแบ่งเป็น 2 ส่วน:

- **Web (Frontend):** React + Vite ทำงานที่ `http://localhost:5173`
- **API (Backend):** Express ทำงานที่ `http://localhost:3001`

ควรเปิดทั้งสองส่วนพร้อมกัน โดยใช้ Terminal แยกกัน 2 หน้าต่าง

## สิ่งที่ต้องติดตั้ง

- Node.js เวอร์ชัน 20 หรือใหม่กว่า
- npm เวอร์ชัน 10 หรือใหม่กว่า

ตรวจสอบเวอร์ชันได้ด้วยคำสั่ง:

```powershell
node --version
npm --version
```

## 1. เข้าโฟลเดอร์โปรเจ็ก

เปิด PowerShell แล้วรัน:

```powershell
cd "C:\Users\PM\Desktop\Web App Project\World Cup Festival Final 688"
```

## 2. ติดตั้ง Dependencies

ขั้นตอนนี้จำเป็นเมื่อนำโปรเจ็กไปรันครั้งแรก หรือเมื่อ `package.json` / `package-lock.json` มีการเปลี่ยนแปลง:

```powershell
npm install
```

## 3. ตรวจสอบไฟล์ Environment Variables

โปรเจ็กต้องมีไฟล์ต่อไปนี้:

- `apps/api/.env` สำหรับ Backend API
- `apps/web/.env` สำหรับ Frontend

หากยังไม่มีไฟล์ ให้ดูชื่อตัวแปรตัวอย่างจาก `.env.example` แล้วกรอกค่าที่จำเป็น ห้ามนำ secret หรือ API key ไป commit ลง Git

## 4. เปิด Backend API

ใน Terminal หน้าต่างแรก ให้รันจากโฟลเดอร์ root ของโปรเจ็ก:

```powershell
npm run dev:api
```

เมื่อตัว API พร้อมใช้งาน สามารถตรวจสอบได้ที่:

```text
http://localhost:3001/health
```

ผลลัพธ์ที่ถูกต้องคือ:

```json
{"status":"ok"}
```

## 5. เปิด Frontend Dev Server

เปิด Terminal หน้าต่างที่สอง เข้าโฟลเดอร์โปรเจ็กเดียวกัน แล้วรัน:

```powershell
npm run dev:web
```

จากนั้นเปิดเว็บเบราว์เซอร์ที่:

```text
http://localhost:5173
```

ถ้าต้องการให้เครื่องอื่นในเครือข่ายเดียวกันเปิดหน้าเว็บได้ ให้ใช้คำสั่งนี้แทน:

```powershell
npm run dev:host
```

คำสั่งนี้เปิด Vite ที่ `0.0.0.0:5173` จากนั้นใช้ IP address ของเครื่องที่รันโปรเจ็ก เช่น `http://192.168.1.10:5173`

## เปิดหน้าเว็บจากโทรศัพท์

### 1. เชื่อมต่อเครือข่ายเดียวกัน

เชื่อมต่อคอมพิวเตอร์และโทรศัพท์เข้ากับ Wi-Fi วงเดียวกันก่อน โทรศัพท์จะเข้าเว็บไม่ได้หากใช้ Mobile Data หรืออยู่คนละเครือข่าย

### 2. เปิด Frontend แบบรับการเชื่อมต่อจากเครือข่าย

รันคำสั่งต่อไปนี้จาก root ของโปรเจ็ก:

```powershell
npm run dev:host
```

ต้องใช้ `dev:host` แทน `dev:web` เพราะคำสั่งนี้กำหนดให้ Vite รับการเชื่อมต่อจากอุปกรณ์อื่นผ่าน `0.0.0.0:5173`

### 3. หา IPv4 Address ของคอมพิวเตอร์

เปิด PowerShell แล้วรัน:

```powershell
ipconfig
```

มองหาหัวข้อของอะแดปเตอร์ที่กำลังใช้งาน เช่น `Wireless LAN adapter Wi-Fi` แล้วดูค่า `IPv4 Address` ตัวอย่าง:

```text
IPv4 Address. . . . . . . . . . . : 192.168.110.120
```

IP address อาจเปลี่ยนเมื่อเชื่อมต่อ Wi-Fi ใหม่ จึงควรตรวจสอบอีกครั้งหาก URL เดิมใช้งานไม่ได้

### 4. เปิด URL บนโทรศัพท์

เปิดเบราว์เซอร์บนโทรศัพท์ แล้วใส่ IP ของคอมพิวเตอร์ตามด้วยพอร์ต `5173`:

```text
http://192.168.110.120:5173
```

สำหรับเครือข่ายที่ใช้ขณะเขียนคู่มือนี้ URL ด้านบนคือ URL ที่ทดสอบแล้ว หาก IPv4 Address ของเครื่องเปลี่ยน ให้แทน `192.168.110.120` ด้วย IP ปัจจุบันจาก `ipconfig`

### 5. อนุญาตผ่าน Windows Firewall เมื่อโทรศัพท์เข้าไม่ได้

ครั้งแรกที่รัน Node.js หรือ Vite อาจมีหน้าต่าง Windows Security Alert แสดงขึ้นมา ให้เลือกอนุญาตเฉพาะ **Private networks** สำหรับ Wi-Fi ที่ไว้ใจได้

หากไม่มีหน้าต่างแจ้งเตือนและโทรศัพท์ยังเข้าไม่ได้ ให้เปิด PowerShell แบบ **Run as administrator** แล้วรัน:

```powershell
netsh advfirewall firewall add rule name="World Cup Festival 688 Vite 5173" dir=in action=allow protocol=TCP localport=5173 profile=private
```

คำสั่งนี้เปิดรับเฉพาะ TCP พอร์ต 5173 บนเครือข่ายประเภท Private อย่าเปิดใช้งานบน Wi-Fi สาธารณะ หลังใช้งานเสร็จและไม่ต้องการกฎนี้แล้ว สามารถลบได้ด้วย PowerShell แบบ Administrator:

```powershell
netsh advfirewall firewall delete rule name="World Cup Festival 688 Vite 5173"
```

### หมายเหตุเกี่ยวกับ Backend API

โปรเจ็กนี้ตั้งค่าให้ Vite proxy เส้นทาง `/api` ไปยัง Backend ที่ `http://localhost:3001` ภายในคอมพิวเตอร์อยู่แล้ว ดังนั้นให้คงค่าใน `apps/web/.env` ไว้เป็นค่าว่าง:

```env
VITE_API_BASE_URL=
```

โทรศัพท์จึงเชื่อมต่อเฉพาะพอร์ต 5173 และไม่จำเป็นต้องเปิดพอร์ต 3001 ผ่าน Firewall แต่ต้องเปิด Backend ด้วย `npm run dev:api` ไว้บนคอมพิวเตอร์ด้วย หากหน้าเว็บเปิดได้แต่ข้อมูลไม่โหลด ให้ตรวจสอบว่า Backend ยังทำงานและ `http://localhost:3001/health` ตอบกลับ `{"status":"ok"}` บนคอมพิวเตอร์

## คำสั่งแบบย่อสำหรับการรันครั้งถัดไป

Terminal 1:

```powershell
npm run dev:api
```

Terminal 2:

```powershell
npm run dev:web
```

## วิธีหยุด Dev Server

กลับไปยัง Terminal ของเซิร์ฟเวอร์ที่ต้องการหยุด แล้วกด:

```text
Ctrl + C
```

หาก PowerShell ถามให้ยืนยันการยุติงาน ให้ตอบ `Y` แล้วกด Enter

## การแก้ปัญหาเบื้องต้น

### พอร์ต 3001 หรือ 5173 ถูกใช้งานอยู่

ตรวจสอบ process ที่ใช้พอร์ต:

```powershell
Get-NetTCPConnection -LocalPort 3001,5173 -State Listen
```

ปิด Dev Server ตัวเดิมด้วย `Ctrl + C` ก่อนเปิดใหม่ ไม่ควรสั่งปิด process อื่นจนกว่าจะแน่ใจว่าเป็น process ของโปรเจ็กนี้

### หน้าเว็บเปิดได้ แต่ดึงข้อมูลไม่ได้

ตรวจสอบว่า:

1. Backend API ยังทำงานอยู่
2. `http://localhost:3001/health` ตอบกลับ `{"status":"ok"}`
3. ค่า `VITE_API_BASE_URL` ใน `apps/web/.env` ชี้ไปที่ `http://localhost:3001`
4. ค่า Supabase และ API key ใน `apps/api/.env` ถูกต้อง

### Dependencies มีปัญหา

ลองติดตั้งใหม่จาก root ของโปรเจ็ก:

```powershell
npm install
```

จากนั้นหยุดและเปิด Dev Server ทั้งสองตัวใหม่
