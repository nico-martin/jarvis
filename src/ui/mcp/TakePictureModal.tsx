import { Modal } from "@theme";
import { eventEmitter } from "@utils/eventEmitter";
import React from "react";

const TIMEOUT = 5;

const TakePictureModal: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [countdown, setCountdown] = React.useState<number | null>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  React.useEffect(() => {
    const openModal = () => {
      setIsOpen(true);
      setCountdown(TIMEOUT);
    };

    const unsubscribe = eventEmitter.on("openTakePictureModal", openModal);
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      navigator.mediaDevices
        .getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: "user",
          },
        })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => {
          console.error("Error accessing camera:", err);
          eventEmitter.emit("takePictureError", "Error accessing camera");
          setIsOpen(false);
        });
    } else {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (countdown === null) return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      takePicture();
    }
  }, [countdown]);

  const takePicture = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      // Use the actual video dimensions, which should now be higher resolution
      const width = videoRef.current.videoWidth || 1920;
      const height = videoRef.current.videoHeight || 1080;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw the video frame to canvas at full resolution
        ctx.drawImage(videoRef.current, 0, 0, width, height);

        // Convert to PNG with high quality
        const dataUrl = canvas.toDataURL("image/png", 1.0);
        eventEmitter.emit("pictureTaken", dataUrl.split(",")[1]);
      } else {
        eventEmitter.emit("takePictureError", "Failed to get canvas context");
      }
      setIsOpen(false);
      setCountdown(null);
    }
  };

  return (
    <Modal size="xl" open={isOpen} setOpen={setIsOpen} title="">
      <div className="relative overflow-hidden rounded-lg border border-blue-400/30 bg-black">
        {/* JARVIS-style header */}
        <div className="border-b border-blue-400/30 bg-gradient-to-r from-blue-500/20 via-cyan-400/20 to-blue-500/20 px-4 py-2">
          <div className="flex items-center justify-between font-mono text-xs text-blue-300">
            <span>VISUAL_ACQUISITION_SYSTEM</span>
            <span className="animate-pulse">CAMERA_ACTIVE</span>
            <span>RES: 1920x1080</span>
          </div>
        </div>

        <div className="relative p-4">
          {/* Corner targeting reticles */}
          <div className="absolute top-6 left-6 z-10 h-8 w-8 border-t-2 border-l-2 border-blue-400" />
          <div className="absolute top-6 right-6 z-10 h-8 w-8 border-t-2 border-r-2 border-blue-400" />
          <div className="absolute bottom-6 left-6 z-10 h-8 w-8 border-b-2 border-l-2 border-blue-400" />
          <div className="absolute right-6 bottom-6 z-10 h-8 w-8 border-r-2 border-b-2 border-blue-400" />

          {/* Central crosshair */}
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            <div className="relative">
              <div className="absolute -top-4 left-1/2 h-8 w-0.5 -translate-x-1/2 transform bg-blue-400/60" />
              <div className="absolute -bottom-4 left-1/2 h-8 w-0.5 -translate-x-1/2 transform bg-blue-400/60" />
              <div className="absolute top-1/2 -left-4 h-0.5 w-8 -translate-y-1/2 transform bg-blue-400/60" />
              <div className="absolute top-1/2 -right-4 h-0.5 w-8 -translate-y-1/2 transform bg-blue-400/60" />
              <div className="h-4 w-4 rounded-full border border-blue-400/60" />
            </div>
          </div>

          {/* Video feed with JARVIS overlay */}
          <div className="relative overflow-hidden rounded border border-blue-400/50 shadow-[0_0_30px_rgba(0,162,255,0.3)]">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="h-auto w-full brightness-110 contrast-110 filter"
              onLoadedData={() => videoRef.current?.play()}
            />

            {/* Scanning lines animation */}
            <div
              className="absolute inset-0 h-1 animate-pulse bg-gradient-to-b from-transparent via-blue-400/10 to-transparent"
              style={{
                animation: "scan 2s linear infinite",
                background:
                  "linear-gradient(to bottom, transparent, rgba(0,162,255,0.2), transparent)",
                height: "4px",
              }}
            />
          </div>

          {/* Countdown overlay */}
          {countdown !== null && countdown > 0 && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-center">
                <div className="mb-4 animate-pulse font-mono text-8xl text-blue-400 drop-shadow-[0_0_20px_rgba(0,162,255,0.8)]">
                  {countdown}
                </div>
                <div className="animate-pulse font-mono text-xl text-blue-300">
                  ACQUIRING_TARGET...
                </div>

                {/* Circular progress indicator */}
                <div className="relative mx-auto mt-6 h-32 w-32">
                  <svg
                    className="h-32 w-32 -rotate-90 transform"
                    viewBox="0 0 120 120"
                  >
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="rgba(0,162,255,0.3)"
                      strokeWidth="4"
                      fill="none"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      stroke="#00a2ff"
                      strokeWidth="4"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${(TIMEOUT - countdown) * (314 / TIMEOUT)} 314`}
                      className="drop-shadow-[0_0_10px_rgba(0,162,255,0.8)] transition-all duration-1000 ease-linear"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* Status bar */}
          <div className="mt-4 flex items-center justify-between rounded border border-blue-400/30 bg-blue-950/20 px-3 py-2 font-mono text-xs text-blue-300">
            <span>STATUS: {countdown !== null ? "CAPTURING" : "READY"}</span>
            <span>FOCAL_LENGTH: AUTO</span>
            <span>EXPOSURE: AUTO</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scan {
          0% {
            top: 0;
          }
          100% {
            top: 100%;
          }
        }
      `}</style>
    </Modal>
  );
};

export default TakePictureModal;
