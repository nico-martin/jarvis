import cn from "@utils/classnames";
import React from "react";

import FormField from "./FormField";
import { SelectProps } from "./types";

export default function Select({
  className = "",
  name,
  id,
  label,
  description,
  required = false,
  value,
  options,
  placeholder,
  error,
  disabled = false,
  onChange,
  onFocus,
  onBlur,
}: SelectProps) {
  return (
    <FormField
      className={className}
      label={label}
      description={description}
      required={required}
      id={id}
      error={error}
    >
      <div className="relative">
        <select
          name={name}
          id={id}
          disabled={disabled}
          className={cn(
            "border-primary-400/70 bg-primary-950/40 text-primary-100 focus:border-primary-300 focus:ring-primary-400/70 w-full cursor-pointer appearance-none border px-3.5 py-2 text-base text-sm shadow-[inset_0_0_15px_rgba(0,162,255,0.2)] backdrop-blur-sm focus:ring-2 focus:outline-none",
            error &&
              "border-red-400/70 focus:border-red-300 focus:ring-red-400/70",
            disabled && "cursor-not-allowed opacity-50"
          )}
          value={value}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          required={required}
        >
          {placeholder && (
            <option value="" disabled className="text-primary-400/60">
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-primary-950 text-primary-100"
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Custom dropdown arrow */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <svg
            className="text-primary-400 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
    </FormField>
  );
}
