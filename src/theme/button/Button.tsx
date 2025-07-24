import cn from "@utils/classnames";
import { ReactNode } from "react";

type ButtonColor = "navy" | "gold" | "cream" | "charcoal";
type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  children: ReactNode;
  className?: string;
  color?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

interface ButtonAsButton extends BaseButtonProps {
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  href?: never;
}

interface ButtonAsLink extends BaseButtonProps {
  href: string;
  onClick?: never;
  to?: never;
  target?: string;
  rel?: string;
}

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const colorVariantStyles: Record<ButtonColor, Record<ButtonVariant, string>> = {
  navy: {
    solid:
      "bg-slate-800 text-white hover:bg-slate-900 focus:ring-slate-600 border-transparent",
    outline:
      "bg-transparent text-slate-800 border-slate-800 hover:bg-slate-50 focus:ring-slate-600",
    ghost:
      "bg-transparent text-slate-800 border-transparent hover:bg-slate-50 focus:ring-slate-600",
  },
  gold: {
    solid:
      "bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-500 border-transparent",
    outline:
      "bg-transparent text-amber-600 border-amber-600 hover:bg-amber-50 focus:ring-amber-500",
    ghost:
      "bg-transparent text-amber-600 border-transparent hover:bg-amber-50 focus:ring-amber-500",
  },
  cream: {
    solid:
      "bg-stone-100 text-stone-800 hover:bg-stone-200 focus:ring-stone-400 border-transparent",
    outline:
      "bg-transparent text-stone-100 border-stone-100 hover:bg-stone-100 hover:text-stone-800 focus:ring-stone-400",
    ghost:
      "bg-transparent text-stone-100 border-transparent hover:bg-stone-100 hover:text-stone-800 focus:ring-stone-400",
  },
  charcoal: {
    solid:
      "bg-stone-800 text-white hover:bg-stone-900 focus:ring-stone-600 border-transparent",
    outline:
      "bg-transparent text-stone-800 border-stone-800 hover:bg-stone-50 focus:ring-stone-600",
    ghost:
      "bg-transparent text-stone-800 border-transparent hover:bg-stone-50 focus:ring-stone-600",
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2.5",
};

export default function Button({
  children,
  className = "",
  color = "navy",
  variant = "solid",
  size = "md",
  iconLeft,
  iconRight,
  disabled = false,
  loading = false,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

  const combinedClassName = cn(
    baseStyles,
    colorVariantStyles[color][variant],
    sizeStyles[size],
    className
  );

  const LoadingSpinner = () => (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );

  const content = (
    <>
      {loading && <LoadingSpinner />}
      {!loading && iconLeft && (
        <span className="flex-shrink-0">{iconLeft}</span>
      )}
      <span>{children}</span>
      {!loading && iconRight && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </>
  );

  if ("href" in props && props.href) {
    return (
      <a
        href={props.href}
        target={props.target}
        rel={props.rel}
        className={combinedClassName}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={"type" in props ? props.type : "button"}
      onClick={props.onClick}
      disabled={disabled || loading}
      className={combinedClassName}
    >
      {content}
    </button>
  );
}
