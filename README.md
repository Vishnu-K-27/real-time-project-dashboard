# Tide — Real-Time Client Project Dashboard

Tide is a full-stack agency workbench engineered for internal project tracking, role-scoped task workflows, and live activity streaming. Built with React (TypeScript), Node.js (Express + TypeScript), PostgreSQL (Prisma ORM), and WebSockets.

---

## 1. Quick Start (Local Setup)

### Prerequisites
- Node.js (v18+)
- Docker and Docker Compose
- npm (v9+)

### Step 1: Clone and Configure Environment

```bash
git clone <your-repository-url>
cd real-time-project-dashboard
```

Copy the environment templates:

```bash
# In backend/
cp .env.example backend/.env

# In frontend/
cp .env.example frontend/.env
```

Default backend `.env` values configured for local Docker:
```env
DATABASE_URL=postgresql://tide:tide@localhost:5436/tide?schema=public
JWT_ACCESS_SECRET=local-dev-access-secret-not-for-production-use
JWT_REFRESH_SECRET=local-dev-refresh-secret-not-for-production-use
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CLIENT_ORIGIN=http://localhost:5173
PORT=4000
NODE_ENV=development
COOKIE_SECURE=false
```

### Step 2: Launch Database via Docker

```bash
docker compose up -d
```
*Note: Maps PostgreSQL to host port `5436` to prevent collision with any existing host Postgres services.*

### Step 3: Install, Migrate & Seed Backend

```bash
cd backend
npm install
npm run db:setup
```

This runs Prisma migrations and executes `prisma/seed.ts`, populating:
- **1 Admin**: `admin@tide.local`
- **2 Project Managers**: `maya@tide.local`, `ravi@tide.local`
- **4 Developers**: `leah@tide.local`, `omar@tide.local`, `priya@tide.local`, `jonah@tide.local`
- *All demo accounts use password:* `Password123!`
- **3 Projects**: `AUR` (Aurora Storefront), `KEL` (Kelp Patient Portal), `LUM` (Lumen Editorial Desk) with 5+ tasks each.
- Overdue tasks flagged in DB (`isOverdue: true`).
- Pre-existing activity history and audit logs.

Run RBAC verification tests:
```bash
npm run test:rbac
```

Start the backend API & WebSocket server:
```bash
npm run dev
```
*(Server listens on `http://localhost:4000`)*

### Step 4: Install & Launch Frontend

In a separate terminal:

```bash
cd frontend
npm install
npm run dev
```
*(Vite app runs at `http://localhost:5173`)*

Open `http://localhost:5173` in your browser. Quick-select demo buttons are available on the login screen for instant role switching.

---

## 2. Database Schema & Architecture

```mermaid
erDiagram
    User ||--o{ Project : "creates (PM)"
    User ||--o{ Task : "assigned to"
    User ||--o{ TaskActivityLog : "acts in"
    User ||--o{ ActivityEvent : "triggers"
    User ||--o{ Notification : "receives"
    User ||--o{ RefreshToken : "owns"
    Client ||--o{ Project : "commissions"
    Project ||--o{ Task : "contains"
    Project ||--o{ ActivityEvent : "scopes"
    Task ||--o{ TaskActivityLog : "records"
    Task ||--o{ ActivityEvent : "relates"
    Task ||--o{ Notification : "triggers"

    User {
        string id PK
        string email UK
        string passwordHash
        string name
        enum role "ADMIN | PROJECT_MANAGER | DEVELOPER"
        datetime createdAt
    }

    Client {
        string id PK
        string name
        string company
        string email
        datetime createdAt
    }

    Project {
        string id PK
        string key UK "e.g. AUR, KEL, LUM"
        string name
        string description
        string clientId FK
        string createdById FK
        datetime createdAt
    }

    Task {
        string id PK
        int taskNumber "unique per project"
        string title
        string description
        string projectId FK
        string assignedToId FK
        enum status "TODO | IN_PROGRESS | IN_REVIEW | DONE"
        enum priority "LOW | MEDIUM | HIGH | CRITICAL"
        datetime dueDate
        boolean isOverdue
        datetime createdAt
        datetime updatedAt
    }

    TaskActivityLog {
        string id PK
        string taskId FK
        string actorId FK
        enum fromStatus
        enum toStatus
        datetime createdAt
    }

    ActivityEvent {
        string id PK
        string actorId FK
        string taskId FK
        string projectId FK
        enum fromStatus
        enum toStatus
        int taskNumber
        datetime createdAt
    }

    Notification {
        string id PK
        string userId FK
        enum type "TASK_ASSIGNED | TASK_IN_REVIEW"
        string title
        string body
        string taskId FK
        datetime readAt
        datetime createdAt
    }

    RefreshToken {
        string id PK
        string userId FK
        string tokenHash
        datetime expiresAt
        datetime createdAt
    }
```

### Indexing Decisions Explained
1. **`Task(projectId, status)` & `Task(assignedToId, status)`**: Accelerates filtered task table queries and board calculations by avoiding full table scans.
2. **`Task(dueDate, isOverdue)`**: Used by the scheduled background cron job to efficiently scan only uncompleted, non-overdue tasks with past due dates.
3. **`Project(createdById)`**: Guarantees fast, indexed isolation for Project Managers accessing their owned projects.
4. **`ActivityEvent(createdAt)` & `ActivityEvent(projectId, createdAt)`**: Optimizes fetching the last 20 missed events during initial connection and reconnects.
5. **`Notification(userId, readAt)`**: Indexes unread notification lookups for instant count badge rendering.

---

## 3. Architectural Decisions

### WebSocket Library: Socket.io with WebSocket-Only Transport
- **Decision**: Used `Socket.io` configured strictly with `transports: ['websocket']` (HTTP long-polling fallback disabled).
- **Justification**: Socket.io provides native room abstractions (`admin`, `project:{id}`, `user:{id}`) and connection lifecycles out of the box while maintaining strict WebSocket wire transport. Disabling long-polling eliminates HTTP polling overhead and satisfies zero-polling assessment constraints.

### Background Jobs: `node-cron`
- **Decision**: Utilized `node-cron` over Bull/Redis.
- **Justification**: The requirement is a single periodic scan to mark overdue tasks (`isOverdue = true`). A Redis-backed queue like Bull introduces unnecessary infrastructure overhead for a simple batch update. `node-cron` keeps local Docker setup lightweight and deterministic.

### Token Storage: HttpOnly, Secure, SameSite Cookies
- **Decision**: Short-lived JWT access tokens and rotating refresh tokens are transmitted exclusively via `HttpOnly` cookies (`access_token`, `refresh_token`).
- **Justification**: Storing authentication tokens in browser `localStorage` leaves applications vulnerable to Cross-Site Scripting (XSS). HttpOnly cookies prevent JavaScript access, while `SameSite=Lax` (or `None; Secure` in cross-origin production) protects against CSRF attacks. Refresh tokens are hashed in PostgreSQL to enable revocation upon logout.

---

## 4. Technical Explanation (150–250 Words)

**The Hardest Problem Solved & Role-Filtered Real-Time Feed**:
The trickiest part was building a live activity feed that enforces strict RBAC without leaking unauthorized project data to developers. Broadcasting events to a single global channel means a client could inspect WebSocket frames and read updates from projects they don't belong to.

I solved this by mapping Socket.IO rooms directly to API authorization boundaries:
- `ADMIN` joins the global `admin` room to receive studio-wide events.
- `PROJECT_MANAGER` dynamically joins `project:{id}` rooms only for projects where `createdById === user.id`.
- `DEVELOPER` joins a private `user:{id}` room to receive assigned task updates.

When a task updates or deletes, the backend transaction writes audit records to PostgreSQL (`TaskActivityLog` and `ActivityEvent`) and emits the event strictly to authorized rooms. For offline reconnects, `GET /activity` queries PostgreSQL applying identical Prisma `WHERE` filters (`activityScopeWhere`), ensuring 100% consistency between REST and WebSockets.

**One Thing I'd Do Differently**:
Currently, Socket.IO runs in-memory on a single Node process. If scaled horizontally across multiple servers, sockets on Node A wouldn't receive events emitted by Node B. In production, I would attach `@socket.io/redis-adapter` for pub/sub event distribution across nodes and use BullMQ/Redis for distributed background job queuing.

---

## 5. Known Limitations

1. **Single-Node WebSocket Transport**: Uses Socket.IO in-memory adapter. Running multiple backend server replicas requires `@socket.io/redis-adapter` for cross-node messaging.
2. **In-Process Cron Scheduling**: `node-cron` executes overdue watchdog sweeps in-process. In a clustered environment, a distributed queue (BullMQ + Redis) should be used to prevent duplicate cron executions.
3. **Cross-Site Cookie Context**: Local dev uses `COOKIE_SECURE=false` with `SameSite=Lax`. Production deployments across distinct frontend/backend domains require HTTPS with `SameSite=None; Secure`.
4. **Relaxed Demo Passwords**: Password validation allows short passwords for rapid demo testing; production authentication should enforce password complexity policies.

---

## 6. Deployment Instructions (For Publishing)

### Deploying Frontend to Vercel
1. Push repository to GitHub or GitLab.
2. Import repository into Vercel.
3. Configure Root Directory to `frontend`.
4. Add Environment Variables:
   - `VITE_API_URL`: URL of your deployed backend (e.g., `https://tide-backend.onrender.com`)
5. Deploy.

### Deploying Backend (Render / Railway / Fly.io)
Because persistent WebSockets cannot run on Vercel Serverless Functions, host the Node backend on a persistent container service:
1. Create a PostgreSQL database instance on Railway, Render, or Supabase.
2. Deploy the `backend` directory.
3. Set environment variables:
   - `DATABASE_URL`: Hosted PostgreSQL connection string.
   - `CLIENT_ORIGIN`: Vercel frontend URL (e.g., `https://tide-workbench.vercel.app`).
   - `COOKIE_SECURE`: `true`
   - `NODE_ENV`: `production`
   - `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: Random 64-character strings.
4. Run build and start scripts: `npm run db:setup && npm start`.
