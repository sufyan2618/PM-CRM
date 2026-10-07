import { useRef } from "react";

type OtpFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
};

export function OtpField({
  label = "Verification code",
  value,
  onChange,
  error,
  disabled,
}: OtpFieldProps) {
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, index) => value[index] ?? "");

  function commit(nextDigits: string[]) {
    onChange(nextDigits.join("").slice(0, 6));
  }

  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="otp-row">
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputs.current[index] = node;
            }}
            className={error ? "otp-input otp-input-error" : "otp-input"}
            inputMode="numeric"
            autoComplete={index === 0 ? "one-time-code" : "off"}
            maxLength={1}
            value={digit}
            disabled={disabled}
            aria-label={`Digit ${index + 1}`}
            onChange={(event) => {
              const nextDigit = event.target.value.replace(/\D/g, "").slice(-1);
              const nextDigits = [...digits];
              nextDigits[index] = nextDigit;
              commit(nextDigits);
              if (nextDigit && index < 5) inputs.current[index + 1]?.focus();
            }}
            onKeyDown={(event) => {
              if (event.key === "Backspace" && !digits[index] && index > 0) {
                inputs.current[index - 1]?.focus();
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
              const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
              if (!pasted) return;
              const nextDigits = Array.from({ length: 6 }, (_, digitIndex) => pasted[digitIndex] ?? "");
              commit(nextDigits);
              inputs.current[Math.min(pasted.length, 5)]?.focus();
            }}
          />
        ))}
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
