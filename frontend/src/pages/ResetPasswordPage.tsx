import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import loginAnimation from "../animations/login.json?url";
import { authApi } from "../api/auth.api";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { OtpField } from "../components/OtpField";
import { useResendCooldown } from "../hooks/useResendCooldown";
import { getErrorMessage } from "../utils/api-error";
import { hasFieldErrors, validateEmail, validateOtp, validatePassword } from "../utils/validators";

const PASSWORD_HINT = "Use 6+ characters with upper, lower, a number, and @$!%*?&";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });
  const cooldown = useResendCooldown();

  const update = useMutation({
    mutationFn: authApi.updatePassword,
    onSuccess: () => {
      navigate("/login", {
        replace: true,
        state: { message: "Password updated. You can log in now." },
      });
    },
  });

  const resend = useMutation({
    mutationFn: authApi.resendOtp,
    onSuccess: () => cooldown.start(),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      email: validateEmail(email),
      otp: validateOtp(otp),
      newPassword: validatePassword(newPassword),
      confirmPassword: newPassword === confirmPassword ? "" : "Passwords do not match",
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    update.mutate({
      email: email.trim().toLowerCase(),
      otp,
      newPassword,
    });
  }

  function handleResend() {
    const emailError = validateEmail(email);
    setErrors((current) => ({ ...current, email: emailError }));
    if (emailError) return;
    resend.mutate({ email: email.trim().toLowerCase(), purpose: "reset_password" });
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle="Use the code from your email, then pick a new password."
      animationSrc={loginAnimation}
      segment={[48, 200]}
      footer={
        <p>
          <Link to="/login">Back to log in</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-heading">
          <h1>New password</h1>
          <p>This replaces the old password on your account.</p>
        </div>
        {update.error ? <Alert tone="error" message={getErrorMessage(update.error)} /> : null}
        {resend.error ? <Alert tone="error" message={getErrorMessage(resend.error)} /> : null}
        {resend.isSuccess ? <Alert tone="success" message="A new code is on the way." /> : null}
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
        <OtpField label="6 digit code" value={otp} onChange={setOtp} error={errors.otp} />
        <InputField
          label="New password"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Create a new password"
          value={newPassword}
          onChange={setNewPassword}
          error={errors.newPassword}
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
        <Button type="submit" loading={update.isPending} fullWidth>
          Update password
        </Button>
        <Button
          type="button"
          variant="ghost"
          fullWidth
          loading={resend.isPending}
          disabled={cooldown.isCoolingDown}
          onClick={handleResend}
        >
          {cooldown.isCoolingDown ? `Resend code in ${cooldown.remaining}s` : "Resend code"}
        </Button>
      </form>
    </AuthLayout>
  );
}
