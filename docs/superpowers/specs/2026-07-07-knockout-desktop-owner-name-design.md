# Knockout Desktop Owner Name Design

## เป้าหมาย

แสดง `displayName` ของผู้ใช้ที่เลือกทีมบนการ์ดการแข่งขันในหน้า Knockout เวอร์ชัน Desktop เพื่อให้เห็นได้ทันทีว่าแต่ละทีมมีใครเป็นเจ้าของ

## ขอบเขต

- แสดงข้อความ `Owner: <displayName>` ใต้ชื่อทีมทั้งฝั่งเหย้าและฝั่งเยือนบนการ์ด Desktop
- ใช้ข้อมูล `Team.ownedByName` ที่มีอยู่แล้วจาก teams query และจับคู่ด้วยรหัสทีม
- ไม่แสดงบรรทัด Owner เมื่อทีมยังไม่มีเจ้าของ
- ไม่แสดงบรรทัด Owner สำหรับข้อความ placeholder เช่น `Winner Match 1`
- ชื่อที่ยาวเกินพื้นที่ของการ์ดต้องอยู่บรรทัดเดียวและตัดด้วย `…`
- ไม่เปลี่ยนหน้าตา Mobile bracket หรือ Knockout overview ในงานนี้

## โครงสร้างและ Data Flow

`AppShell` โหลดข้อมูล knockout และ teams ตามเดิม แล้วส่ง `teams` เข้า `KnockoutTab` โดยไม่เพิ่ม API request ใหม่ ภายใน `KnockoutTab` ฟังก์ชัน resolve ทีมจะอ่าน `ownedByName` จากทีมที่ตรงกับรหัสบน bracket และส่วนแสดงชื่อทีมบน Desktop จะเติม prefix `Owner:` ก่อนค่า display name

## สถานะข้อมูล

- ทีมที่ resolve ได้และมี `ownedByName`: แสดง `Owner: <displayName>`
- ทีมที่ resolve ได้แต่ไม่มี `ownedByName`: ไม่แสดง Owner
- placeholder หรือทีมที่ resolve ไม่ได้: ไม่แสดง Owner
- display name ที่เป็น Unicode รวมถึงภาษาไทยและภาษาพม่าต้องแสดงตามค่าจริง

## การจัดวาง

Owner อยู่ใต้ชื่อทีมภายในพื้นที่ข้อความเดิมของการ์ด ใช้ขนาดตัวอักษรรองและสีที่ไม่แย่งความเด่นจากชื่อทีม พร้อม `overflow: hidden`, `text-overflow: ellipsis` และ `white-space: nowrap` เพื่อไม่ให้การ์ดขยายหรือกระทบเส้น bracket

## การทดสอบ

- Component test ยืนยันว่าการ์ด Desktop แสดง `Owner: <displayName>` เมื่อทีมมีเจ้าของ
- Component test ยืนยันว่า placeholder ไม่มีบรรทัด Owner
- CSS assertion ยืนยันว่าชื่อ Owner ตัดด้วย ellipsis และอยู่บรรทัดเดียว
- รัน test ของ `KnockoutTab`, type check และตรวจหน้า Desktop ผ่าน dev server

## เกณฑ์สำเร็จ

บนหน้า Knockout เวอร์ชัน Desktop การ์ดของทีมที่ถูกเลือกแสดง `Owner: <displayName>` ใต้ชื่อทีมอย่างอ่านได้ โดยชื่อยาวไม่ทำให้ layout เสีย และทีมที่ไม่มีเจ้าของหรือยังเป็น placeholder ไม่แสดงข้อความ Owner
