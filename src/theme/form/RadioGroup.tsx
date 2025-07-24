import { RadioGroup as HeadlessRadioGroup, Radio } from "@headlessui/react";
import React from "react";

import cn from "../../utils/classnames.ts";

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
            "flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-3 text-sm font-medium text-gray-900 uppercase hover:bg-gray-50 data-checked:border-transparent data-checked:bg-indigo-600 data-checked:text-white data-checked:hover:bg-indigo-700 data-focus:ring-2 data-focus:ring-indigo-500 data-focus:ring-offset-2 sm:flex-1"
          //"relative -m-0.5 flex cursor-pointer items-center justify-center rounded-full p-0.5 focus:outline-hidden data-checked:ring-2 data-focus:data-checked:ring-3 data-focus:data-checked:ring-offset-1"
        )}
      >
        {choice.label}
      </Radio>
    ))}
  </HeadlessRadioGroup>
);

export default RadioGroup;
