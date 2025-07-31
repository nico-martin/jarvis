import cn from "@utils/classnames";
import React from "react";

interface InputTextProps {
  className?: string;
  type?: React.HTMLInputTypeAttribute;
  name: string;
  id: string;
  label?: string;
  placeholder?: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export default function InputText({
  className = "",
  type = "text",
  name,
  id,
  label = "",
  placeholder = "",
  value,
  onChange,
  onKeyDown,
}: InputTextProps) {
  return (
    <div className={cn(className)}>
      {Boolean(label) && (
        <label
          htmlFor={id}
          className={cn(
            "text-primary-300 mb-1 block text-xs font-medium tracking-wider uppercase"
          )}
        >
          {label}
        </label>
      )}
      <input
        type={type}
        name={name}
        id={id}
        placeholder={placeholder}
        className={cn(
          "border-primary-400/70 bg-primary-950/40 text-primary-100 focus:border-primary-300 focus:ring-primary-400/70 placeholder:text-primary-400/60 w-full border px-3.5 py-2 text-base text-sm shadow-[inset_0_0_15px_rgba(0,162,255,0.2)] backdrop-blur-sm focus:ring-2 focus:outline-none"
        )}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
