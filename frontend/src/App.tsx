import { QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { BrowserRouter, Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { queryClient } from "./api/query-client";
import { authApi } from "./api/auth.api";
import { apiRequest } from "./api/client";
import { FullPageLoader } from "./components/FullPageLoader";
import { LoginPage } from "./pages/LoginPage";
import { useProfile } from "./hooks/useProfile";
import { useAuthStore } from "./store/auth.store";
import { ApiError } from "./utils/api-error";
import { Brand } from "./components/Brand";
import { Icon } from "./components/Icon";
import type { IconName } from "./components/Icon";

type Role = "ADMIN" | "MANAGER" | "AGENT";
type Person = { id: string; code: string; name: string; specialization?: string };
type Project = { id: string; name: string; clientName: string; description: string; deadline: string; manager: Person; taskCount: number; totalEstimatedHours: number; createdAt?: string; tasks?: Task[] };
type Task = { id: string; projectId?: string; title: string; description: string; deadline: string; estimatedHours: number; assignee?: Person; project?: Project };
type Member = Person & { role: Role; skills?: string[] };
type DraftTask = { title: string | null; description: string | null; assigneeId: string | null; deadline: string | null; estimatedHours: number | null };
type DraftProject = { name: string | null; clientName: string | null; description: string | null; managerId: string | null; deadline: string | null; tasks: DraftTask[] };
type StudioDraft = { runId?: string; draft: { projects: DraftProject[] }; issues?: Array<{ path: string; message: string }> };
type Envelope<T> = { data: T; meta?: { totalPages?: number; total?: number } };
function isIsoDate(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return false;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
function localDraftIssues(draft: { projects: DraftProject[] }, members: Member[]) {
  const issues: Array<{ path: string; message: string }> = [];
  const managerCodes = new Set(members.filter((m) => m.role === "MANAGER").map((m) => m.code));
  const agentCodes = new Set(members.filter((m) => m.role === "AGENT").map((m) => m.code));
  draft.projects.forEach((project, pi) => {
    const base = `projects[${pi}]`;
    if (!project.name?.trim()) issues.push({ path: `${base}.name`, message: "Project name is required" });
    if (!project.clientName?.trim()) issues.push({ path: `${base}.clientName`, message: "Client name is required" });
    if (!isIsoDate(project.deadline)) issues.push({ path: `${base}.deadline`, message: "Pick a valid project deadline" });
    if (!project.managerId || (managerCodes.size > 0 && !managerCodes.has(project.managerId))) {
      issues.push({ path: `${base}.managerId`, message: "Select a manager" });
    }
    if (!project.tasks.length) issues.push({ path: `${base}.tasks`, message: "Add at least one task" });
    const titles = new Set<string>();
    project.tasks.forEach((task, ti) => {
      const tBase = `${base}.tasks[${ti}]`;
      if (!task.title?.trim()) issues.push({ path: `${tBase}.title`, message: "Task title is required" });
      else if (titles.has(task.title.trim().toLowerCase())) issues.push({ path: `${tBase}.title`, message: "Duplicate task title" });
      if (task.title?.trim()) titles.add(task.title.trim().toLowerCase());
      if (!task.assigneeId || (agentCodes.size > 0 && !agentCodes.has(task.assigneeId))) {
        issues.push({ path: `${tBase}.assigneeId`, message: "Select a developer" });
      }
      if (!isIsoDate(task.deadline)) issues.push({ path: `${tBase}.deadline`, message: "Pick a valid task deadline" });
      else if (isIsoDate(project.deadline) && task.deadline! > project.deadline!) {
        issues.push({ path: `${tBase}.deadline`, message: `Task deadline must be on or before ${project.deadline}` });
      }
      const hours = Number(task.estimatedHours);
      if (!Number.isFinite(hours) || hours <= 0) issues.push({ path: `${tBase}.estimatedHours`, message: "Enter hours greater than 0" });
    });
  });
  return issues;
}
function fieldIssue(issues: Array<{ path: string; message: string }> | undefined, path: string) {
  return issues?.find((issue) => issue.path === path)?.message;
}
function DraftField({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label>
      {label}
      {children}
      {error && <small className="inline-error">{error}</small>}
    </label>
  );
}
const demoAccounts = ["admin@novaworks.example", "ayesha@novaworks.example", "bilal@novaworks.example", "hina@novaworks.example", "ali@novaworks.example", "hamza@novaworks.example", "sara@novaworks.example", "usman@novaworks.example", "zain@novaworks.example", "maryam@novaworks.example"];
function roleFor(email?: string, role?: Role): Role { if (role) return role; if (email === demoAccounts[0]) return "ADMIN"; if (email && demoAccounts.slice(1, 4).includes(email)) return "MANAGER"; return "AGENT"; }
function useRole(): Role { const user = useAuthStore((s) => s.user); return roleFor(user?.email, user?.role); }
function useResource<T>(path: string, key: unknown[]) { return useQuery({ queryKey: key, queryFn: () => apiRequest<Envelope<T>>(path), enabled: !!useAuthStore.getState().accessToken }); }
function shortDate(value: string) { if (!value) return "Unscheduled"; const [y, m, d] = value.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }
function initials(value = "") { return value.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "NW"; }

function Shell({ children }: { children: ReactNode }) {
  const role = useRole();
  const user = useAuthStore((s) => s.user);
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const logout = useMutation({ mutationFn: authApi.logout, onSettled: () => { useAuthStore.getState().clearSession(); queryClient.clear(); navigate("/login", { replace: true }); } });
  const links: Array<[string, string, IconName]> = role === "ADMIN"
    ? [["Dashboard", "/desk", "grid"], ["Projects", "/projects", "folder"], ["Team", "/team", "users"], ["Transcript Studio", "/studio", "sparkles"]]
    : role === "MANAGER" ? [["Projects", "/projects", "folder"], ["Team", "/team", "users"]]
    : [["My tasks", "/my-tasks", "check"], ["Projects", "/projects", "folder"], ["Team", "/team", "users"]];
  return <div className="site-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="masthead"><Link to="/" className="wordmark" aria-label="NovaWorks home"><Brand/></Link><nav id="workspace-navigation" className={menu ? "main-nav is-open" : "main-nav"} aria-label="Main navigation">{links.map(([label, href, icon]) => <NavLink key={href} to={href} onClick={() => setMenu(false)} className={({ isActive }) => (isActive ? "active" : "")}><Icon name={icon} size={17}/>{label}</NavLink>)}</nav><div className="account"><span className="avatar">{initials(`${user?.firstName ?? ""} ${user?.lastName ?? ""}`)}</span><span className="account-name">{user?.firstName ?? "Workspace"}<small>{role === "AGENT" ? "Developer" : role === "MANAGER" ? "Project manager" : "Administrator"}</small></span><button className="logout-button" aria-label="Sign out" title="Sign out" disabled={logout.isPending} onClick={() => logout.mutate()}><Icon name="logout" size={18}/></button></div><button className="menu-toggle" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="workspace-navigation" aria-label={menu ? "Close navigation" : "Open navigation"}><Icon name={menu ? "close" : "menu"}/></button></header>
    <div className="content-col">{children}<footer className="site-footer"><span>NovaWorks Technologies</span><span>Lahore, Pakistan</span></footer></div>
  </div>;
}
function Home() { const role = useRole(); return <Navigate to={role === "ADMIN" ? "/desk" : role === "MANAGER" ? "/projects" : "/my-tasks"} replace />; }
function Guard({ roles, children }: { roles?: Role[]; children: ReactNode }) { const profile = useProfile(); const user = useAuthStore((s) => s.user); const location = useLocation(); if (profile.isPending) return <FullPageLoader message="Opening your workspace…" />; if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />; if (roles && !roles.includes(roleFor(user.email, user.role))) return <Shell><main id="main" className="page narrow"><p className="eyebrow">403 · Access</p><h1>Access denied</h1><p>Your role doesn’t have permission to view this page.</p><Link className="button-link" to="/">Back to home</Link></main></Shell>; return <>{children}</>; }
function Page({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children: ReactNode }) {
  const location = useLocation();
  return <Shell><main id="main" className="page" key={location.pathname}><div className="page-heading"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{subtitle && <p className="lede">{subtitle}</p>}</div></div>{children}</main></Shell>;
}
function LoadState<T>({ query, empty, hint, cta, children }: { query: { isPending: boolean; error: Error | null; refetch: () => unknown; data?: Envelope<T> }; empty: string; hint?: string; cta?: ReactNode; children: (data: T) => React.ReactNode }) { if (query.isPending) return <div className="state-panel"><span className="loader-spinner"/><p>Loading…</p></div>; if (query.error) return <div className="state-panel state-error"><span className="state-mark">!</span><h2>Something went wrong</h2><p>{query.error.message}</p><button className="button-link" onClick={() => void query.refetch()}>Try again</button></div>; const data = query.data?.data; if (data === undefined || (Array.isArray(data) && data.length === 0)) return <div className="empty-panel"><span className="empty-orbit">—</span><h2>{empty}</h2><p>{hint ?? "There’s nothing to show here yet."}</p>{cta}</div>; return <>{children(data)}</>; }
function Folio({ project, index }: { project: Project; index: number }) {
  return <Link to={`/projects/${project.id}`} className="folio">
    <div className="folio-top"><span className="project-symbol"><Icon name={index % 3 === 0 ? "folder" : index % 3 === 1 ? "sparkles" : "grid"} size={25}/></span><span className="folio-index">Project {String(index + 1).padStart(2, "0")}</span><span className="folio-open"><Icon name="diagonal" size={18}/></span></div>
    <span className="client-label">{project.clientName}</span><h2>{project.name}</h2><p className="folio-description">{project.description || "No description provided."}</p>
    <div className="folio-bottom"><span className="person-line"><span className="avatar small">{initials(project.manager?.name)}</span>{project.manager?.name ?? "Project team"}</span><span className="project-due"><Icon name="calendar" size={13}/>{shortDate(project.deadline)}</span></div>
    <div className="folio-stats"><span><Icon name="check" size={14}/>{project.taskCount} tasks</span><span><Icon name="clock" size={14}/>{project.totalEstimatedHours} hours</span><span className="folio-arrow"><Icon name="arrow" size={16}/></span></div>
  </Link>;
}
function ProjectShelf({ projects }: { projects: Project[] }) { return <div className="folio-grid">{projects.map((project, index) => <Folio key={project.id} project={project} index={index}/>)}</div>; }
function GettingStarted({ show }: { show: boolean }) {
  if (!show) return null;
  const steps: Array<[string, string]> = [["Paste a transcript", "Open Transcript Studio and paste notes from a client or team meeting."], ["Review the draft", "Check the generated projects, tasks, owners and deadlines. Fix anything flagged."], ["Save the plan", "Managers and developers see only the projects and tasks that involve them."]];
  return <section className="getting-started" aria-label="Getting started"><h2>Get started in three steps</h2><ol>{steps.map(([title, text], i) => <li key={title}><span className="step-num">{i + 1}</span><div><strong>{title}</strong><p>{text}</p></div></li>)}</ol></section>;
}
function DeskPage() {
  const query = useResource<Project[]>("/api/v1/projects", ["projects"]);
  const projects = query.data?.data ?? [];
  const totalTasks = projects.reduce((n, p) => n + p.taskCount, 0);
  const hours = projects.reduce((n, p) => n + p.totalEstimatedHours, 0);
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Karachi" });
  return <Page eyebrow={today} title="Dashboard" subtitle="An overview of active projects, tasks and upcoming deadlines.">
    <div className="workspace-summary"><span><strong>{projects.length}</strong> Active projects</span><span><strong>{totalTasks}</strong> Total tasks</span><span><strong>{hours}</strong> Estimated hours</span></div>
    <GettingStarted show={!query.isPending && projects.length === 0}/>
    <Link to="/studio" className="studio-cta"><div className="cta-copy"><span className="cta-tag"><Icon name="sparkles" size={14}/> Transcript Studio</span><strong>Create projects from a meeting transcript</strong><p>Paste your notes and review the generated projects, tasks and assignments before saving.</p></div><span className="cta-action">Open studio <Icon name="arrow" size={16}/></span></Link>
    <section className="section-block"><div className="section-head"><div><h2>Projects<span className="count-pill">{projects.length}</span></h2></div><Link to="/projects" className="quiet-link">View all <Icon name="arrow" size={16}/></Link></div><LoadState query={query} empty="No projects yet." hint="Create your first projects by pasting a meeting transcript into Transcript Studio." cta={<Link to="/studio" className="button-link">Open Transcript Studio</Link>}>{(data) => <ProjectShelf projects={data}/>}</LoadState></section><DeadlineRail projects={projects}/>
  </Page>;
}
function ProjectsPage() { const role = useRole(); const [params, setParams] = useSearchParams(); const [search, setSearch] = useState(params.get("q") ?? ""); useEffect(() => { const timer = window.setTimeout(() => { if (search === (params.get("q") ?? "")) return; const next = new URLSearchParams(params); if (search) next.set("q", search); else next.delete("q"); next.delete("page"); setParams(next, { replace: true }); }, 300); return () => window.clearTimeout(timer); }, [search, params, setParams]); const query = useResource<Project[]>(`/api/v1/projects?search=${encodeURIComponent(params.get("q") ?? "")}&page=${params.get("page") ?? "1"}&limit=12`, ["projects", params.toString()]); const [view, setView] = useState<"shelf"|"index">("shelf"); return <Page eyebrow="Projects" title="Projects" subtitle={role === "MANAGER" ? "Projects you manage." : role === "AGENT" ? "Projects you have tasks in." : "All projects across the organization. Select one to see its tasks."}><div className="toolbar"><label className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects or clients" aria-label="Search projects"/></label><div className="view-toggle" aria-label="Project view"><button className={view === "shelf" ? "selected" : ""} onClick={() => setView("shelf")}>Cards</button><button className={view === "index" ? "selected" : ""} onClick={() => setView("index")}>List</button></div></div><LoadState query={query} empty={search ? `No projects match “${search}”.` : "No projects yet."} hint={search ? "Try a different project or client name." : role === "MANAGER" ? "Projects you are assigned to manage will appear here." : role === "AGENT" ? "Projects appear here once a task is assigned to you." : "Create projects from a meeting transcript in Transcript Studio."}>{(projects) => view === "shelf" ? <ProjectShelf projects={projects}/> : <div className="index-list">{projects.map((p, i) => <Link key={p.id} className="index-row" to={`/projects/${p.id}`}><span className="mono faint">{String(i+1).padStart(2,"0")}</span><span className="index-project"><small>{p.clientName}</small><strong>{p.name}</strong></span><span>{p.manager?.name}</span><span className="mono">{shortDate(p.deadline)}</span><span>{p.taskCount} tasks · {p.totalEstimatedHours} h</span><b>↗</b></Link>)}</div>}</LoadState></Page>; }
function DeadlineRail({ projects }: { projects: Project[] }) { if (!projects.length) return null; const ordered = [...projects].sort((a,b) => a.deadline.localeCompare(b.deadline)); return <section className="section-block deadline-section"><div className="section-head"><div><h2>Upcoming deadlines</h2></div><span className="mono">{ordered.length} dates</span></div><div className="deadline-rail">{ordered.map((p) => <Link to={`/projects/${p.id}`} key={p.id} className="deadline-item"><span className="deadline-dot"/><span className="mono">{shortDate(p.deadline)}</span><strong>{p.name}</strong><small>{p.clientName}</small></Link>)}</div></section>; }
function ProjectPage() { const { projectId = "" } = useParams(); const role = useRole(); const query = useResource<Project>(`/api/v1/projects/${encodeURIComponent(projectId)}`, ["project", projectId]); return <Page eyebrow="Project" title={query.data?.data.name ?? "Project detail"}><LoadState query={query} empty="We couldn’t find that page.">{(project) => <><div className="project-hero"><p className="client-label">{project.clientName}</p><h1>{project.name}</h1><p className="lede">{project.description}</p><div className="project-meta"><div><small>Project manager</small><strong>{project.manager?.name}</strong></div><div><small>Deadline</small><strong>{shortDate(project.deadline)}</strong></div><div><small>Tasks</small><strong>{project.taskCount}</strong></div><div><small>{role === "AGENT" ? "Your hours" : "Estimated hours"}</small><strong>{project.totalEstimatedHours} h</strong></div></div></div>{role === "AGENT" && <p className="quiet-note">You’re seeing your own tasks in this project.</p>}<section className="section-block"><div className="section-head"><div><h2>Tasks</h2></div></div><TaskTable tasks={project.tasks ?? []}/></section></>}</LoadState></Page>; }
function TaskTable({ tasks }: { tasks: Task[] }) { const [sort, setSort] = useState("deadline"); const sorted = useMemo(() => [...tasks].sort((a,b) => sort === "hours" ? a.estimatedHours-b.estimatedHours : sort === "owner" ? (a.assignee?.name ?? "").localeCompare(b.assignee?.name ?? "") : a.deadline.localeCompare(b.deadline)), [tasks, sort]); if (!tasks.length) return <div className="empty-panel compact"><h2>No tasks yet</h2><p>Tasks will appear here once they are added.</p></div>; return <div className="ledger-wrap"><div className="ledger-controls"><span>Sort by</span>{[["deadline","Deadline"],["owner","Owner"],["hours","Hours"]].map(([v,l]) => <button key={v} className={sort===v?"sort-active":""} onClick={() => setSort(v)}>{l}</button>)}</div><div className="task-ledger">{sorted.map((task, i) => <article className="task-row" key={task.id}><span className="task-number">{String(i+1).padStart(2,"0")}</span><div className="task-copy"><h3>{task.title}</h3><p>{task.description}</p></div><span className="person-line"><span className="avatar small">{initials(task.assignee?.name)}</span>{task.assignee?.name ?? "Unassigned"}</span><span className="mono">{shortDate(task.deadline)}</span><span className="hours-stamp">{task.estimatedHours} h</span></article>)}</div><div className="ledger-total">Total hours <strong>{tasks.reduce((n,t)=>n+t.estimatedHours,0)} h</strong></div></div>; }
function MyTasksPage() { const query = useResource<Task[]>("/api/v1/tasks/my", ["my-tasks"]); return <Page eyebrow="My tasks" title="My tasks" subtitle="Your assigned work, ordered by deadline."><LoadState query={query} empty="No tasks assigned to you." hint="When a manager assigns you a task it will show up here with its deadline and estimated hours.">{(tasks) => <div className="ticket-list">{[...tasks].sort((a,b)=>a.deadline.localeCompare(b.deadline)).map((task) => <article className="ticket" key={task.id}><span className="hours-stamp">{task.estimatedHours}<small>HRS</small></span><div className="ticket-main"><h2>{task.title}</h2><p>{task.description}</p><Link to={`/projects/${task.project?.id ?? task.projectId}`} className="quiet-link">{task.project?.clientName} · {task.project?.name} ↗</Link></div><div className="ticket-date"><strong>{shortDate(task.deadline).split(" ")[0]}</strong><span>{shortDate(task.deadline).split(" ")[1]}</span></div></article>)}</div>}</LoadState></Page>; }
function TeamPage() { const role = useRole(); const query = useResource<Member[]>("/api/v1/team", ["team"]); const groups: Role[] = ["ADMIN","MANAGER","AGENT"]; const names: Record<Role,string> = { ADMIN:"Administrator", MANAGER:"Project managers", AGENT:"Developers" }; return <Page eyebrow="People" title="Team" subtitle={role === "ADMIN" ? "Everyone in the organization and their skills." : "The people you work with on your projects."}><LoadState query={query} empty="No team members yet." hint="Teammates appear here once you share a project with them.">{(members) => <>{groups.map((role) => { const people = members.filter((m) => m.role === role); return people.length ? <section className="section-block" key={role}><div className="section-head"><div><p className="eyebrow">{names[role]}</p><h2>{people.length} {people.length === 1 ? "member" : "members"}</h2></div></div><div className="people-grid">{people.map((person) => <article className="person-card" key={person.id}><span className="person-seal">{initials(person.name)}</span><div><h3>{person.name}</h3><p>{person.specialization ?? names[role]}</p><div className="skill-tags">{person.skills?.map((skill) => <span key={skill}>{skill}</span>)}</div></div></article>)}</div></section> : null; })}</>}</LoadState></Page>; }
function StudioPage() {
  const [transcript, setTranscript] = useState("");
  const [result, setResult] = useState<{ projectCount: number; taskCount: number } | null>(null);
  const [correction, setCorrection] = useState<StudioDraft | null>(null);
  const [validationMessage, setValidationMessage] = useState("");
  const [touched, setTouched] = useState(false);
  const team = useResource<Member[]>("/api/v1/team", ["team"]);
  const members = team.data?.data ?? [];
  const managers = members.filter((m) => m.role === "MANAGER");
  const agents = members.filter((m) => m.role === "AGENT");
  const convert = useMutation({
    mutationFn: () => apiRequest<{ data: { projectCount: number; taskCount: number } }>("/api/v1/transcripts/convert", { method: "POST", body: { transcript } }),
    onSuccess: (data) => { setCorrection(null); setResult(data.data); void queryClient.invalidateQueries({ queryKey: ["projects"] }); },
    onError: (error) => { if (error instanceof ApiError && error.status === 422 && error.details && typeof error.details === "object" && "draft" in error.details) { setCorrection(error.details as StudioDraft); setTouched(true); } },
  });
  const liveIssues = correction ? localDraftIssues(correction.draft, members) : [];
  const shownIssues = [...(correction?.issues ?? []), ...liveIssues].filter((issue, index, list) => list.findIndex((item) => item.path === issue.path) === index);
  const validate = useMutation({
    mutationFn: async () => {
      const local = localDraftIssues(correction!.draft, members);
      if (local.length) {
        setCorrection((current) => current ? { ...current, issues: local } : current);
        setValidationMessage(`${local.length} field${local.length === 1 ? "" : "s"} still need attention.`);
        throw new Error("Fix the highlighted fields first.");
      }
      return apiRequest<{ data?: { issues?: StudioDraft["issues"]; valid?: boolean } }>("/api/v1/transcripts/validate", { method: "POST", body: { runId: correction?.runId, draft: correction?.draft } });
    },
    onSuccess: (response) => {
      const issues = response.data?.issues ?? [];
      setCorrection((current) => current ? { ...current, issues } : null);
      setValidationMessage(issues.length ? `${issues.length} item${issues.length === 1 ? "" : "s"} still need attention.` : "Everything looks ready to save.");
    },
  });
  const commit = useMutation({
    mutationFn: async () => {
      const local = localDraftIssues(correction!.draft, members);
      if (local.length) {
        setCorrection((current) => current ? { ...current, issues: local } : current);
        throw new Error("Fix the highlighted fields first.");
      }
      return apiRequest<{ data: { projectCount?: number; taskCount?: number } }>("/api/v1/transcripts/commit", { method: "POST", body: { runId: correction?.runId, draft: correction?.draft } });
    },
    onSuccess: (response) => { setCorrection(null); setResult({ projectCount: response.data.projectCount ?? 0, taskCount: response.data.taskCount ?? 0 }); void queryClient.invalidateQueries({ queryKey: ["projects"] }); void queryClient.invalidateQueries({ queryKey: ["my-tasks"] }); },
  });
  function editDraft(projectIndex: number, taskIndex: number, field: keyof DraftProject | keyof DraftTask, value: string) {
    setTouched(true);
    setCorrection((current) => {
      if (!current) return current;
      const projects = current.draft.projects.map((project, index) => {
        if (index !== projectIndex) return project;
        if (taskIndex < 0) return { ...project, [field]: value };
        return { ...project, tasks: project.tasks.map((task, index) => index === taskIndex ? { ...task, [field]: field === "estimatedHours" ? (value === "" ? null : Number(value)) : value } : task) };
      });
      return { ...current, draft: { projects }, issues: current.issues?.filter((issue) => {
        const path = taskIndex < 0 ? `projects[${projectIndex}].${field}` : `projects[${projectIndex}].tasks[${taskIndex}].${field}`;
        return issue.path !== path;
      }) };
    });
    setValidationMessage("");
  }
  const sample = "We met with the UrbanCart team to plan the new storefront. Ayesha will manage the work, with Ali building the product catalog by October 20. Hamza will create the checkout experience, Sara will handle responsive design, and Usman will prepare the launch QA plan.";
  return <Page eyebrow="Admin" title={correction ? "Review required" : "Transcript Studio"} subtitle={correction ? "Fix the highlighted fields, then validate again before saving." : "Paste a meeting transcript to generate projects, tasks and assignments."}>
    <div className="studio-layout"><div className="studio-paper">
      {correction ? <><p className="eyebrow">Review draft</p><div className="correction-list">{correction.draft.projects.map((project, pi) => <section className="correction-project" key={pi}><h2>Project {pi + 1}</h2><div className="correction-grid">
        <DraftField label="Project name" error={fieldIssue(shownIssues, `projects[${pi}].name`)}><input required maxLength={150} value={project.name ?? ""} onChange={(e) => editDraft(pi, -1, "name", e.target.value)} aria-invalid={!!fieldIssue(shownIssues, `projects[${pi}].name`)} /></DraftField>
        <DraftField label="Client" error={fieldIssue(shownIssues, `projects[${pi}].clientName`)}><input required maxLength={150} value={project.clientName ?? ""} onChange={(e) => editDraft(pi, -1, "clientName", e.target.value)} aria-invalid={!!fieldIssue(shownIssues, `projects[${pi}].clientName`)} /></DraftField>
        <DraftField label="Project deadline" error={fieldIssue(shownIssues, `projects[${pi}].deadline`)}><input type="date" required value={isIsoDate(project.deadline) ? project.deadline! : ""} onChange={(e) => editDraft(pi, -1, "deadline", e.target.value)} aria-invalid={!!fieldIssue(shownIssues, `projects[${pi}].deadline`)} /></DraftField>
        <DraftField label="Manager" error={fieldIssue(shownIssues, `projects[${pi}].managerId`)}><select required value={project.managerId ?? ""} onChange={(e) => editDraft(pi, -1, "managerId", e.target.value)} aria-invalid={!!fieldIssue(shownIssues, `projects[${pi}].managerId`)}><option value="">Select manager</option>{managers.map((m) => <option key={m.id} value={m.code}>{m.name} ({m.code})</option>)}</select></DraftField>
      </div>{project.tasks.map((task, ti) => <div className="correction-task" key={ti}><h3>Task {ti + 1}</h3><div className="correction-grid">
        <DraftField label="Task title" error={fieldIssue(shownIssues, `projects[${pi}].tasks[${ti}].title`)}><input required maxLength={150} value={task.title ?? ""} onChange={(e) => editDraft(pi, ti, "title", e.target.value)} aria-invalid={!!fieldIssue(shownIssues, `projects[${pi}].tasks[${ti}].title`)} /></DraftField>
        <DraftField label="Assignee" error={fieldIssue(shownIssues, `projects[${pi}].tasks[${ti}].assigneeId`)}><select required value={task.assigneeId ?? ""} onChange={(e) => editDraft(pi, ti, "assigneeId", e.target.value)} aria-invalid={!!fieldIssue(shownIssues, `projects[${pi}].tasks[${ti}].assigneeId`)}><option value="">Select developer</option>{agents.map((a) => <option key={a.id} value={a.code}>{a.name} ({a.code})</option>)}</select></DraftField>
        <DraftField label="Task deadline" error={fieldIssue(shownIssues, `projects[${pi}].tasks[${ti}].deadline`)}><input type="date" required max={isIsoDate(project.deadline) ? project.deadline! : undefined} value={isIsoDate(task.deadline) ? task.deadline! : ""} onChange={(e) => editDraft(pi, ti, "deadline", e.target.value)} aria-invalid={!!fieldIssue(shownIssues, `projects[${pi}].tasks[${ti}].deadline`)} /></DraftField>
        <DraftField label="Estimated hours" error={fieldIssue(shownIssues, `projects[${pi}].tasks[${ti}].estimatedHours`)}><input type="number" required min={0.5} max={1000} step={0.5} value={task.estimatedHours ?? ""} onChange={(e) => editDraft(pi, ti, "estimatedHours", e.target.value)} aria-invalid={!!fieldIssue(shownIssues, `projects[${pi}].tasks[${ti}].estimatedHours`)} /></DraftField>
      </div></div>)}</section>)}</div><div className="correction-actions"><button className="button-link" onClick={() => { setCorrection(null); setValidationMessage(""); setTouched(false); }}>Back to transcript</button><button className="button-link" disabled={validate.isPending} onClick={() => { setTouched(true); validate.mutate(); }}>{validate.isPending ? "Validating…" : "Validate again"}</button><button className="primary-button" disabled={commit.isPending || (touched && shownIssues.length > 0)} onClick={() => { setTouched(true); commit.mutate(); }}>{commit.isPending ? "Saving…" : "Save plan"}</button></div>{(validationMessage || (touched && shownIssues.length > 0)) && <p className="inline-error" role="status">{validationMessage || `${shownIssues.length} field${shownIssues.length === 1 ? "" : "s"} still need attention.`}</p>}</> : <><label htmlFor="transcript" className="eyebrow">Meeting transcript</label><textarea id="transcript" value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste your meeting transcript here…"/><div className="paper-footer"><span>{transcript.trim().length} characters · private to this session</span><button className="button-link" onClick={() => setTranscript(sample)}>Load sample transcript</button></div><button className="primary-button" disabled={transcript.trim().length < 50 || convert.isPending} onClick={() => { setResult(null); convert.mutate(); }}>{convert.isPending ? "Analyzing transcript…" : "Generate plan"}</button>{convert.error && !correction && <p className="inline-error" role="alert">{convert.error.message}. Your transcript is saved here; you can revise it and try again.</p>}</>}
    </div><aside className="studio-aside"><p className="eyebrow">How it works</p><h2>Paste a transcript, review the result, save.</h2><p>Projects, owners, deadlines and estimates are extracted from the conversation. You can review and edit everything before it is saved.</p>{result && <div className="result-reveal" role="status"><span className="eyebrow">Plan created</span><strong>{result.projectCount} projects</strong><span>{result.taskCount} tasks are ready for the team.</span></div>}</aside></div>
  </Page>;
}
function AppRoutes() { const profile = useProfile(); const user = useAuthStore((s) => s.user); if (profile.isPending) return <FullPageLoader message="Loading…"/>; return <Routes><Route path="/login" element={user ? <Home/> : <LoginPage/>}/><Route path="/" element={<Guard><Home/></Guard>}/><Route path="/desk" element={<Guard roles={["ADMIN"]}><DeskPage/></Guard>}/><Route path="/studio" element={<Guard roles={["ADMIN"]}><StudioPage/></Guard>}/><Route path="/projects" element={<Guard><ProjectsPage/></Guard>}/><Route path="/projects/:projectId" element={<Guard><ProjectPage/></Guard>}/><Route path="/my-tasks" element={<Guard roles={["AGENT"]}><MyTasksPage/></Guard>}/><Route path="/team" element={<Guard><TeamPage/></Guard>}/><Route path="*" element={<Shell><main id="main" className="page narrow"><p className="eyebrow">404 · Not found</p><h1>Page not found</h1><Link className="button-link" to="/">Back to home</Link></main></Shell>}/></Routes>; }
export default function App() { return <QueryClientProvider client={queryClient}><BrowserRouter><AppRoutes/></BrowserRouter></QueryClientProvider>; }
