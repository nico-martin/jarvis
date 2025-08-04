import cn from "@utils/classnames";
import { ComponentChildren } from "preact";

export type MessageType = "info" | "warning" | "success" | "error";

interface MessageProps {
  type: MessageType;
  title?: string;
  children: ComponentChildren;
  className?: string;
}

const messageStyles: Record<MessageType, string> = {
  info: "border-blue-400/50 bg-blue-950/20 shadow-[0_0_15px_rgba(59,130,246,0.2)]",
  warning:
    "border-yellow-400/50 bg-yellow-950/20 shadow-[0_0_15px_rgba(234,179,8,0.2)]",
  success:
    "border-green-400/50 bg-green-950/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]",
  error:
    "border-red-400/50 bg-red-950/20 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
};

const titleStyles: Record<MessageType, string> = {
  info: "text-blue-300 uppercase tracking-wider",
  warning: "text-yellow-300 uppercase tracking-wider",
  success: "text-green-300 uppercase tracking-wider",
  error: "text-red-300 uppercase tracking-wider",
};

const contentStyles: Record<MessageType, string> = {
  info: "text-blue-200 font-mono",
  warning: "text-yellow-200 font-mono",
  success: "text-green-200 font-mono",
  error: "text-red-200 font-mono",
};

export function Message({ type, title, children, className }: MessageProps) {
  return (
    <div className={cn("border p-4", messageStyles[type], className)}>
      {title && (
        <h3 className={cn("mb-2 text-sm font-bold", titleStyles[type])}>
          {title}
        </h3>
      )}
      <div className={cn("text-sm", contentStyles[type])}>{children}</div>
    </div>
  );
}

export default Message;
