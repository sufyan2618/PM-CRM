# NovaWorks "Meeting → Execution" — Frontend Specification

> Target reader: Cursor (AI coding agent). Build the COMPLETE frontend described here.
> Stack: **React + TypeScript (strict) + Vite + Zustand + TanStack Query v5**, plus the supporting libraries listed in section 3.
> Backend: the Bun/Express/MongoDB API defined in `backend-spec.md` (base path `/api/v1`). This document uses those endpoints exactly. When the backend is running, the frontend must work with **zero extra configuration** (section 4).

---

## 0. READ FIRST — Rules for the Agent

1. If a frontend folder/starter already exists, **inspect it and keep its structure**. Otherwise create the structure in section 5.
2. Strict TypeScript, no `any`, no unused code. Components small and single-purpose. Logic lives in hooks/services, not JSX.
3. **Server state = TanStack Query. Client/UI state = Zustand.** Never copy server data into Zustand. Zustand holds only: auth session, UI preferences (theme), and the transcript-studio draft editor state.
4. All HTTP goes through ONE typed API client (section 6). No `fetch`/`axios` calls inside components.
5. Authorization is enforced by the backend. The frontend only **adapts** to it (route guards, hidden nav). Never trust or send a role/user id from the client.
6. The design in sections 9–13 is **mandatory**. Do NOT produce a generic admin dashboard: no left sidebar of icons, no row of four KPI cards, no default shadcn/MUI look, no purple-blue gradients, no stock Tailwind palette. Follow the design system literally.
7. Every screen has loading, empty, error, and success states (section 14). No blank screens, no raw error JSON.
8. Accessibility (WCAG 2.2 AA) and `prefers-reduced-motion` support are required (section 15).

---

## 1. Project Understanding

A simple Project Management CRM for the fictional **NovaWorks Technologies** (Lahore). The admin pastes a meeting transcript; AI converts it into **projects and tasks** (managers, developer assignments, deadlines, estimated hours); users then see only what their role allows.

Roles:
- **ADMIN** — sees all projects, team directory, and the **Transcript Studio** (create from transcript).
- **MANAGER** — sees only their own projects (all tasks inside them).
- **AGENT** (developer) — sees **My Tasks** and the projects those tasks belong to (only their own tasks).

Out of scope (do not build): signup, forgot password, user management screens, cost/budget, progress/completion tracking, charts of progress, timesheets, notifications.

Demo accounts (show on the login screen as quick-fill chips; password `Demo123!` for all):

| Code | Name | Email | Role |
|------|------|-------|------|
| ADMIN | Admin | admin@novaworks.example | ADMIN |
| PM01 | Ayesha Khan | ayesha@novaworks.example | MANAGER |
| PM02 | Bilal Ahmed | bilal@novaworks.example | MANAGER |
| PM03 | Hina Malik | hina@novaworks.example | MANAGER |
| DEV01 | Ali Raza | ali@novaworks.example | AGENT |
| DEV02 | Hamza Shah | hamza@novaworks.example | AGENT |
| DEV03 | Sara Noor | sara@novaworks.example | AGENT |
| DEV04 | Usman Tariq | usman@novaworks.example | AGENT |
| DEV05 | Zain Abbas | zain@novaworks.example | AGENT |
| DEV06 | Maryam Asif | maryam@novaworks.example | AGENT |

---

## 2. Deliverables (frontend)

- Login / logout with quick-fill demo accounts.
- Role-aware home: Admin → "The Desk"; Manager → "My Projects"; Agent → "My Tasks".
- Projects index and Project detail (client, manager, deadline, tasks with owner/deadline/hours).
- Read-only Team directory.
- **Transcript Studio** (admin): paste → convert → processing state → success reveal, OR 422 correction flow with editable draft and revalidation.
- Optional (build, small): admin edit/delete for project and task via drawers.
- Persistent data after refresh (the session survives reload).
- README section for the frontend, `.env.example`.

---

## 3. Tech & Libraries

| Concern | Choice |
|---------|--------|
| Build | Vite + React 18 + TypeScript strict |
| Package manager/runtime | Bun (`bun install`, `bun run dev`) |
| Routing | React Router v6.4+ (data router, `createBrowserRouter`), lazy-loaded routes |
| Server state | `@tanstack/react-query` v5 + devtools (dev only) |
| Client state | `zustand` (+ `persist` middleware only for theme and auth token if token-based) |
| Forms/validation | `react-hook-form` + `zod` + `@hookform/resolvers` |
| Styling | **Tailwind CSS v4 with a fully custom theme (tokens in section 9)** — do not use default palette, or plain CSS variables + CSS Modules. No component library look. |
| Primitives (headless only) | `@radix-ui/react-dialog`, `-dropdown-menu`, `-tooltip`, `-tabs`, `-select`, `-visually-hidden` (unstyled; we style everything) |
| Motion | `motion` (Framer Motion) for orchestrated transitions; CSS for micro-interactions |
| Dates | `date-fns` (parse `YYYY-MM-DD` as local dates, never `new Date('YYYY-MM-DD')`, to avoid timezone shift) |
| Icons | `lucide-react` used sparingly (thin stroke 1.5) — prefer typographic marks |
| Fonts | Self-hosted via `@fontsource-variable/*` (section 9.3) |
| Toasts | `sonner`, restyled to the design system |
| Tests | Vitest + React Testing Library + MSW (mock API) |

---

## 4. Automatic Backend Connection

Goal: run backend → run frontend → works.

- API base: `VITE_API_BASE_URL` defaulting to `/api/v1`.
- `vite.config.ts` dev **proxy**: `/api` → `http://localhost:5000` (override with `VITE_DEV_PROXY_TARGET`). This avoids CORS issues in dev. Backend port default is `5000` (per backend `.env.example` `PORT=5000`); if the backend repo uses a different port, read it and set the default accordingly.
- `.env.example`:
```
VITE_API_BASE_URL=/api/v1
VITE_DEV_PROXY_TARGET=http://localhost:5000
```
- In production, set `VITE_API_BASE_URL` to the full backend URL (e.g. `https://api.example.com/api/v1`); backend `CLIENT_URL` must match the frontend origin.
- **Auth transport:** inspect the existing backend auth. Support both transports in the API client with a single switch constant:
  - Cookie-based session → `credentials: 'include'`, no Authorization header.
  - Bearer token → store token in the auth store (persisted), send `Authorization: Bearer <token>`.
  Default to Bearer + `credentials: 'include'` (harmless when cookies unused). Read the token from the login response `data.token` if present.
- **Boot sequence:** on app start, if a token/cookie may exist, call `GET /auth/me` before rendering protected routes; show the branded splash (section 12.1) meanwhile. 401 → clear session → redirect to `/login`.
- **Backend health:** on boot ping `GET /health`. If unreachable, show a full-page "Can't reach the server" state with the base URL it tried and a Retry button (no crash).

---

## 5. Folder Structure

```
src/
  app/
    router.tsx              # routes + guards + lazy imports
    providers.tsx           # QueryClientProvider, Toaster, theme
    query-client.ts         # defaults: staleTime 30s, retry 1 (never retry 401/403/404/422)
  api/
    client.ts               # typed fetch wrapper, envelope unwrapping, ApiError
    endpoints/
      auth.api.ts
      team.api.ts
      projects.api.ts
      tasks.api.ts
      transcripts.api.ts
      health.api.ts
    types.ts                # DTO types mirroring backend
    query-keys.ts
  features/
    auth/        (LoginPage, DemoAccountPicker, useLogin, useMe, auth.store.ts, guards)
    desk/        (AdminDesk page)
    projects/    (ProjectsPage, ProjectPage, Folio, TaskLedger, DeadlineRail, hooks)
    tasks/       (MyTasksPage, hooks)
    team/        (TeamPage, PersonCard)
    studio/      (TranscriptStudioPage, PaperEditor, ProcessingStage, CorrectionDesk, ResultReveal, studio.store.ts, hooks)
  components/
    ui/          (Button, IconButton, Field, Input, Textarea, Select, Dialog, Drawer, Tooltip, Badge, Skeleton, EmptyState, ErrorState, Kbd, Tag)
    layout/      (Masthead, PageShell, Footer, SplashScreen, RouteTransition)
    brand/       (Wordmark, Seal, Grain)
  lib/           (dates.ts, format.ts, cn.ts, a11y.ts, roles.ts)
  styles/        (tokens.css, base.css, typography.css, motion.css)
  main.tsx
```

---

## 6. API Layer (exact contract)

### 6.1 Client (`api/client.ts`)
- `request<T>(method, path, { body, query, signal })`.
- Builds URL from `VITE_API_BASE_URL`; JSON in/out; passes `AbortSignal` from TanStack Query.
- Unwraps the envelope: success `{ success: true, data, meta?, message? }` → returns `{ data, meta, message }`. Error `{ success: false, error: { code, message, details? } }` → throws `ApiError { status, code, message, details }`.
- Network failure/timeouts → `ApiError` with `code: 'NETWORK_ERROR'`.
- On `401` (except on `/auth/login`) → call `authStore.clearSession()` and navigate to `/login` with `?from=` return path (via a registered unauthorized handler, not by importing router into the client).
- Do not retry mutations.

### 6.2 Types (`api/types.ts`)
```ts
export type Role = 'ADMIN' | 'MANAGER' | 'AGENT';
export interface User { id: string; code: string; name: string; email: string; role: Role; specialization: string; skills: string[]; }
export interface TeamMember { id: string; code: string; name: string; role: Role; specialization: string; skills: string[]; }
export interface PersonRef { id: string; code: string; name: string; specialization?: string; }
export interface Pagination { page: number; limit: number; total: number; totalPages: number; }

export interface ProjectCard {
  id: string; name: string; clientName: string; description: string; deadline: string; // YYYY-MM-DD
  manager: PersonRef; taskCount: number; totalEstimatedHours: number; createdAt: string;
}
export interface Task {
  id: string; projectId: string; title: string; description: string;
  assignee: PersonRef; deadline: string; estimatedHours: number;
}
export interface ProjectDetail extends Omit<ProjectCard, 'createdAt'> { tasks: Task[]; }
export interface MyTask {
  id: string; title: string; description: string; deadline: string; estimatedHours: number;
  project: { id: string; name: string; clientName: string; deadline: string; manager: PersonRef };
}

export interface DraftTask { title: string | null; description: string | null; assigneeId: string | null; deadline: string | null; estimatedHours: number | null; }
export interface DraftProject { name: string | null; clientName: string | null; description: string | null; managerId: string | null; deadline: string | null; tasks: DraftTask[]; }
export interface Draft { projects: DraftProject[]; }
export interface DraftIssue { path: string; code: IssueCode; message: string; value?: unknown; }
export type IssueCode = 'MISSING_FIELD'|'INVALID_DATE'|'MANAGER_NOT_FOUND'|'ASSIGNEE_NOT_FOUND'|'INVALID_HOURS'|'TASK_AFTER_PROJECT_DEADLINE'|'DUPLICATE_TASK'|'NO_TASKS'|'NO_PROJECTS';
export interface ConvertSuccess { runId: string; projectCount: number; taskCount: number; projects: Array<Pick<ProjectCard,'id'|'name'|'clientName'|'deadline'|'manager'|'taskCount'|'totalEstimatedHours'>>; }
export interface DraftInvalidDetails { runId: string; draft: Draft; issues: DraftIssue[]; }
```

### 6.3 Endpoint map (backend → frontend function → hook)

| Backend endpoint | Function | Hook (TanStack) | Used by |
|------------------|----------|-----------------|---------|
| `POST /auth/login` `{email,password}` | `authApi.login` | `useLogin` (mutation) | Login |
| `POST /auth/logout` | `authApi.logout` | `useLogout` (mutation; always clears local session even if request fails) | Masthead |
| `GET /auth/me` | `authApi.me` | `useMe` (query, boot) | Boot/guards |
| `GET /team?role=` | `teamApi.list` | `useTeam` (staleTime 5 min) | Team, Studio directory panel, edit drawers |
| `GET /projects?search&page&limit` | `projectsApi.list` | `useProjects` | Desk, Projects |
| `GET /projects/:id` | `projectsApi.get` | `useProject` | Project page |
| `PATCH /projects/:id` (admin) | `projectsApi.update` | `useUpdateProject` | Edit drawer |
| `DELETE /projects/:id` (admin) | `projectsApi.remove` | `useDeleteProject` | Project page |
| `GET /projects/:id/tasks` | `tasksApi.listByProject` | `useProjectTasks` (only if detail's tasks need refetch) | Project page |
| `GET /tasks/my?projectId=` (agent) | `tasksApi.my` | `useMyTasks` | My Tasks |
| `GET /tasks/:id` | `tasksApi.get` | `useTask` | Task drawer deep link |
| `PATCH /tasks/:id` (admin) | `tasksApi.update` | `useUpdateTask` | Task drawer |
| `DELETE /tasks/:id` (admin) | `tasksApi.remove` | `useDeleteTask` | Task drawer |
| `POST /transcripts/convert` `{transcript, allowDuplicate?}` | `transcriptsApi.convert` | `useConvertTranscript` (mutation) | Studio |
| `POST /transcripts/commit` `{runId?, draft}` | `transcriptsApi.commit` | `useCommitDraft` (mutation) | Correction desk |
| `POST /transcripts/validate` `{draft}` | `transcriptsApi.validate` | `useValidateDraft` (mutation) | Correction desk "Check" |
| `GET /transcripts/runs` | `transcriptsApi.runs` | `useRuns` | Studio history rail |
| `GET /stats` (admin, optional) | `statsApi.get` | `useStats` | Desk masthead line |
| `GET /health` | `healthApi.ping` | `useHealth` (boot) | Boot |

### 6.4 Query keys (`query-keys.ts`)
`['me']`, `['team', role?]`, `['projects', {search,page,limit}]`, `['project', id]`, `['project-tasks', id]`, `['my-tasks', {projectId?}]`, `['task', id]`, `['runs']`, `['stats']`.
Invalidation: after convert/commit success → invalidate `projects`, `my-tasks`, `stats`, `runs`. After project/task update/delete → invalidate `project`, `projects`, `my-tasks`, `stats`. On logout → `queryClient.clear()`.

### 6.5 Error-code → UX mapping

| code / status | UX |
|---------------|----|
| `INVALID_CREDENTIALS` | Inline form error "Those details don't match a NovaWorks account." Shake the card once (reduced-motion: none). |
| `UNAUTHENTICATED` / 401 | Clear session → login with return path |
| `FORBIDDEN` / 403 | Full-page "Not on your list" state (section 14) |
| 404 (incl. out-of-scope project) | "We couldn't find that" state — never hint the item exists |
| `VALIDATION_ERROR` 400 | Map `details` to form fields when possible, else toast |
| `DRAFT_INVALID` 422 | Switch Studio to Correction Desk with `details.draft` + `details.issues` |
| `CONVERSION_IN_PROGRESS` 409 | Inline notice "A conversion is already running" + keep button disabled, poll `useRuns` until finished |
| `DUPLICATE_TRANSCRIPT` 409 | Dialog: "This meeting was already converted. Create it again anyway?" → resend with `allowDuplicate: true` |
| `AI_FAILURE` 502 | In-stage error "The assistant couldn't read this one" + Try again (transcript preserved) |
| `NETWORK_ERROR` | Offline banner + retry |

---

## 7. Routes & Guards

| Path | Roles | Screen |
|------|-------|--------|
| `/login` | public (redirect to home if signed in) | Login |
| `/` | any | Role redirect: ADMIN → `/desk`, MANAGER → `/projects`, AGENT → `/my-tasks` |
| `/desk` | ADMIN | The Desk |
| `/studio` | ADMIN | Transcript Studio |
| `/projects` | ADMIN, MANAGER, AGENT | Projects index (AGENT sees projects containing their tasks) |
| `/projects/:projectId` | ADMIN, MANAGER, AGENT | Project detail |
| `/my-tasks` | AGENT | My Tasks |
| `/team` | any | Team directory |
| `*` | — | Not found |

Guard components: `RequireAuth`, `RequireRole(roles)`. A wrong-role visit shows the 403 state (not a silent redirect). Preserve `?from=`. Route-level code splitting; prefetch project detail on card hover/focus (`queryClient.prefetchQuery`).

---

## 8. Screens — Content & Behavior

Navigation is a **Masthead** (top, slim, editorial) — NOT a sidebar. Links by role:
- ADMIN: Desk · Projects · Team · **Studio** (accent link)
- MANAGER: Projects · Team
- AGENT: My Tasks · Projects · Team
Right side: current user's initials seal + name; menu → theme toggle, Sign out.

### 8.1 Login (`/login`)
- Split composition: left 58% = brand poster (large serif wordmark, the tagline "From the meeting room to the task list.", grain texture, a slowly drifting set of thin vertical "thread" lines in accent color); right = sign-in sheet on paper.
- Form: email, password (show/hide), submit "Sign in". Validation via zod. Submit disabled while pending.
- Beneath: **"Demo cast"** — 10 small name chips grouped Admin / Managers / Developers; clicking a chip fills email + password (`Demo123!`) and focuses submit. Pressing Enter signs in. Mark this as demo-only with a small caption.
- On success: route to `from` or role home with a short curtain transition.

### 8.2 The Desk (`/desk`, admin home)
Not a KPI dashboard. Composition:
- A large editorial header: date in the display serif ("Wednesday, 7 October"), a one-line summary from `/stats` ("3 projects · 12 tasks · 124 hours of work in motion") in prose, not cards. If `/stats` is missing, compute from `/projects`.
- A dominant **primary call-to-action band**: "Turn a meeting into a plan" → Studio (large, typographic, accent underline sweep on hover).
- **The Shelf**: all projects as Folios (section 12.2), laid out in an asymmetric masonry-like grid (alternating tall/wide, driven by task count), each tilted 0° (no gimmick tilt) with staggered reveal.
- **Deadline Rail** (section 12.3) showing every project deadline across the next weeks on one horizontal line.
- Empty (no projects yet): illustrated empty state with CTA to Studio.

### 8.3 Projects (`/projects`)
- Header with count in prose; a search field (debounced 300 ms → `search` param); view toggle **Shelf / Index** (persisted in Zustand `ui.store`).
- Shelf = Folios; Index = dense typographic table-like list (client · project · manager · deadline · tasks · hours).
- Pagination (numbered, minimal) if `totalPages > 1`, URL-synced (`?page=&q=`).
- Agent copy: "Projects you have tasks in." Manager copy: "Projects you manage."

### 8.4 Project detail (`/projects/:projectId`)
- Hero: client name (small caps), project title (display), description paragraph; metadata strip: Manager (PersonChip), Deadline (formatted + "in 13 days" relative), Tasks, Total hours (for agents show "Your hours", label changes since totals only cover visible tasks).
- **Deadline Rail (project scope)**: tasks plotted by deadline on a horizontal line ending at the project deadline marker.
- **Task Ledger** (section 12.4): rows with title, description (expandable), assignee PersonChip, deadline, hours. Sort controls: by deadline (default) / owner / hours. Group-by-owner toggle (manager/admin only).
- Admin only: "Edit" and "Remove" actions (drawer/dialog). Task row click (admin) opens Task drawer with PATCH form.
- Agent view shows a quiet note: "You're seeing your own tasks in this project."

### 8.5 My Tasks (`/my-tasks`, agent)
- Header: "Your work, in order." Tasks sorted by deadline, grouped by week ("This week", "Next week", "Later") using Karachi-local dates.
- Each task is a **Ticket** (section 12.5): hours as a stamped number, deadline, project + client label linking to project page, manager name.
- Filter chip row by project (uses `?projectId=`). Empty: "Nothing assigned yet."

### 8.6 Team (`/team`)
- Read-only. Three groups: Administrator, Project managers, Developers. Each person is a **Person Card**: large initials seal (deterministic color from palette by `code`), name, specialization, skills as tags. No emails or edit controls. Subtle hover lift; filter by role segmented control.

### 8.7 Transcript Studio (`/studio`, admin) — the signature screen
Layout: two stages side by side on desktop (stacked on mobile).

**Left — The Paper (PaperEditor):** a large textarea styled as a sheet of typewritten paper (warm paper tone, mono-leaning serif, line-height 1.7, faint ruled margin line in accent, grain). Features: character/word counter, "Paste from clipboard" button, "Load sample transcript" (embeds the supplied NovaWorks transcript file as a static asset `src/assets/sample-transcript.txt`), "Clear". Min 50 chars to enable convert (matches backend), max 100,000 with live counter turning accent-red near limit.

**Right — The Cast (directory panel):** shows the team directory that the AI will use (from `useTeam`): managers and developers as compact chips with skills. Caption: "The assistant can only assign people from this list." Reinforces "Do not invent an employee."

**Primary action:** `Create from Transcript` button (large). While pending: button disabled & shows state; the whole paper becomes read-only; prevents double submissions (also guard in the mutation handler with a ref).

**Processing stage (ProcessingStage):** replaces the right panel with a sequence of honest-feeling steps (time-based, since backend is one request): "Reading the transcript" → "Finding the projects" → "Matching people" → "Checking dates and hours" → "Saving everything". Visual: the paper's sentences get subtly highlighted line by line (a soft sweep), threads in accent color draw from the paper toward the right. Provide `aria-live="polite"` text. Timeout hint after 25 s: "Still working — larger meetings take longer." Cancel is not offered (no backend cancel); do not claim cancellation.

**Success (ResultReveal) — 201:** the threads resolve into the created Folios, which "land" with staggered spring animation; a sentence summary ("Created 3 projects with 12 tasks"), per-project row (name, manager, tasks, hours), and CTAs: "Open the Desk", "View UrbanCart Website" etc. Invalidate queries. Confetti is forbidden; use the thread/landing motion only.

**Correction Desk — 422 `DRAFT_INVALID`:**
- Banner: "Nothing was saved. A few details need your eye." with issue count.
- Draft rendered as an **editable form tree**: projects (name, client, description, manager select from managers, deadline date input) each with tasks (title, description, assignee select from agents, deadline, hours number). Fields referenced by `issues[].path` (e.g. `projects[1].tasks[2].assigneeId`) are highlighted with accent ring + inline message; the issue list on the side jumps to the field on click.
- Selects are filled from `useTeam` (value = user **code**, e.g. `DEV01`); a draft value that doesn't resolve (e.g. "Kamran") shows as "Unresolved: Kamran" with the select empty.
- Add/remove task rows and projects locally (draft-only).
- Actions: **Check again** (`POST /transcripts/validate`) → updates issue list live, "All clear" state when valid; **Save projects** (`POST /transcripts/commit` with `{runId, draft}`) → success reveal; **Back to transcript** (keeps transcript text).
- Draft state lives in `studio.store.ts` (Zustand): `transcript`, `phase: 'compose'|'processing'|'correcting'|'done'|'error'`, `draft`, `issues`, `runId`, `result`. Reset on leaving success.
- Frontend pre-validation mirrors backend rules (date format, hours > 0, task deadline ≤ project deadline) for instant feedback, but backend remains the authority.

**History rail (optional, `GET /transcripts/runs`):** slim list "Earlier conversions" with status dots and relative times.

---

## 9. Design System — "Press Room" (mandatory)

### 9.1 Concept
**Editorial print studio meets project desk.** The product turns spoken meetings into plans, so the metaphor is *a meeting's notes being typeset into a published schedule*: paper, ink, thread, stamps, and folios. Calm, confident, high-contrast typography; a single hot accent; lots of whitespace; asymmetric layouts. It must feel designed by a typographer, not assembled from components.

Words that describe it: warm, tactile, editorial, precise, quiet-confident. Words that must NOT describe it: corporate-blue, glassy, neon, dashboard-y, playful-cartoon.

### 9.2 Color tokens (`styles/tokens.css`, exposed to Tailwind theme)

Light ("Paper") — default:
| Token | Value | Use |
|-------|-------|-----|
| `--paper` | `#F4EFE6` | App background (warm off-white) |
| `--paper-raised` | `#FBF8F2` | Cards, sheets |
| `--paper-sunken` | `#EAE3D6` | Inputs, wells |
| `--ink` | `#16130F` | Primary text |
| `--ink-soft` | `#4A443B` | Secondary text |
| `--ink-faint` | `#8A8274` | Tertiary, captions |
| `--rule` | `#D9D0BF` | Hairlines/borders |
| `--vermilion` | `#E8421F` | **Single accent** (CTA, active, threads, highlights) |
| `--vermilion-deep` | `#B92E10` | Accent hover/pressed, text on paper for AA |
| `--vermilion-wash` | `#F8D9CE` | Accent tint backgrounds |
| `--moss` | `#3F6B4F` | Success |
| `--saffron` | `#C98A0B` | Warning / near deadline |
| `--oxblood` | `#8E1F2B` | Error |

Dark ("Midnight Press"):
`--paper #14110E`, `--paper-raised #1D1914`, `--paper-sunken #0F0D0A`, `--ink #F2ECE0`, `--ink-soft #C4BCAC`, `--ink-faint #8C8474`, `--rule #35302A`, `--vermilion #FF6A47`, `--vermilion-deep #FF8A6D`, `--vermilion-wash #3A1D14`.

**Person palette** (for initials seals; deterministic by `code` hash; all pass AA with `--ink`/white as specified): `#E8421F`, `#2F5D62`, `#C98A0B`, `#5B3F8C`, `#3F6B4F`, `#8E1F2B`, `#1F3A5F`, `#7A5C3E`, `#B04A7A`.

Rules: accent covers ≤ 8% of any screen. Never use pure `#000`/`#FFF`. No gradients except the subtle paper-grain noise overlay and the thread glow. Respect `prefers-color-scheme` on first load; allow toggle (persisted).

### 9.3 Typography
| Role | Font | Settings |
|------|------|----------|
| Display (titles, numerals, wordmark) | **Fraunces Variable** (`@fontsource-variable/fraunces`) | opsz 144 for hero, 72 for h2; weight 300–600; use soft/wonk axes sparingly (`SOFT 50`) |
| UI / body | **Instrument Sans** or **Geist** (`@fontsource-variable/instrument-sans`) | 400/500/600 |
| Data / transcript / hours | **JetBrains Mono** (`@fontsource-variable/jetbrains-mono`) | tabular numerals, 400/500 |

Scale (fluid with `clamp`): `display-xl 56→112px / 0.95`, `display-lg 40→72 / 1.0`, `h1 32→48 / 1.05`, `h2 24→32 / 1.15`, `h3 18→20 / 1.3`, `body 16 / 1.6`, `small 14 / 1.5`, `caption 12 / 1.4 (letter-spacing .06em uppercase for labels)`.
Rules: display text uses tight tracking (-0.02em); labels are small caps / uppercase with positive tracking; **numbers (hours, dates, counts) always in mono or Fraunces numerals, tabular**; max line length 68ch for prose; never center long text; use real typographic quotes and en dashes (`12–15 Oct`).

### 9.4 Layout & spacing
- 12-col grid, max content width 1280px, generous outer margin (`clamp(20px, 5vw, 72px)`).
- Spacing scale: 4, 8, 12, 16, 24, 32, 48, 72, 112.
- **Asymmetry is intentional:** headline blocks span 7/12 columns left-aligned, metadata hangs in the right 4/12; sections separated by hairline rules with small index numbers ("01 — Shelf"), like a printed magazine.
- Radii: tiny and consistent — `2px` for inputs/tags, `6px` for sheets/cards, `999px` only for seals. No large rounded "bubble" cards.
- Elevation via **hairline border + soft warm shadow** (`0 1px 0 rgba(22,19,15,.04), 0 12px 32px -16px rgba(22,19,15,.22)`), never heavy drop-shadows.
- Texture: global fixed `Grain` overlay (SVG feTurbulence noise, 4–6% opacity, `mix-blend-mode: multiply`; off in dark via lower opacity). Must not hurt performance (static, `pointer-events:none`, `will-change` avoided).

### 9.5 Signature motifs (use consistently)
1. **Thread** — a 1.5px vermilion line that connects related things (transcript → projects, task → project, deadline → rail). Animated via SVG `stroke-dashoffset`.
2. **Seal** — circular initials stamp for people; slight inset ring and 1° rotation variance deterministic by code (max ±2°).
3. **Folio** — project card styled like a folded document cover (corner fold detail, oversize index numeral).
4. **Stamp** — hours shown as a boxed mono numeral with a tiny "HRS" label, like a rubber stamp (border 1.5px, slight letterspacing).
5. **Rule & index** — numbered hairline section dividers.

### 9.6 Components (visual rules)
- **Button primary:** vermilion background, `--paper-raised` text, 2px radius, height 48, uppercase 13px tracking .08em; hover: background → deep, an underline "thread" sweeps beneath text; active: translateY(1px). Secondary: transparent with 1px ink border, hover fills ink with paper text. Tertiary: text link with animated underline. Loading: label replaced by 3 animated dots (no spinner wheel).
- **Inputs:** sunken paper fill, bottom 1.5px ink rule instead of full border; label floats as small-caps above; focus → rule becomes vermilion + 2px focus ring offset; errors → oxblood rule + message with icon.
- **Selects/menus:** Radix primitives, paper-raised panel, hairline border, items with generous height 40.
- **Tags (skills):** mono 12px, 2px radius, 1px rule border, no fill.
- **Badges (deadline state):** `Due in 3 days` saffron, `Overdue` oxblood, `On the calendar` ink-faint. (Deadline proximity only — NOT progress.)
- **Tooltip:** ink background, paper text, 12px, 150ms delay.
- **Dialog/Drawer:** drawer slides from right, 480px, paper-raised, dimmed backdrop `rgba(22,19,15,.45)`, focus trapped.
- **Toast:** bottom-left, paper-raised, left accent bar colored by type.
- **Skeletons:** paper-sunken blocks with a slow warm shimmer (1.8s); shapes must match final layout (folio-shaped, ledger-row-shaped).

### 9.7 Motion rules
- Easing tokens: `--ease-out: cubic-bezier(.2,.8,.2,1)`, `--ease-in-out: cubic-bezier(.65,0,.35,1)`, spring for landings `{ stiffness: 260, damping: 26 }`.
- Durations: micro 120–180ms, component 240–320ms, page/stage 500–700ms. Never > 900ms except the studio result sequence (≤ 1.6s total).
- Page transitions: content fades up 12px with 40ms stagger per block (max 8 staggered items).
- Lists: stagger children 30–50ms; use `layout` animations for reorder (sort change).
- Hover on folios: lift 4px + the corner fold peels 6px; no scale > 1.02.
- Studio is the only place with choreographed sequences (threads, highlight sweep, landing).
- `prefers-reduced-motion: reduce` → disable translate/stagger/threads; use instant or opacity-only 120ms transitions; processing text remains.
- Animate only `transform` and `opacity`; no layout-thrashing animations.

### 9.8 Iconography & imagery
Thin 1.5px line icons, 18–20px, only where they aid scanning (search, sort, copy, close, chevron). Prefer typographic marks (→, ↗, №, §). No stock illustrations. Empty states use small bespoke SVG line drawings (a folded page, a threaded needle, an empty shelf) in ink + vermilion single-line style.

### 9.9 Voice & microcopy
Plain, warm, precise. Examples: "Turn a meeting into a plan." · "Nothing was saved. A few details need your eye." · "Your work, in order." · "Not on your list." · "The assistant can only assign people from this list." Avoid exclamation marks, emojis, jargon ("Oops!", "Something went wrong" alone).

---

## 10. Layout Skeletons (ASCII guides)

**Masthead (64px, sticky, paper with blur-free hairline bottom):**
```
NOVAWORKS ·                Desk   Projects   Team   [Studio ↗]                 (AK) Ayesha ▾
```
Wordmark: "Nova" in Fraunces 600 + "works" in Fraunces 300 italic, tiny vermilion dot.

**Desk:**
```
Wednesday, 7 October                                 [ Turn a meeting into a plan → ]
3 projects · 12 tasks · 124 hours in motion

01 — The Shelf ───────────────────────────────────────────────
[ Folio tall ] [ Folio wide      ] [ Folio ]
02 — On the calendar ─────────────────────────────────────────
|—— 12 ——— 15 —— 20 ● UrbanCart —— 22 ● HelpDeskPro —— 24 ● QuickServe ——|
```

**Project detail:**
```
URBANCART CLOTHING                              Manager   Deadline   Tasks   Hours
UrbanCart Website                               (AK)Ayesha 20 Oct     4       40
Description paragraph (max 68ch)…
——— Deadline Rail ———
№1  Product catalog UI    (AR) Ali   12 Oct   [12 HRS]
№2  Demo cart UI          …
```

---

## 11. Key Component Specs

### 11.1 `Folio`
Props: `project: ProjectCard`, `size: 'tall'|'wide'|'compact'`, `index: number`.
Look: paper-raised, 6px radius, top-right folded corner (CSS clip + shadow), oversized Fraunces index numeral ("01") in ink-faint at 30% opacity, client name in small caps, project name in display h2, manager Seal+name, bottom meta row: deadline (mono), `taskCount` tasks, hours stamp. Whole card is a link; focus ring visible; hover lift. `size` changes grid span only.

### 11.2 `DeadlineRail`
Props: `items: Array<{ id; label; date: string; kind: 'project'|'task'; href? }>`. Horizontal scrollable SVG/DOM timeline; date ticks weekly; today marker as thin ink line with "Today · 7 Oct" label; items as dots on the thread with labels alternating above/below to avoid overlap; keyboard-navigable (arrow keys), tooltip with details; on small screens becomes a vertical list. Based only on deadlines — no progress.

### 11.3 `TaskLedger`
Semantic `<table>` (or `role="table"`) styled as a ledger: numbered rows (№ mono), title (h3) + collapsible description, assignee `PersonChip`, deadline (mono + proximity badge), hours `Stamp`. Totals footer row: "Total hours" (mono, right-aligned). Row hover: left vermilion bar slides in. Sortable headers are buttons with `aria-sort`. Mobile: rows become stacked ledger cards.

### 11.4 `Ticket` (My Tasks)
Notched ticket silhouette (CSS mask radial notches), left stub holds hours stamp, main area title, description snippet, project/client link and manager; right stub holds deadline day numeral (Fraunces, large) with month abbreviation. Hover: perforation dashes animate.

### 11.5 `PersonChip` / `Seal`
Seal 28–56px circle with initials, palette color by code hash, ±2° rotation, 1px inset ring. `PersonChip` = Seal + name (+ specialization on wide variants).

### 11.6 `CorrectionDesk` field binding
Create `getIssuesFor(path)` helper; fields register their path string exactly as the backend returns it (`projects[i].tasks[j].field`). Maintain a map `path → ref` to scroll/focus on issue click.

---

## 12. Special States

### 12.1 Splash
Centered wordmark with a single thread drawing under it (600ms) while `/health` + `/auth/me` resolve. Minimum display 400ms to avoid flicker.

### 12.2 Empty / Error / 403 / 404 (components `EmptyState`, `ErrorState`)
Each has a small line illustration, a display-serif headline, one sentence, and one clear action:
- No projects: "The shelf is empty." → (admin) "Create from a transcript".
- No tasks (agent): "Nothing assigned yet."
- Search no results: "Nothing matches “{q}”." → Clear search.
- 403: "Not on your list." → Go to my home.
- 404: "We couldn't find that page."
- Server unreachable / network: "Can't reach the server." shows base URL, Retry.
- Generic error: show `error.message` from API, Retry.

---

## 13. Formatting Utilities (`lib/`)
- `parseLocalDate('2026-10-12')` → local Date via `new Date(y, m-1, d)`.
- `formatDate(date, 'd MMM')`, long form `EEEE, d MMMM`.
- `relativeDeadline(date, today)` → "Due in 13 days", "Due today", "Overdue by 2 days". "Today" computed in `Asia/Karachi`.
- `formatHours(n)` → `12 h` / `12.5 h` (mono).
- `initials(name)`; `personColor(code)` deterministic hash.
- `cn()` classnames helper.

---

## 14. State, Data & UX Rules

- Query defaults: `staleTime: 30_000`, `gcTime: 5min`, `refetchOnWindowFocus: false`, `retry`: 1 for network/5xx only.
- Use `placeholderData: keepPreviousData` for paginated/search lists.
- Mutations: show pending state, disable submit, toast on success/failure, invalidate keys (6.4). For admin task/project edits use optimistic updates with rollback on error.
- Buttons never allow double-submit (disabled + `aria-busy`).
- Debounce search 300ms; sync filters to URL search params.
- Persist: theme (`localStorage`), projects view mode, auth token (if bearer). Never persist transcript text beyond session (use `sessionStorage` only for unsaved draft recovery — optional, clear on success).
- Session expiry: handled globally via the 401 handler; show toast "Your session ended. Please sign in again."

---

## 15. Accessibility & Responsiveness

- Semantic landmarks (`header`, `nav`, `main`), skip link, visible 2px focus ring (vermilion, offset 2px) on every interactive element.
- Color contrast ≥ 4.5:1 for text (use `--vermilion-deep` for accent text on paper). Don't rely on color alone for deadline states (include text).
- Forms: labels bound, `aria-invalid`, `aria-describedby` for errors; error summary focus on submit failure; the Correction Desk issue list is a keyboard-navigable list of buttons.
- Live regions for processing steps and toasts (`aria-live="polite"`).
- Dialogs/drawers trap focus, close on Esc, restore focus.
- Touch targets ≥ 44px. Breakpoints: `sm 640`, `md 768`, `lg 1024`, `xl 1280`. Masthead collapses into a full-screen menu on < md. Studio stacks panels on < lg. Tables convert to stacked cards on < md. Test at 360px width.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

---

## 16. Performance

- Route-level lazy loading; `motion` loaded only in routes using orchestration (use `LazyMotion` with `domAnimation`).
- Preload display font (Fraunces) subset latin; `font-display: swap`.
- Prefetch on hover for project detail; avoid waterfalls (fetch `team` in parallel with page data).
- Images: none required; SVGs inline and small.
- Lighthouse targets: Performance ≥ 90, Accessibility ≥ 95 on login and projects pages.

---

## 17. Testing (Vitest + RTL + MSW)

1. Auth: login success stores session and redirects by role; wrong password shows inline error; 401 clears session.
2. Guards: AGENT visiting `/studio` sees 403 state; MANAGER cannot see Studio link.
3. Projects: Shelf renders from mock; search debounces and updates URL; empty state.
4. Project detail: agent view shows only returned tasks and the "your own tasks" note.
5. Studio: convert button disabled for empty/<50 chars; double click sends one request; 201 → result reveal; 422 → Correction Desk with highlighted fields from `issues`; Check again calls `/validate`; commit success invalidates queries.
6. Error mapping: 409 `CONVERSION_IN_PROGRESS`, 409 `DUPLICATE_TRANSCRIPT` dialog, 502 retry.
7. Utilities: date parsing is timezone-safe; relativeDeadline cases.
Mock handlers mirror the backend envelope and the 12-task acceptance data in the backend spec.

---

## 18. End-to-End Acceptance (with backend running)

1. `bun run seed` (backend), start backend, start frontend → app loads with no config; login page shows demo cast.
2. Sign in as admin → Desk → Studio → "Load sample transcript" → Create from Transcript → processing → reveal "Created 3 projects with 12 tasks".
3. Desk Shelf shows UrbanCart Website (4 tasks · 40 h · 20 Oct), QuickServe Mobile App (4 · 46 h · 24 Oct), HelpDeskPro AI Assistant (4 · 38 h · 22 Oct).
4. Sign in as Ayesha → only UrbanCart; try opening a QuickServe URL → "We couldn't find that".
5. Sign in as Ali → My Tasks shows exactly 3 tasks; as Hamza → 2 tasks across UrbanCart & QuickServe.
6. Edit the transcript (QuickServe integration → 12 h, 23 Oct) → convert → only that task differs (after a data reset).
7. Provoke a 422 (transcript with an unknown assignee) → Correction Desk highlights the field, fix it, Check again → All clear → Save.
8. Refresh any page → session and data persist.
9. Toggle dark mode; reduced-motion mode; 360px width — all remain polished.

---

## 19. Deliverables Checklist

- [ ] Vite + TS strict project (or existing structure retained), Tailwind theme from tokens, fonts self-hosted
- [ ] API client with envelope handling, `ApiError`, 401 handler, base URL + dev proxy (works out of the box with backend on :5000)
- [ ] All endpoint functions, types, query keys, hooks (section 6)
- [ ] Zustand stores: `auth`, `ui` (theme, view mode), `studio`
- [ ] Router with guards and role redirects
- [ ] Screens: Login, Desk, Projects, Project detail, My Tasks, Team, Studio (compose/processing/correcting/done), 403/404/error
- [ ] Design-system components and motifs: Masthead, Folio, DeadlineRail, TaskLedger, Ticket, Seal/PersonChip, Stamp, Grain, Thread
- [ ] Loading/empty/error states everywhere; a11y and reduced motion
- [ ] Tests (section 17), `.env.example`, README (setup, env vars, demo accounts, how it connects to backend, screenshots placeholders)
