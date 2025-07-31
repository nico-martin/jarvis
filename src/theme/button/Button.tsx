import cn from "@utils/classnames";
import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

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
  title?: string;
}

interface ButtonPropsButton extends BaseButtonProps {
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  href?: never;
}

interface ButtonPropsRouter extends BaseButtonProps {
  to: string;
}

type ButtonProps = ButtonPropsRouter | ButtonPropsButton;

const colorVariantStyles: Record<ButtonColor, Record<ButtonVariant, string>> = {
  navy: {
    solid:
      "bg-blue-950/20 text-blue-300 hover:bg-blue-900/30 hover:shadow-[0_0_20px_rgba(0,162,255,0.3)] focus:ring-blue-400/50 border-blue-400/50 backdrop-blur-sm",
    outline:
      "bg-blue-950/20 text-blue-300 border-blue-400/50 hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] hover:border-blue-300 focus:ring-blue-400/50 backdrop-blur-sm",
    ghost:
      "bg-transparent text-blue-300 border-transparent hover:bg-blue-950/20 hover:shadow-[0_0_10px_rgba(0,162,255,0.2)] focus:ring-blue-400/50",
  },
  gold: {
    solid:
      "bg-blue-950/20 text-blue-300 hover:bg-blue-900/30 hover:shadow-[0_0_20px_rgba(0,162,255,0.3)] focus:ring-blue-400/50 border-blue-400/50 backdrop-blur-sm",
    outline:
      "bg-blue-950/20 text-blue-300 border-blue-400/50 hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] hover:border-blue-300 focus:ring-blue-400/50 backdrop-blur-sm",
    ghost:
      "bg-transparent text-blue-300 border-transparent hover:bg-blue-950/20 hover:shadow-[0_0_10px_rgba(0,162,255,0.2)] focus:ring-blue-400/50",
  },
  cream: {
    solid:
      "bg-blue-950/20 text-blue-300 hover:bg-blue-900/30 hover:shadow-[0_0_20px_rgba(0,162,255,0.3)] focus:ring-blue-400/50 border-blue-400/50 backdrop-blur-sm",
    outline:
      "bg-blue-950/20 text-blue-300 border-blue-400/50 hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] hover:border-blue-300 focus:ring-blue-400/50 backdrop-blur-sm",
    ghost:
      "bg-transparent text-blue-300 border-transparent hover:bg-blue-950/20 hover:shadow-[0_0_10px_rgba(0,162,255,0.2)] focus:ring-blue-400/50",
  },
  charcoal: {
    solid:
      "bg-blue-950/20 text-blue-300 hover:bg-blue-900/30 hover:shadow-[0_0_20px_rgba(0,162,255,0.3)] focus:ring-blue-400/50 border-blue-400/50 backdrop-blur-sm",
    outline:
      "bg-blue-950/20 text-blue-300 border-blue-400/50 hover:bg-blue-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] hover:border-blue-300 focus:ring-blue-400/50 backdrop-blur-sm",
    ghost:
      "bg-transparent text-blue-300 border-transparent hover:bg-blue-950/20 hover:shadow-[0_0_10px_rgba(0,162,255,0.2)] focus:ring-blue-400/50",
  },
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs gap-1.5 font-mono",
  md: "px-4 py-2 text-sm gap-2 font-mono",
  lg: "px-6 py-3 text-base gap-2.5 font-mono",
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
  title = "",
  ...props
}: ButtonProps) {
  const baseStyles =
    "cursor-pointer inline-flex items-center justify-center font-medium border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider";

  const combinedClassName = cn(
    baseStyles,
    colorVariantStyles[color][variant],
    sizeStyles[size],
    className
  );

  const LoadingSpinner = () => (
    <svg
      className="h-4 w-4 animate-spin shadow-[0_0_10px_rgba(0,162,255,0.5)]"
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

  if ("to" in props) {
    return (
      <NavLink to={props.to} className={combinedClassName} title={title}>
        {content}
      </NavLink>
    );
  }

  if ("onClick" in props) {
    return (
      <button
        type={"type" in props ? props.type : "button"}
        onClick={props.onClick}
        disabled={disabled || loading}
        className={combinedClassName}
        title={title}
      >
        {content}
      </button>
    );
  }
  return null;
}
