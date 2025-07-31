import cn from "@utils/classnames";
import React from "react";

interface InputTextProps {
  className?: string;
  type: React.HTMLInputTypeAttribute;
  name: string;
  ref: React.RefObject<HTMLInputElement>;
  placeholder?: string;
}

export default function InputText({
  className = "",
  type = "text",
  name,
  ref,
  placeholder = "",
}: InputTextProps) {
  return (
    <input
      type={type}
      name={name}
      ref={ref}
      placeholder={placeholder}
      className={cn(
        className,
        "border border-blue-400/70 bg-blue-950/40 px-3.5 py-2 text-base text-blue-100 shadow-[inset_0_0_15px_rgba(0,162,255,0.2)] backdrop-blur-sm placeholder:text-blue-300/70 focus:border-blue-300 focus:ring-2 focus:ring-blue-400/70 focus:outline-none"
      )}
    />
  );
}
