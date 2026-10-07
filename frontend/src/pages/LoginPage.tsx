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

  const login = useMutation({
    mutationFn: authApi.login,
    onSuccess: (result) => {
      useAuthStore.getState().setSession(result.data, result.accessToken);
      queryClient.setQueryData(["profile"], result.data);
      navigate("/dashboard", { replace: true });
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
      title="Welcome back"
      subtitle="Log in and we will take you to your dashboard."
      animationSrc={loginAnimation}
      segment={[48, 200]}
      footer={
        <p>
          New here? <Link to="/signup">Create an account</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-heading">
          <h1>Log in</h1>
          <p>Use the email and password for your account.</p>
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
        <InputField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={setPassword}
          error={errors.password}
        />
        <div className="form-row-end">
          <Link to="/forgot-password">Forgot password?</Link>
        </div>
        <Button type="submit" loading={login.isPending} fullWidth>
          Log in
        </Button>
      </form>
    </AuthLayout>
  );
}
