import cn from "@utils/classnames";
import React from "react";

import { ButtonProps } from "../button/Button";
import { Button } from "../index";

export default function PageContent({
  title,
  subtitle,
  children,
  className = "",
  statusBar = {},
  button = null,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  statusBar?: Record<string, boolean>;
  button?: ButtonProps;
}) {
  const [time, setTime] = React.useState<number>(new Date().getTime());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date().getTime());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const timeString: string = React.useMemo(
    () => new Date().toLocaleTimeString(),
    [time]
  );

  return (
    <div
      className={cn(className, "mx-auto my-[5vh] w-10/12 max-w-4xl space-y-4")}
    >
      <header className="border-primary-400/30 from-primary-500/20 to-primary-500/20 border bg-gradient-to-r via-cyan-400/20 p-4 shadow-[0_0_30px_rgba(0,162,255,0.2)] backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-primary-300 text-4xl font-bold drop-shadow-[0_0_10px_rgba(0,162,255,0.8)]">
              {title}
            </h1>
            {Boolean(subtitle) && (
              <p className="text-primary-400/80 mt-1 text-lg">{subtitle}</p>
            )}
          </div>
          {button && <Button {...button} />}
        </div>
        {Object.entries(statusBar).length !== 0 && (
          <div className="border-primary-400/20 text-primary-300/60 mt-3 flex items-center justify-between border-t pt-2 text-sm">
            {Object.entries(statusBar).map(([text, animate]) => (
              <span className={cn({ "animate-pulse": animate })} key={text}>
                {text}
              </span>
            ))}
            <span>{timeString}</span>
          </div>
        )}
      </header>
      {children}
    </div>
  );
}
