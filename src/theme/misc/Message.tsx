import cn from "@utils/classnames";
import React from "react";

export type MessageType = "info" | "warning" | "success" | "error";

interface MessageProps {
  type: MessageType;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const messageStyles: Record<MessageType, string> = {
  info: "border-blue-200 bg-blue-50",
  warning: "border-yellow-200 bg-yellow-50",
  success: "border-green-200 bg-green-50",
  error: "border-red-200 bg-red-50",
};

const titleStyles: Record<MessageType, string> = {
  info: "text-blue-800",
  warning: "text-yellow-800",
  success: "text-green-800",
  error: "text-red-800",
};

const contentStyles: Record<MessageType, string> = {
  info: "text-blue-700",
  warning: "text-yellow-700",
  success: "text-green-700",
  error: "text-red-700",
};

export function Message({ type, title, children, className }: MessageProps) {
  return (
    <div
      className={cn("rounded-md border p-4", messageStyles[type], className)}
    >
      {title && (
        <h3 className={cn("mb-2 text-sm font-medium", titleStyles[type])}>
          {title}
        </h3>
      )}
      <div className={cn("text-sm", contentStyles[type])}>{children}</div>
    </div>
  );
}

export default Message;
