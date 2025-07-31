import { RadioGroup as HeadlessRadioGroup, Radio } from "@headlessui/react";
import React from "react";

import cn from "../../utils/classnames";

const RadioGroup: React.FC<{
  value: string;
  onChange: (value: string) => void;
  className?: string;
  choices: Array<{ value: string; label: React.ReactNode; className?: string }>;
}> = ({ value, onChange, className = "", choices }) => (
  <HeadlessRadioGroup
    value={value}
    onChange={onChange}
    className={cn("grid grid-cols-3 gap-3 sm:grid-cols-6", className)}
  >
    {choices.map((choice) => (
      <Radio
        key={choice.value}
        value={choice.value}
        aria-label={choice.value}
        className={cn(
          choice?.className ||
            "flex items-center justify-center border border-blue-400/50 bg-blue-950/20 backdrop-blur-sm px-3 py-3 text-sm font-medium text-blue-300 font-mono uppercase tracking-wider hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] data-checked:border-blue-300 data-checked:bg-blue-500/30 data-checked:text-blue-100 data-checked:shadow-[0_0_20px_rgba(0,162,255,0.4)] data-checked:hover:bg-blue-500/40 data-focus:ring-2 data-focus:ring-blue-400/50 data-focus:ring-offset-2 transition-all duration-300 sm:flex-1"
          //"relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-hidden data-checked:ring-2 data-focus:data-checked:ring-3 data-focus:data-checked:ring-offset-1"
        )}
      >
        {choice.label}
      </Radio>
    ))}
  </HeadlessRadioGroup>
);

export default RadioGroup;
