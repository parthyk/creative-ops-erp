# Creative Ops ERP — API Reference

Base URL: `https://creative-ops-erp-api.onrender.com/api/v1`

All endpoints require a `Authorization: Bearer <token>` header, except `auth/login`, `auth/refresh`, and `health`.

---

## Authentication

### POST `/auth/login`

Authenticate with an email, password, and portal.

```json
{
  "email": "admin@onedot.com",
  "password": "Admin@123",
  "portal": "MANAGER"
}
```

`portal` must be `MANAGER` or `EMPLOYEE`. Returns:

```json
{
  "accessToken": "eyJ...",
  "refreshToken": "Qcqf...",
  "refreshExpiresAt": "2026-08-11T08:01:42.124Z",
  "user": {
    "id": "...",
    "email": "admin@onedot.com",
    "name": "Vikram Raj",
    "role": "MANAGER",
    "status": "ACTIVE",
    "isApprover": true,
    "workingHoursPerDay": 8,
    "departmentId": "...",
    "designation": "Creative Director"
  }
}
```

### POST `/auth/refresh`

```json
{ "refreshToken": "Qcqf..." }
```

Returns a new `accessToken`/`refreshToken`.

### GET `/auth/me`

Returns the current user (from the access token).

---

## Dashboard

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/dashboard/summary?period=month` | all | KPI summary (counts, hours, revenue) |
| GET | `/dashboard/ranking?period=month` | MANAGER | Employee performance ranking |
| GET | `/dashboard/growth` | all | Month-over-month growth |
| GET | `/dashboard/trend?period=month` | all | Task trend over time |
| GET | `/dashboard/departments?period=month` | all | Load by department |

`period` values: `today`, `week`, `month`, `quarter`, `year`, `all`.

---

## Tasks

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/tasks?limit=5&page=1` | all | Paginated list (scoped by role) |
| GET | `/tasks/kanban` | all | Tasks grouped by status |
| GET | `/tasks/my-day?date=` | all | Tasks for a day |
| GET | `/tasks/calendar?from=&to=` | all | Calendar events |
| GET | `/tasks/overdue` | all | Overdue summary |
| GET | `/tasks/:id` | all | Task detail |
| POST | `/tasks` | MANAGER | Create task |
| PATCH | `/tasks/:id` | all | Update task |
| PATCH | `/tasks/:id/status` | all | Change status |
| POST | `/tasks/:id/reassign` | MANAGER | Reassign task |
| POST | `/tasks/:id/comments` | all | Add comment |
| DELETE | `/tasks/:id` | MANAGER | Delete task |

### Create task

```json
{
  "taskName": "Q3 Hero Banner",
  "taskType": "Creative",
  "description": "Launch banner for Q3",
  "employeeId": "<employee-id>",
  "priority": "HIGH",
  "status": "TODO",
  "dueDate": "2026-08-15T00:00:00.000Z",
  "clientId": "<optional>",
  "departmentId": "<optional>",
  "estimatedTime": 8,
  "taskCount": 1
}
```

`taskType` enums: `Creative`, `Video`, `Carousel`, `Ads`, `Cover`, `Branding`, `Logo`, `Brochure`.
`status` enums: `TODO`, `IN_PROGRESS`, `REVIEW`, `REWORK`, `APPROVED`, `COMPLETED`.
`priority` enums: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.

### Add comment

```json
{ "body": "Looks good, minor tweaks", "mentions": ["<user-id>"] }
```

---

## Reports (MANAGER only)

| Method | Route | Description |
|---|---|---|
| GET | `/reports/tasks` | Export tasks report |
| GET | `/reports/employees` | Export employee report |
| GET | `/reports/kpi` | Export KPI report |

Accessible only with a MANAGER token; employees get `403`.

---

## Users

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/users` | MANAGER | Paginated user list `{ items, total, page, perPage }` |
| GET | `/users/:id` | all | User detail |
| PATCH | `/users/:id` | MANAGER | Update user |
| DELETE | `/users/:id` | MANAGER | Delete user |

---

## Clients

| Method | Route | Description |
|---|---|---|
| GET | `/clients` | List clients |
| POST | `/clients` | Create client |
| GET | `/clients/:id` | Client detail |
| PATCH | `/clients/:id` | Update client |
| DELETE | `/clients/:id` | Delete client |
| POST | `/clients/:id/stakeholders` | Add stakeholder |

Creating a client emits a realtime `client.created` event. Assigning a stakeholder emits a `notification` to that employee.

---

## Calendar

| Method | Route | Description |
|---|---|---|
| GET | `/calendar/holidays` | List holidays |
| POST | `/calendar/holidays` | Create holiday (MANAGER) |
| DELETE | `/calendar/holidays/:id` | Delete holiday (MANAGER) |
| GET | `/calendar/leaves` | List leave requests |
| PATCH | `/calendar/leaves/:id` | Approve/deny leave (emits `notification`) |

---

## Files

| Method | Route | Description |
|---|---|---|
| POST | `/files/upload` | Multipart upload (`file` field) |

Returns:

```json
{
  "id": "cmsei...",
  "name": "r2-test.txt",
  "originalName": "r2-test.txt",
  "mimeType": "text/plain",
  "size": 24,
  "url": "https://pub-<bucket>.r2.dev/General/<uuid>.txt",
  "key": "General/<uuid>.txt",
  "folder": "General"
}
```

The `url` is publicly accessible (no auth needed to view).

---

## Misc

| Method | Route | Access | Description |
|---|---|---|---|
| GET | `/activity` | all | Recent activity feed |
| GET | `/notifications` | all | Current user's notifications |
| GET | `/settings` | all | System settings |
| GET | `/settings/kpi` | all | KPI settings |
| POST | `/settings/kpi` | MANAGER | Update KPI settings |
| GET | `/ai/summary` | all | AI-generated summary |
| GET | `/health` | public | Health check `{ status, uptime, timestamp }` |

---

## Realtime events (Socket.IO)

Connect to the socket URL with `{ query: { userId } }`:

```
NEXT_PUBLIC_SOCKET_URL  e.g. https://creative-ops-erp-api.onrender.com
```

| Event | Payload | Emitted when |
|---|---|---|
| `task.created` | `{ taskId }` | A task is created |
| `task.updated` | `{ taskId, status }` | A task is updated |
| `task.assigned` | `{ taskId }` | Task assigned to you |
| `task.commented` | `{ taskId }` | Comment on your task |
| `client.created` | `{ id, name }` | A client is created |
| `stakeholder.changed` | `{ clientId, role }` | Stakeholder assignment changed |
| `notification` | `{ type }` | A notification is created |

---

## Error responses

| Status | Meaning |
|---|---|
| 400 | Validation error (see `message` array) |
| 401 | Missing/invalid token |
| 403 | Forbidden (wrong role, e.g. employee on MANAGER routes) |
| 404 | Not found |
