import React from "react";

export default function Background() {
  return (
    <div className="fixed inset-0 flex h-screen items-center justify-center overflow-hidden bg-black">
      <div className="from-primary-950/20 absolute inset-0 bg-gradient-to-br via-black to-cyan-950/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,162,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 animate-pulse bg-[linear-gradient(45deg,transparent_30%,rgba(0,162,255,0.05)_50%,transparent_70%)]" />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,162,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,162,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] opacity-30" />
      <div className="border-primary-400/50 absolute top-4 left-4 h-16 w-16 border-t-2 border-l-2" />
      <div className="border-primary-400/50 absolute top-4 right-4 h-16 w-16 border-t-2 border-r-2" />
      <div className="border-primary-400/50 absolute bottom-4 left-4 h-16 w-16 border-b-2 border-l-2" />
      <div className="border-primary-400/50 absolute right-4 bottom-4 h-16 w-16 border-r-2 border-b-2" />
    </div>
  );
}
