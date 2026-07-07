# Fixtures Live Clock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แสดง clock สดและเวลาทดเวลาในหน้า Fixtures เช่น `45:01 +6`

**Architecture:** ส่ง `status.extra` จาก API-Football ผ่าน API ของแอปเป็น `statusExtra` แล้วใช้ React clock เพิ่มวินาทีระหว่างสถานะที่บอลกำลังเดิน โดยตั้งฐานใหม่ทุกครั้งที่ข้อมูล fixture เปลี่ยน

**Tech Stack:** TypeScript, React, Vitest, Testing Library

---

### Task 1: Map stoppage time through the API

**Files:**
- Modify: `apps/api/src/types.ts`
- Modify: `apps/api/src/services/apiFootballService.ts`
- Test: `apps/api/src/services/apiFootballService.test.ts`

- [ ] เพิ่ม fixture ทดสอบที่มี `status.extra: 6` และคาดหวัง `statusExtra: 6`
- [ ] รัน API service test และยืนยันว่า fail เพราะยังไม่มี `statusExtra`
- [ ] เพิ่ม `extra` ใน raw status type, `statusExtra` ใน Fixture และ mapping
- [ ] รัน API service test และยืนยันว่าผ่าน

### Task 2: Render a ticking live clock

**Files:**
- Create: `apps/web/src/components/home/FixtureLiveClock.tsx`
- Create: `apps/web/src/components/home/FixtureLiveClock.test.tsx`
- Modify: `apps/web/src/lib/types.ts`
- Modify: `apps/web/src/components/home/FixturesTab.tsx`

- [ ] เขียน fake-timer test ที่เริ่ม `45:00 +6` และหลังหนึ่งวินาทีเป็น `45:01 +6`
- [ ] เขียน test ว่าสถานะพักครึ่งไม่เพิ่มวินาที
- [ ] รัน test และยืนยันว่า fail เพราะ component ยังไม่มี
- [ ] สร้าง `FixtureLiveClock` ที่ตั้งฐานจาก `statusElapsed`, เพิ่มวินาทีเฉพาะสถานะที่ clock เดิน และแสดง `statusExtra` เมื่อมากกว่า 0
- [ ] เพิ่ม `statusExtra` ใน web Fixture type และใช้ component ใน FixturesTab
- [ ] รัน targeted tests และยืนยันว่าผ่าน

### Task 3: Regression verification

**Files:**
- Test: `apps/web/src/components/home/FixturesTab.test.tsx`

- [ ] ปรับ expectation เดิมจาก `67'` ให้ตรงกับ clock แบบ `67:00`
- [ ] รัน Fixtures tests, API service tests, typecheck/lint และ production builds
- [ ] ตรวจหน้า Fixtures ผ่าน dev server ว่า layout ไม่ล้นและ clock เดินจริง
