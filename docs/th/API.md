# API

[English](../en/API.md) | ภาษาไทย

Base URL บนเครื่องคือ `http://localhost:3001` ส่วน production client ปกติเรียก same-origin `/api/...` ผ่าน Nginx

JSON request ควรส่ง `Content-Type: application/json` ทุก response มี header `x-request-id` ที่ API สร้างให้ หาก caller ไม่ได้ส่งมา

## Health

### `GET /health`

```json
{ "status": "ok" }
```

Nginx มี `GET /healthz` สำหรับตรวจ web container เพิ่มเติม ซึ่งไม่ใช่ Express route

## Tournament endpoints

| Method | Path | Response |
|---|---|---|
| `GET` | `/api/tournament/teams` | `{ "teams": Team[] }` พร้อมข้อมูลเจ้าของทีม |
| `GET` | `/api/tournament/knockout` | `{ "knockout": KnockoutRound[] }` |
| `GET` | `/api/tournament/fixtures` | `{ "fixtures": Fixture[] }` |
| `GET` | `/api/tournament/table` | `{ "standings": GroupStanding[], "companyPicks": CompanyPick[] }` |
| `GET` | `/api/tournament/news` | `{ "news": NewsItem[] }` |

Endpoints ข้อมูลฟุตบอลอาจคืนข้อมูลจาก API-Football หรือข้อมูล static fallback ส่วนข่าวจะคืนรายการว่างเมื่ออ่าน RSS provider ไม่ได้

## Participant endpoints

### `GET /api/participant/session/:deviceId`

คืน Participant ของอุปกรณ์นั้น หรือ `null`

```json
{
  "participant": {
    "deviceId": "browser-generated-id",
    "displayName": "Alice",
    "teamCode": "THA"
  }
}
```

### `POST /api/participant/select`

สร้างหรือแทนที่การเลือกของ device ที่ส่งมา และคืน HTTP `201`

```json
{
  "deviceId": "browser-generated-id",
  "displayName": "Alice",
  "teamCode": "THA"
}
```

### `POST /api/participant/change`

เปลี่ยนทีมของ Participant ที่มีอยู่ Request body เหมือน `/select` และคืน `404` หาก device นั้นยังไม่มี Participant

### `PATCH /api/participant/display-name`

```json
{
  "deviceId": "browser-generated-id",
  "displayName": "New name"
}
```

### `POST /api/participant/reset`

ลบข้อมูลการเลือกฝั่ง server สำหรับ device

```json
{ "deviceId": "browser-generated-id" }
```

Response เมื่อสำเร็จ:

```json
{ "ok": true }
```

## Validation

- ต้องมี `deviceId` และยาวไม่เกิน 128 ตัวอักษร
- ต้องมี `displayName` และยาวไม่เกิน 80 ตัวอักษร
- ต้องมี `teamCode` ระบบจะแปลงเป็นตัวพิมพ์ใหญ่และต้องเป็นตัวอักษรสามตัว
- Team code ต้องมีอยู่ในข้อมูลทีมของแอป

## รูปแบบ Error

```json
{
  "code": "SELECTION_CONFLICT",
  "message": "Selected team is no longer available.",
  "requestId": "..."
}
```

| Status | Code ที่พบบ่อย | ความหมาย |
|---:|---|---|
| `400` | `INVALID_REQUEST`, `UNKNOWN_TEAM` | Payload หรือทีมไม่ถูกต้อง |
| `404` | `PARTICIPANT_NOT_FOUND`, `NOT_FOUND` | ไม่พบ Participant หรือ route |
| `409` | `SELECTION_CONFLICT` | Participant คนอื่นเป็นเจ้าของทีมแล้ว |
| `503` | `UPSTREAM_UNAVAILABLE` | โหลดข้อมูลจากภายนอกล้มเหลว |
| `500` | `INTERNAL_ERROR` | Server error ที่ไม่คาดคิด |

## ส่วนที่ยังไม่เปิดใช้งาน

มีไฟล์ `src/routes/push.ts` แต่ server ปัจจุบันยังไม่ได้ mount ดังนั้น `/api/push/*` และ `/ws` ยังไม่ถือเป็น API contract ที่รองรับ
