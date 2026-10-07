const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRequired(value: string, label: string) {
  if (!value.trim()) return `${label} is required`;
  return "";
}

export function validateEmail(email: string) {
  if (!email.trim()) return "Email is required";
  if (!EMAIL_PATTERN.test(email.trim())) return "Enter a valid email";
  return "";
}

export function validatePassword(password: string) {
  if (password.length < 6) return "Password must be at least 6 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  if (!/[@$!%*?&]/.test(password)) {
    return "Password must contain at least one special character (@$!%*?&)";
  }
  return "";
}

export function validateOtp(otp: string) {
  if (!/^\d{6}$/.test(otp)) return "Enter the 6 digit code";
  return "";
}

export function hasFieldErrors(errors: Record<string, string>) {
  return Object.values(errors).some(Boolean);
}
