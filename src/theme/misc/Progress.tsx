import cn from "@utils/classnames";
import { FunctionComponent } from "preact";

interface ProgressProps {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "danger";
  showLabel?: boolean;
  className?: string;
}

const Progress: FunctionComponent<ProgressProps> = ({
  value,
  max = 100,
  size = "md",
  variant = "primary",
  showLabel = false,
  className = "",
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  const sizeStyles = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  }[size];

  const variantStyles = {
    primary: {
      bg: "bg-primary-950/20 backdrop-blur-sm border-primary-400/30",
      fill: "bg-primary-400 shadow-[0_0_10px_rgba(0,162,255,0.5)]",
    },
    secondary: {
      bg: "bg-secondary-950/20 backdrop-blur-sm border-secondary-400/30",
      fill: "bg-secondary-400 shadow-[0_0_10px_rgba(0,162,255,0.5)]",
    },
    danger: {
      bg: "bg-red-950/20 backdrop-blur-sm border-red-400/30",
      fill: "bg-red-400 shadow-[0_0_10px_rgba(255,0,0,0.5)]",
    },
  }[variant];

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-xs text-secondary-300">
          <span>{Math.round(percentage)}%</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full border",
          sizeStyles,
          variantStyles.bg
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-300 ease-out",
            variantStyles.fill
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default Progress;