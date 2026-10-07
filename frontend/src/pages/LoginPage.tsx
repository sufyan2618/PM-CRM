import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi } from "../api/auth.api";
import { queryClient } from "../api/query-client";
import { Brand } from "../components/Brand";
import { Icon } from "../components/Icon";
import { useAuthStore } from "../store/auth.store";
import { getErrorMessage } from "../utils/api-error";
import { hasFieldErrors, validateEmail, validateRequired } from "../utils/validators";

const demoGroups = [
  { label: "Administrator", role: "ADMIN", names: ["Admin"] },
  { label: "Managers", role: "MANAGER", names: ["Ayesha", "Bilal", "Hina"] },
  { label: "Developers", role: "AGENT", names: ["Ali", "Hamza", "Sara", "Usman", "Zain", "Maryam"] },
] as const;

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const submitRef = useRef<HTMLButtonElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [demoGroup, setDemoGroup] = useState(0);
  const notice = (location.state as { message?: string } | null)?.message;

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      useAuthStore.getState().setSession(result.data, result.accessToken);
      queryClient.setQueryData(["profile"], result.data);
      const target = result.data.role === "ADMIN" ? "/desk" : result.data.role === "MANAGER" ? "/projects" : "/my-tasks";
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from?.startsWith("/") && !from.startsWith("//") ? from : target, { replace: true });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (login.isPending) return;
    const nextErrors = { email: validateEmail(email), password: validateRequired(password, "Password") };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;
    login.mutate({ email: email.trim().toLowerCase(), password });
  }

  function fillAccount(name: string) {
    setEmail(`${name.toLowerCase()}@novaworks.example`);
    setPassword("Demo123!");
    setErrors({ email: "", password: "" });
    login.reset();
    submitRef.current?.focus();
  }

  return <main className="login-screen">
    <section className="login-story" aria-label="About NovaWorks">
      <div className="login-brand"><Brand/><span className="login-location">Lahore, Pakistan</span></div>
      <div className="login-story-copy"><h1>Turn meeting transcripts into project plans.</h1><p>Manage projects, assign work and track deadlines in one place, with clear ownership for every task.</p>
        <ul className="feature-list">
          <li><span className="feature-icon"><Icon name="file" size={16}/></span><div><strong>Transcript to tasks</strong><span className="desc">Extract projects, owners, deadlines and estimates from meeting notes.</span></div></li>
          <li><span className="feature-icon"><Icon name="users" size={16}/></span><div><strong>Role-based workspaces</strong><span className="desc">Admins, project managers and developers each see what they need.</span></div></li>
          <li><span className="feature-icon"><Icon name="calendar" size={16}/></span><div><strong>Deadline tracking</strong><span className="desc">Keep every project and task on schedule.</span></div></li>
        </ul></div>
      <div className="login-story-footer">© NovaWorks Technologies</div>
    </section>
    <section className="login-panel" aria-label="Sign in">
      <div className="login-sheet">
        <div className="login-greeting"><h2>Sign in</h2><p>Enter your credentials to access your workspace.</p></div>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          {notice && <p className="alert alert-success" role="status">{notice}</p>}
          {login.error && <p className="alert alert-error" role="alert">{getErrorMessage(login.error)}</p>}
          <div className="field"><label htmlFor="login-email">Email address</label><div className={errors.email ? "login-input has-error" : "login-input"}><Icon name="mail" size={18}/><input id="login-email" name="email" type="email" autoComplete="email" placeholder="you@novaworks.example" value={email} onChange={(event) => setEmail(event.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? "login-email-error" : undefined} disabled={login.isPending}/></div>{errors.email && <p id="login-email-error" className="field-error">{errors.email}</p>}</div>
          <div className="field"><label htmlFor="login-password">Password</label><div className={errors.password ? "login-input has-error" : "login-input"}><Icon name="lock" size={18}/><input id="login-password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!errors.password} aria-describedby={errors.password ? "login-password-error" : undefined} disabled={login.isPending}/><button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword}><Icon name={showPassword ? "eyeOff" : "eye"} size={18}/></button></div>{errors.password && <p id="login-password-error" className="field-error">{errors.password}</p>}</div>
          <button ref={submitRef} type="submit" className="primary-button login-submit" disabled={login.isPending} aria-busy={login.isPending}><span>{login.isPending ? "Signing in…" : "Sign in"}</span>{login.isPending ? <span className="button-spinner"/> : <Icon name="arrow" size={19}/>}</button>
        </form>
        <section className="demo-cast" aria-label="Try a demo account"><div className="demo-cast-head"><div><Icon name="users" size={18}/><strong>Demo accounts</strong></div><span className="demo-badge">DEMO</span></div><p>Select a user to fill in their credentials.</p><div className="demo-role-tabs">{demoGroups.map((group, index) => <button key={group.role} type="button" aria-pressed={demoGroup === index} className={demoGroup === index ? "selected" : ""} onClick={() => setDemoGroup(index)}>{group.label}</button>)}</div><div className="demo-accounts">{demoGroups[demoGroup].names.map((name) => <button type="button" className={email === `${name.toLowerCase()}@novaworks.example` ? "demo-chip chosen" : "demo-chip"} key={name} onClick={() => fillAccount(name)} disabled={login.isPending}><span>{name.slice(0, 2).toUpperCase()}</span>{name}<Icon name="diagonal" size={12}/></button>)}</div><p className="demo-note"><Icon name="lock" size={12}/> All demo accounts use <code>Demo123!</code></p></section>
      </div>
      <div className="login-panel-footer"><span>NovaWorks Technologies</span><span>Secure sign-in</span></div>
    </section>
  </main>;
}
