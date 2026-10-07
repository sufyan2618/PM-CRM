import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import loginAnimation from "../animations/login.json?url";
import { authApi } from "../api/auth.api";
import { queryClient } from "../api/query-client";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { useAuthStore } from "../store/auth.store";
import { ApiError, getErrorMessage } from "../utils/api-error";
import { hasFieldErrors, validateEmail, validateRequired } from "../utils/validators";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const notice = (location.state as { message?: string } | null)?.message ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      useAuthStore.getState().setSession(result.data, result.accessToken);
      queryClient.setQueryData(["profile"], result.data);
      const target = result.data.email === "admin@novaworks.example" ? "/desk" : ["ayesha@novaworks.example", "bilal@novaworks.example", "hina@novaworks.example"].includes(result.data.email) ? "/projects" : "/my-tasks";
      navigate((location.state as { from?: string } | null)?.from ?? target, { replace: true });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email),
      password: validateRequired(password, "Password"),
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;
    login.mutate({ email: email.trim().toLowerCase(), password });
  }

  const needsVerification =
    login.error instanceof ApiError &&
    login.error.status === 403 &&
    login.error.message.toLowerCase().includes("verify");

  return (
    <AuthLayout
      title="From the meeting room to the task list."
      subtitle="A calmer way to turn good conversations into work that moves."
      animationSrc={loginAnimation}
      segment={[48, 200]}
      footer={
        <p>NovaWorks · Lahore</p>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-heading">
            <h1>Welcome back</h1>
            <p>Sign in to your workspace.</p>
        </div>
        {notice ? <Alert tone="success" message={notice} /> : null}
        {login.error ? <Alert tone="error" message={getErrorMessage(login.error)} /> : null}
        {needsVerification ? (
          <p className="form-note">
            <Link to="/verify-otp" state={{ email: email.trim().toLowerCase() }}>
              Enter your verification code
            </Link>
          </p>
        ) : null}
        <InputField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />
        <div className="field"><label className="field-label" htmlFor="password">Password</label><div className="field-control"><input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Your password" value={password} onChange={(event) => setPassword(event.target.value)} aria-invalid={!!errors.password}/><button type="button" className="field-toggle" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div>{errors.password && <span className="field-error">{errors.password}</span>}</div>
        <Button type="submit" loading={login.isPending} fullWidth>
          Sign in
        </Button>
      </form>
      <section className="demo-cast" aria-label="Demo accounts">
        <div className="demo-cast-head"><strong>Demo cast</strong><span>Quick fill</span></div>
        <div className="demo-groups">
          {[["Admin", ["Admin"]], ["Managers", ["Ayesha", "Bilal", "Hina"]], ["Developers", ["Ali", "Hamza", "Sara", "Usman", "Zain", "Maryam"]]].map(([group, names]) => <div className="demo-group" key={group as string}><span>{group as string}</span>{(names as string[]).map((name) => { const account = ["admin", "ayesha", "bilal", "hina", "ali", "hamza", "sara", "usman", "zain", "maryam"].find((part) => part.toLowerCase() === name.toLowerCase()) ?? "admin"; return <button type="button" className="demo-chip" key={name} onClick={() => { setEmail(`${account}@novaworks.example`); setPassword("Demo123!"); setErrors({ email: "", password: "" }); document.getElementById("password")?.focus(); }}>{name}</button>; })}</div>)}
        </div>
        <p className="demo-note">Demo only · password is Demo123! for every account</p>
      </section>
    </AuthLayout>
  );
}
