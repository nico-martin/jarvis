import { JSX } from "preact";

// Base form field props shared by all form components
export interface BaseFormFieldProps {
  className?: string;
  name: string;
  id: string;
  label?: string;
  description?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}

// Input-specific props
export interface InputTextProps extends BaseFormFieldProps {
  type?: string;
  placeholder?: string;
  value: string;
  onChange?: (e: JSX.TargetedEvent<HTMLInputElement, Event>) => void;
  onKeyDown?: (e: JSX.TargetedKeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: JSX.TargetedFocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: JSX.TargetedFocusEvent<HTMLInputElement>) => void;
}

// Textarea-specific props
export interface TextareaProps extends BaseFormFieldProps {
  placeholder?: string;
  value: string;
  rows?: number;
  cols?: number;
  resize?: "none" | "both" | "horizontal" | "vertical";
  onChange?: (e: JSX.TargetedEvent<HTMLTextAreaElement, Event>) => void;
  onKeyDown?: (e: JSX.TargetedKeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: JSX.TargetedFocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: JSX.TargetedFocusEvent<HTMLTextAreaElement>) => void;
}

// Select option type
export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

// Select-specific props
export interface SelectProps extends BaseFormFieldProps {
  value: string;
  options: SelectOption[];
  placeholder?: string;
  onChange?: (e: JSX.TargetedEvent<HTMLSelectElement, Event>) => void;
  onFocus?: (e: JSX.TargetedFocusEvent<HTMLSelectElement>) => void;
  onBlur?: (e: JSX.TargetedFocusEvent<HTMLSelectElement>) => void;
}
