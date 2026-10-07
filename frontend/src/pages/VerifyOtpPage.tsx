import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import signupAnimation from "../animations/signup.json?url";
import { authApi } from "../api/auth.api";
import { Alert } from "../components/Alert";
import { AuthLayout } from "../components/AuthLayout";
import { Button } from "../components/Button";
import { InputField } from "../components/InputField";
import { OtpField } from "../components/OtpField";
import { useResendCooldown } from "../hooks/useResendCooldown";
import { getErrorMessage } from "../utils/api-error";
import { hasFieldErrors, validateEmail, validateOtp } from "../utils/validators";

export function VerifyOtpPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const initialEmail = (location.state as { email?: string } | null)?.email ?? "";
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState({ email: "", otp: "" });
  const cooldown = useResendCooldown();

  const verify = useMutation({
    mutationFn: authApi.verifyOtp,
    onSuccess: () => {
      navigate("/login", {
        replace: true,
        state: { message: "Email verified. You can log in now." },
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
    };
    setErrors(nextErrors);
    if (hasFieldErrors(nextErrors)) return;

    verify.mutate({
      email: email.trim().toLowerCase(),
      otp,
      purpose: "verify_email",
    });
  }

  function handleResend() {
    const emailError = validateEmail(email);
    setErrors((current) => ({ ...current, email: emailError }));
    if (emailError) return;
    resend.mutate({ email: email.trim().toLowerCase(), purpose: "verify_email" });
  }

  return (
    <AuthLayout
      title="Check your email"
      subtitle="Type the 6 digit code we sent you."
      animationSrc={signupAnimation}
      footer={
        <p>
          Wrong email? <Link to="/signup">Go back to sign up</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit} noValidate>
        <div className="form-heading">
          <h1>Verify email</h1>
          <p>Your account stays locked until this code is confirmed.</p>
        </div>
        {verify.error ? <Alert tone="error" message={getErrorMessage(verify.error)} /> : null}
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
        <Button type="submit" loading={verify.isPending} fullWidth>
          Verify email
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
