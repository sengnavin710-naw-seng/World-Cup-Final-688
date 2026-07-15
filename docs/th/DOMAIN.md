# คำศัพท์และกฎระบบ

[English](../en/DOMAIN.md) | ภาษาไทย

เอกสารนี้กำหนดคำศัพท์ของผลิตภัณฑ์และกฎทางธุรกิจที่ควรใช้ให้ตรงกันใน UI, API, tests และเอกสาร

## คำศัพท์หลัก

**Participant (ผู้เข้าร่วม)**: ผู้ที่ใช้งานเว็บไซต์เลือกทีมฟุตบอลโลก

**National Team (ทีมชาติ)**: หนึ่งในทีมฟุตบอลโลกที่เปิดให้เลือก

**Team Selection (ทีมที่เลือก)**: ทีมชาติหนึ่งทีมที่ Participant เลือกอยู่ในปัจจุบัน

**Selection Rule (กฎการเลือก)**: Participant มี Team Selection ได้ไม่เกินหนึ่งทีม และ National Team หนึ่งทีมเป็นของ Participant ได้ไม่เกินหนึ่งคน

**Returning Participant (ผู้ใช้ที่กลับมา)**: Participant ที่ระบบจดจำได้เมื่อเปิดเว็บไซต์ด้วย browser identity เดิม

**Device Identity**: รหัสประจำ browser ซึ่งเก็บใน local storage ด้วย key `wcf688-device-id`

**Device Reset**: การลบ Selection Record ฝั่ง server และล้าง identity/session ใน browser อย่างชัดเจน

**Selection Release**: การคืน National Team ให้กลับมาเลือกได้ เมื่อเจ้าของทำ Device Reset

**Display Name (ชื่อแสดงผล)**: ชื่อที่ Participant กรอก โดย API จำกัดความยาวไม่เกิน 80 ตัวอักษร

**Selection Change (เปลี่ยนทีม)**: การเปลี่ยนจาก Team Selection ปัจจุบันไปเป็น National Team อื่นที่ยังว่าง หลังยืนยันการเปลี่ยน

**Selection Conflict**: การเลือกที่ถูกปฏิเสธ เพราะ National Team นั้นมี Participant คนอื่นเป็นเจ้าของแล้ว

**Selection Record**: ข้อมูลที่เชื่อม `deviceId`, `displayName` และ `teamCode` สามตัวอักษรเข้าด้วยกัน

**Team Availability**: สถานะว่า National Team ยังว่างหรือมีเจ้าของแล้ว พร้อมชื่อเจ้าของเมื่อมีข้อมูล

## ส่วนต่าง ๆ ของผลิตภัณฑ์

**Team Selection Grid**: ตารางทีมที่ค้นหาได้ ใช้สำหรับเลือก National Team

**Team Search**: ช่องกรอง Team Selection Grid ด้วยชื่อทีมและ alias ที่ระบบรองรับ

**Selection Confirmation**: การยืนยัน National Team ที่เลือกไว้และเข้าสู่ Home View

**Home View**: หน้าหลักหลังเลือกทีม หรือหลังผู้ใช้เลือกข้ามขั้นตอนการเลือกทีม

**Brand Header**: พื้นที่ navigation ด้านบนที่แสดงชื่อ World Cup Festival 688 และ action หลักของแอป

**Home Tabs**: Knockout, Fixtures, Table และ News

**Selected Team Summary**: ส่วนสรุปทีมที่ Participant เลือก และเป็นจุดเริ่มต้นสำหรับเปลี่ยนทีม

**Company Picks Table**: รายการรวมว่า Participant แต่ละคนเป็นเจ้าของ National Team ใด

**Notification Panel**: แผงที่เปิดจากปุ่มกระดิ่งเพื่อแสดงข้อมูลอัปเดตของการแข่งขัน

**Team Spotlight News**: ข่าวการแข่งขันที่เน้น National Team ซึ่ง Participant เลือกไว้

**Mock Tournament Data**: ข้อมูลการแข่งขันแบบ static ที่ใช้เมื่อ live provider ที่ตั้งค่าไว้ไม่พร้อมใช้งาน

## กฎการจัดเก็บข้อมูล

- ตาราง `participant_selections` ใน Supabase บังคับให้ `device_id` และ `team_code` ไม่ซ้ำกัน
- หากตั้งค่า Supabase ไม่ครบ API จะใช้ in-memory store และข้อมูลจะหายเมื่อ API process restart
- Browser เก็บทั้ง Device Identity และ Participant session ล่าสุดไว้ใน local storage
