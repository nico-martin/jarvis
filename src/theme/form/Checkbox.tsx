import React from "react";

import cn from "../../utils/classnames.ts";

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
          className="col-start-1 row-start-1 appearance-none rounded-sm border border-gray-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 indeterminate:border-indigo-600 indeterminate:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:border-gray-300 disabled:bg-gray-100 disabled:checked:bg-gray-100 forced-colors:appearance-auto"
        />
        <svg
          fill="none"
          viewBox="0 0 14 14"
          className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25"
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
    <label htmlFor={id} className="text-sm text-gray-600">
      {label}
    </label>
  </div>
);

export default Checkbox;
