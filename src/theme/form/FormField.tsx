import cn from "@utils/classnames";
import { ComponentChildren } from "preact";

interface FormFieldProps {
  children: ComponentChildren;
  className?: string;
  label?: string;
  description?: string;
  required?: boolean;
  id: string;
  error?: string;
}

export default function FormField({
  children,
  className = "",
  label,
  description,
  required = false,
  id,
  error,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {Boolean(label) && (
        <label
          htmlFor={id}
          className={cn(
            "text-primary-300 block text-xs font-medium tracking-wider uppercase"
          )}
        >
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </label>
      )}

      {children}

      {Boolean(description) && (
        <p className="text-primary-400/80 text-xs">{description}</p>
      )}

      {Boolean(error) && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
