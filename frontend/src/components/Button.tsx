import type { ReactNode } from "react";

type ButtonProps = {
  children: ReactNode;
  type?: "button" | "submit";
  variant?: "primary" | "ghost" | "danger";
  loading?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  disabled?: boolean;
};

export function Button({
  children,
  type = "button",
  variant = "primary",
  loading = false,
  fullWidth = false,
  onClick,
  disabled,
}: ButtonProps) {
  const className = [
    "button",
    `button-${variant}`,
    fullWidth ? "button-full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={className}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-busy={loading}
    >
      {loading ? "Please wait..." : children}
    </button>
  );
}
