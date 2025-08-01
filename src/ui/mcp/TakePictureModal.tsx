import ImageToText from "@ai/imageToText/ImageToText";
import { Crosshair, Modal } from "@theme";
import { eventEmitter } from "@utils/eventEmitter";
import React from "react";

const TIMEOUT = 5;

const TakePictureModal: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [query, setQuery] = React.useState<string>("");
  const [countdown, setCountdown] = React.useState<number | null>(5);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [capturedImageUrl, setCapturedImageUrl] = React.useState<string>("");
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const imageToTextRef = React.useRef<ImageToText | null>(null);

  React.useEffect(() => {
    // Initialize ImageToText instance
    imageToTextRef.current = new ImageToText();
    imageToTextRef.current.preload();

    const openModal = () => {
      setIsOpen(true);
      setCountdown(TIMEOUT);
      setIsProcessing(false);
      setCapturedImageUrl("");
    };

    const unsubscribe = eventEmitter.on("openTakePictureModal", (query) => {
      openModal();
      setQuery(query);
    });
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

  const takePicture = async () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      // Use the actual video dimensions, which should now be higher resolution
      const width = videoRef.current.videoWidth || 1920;
      const height = videoRef.current.videoHeight || 1080;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/png", 1.0);
        setCapturedImageUrl(dataUrl);
        setIsProcessing(true);

        try {
          const prompt = query || "Describe this image in detail.";
          const imageDescription = await imageToTextRef.current.generate(
            dataUrl,
            prompt
          );

          // Emit the result
          eventEmitter.emit("pictureTaken", {
            imageData: dataUrl.split(",")[1],
            imageDescription,
          });
        } catch (e) {
          eventEmitter.emit(
            "takePictureError",
            "Failed to generate Description"
          );
        } finally {
          setIsOpen(false);
          setIsProcessing(false);
          setCapturedImageUrl("");
        }
      } else {
        eventEmitter.emit("takePictureError", "Failed to get canvas context");
      }
      setIsOpen(false);
      setCountdown(null);
    }
  };

  return (
    <Modal size="xl" open={isOpen} setOpen={setIsOpen} title="">
      <div className="border-primary-400/30 relative overflow-hidden border bg-black">
        {/* JARVIS-style header */}
        <div className="border-primary-400/30 from-primary-500/20 to-primary-500/20 border-b bg-gradient-to-r via-cyan-400/20 px-4 py-2">
          <div className="text-primary-300 flex items-center justify-between font-mono text-xs">
            <span>VISUAL_ACQUISITION_SYSTEM</span>
            <span className="animate-pulse">CAMERA_ACTIVE</span>
            <span>RES: 1920x1080</span>
          </div>
        </div>

        <div className="relative p-4">
          <div className="border-primary-400/50 relative overflow-hidden shadow-[0_0_30px_rgba(0,162,255,0.3)]">
            {/* Show captured image during processing, otherwise show video */}
            <div className="relative">
              {/* Countdown overlay */}
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-8 bg-black/70">
                {countdown !== null && countdown > 0 && (
                  <>
                    <Crosshair />
                    <div className="text-center">
                      <div className="text-primary-300 animate-pulse font-mono text-xl">
                        ACQUIRING_TARGET_{countdown}
                      </div>
                    </div>
                  </>
                )}

                {/* Processing overlay */}
                {isProcessing && (
                  <div className="max-w-lg px-4 text-center">
                    <div className="text-primary-300 mb-2 animate-pulse font-mono text-lg">
                      PROCESSING_IMAGE...
                    </div>
                  </div>
                )}
              </div>

              {isProcessing && capturedImageUrl ? (
                <img
                  src={capturedImageUrl}
                  alt="Captured"
                  className="h-auto w-full brightness-110 contrast-110 filter"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="h-auto w-full brightness-110 contrast-110 filter"
                  onLoadedData={() => videoRef.current?.play()}
                />
              )}
            </div>
            {/* Scanning lines animation */}
            <div
              className="via-primary-400/10 absolute inset-0 h-1 animate-pulse bg-gradient-to-b from-transparent to-transparent"
              style={{
                animation: "scan 2s linear infinite",
                background:
                  "linear-gradient(to bottom, transparent, rgba(0,162,255,0.2), transparent)",
                height: "4px",
              }}
            />
          </div>

          {/* Status bar */}
          <div className="border-primary-400/30 bg-primary-950/20 text-primary-300 mt-4 flex items-center justify-between rounded border px-3 py-2 font-mono text-xs">
            <span>
              STATUS:{" "}
              {isProcessing
                ? "PROCESSING"
                : countdown !== null
                  ? "CAPTURING"
                  : "READY"}
            </span>
            <span>FOCAL_LENGTH: AUTO</span>
            <span>EXPOSURE: AUTO</span>
          </div>
        </div>
      </div>

      <style jsx="true">{`
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
