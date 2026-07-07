# Knockout Desktop Owner Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** แสดง `<displayName>` ใต้ชื่อทีมบนการ์ด Knockout เวอร์ชัน Desktop โดยไม่เติมคำว่า `Owner:` และไม่กระทบ placeholder หรือ mobile layout

**Architecture:** ใช้ `Team.ownedByName` จาก teams query ที่ `KnockoutTab` ได้รับอยู่แล้ว ฟังก์ชัน resolve ทีมยังคงเป็นจุดจับคู่รหัสทีม ส่วน `KnockoutTeamName` รับผิดชอบสร้าง label ของ Owner และ CSS จำกัดข้อความให้อยู่ในพื้นที่การ์ด

**Tech Stack:** React 19, TypeScript, Vitest, Testing Library, CSS

---

### Task 1: ระบุพฤติกรรม Owner บน Desktop ด้วย Test

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.test.tsx`
- Test: `apps/web/src/components/home/KnockoutTab.test.tsx`

- [ ] **Step 1: ปรับ test ให้คาดหวัง prefix Owner บน desktop card**

ใช้ทีมที่มี `ownedByName: "မင်း"` แล้วค้นหาข้อความ `Owner: မင်း` เฉพาะภายใน `.knockout-card`:

```tsx
const desktopOwner = screen
  .getAllByText("မင်း")
  .find((node) => node.closest(".knockout-card"));
expect(desktopOwner).toHaveAttribute("title", "မင်း");
expect(screen.queryByText("Owner: မင်း")).not.toBeInTheDocument();
```

- [ ] **Step 2: รัน test และยืนยัน RED**

Run: `npm run test --workspace web -- src/components/home/KnockoutTab.test.tsx`

Expected: FAIL เพราะ component ปัจจุบันเติม `Owner:` หน้าค่า display name

### Task 2: แสดง Owner และรักษา Layout

**Files:**
- Modify: `apps/web/src/components/home/KnockoutTab.tsx`
- Modify: `apps/web/src/styles.css`
- Test: `apps/web/src/components/home/KnockoutTab.test.tsx`

- [ ] **Step 1: เพิ่ม prefix และ title ใน component**

```tsx
{resolved.ownerName ? (
  <small className="knockout-owner-name" title={resolved.ownerName}>
    {resolved.ownerName}
  </small>
) : null}
```

- [ ] **Step 2: เปิดการแสดงผลเฉพาะ desktop card พร้อม ellipsis**

```css
.knockout-card .knockout-owner-name {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

- [ ] **Step 3: รัน test และยืนยัน GREEN**

Run: `npm run test --workspace web -- src/components/home/KnockoutTab.test.tsx`

Expected: test file ผ่านทั้งหมด

- [ ] **Step 4: รัน type check และ web tests ทั้งหมด**

Run: `npm run lint --workspace web`

Expected: exit code 0

Run: `npm run test --workspace web`

Expected: test ผ่านทั้งหมด

### Task 3: ตรวจหน้า Desktop จริง

**Files:**
- Verify: `apps/web/src/components/home/KnockoutTab.tsx`
- Verify: `apps/web/src/styles.css`

- [ ] **Step 1: เปิดหน้า Knockout ที่ viewport desktop**

ใช้ dev server ที่ `http://192.168.110.120:5173/` และตั้ง viewport อย่างน้อย 1280px

- [ ] **Step 2: ตรวจ DOM และ layout**

ยืนยันว่าทีมที่มีเจ้าของแสดง `Owner: <displayName>` ภายใน `.knockout-card`, placeholder ไม่มี Owner และชื่อยาวไม่ขยายการ์ด

- [ ] **Step 3: ตรวจ diff สุดท้าย**

Run: `git diff --check`

Expected: ไม่มี whitespace error
