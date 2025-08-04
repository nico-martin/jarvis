import cn from "@utils/classnames";
import FormField from "./FormField";
import { InputTextProps } from "./types";

export default function InputText({
  className = "",
  type = "text",
  name,
  id,
  label,
  description,
  required = false,
  placeholder = "",
  value,
  error,
  disabled = false,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
}: InputTextProps) {
  return (
    <FormField
      className={className}
      label={label}
      description={description}
      required={required}
      id={id}
      error={error}
    >
      <input
        type={type}
        name={name}
        id={id}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          "border-primary-400/70 bg-primary-950/40 text-primary-100 focus:border-primary-300 focus:ring-primary-400/70 placeholder:text-primary-400/60 w-full border px-3.5 py-2 text-base text-sm shadow-[inset_0_0_15px_rgba(0,162,255,0.2)] backdrop-blur-sm focus:ring-2 focus:outline-none",
          error && "border-red-400/70 focus:border-red-300 focus:ring-red-400/70",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        required={required}
      />
    </FormField>
  );
}
