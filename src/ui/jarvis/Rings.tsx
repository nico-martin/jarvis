import cn from "@utils/classnames";

export default function Rings({
  isActive,
  isSpeaking,
  audioLevels,
  size = "10vmin",
  className = "",
}: {
  isActive: boolean;
  isSpeaking: boolean;
  audioLevels: number[];
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex h-[20em] w-[20em] items-center justify-center",
        className
      )}
      style={{ fontSize: size }}
    >
      {/* Outermost Ring with Dots */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
          isActive ? "animate-spin border-cyan-300/40" : "border-slate-500/20"
        }`}
        style={{
          width: "20em",
          height: "20em",
          borderWidth: "0.125em",
          borderStyle: "solid",
          borderRadius: "50%",
          animationDuration: "12s",
        }}
      >
        {/* Orbital Dots */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 opacity-60"
          style={{
            width: "0.5em",
            height: "0.5em",
            top: "-0.25em",
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-cyan-400 opacity-60"
          style={{
            width: "0.5em",
            height: "0.5em",
            bottom: "-0.25em",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full bg-cyan-400 opacity-60"
          style={{
            width: "0.5em",
            height: "0.5em",
            left: "-0.25em",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 rounded-full bg-cyan-400 opacity-60"
          style={{
            width: "0.5em",
            height: "0.5em",
            right: "-0.25em",
          }}
        />
      </div>

      {/* Outer Ring */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
          isActive ? "animate-spin border-cyan-400/60" : "border-slate-600/30"
        }`}
        style={{
          width: "15em",
          height: "15em",
          borderWidth: "0.125em",
          borderStyle: "solid",
          borderRadius: "50%",
          animationDuration: "8s",
        }}
      >
        {/* Spinning Lines */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 bg-cyan-400 opacity-80"
          style={{ height: "1.5em", width: "0.0625em" }}
        />
        <div
          className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-cyan-400 opacity-80"
          style={{ height: "1.5em", width: "0.0625em" }}
        />
      </div>

      {/* Middle Ring with Segments */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
          isActive ? "animate-spin" : ""
        }`}
        style={{
          width: "12em",
          height: "12em",
          animationDuration: "4s",
          animationDirection: "reverse",
        }}
      >
        {/* Segmented Arc */}
        <div
          className={`h-full w-full border-transparent transition-all duration-1000`}
          style={{
            borderRadius: "50%",
            borderWidth: "0.125em",
            borderStyle: "solid",
            borderTopColor: isActive
              ? "rgba(59, 130, 246, 0.7)"
              : "rgba(51, 65, 85, 0.2)",
            borderRightColor: isActive
              ? "rgba(59, 130, 246, 0.5)"
              : "rgba(51, 65, 85, 0.2)",
            borderBottomColor: "transparent",
            borderLeftColor: isActive
              ? "rgba(59, 130, 246, 0.3)"
              : "rgba(51, 65, 85, 0.2)",
          }}
        />
      </div>

      {/* Inner Ring */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
          isActive ? "animate-spin border-blue-400/40" : "border-slate-700/20"
        }`}
        style={{
          width: "10em",
          height: "10em",
          borderWidth: "0.0625em",
          borderStyle: "solid",
          borderRadius: "50%",
          animationDuration: "6s",
          animationDirection: "reverse",
        }}
      >
        {/* Inner Indicators */}
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-blue-400 opacity-70"
          style={{
            width: "0.25em",
            height: "0.25em",
            top: "-0.125em",
          }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 rounded-full bg-blue-400 opacity-70"
          style={{
            width: "0.25em",
            height: "0.25em",
            bottom: "-0.125em",
          }}
        />
      </div>

      {/* Core Ring */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
          isActive ? "animate-spin border-cyan-500/30" : "border-slate-800/20"
        }`}
        style={{
          width: "7em",
          height: "7em",
          borderWidth: "0.0625em",
          borderStyle: "solid",
          borderRadius: "50%",
          animationDuration: "3s",
        }}
      />

      {/* Audio Level Indicators */}
      {isActive && (
        <div
          id="audio"
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ width: "24em", height: "24em" }}
        >
          {audioLevels.map((level, i) => {
            return (
              <div
                key={i}
                className="absolute bg-cyan-400 transition-all duration-150"
                style={{
                  width: "0.125em",
                  height: "1em",
                  //height: `${Math.max(0.25, level * 0.01875)}em`,
                  left: "50%",
                  top: "50%",
                  transformOrigin: "top left",
                  transform: `rotate(${i * 60}deg) translateY(calc(-${10 + level * 0.01}em)) translateX(-0.0625em)`,
                  opacity: isSpeaking ? 0.8 : 0.3,
                  boxShadow: isSpeaking
                    ? `0 0 0.625em rgba(6, 182, 212, ${level * 0.01})`
                    : "none",
                }}
              />
            );
          })}
        </div>
      )}

      {/* Speaking Ring Expansion */}
      {isSpeaking && isActive && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse border border-cyan-400/30"
          style={{
            width: "18em",
            height: "18em",
            borderRadius: "50%",
            animationDuration: "0.8s",
          }}
        />
      )}

      {/* Central Core */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
          isActive
            ? isSpeaking
              ? "animate-pulse bg-orange-400"
              : "animate-pulse bg-cyan-500"
            : "bg-slate-600"
        }`}
        style={{
          width: "5em",
          height: "5em",
          borderRadius: "50%",
          transform: isSpeaking && isActive ? "scale(1.1)" : "scale(1)",
          transition: "transform 0.2s ease-in-out",
          boxShadow: isActive
            ? isSpeaking
              ? "0 0 3.125em rgba(251, 146, 60, 0.8)"
              : "0 0 2.5em rgba(6, 182, 212, 0.6)"
            : "0 0 0.625em rgba(100, 116, 139, 0.3)",
        }}
      >
        {/* Core Pulse */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
            isActive ? "animate-ping bg-white" : "bg-slate-300 opacity-50"
          }`}
          style={{
            width: "1em",
            height: "1em",
            animationDuration: isSpeaking ? "0.5s" : "2s",
          }}
        />

        {/* Core Lines */}
        {isActive && (
          <>
            <div
              className="absolute left-1/2 -translate-x-1/2 bg-white/60 transition-all duration-150"
              style={{
                width: "0.0625em",
                height: isSpeaking ? "1.25em" : "1em",
                top: "0.5em",
                opacity: isSpeaking ? 1 : 0.6,
              }}
            />
            <div
              className="absolute left-1/2 -translate-x-1/2 bg-white/60 transition-all duration-150"
              style={{
                width: "0.0625em",
                height: isSpeaking ? "1.25em" : "1em",
                bottom: "0.5em",
                opacity: isSpeaking ? 1 : 0.6,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 bg-white/60 transition-all duration-150"
              style={{
                height: "0.0625em",
                width: isSpeaking ? "1.25em" : "1em",
                left: "0.5em",
                opacity: isSpeaking ? 1 : 0.6,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 bg-white/60 transition-all duration-150"
              style={{
                height: "0.0625em",
                width: isSpeaking ? "1.25em" : "1em",
                right: "0.5em",
                opacity: isSpeaking ? 1 : 0.6,
              }}
            />
          </>
        )}
      </div>

      {/* Floating Particles */}
      {isActive && (
        <>
          <div
            className="absolute animate-ping rounded-full bg-cyan-400 opacity-80"
            style={{
              width: "0.25e m",
              height: "0.25em",
              top: "30%",
              left: "20%",
              animationDelay: "0s",
              animationDuration: "3s",
            }}
          />
          <div
            className="absolute animate-ping rounded-full bg-blue-400 opacity-60"
            style={{
              width: "0.25em",
              height: "0.25em",
              top: "70%",
              right: "25%",
              animationDelay: "1s",
              animationDuration: "4s",
            }}
          />
          <div
            className="absolute animate-ping rounded-full bg-cyan-300 opacity-70"
            style={{
              width: "0.25em",
              height: "0.25em",
              top: "25%",
              right: "30%",
              animationDelay: "2s",
              animationDuration: "3.5s",
            }}
          />
        </>
      )}
    </div>
  );
}
