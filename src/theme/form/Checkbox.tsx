import { FunctionComponent } from "preact";

import cn from "../../utils/classnames";

const Checkbox: FunctionComponent<{
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
          className="border-primary-400/50 bg-primary-950/20 checked:border-primary-300 checked:bg-primary-500/30 indeterminate:border-primary-300 indeterminate:bg-primary-500/30 focus-visible:outline-primary-400 disabled:border-primary-400/30 disabled:bg-primary-950/10 disabled:checked:bg-primary-950/10 col-start-1 row-start-1 appearance-none rounded-sm border backdrop-blur-sm transition-all duration-300 checked:shadow-[0_0_10px_rgba(59,130,246,0.3)] focus-visible:outline-2 focus-visible:outline-offset-2 forced-colors:appearance-auto"
        />
        <svg
          fill="none"
          viewBox="0 0 14 14"
          className="stroke-primary-100 group-has-disabled:stroke-primary-400/25 pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center"
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
    <label htmlFor={id} className="text-primary-300 text-sm">
      {label}
    </label>
  </div>
);

export default Checkbox;
