import React from "react";

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
  type?: React.HTMLInputTypeAttribute;
  placeholder?: string;
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

// Textarea-specific props
export interface TextareaProps extends BaseFormFieldProps {
  placeholder?: string;
  value: string;
  rows?: number;
  cols?: number;
  resize?: "none" | "both" | "horizontal" | "vertical";
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLTextAreaElement>) => void;
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
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
}
