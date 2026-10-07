import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import signupAnimation from "../animations/signup.json?url";
import { authApi } from "../api/auth.api";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { getErrorMessage } from "../utils/api-error";
import { hasFieldErrors, validateEmail, validatePassword, validateRequired } from "../utils/validators";

const PASSWORD_HINT = "Use 6+ characters with upper, lower, a number, and @$!%*?&";

export function SignupPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const signup = useMutation({
    mutationFn: authApi.register,
    onSuccess: () => {
      navigate("/verify-otp", { state: { email: email.trim().toLowerCase() } });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      firstName: validateRequired(firstName, "First name"),
      lastName: validateRequired(lastName, "Last name"),
      email: validateEmail(email),
      password: validatePassword(password),
      confirmPassword: password === confirmPassword ? "" : "Passwords do not match",
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    signup.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      password,
    });
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="We will email you a 6 digit code to confirm it is you."
      animationSrc={signupAnimation}
      footer={
        <p>
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-heading">
          <h1>Sign up</h1>
          <p>Tell us your name, email, and a password.</p>
        </div>
        {signup.error ? <Alert tone="error" message={getErrorMessage(signup.error)} /> : null}
        <div className="field-grid">
          <InputField
            label="First name"
            name="firstName"
            autoComplete="given-name"
            placeholder="Alex"
            value={firstName}
            onChange={setFirstName}
            error={errors.firstName}
          />
          <InputField
            label="Last name"
            name="lastName"
            autoComplete="family-name"
            placeholder="Rivera"
            value={lastName}
            onChange={setLastName}
            error={errors.lastName}
          />
        </div>
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
          autoComplete="new-password"
          placeholder="Create a password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          hint={PASSWORD_HINT}
        />
        <InputField
          label="Confirm password"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Type it again"
          value={confirmPassword}
          onChange={setConfirmPassword}
          error={errors.confirmPassword}
        />
        <Button type="submit" loading={signup.isPending} fullWidth>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
