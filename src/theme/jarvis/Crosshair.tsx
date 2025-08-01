import cn from "@utils/classnames";
import React from "react";

export default function Crosshair({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        className,
        "pointer-events-none flex -translate-x-1/2 -translate-y-1/2 items-center justify-center"
      )}
    >
      <div className="bg-primary-400/60 absolute -top-4 left-1/2 h-8 w-0.5 -translate-x-1/2 transform" />
      <div className="bg-primary-400/60 absolute -bottom-4 left-1/2 h-8 w-0.5 -translate-x-1/2 transform" />
      <div className="bg-primary-400/60 absolute top-1/2 -left-4 h-0.5 w-8 -translate-y-1/2 transform" />
      <div className="bg-primary-400/60 absolute top-1/2 -right-4 h-0.5 w-8 -translate-y-1/2 transform" />
      <div className="border-primary-400/60 h-4 w-4 rounded-full border" />
    </div>
  );
}
