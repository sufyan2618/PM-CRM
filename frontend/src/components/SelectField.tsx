import { useId } from "react";

export type SelectOption = {
  label: string;
  value: string;
};

type SelectFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
};

export function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: SelectFieldProps) {
  const id = useId();

  return (
    <div className="field">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <div className={error ? "field-control field-control-error" : "field-control"}>
        <select
          id={id}
          name={name}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
