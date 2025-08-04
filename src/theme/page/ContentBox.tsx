import cn from "@utils/classnames";
import { ComponentChildren } from "preact";

export default function ContentBox({
  children,
  header,
  className = "",
  wrapperClassName = "",
}: {
  children?: ComponentChildren;
  header?: ComponentChildren;
  className?: string;
  wrapperClassName?: string;
}) {
  return (
    <div
      className={cn(
        wrapperClassName,
        "border-primary-400/30 bg-primary-950/10 border shadow-[0_0_20px_rgba(0,162,255,0.1)] backdrop-blur-sm"
      )}
    >
      {header && (
        <div className="border-b border-blue-400/20 bg-gradient-to-r from-blue-500/10 via-transparent to-blue-500/10 px-6 py-4">
          {header}
        </div>
      )}
      <div className={cn(className, "p-4")}>{children}</div>
    </div>
  );
}
