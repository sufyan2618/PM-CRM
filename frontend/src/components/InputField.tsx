import { useId, useState } from "react";

type InputFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "email" | "password";
  placeholder?: string;
  autoComplete?: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
};

export function InputField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  error,
  hint,
  disabled,
}: InputFieldProps) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword && visible ? "text" : type;

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className={error ? "field-control field-control-error" : "field-control"}>
        <input
          id={id}
          className={isPassword ? "has-toggle" : undefined}
          name={name}
          type={inputType}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          spellCheck={type === "email" ? false : undefined}
          onChange={(event) => onChange(event.target.value)}
        />
        {isPassword ? (
          <button
            className="field-toggle"
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? "Hide" : "Show"}
          </button>
        ) : null}
      </div>
      {error ? <p className="field-error">{error}</p> : null}
      {!error && hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}
