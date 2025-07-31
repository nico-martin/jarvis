import React from "react";

import cn from "../../utils/classnames";

const Checkbox: React.FC<{
  value: string;
  name: string;
  label: string;
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}> = ({ value, id, name, label, checked, onChange, className = "" }) => (
  <div className="flex gap-3">
    <div className="flex h-5 shrink-0 items-center">
      <div className={cn("group grid size-4 grid-cols-1", className)}>
        <input
          defaultValue={value}
          id={id}
          name={name}
          checked={checked}
          onChange={() => onChange(!checked)}
          type="checkbox"
          className="col-start-1 row-start-1 appearance-none rounded-sm border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm checked:border-blue-300 checked:bg-blue-500/30 checked:shadow-[0_0_10px_rgba(59,130,246,0.3)] indeterminate:border-blue-300 indeterminate:bg-blue-500/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:border-blue-400/30 disabled:bg-blue-950/10 disabled:checked:bg-blue-950/10 forced-colors:appearance-auto transition-all duration-300"
        />
        <svg
          fill="none"
          viewBox="0 0 14 14"
          className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-blue-100 group-has-disabled:stroke-blue-400/25"
        >
          <path
            d="M3 8L6 11L11 3.5"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0 group-has-checked:opacity-100"
          />
          <path
            d="M3 7H11"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="opacity-0 group-has-indeterminate:opacity-100"
          />
        </svg>
      </div>
    </div>
    <label htmlFor={id} className="text-sm text-blue-300 font-mono">
      {label}
    </label>
  </div>
);

export default Checkbox;
