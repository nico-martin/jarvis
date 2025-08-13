import cn from "@utils/classnames";
import { ComponentChildren } from "preact";
import { Link } from "preact-router";

import { Loader } from "../index";

type ButtonColor = "primary" | "secondary" | "danger";
type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface BaseButtonProps {
  children: ComponentChildren;
  className?: string;
  color?: ButtonColor;
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconLeft?: ComponentChildren;
  iconRight?: ComponentChildren;
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

export type ButtonProps = ButtonPropsRouter | ButtonPropsButton;

const colorVariantStyles: Record<ButtonColor, Record<ButtonVariant, string>> = {
  secondary: {
    solid:
      "bg-secondary-950/20 text-secondary-300 hover:bg-secondary-900/30 hover:shadow-[0_0_20px_rgba(0,162,255,0.3)] focus:ring-secondary-400/50 border-secondary-400/50 backdrop-blur-sm",
    outline:
      "bg-secondary-950/20 text-secondary-300 border-secondary-400/50 hover:bg-secondary-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] hover:border-secondary-300 focus:ring-secondary-400/50 backdrop-blur-sm",
    ghost:
      "bg-transparent text-secondary-300 border-transparent hover:bg-secondary-950/20 hover:shadow-[0_0_10px_rgba(0,162,255,0.2)] focus:ring-secondary-400/50",
  },
  primary: {
    solid:
      "bg-primary-950/20 text-primary-300 hover:bg-primary-900/30 hover:shadow-[0_0_20px_rgba(0,162,255,0.3)] focus:ring-primary-400/50 border-primary-400/50 backdrop-blur-sm",
    outline:
      "bg-primary-950/20 text-primary-300 border-primary-400/50 hover:bg-primary-900/30 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] hover:border-primary-300 focus:ring-primary-400/50 backdrop-blur-sm",
    ghost:
      "bg-transparent text-primary-300 border-transparent hover:bg-primary-950/20 hover:shadow-[0_0_10px_rgba(0,162,255,0.2)] focus:ring-primary-400/50",
  },
  danger: {
    solid:
      "bg-red-950/20 text-red-300 hover:bg-red-900/30 hover:shadow-[0_0_20px_rgba(255,0,0,0.3)] focus:ring-red-400/50 border-red-400/50 backdrop-blur-sm",
    outline:
      "bg-red-950/20 text-red-300 border-red-400/50 hover:bg-red-900/30 hover:shadow-[0_0_15px_rgba(255,0,0,0.3)] hover:border-red-300 focus:ring-red-400/50 backdrop-blur-sm",
    ghost:
      "bg-transparent text-red-300 border-transparent hover:bg-red-950/20 hover:shadow-[0_0_10px_rgba(255,0,0,0.2)] focus:ring-red-400/50",
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
  color = "primary",
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
    "cursor-pointer inline-flex items-center justify-center gap-[1em] font-medium border focus:outline-none focus:ring-2 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider";

  const combinedClassName = cn(
    baseStyles,
    colorVariantStyles[color][variant],
    sizeStyles[size],
    className
  );

  const content = (
    <>
      {loading && <Loader />}
      {!loading && iconLeft && (
        <span className="flex-shrink-0">{iconLeft}</span>
      )}
      <span className="flex gap-2">{children}</span>
      {!loading && iconRight && (
        <span className="flex-shrink-0">{iconRight}</span>
      )}
    </>
  );

  if ("to" in props) {
    return (
      <Link {...({ href: props.to, className: combinedClassName, title } as any)}>
        {content}
      </Link>
    );
  }

  if ("onClick" in props || props.type === "submit") {
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
