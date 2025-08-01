import cn from "@utils/classnames";
import React from "react";

import FormField from "./FormField";
import { TextareaProps } from "./types";

export default function Textarea({
  className = "",
  name,
  id,
  label,
  description,
  required = false,
  placeholder = "",
  value,
  rows = 4,
  cols,
  resize = "vertical",
  error,
  disabled = false,
  onChange,
  onKeyDown,
  onFocus,
  onBlur,
}: TextareaProps) {
  const resizeClass = {
    none: "resize-none",
    both: "resize",
    horizontal: "resize-x",
    vertical: "resize-y",
  }[resize];

  return (
    <FormField
      className={className}
      label={label}
      description={description}
      required={required}
      id={id}
      error={error}
    >
      <textarea
        name={name}
        id={id}
        placeholder={placeholder}
        rows={rows}
        cols={cols}
        disabled={disabled}
        className={cn(
          "border-primary-400/70 bg-primary-950/40 text-primary-100 focus:border-primary-300 focus:ring-primary-400/70 placeholder:text-primary-400/60 w-full border px-3.5 py-2 text-base text-sm shadow-[inset_0_0_15px_rgba(0,162,255,0.2)] backdrop-blur-sm focus:ring-2 focus:outline-none",
          resizeClass,
          error &&
            "border-red-400/70 focus:border-red-300 focus:ring-red-400/70",
          disabled && "cursor-not-allowed opacity-50"
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
