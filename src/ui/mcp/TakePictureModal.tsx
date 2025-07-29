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
        .getUserMedia({ video: true })
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
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL("image/png");
        eventEmitter.emit("pictureTaken", dataUrl.split(",")[1]);
      } else {
        eventEmitter.emit("takePictureError", "Failed to get canvas context");
      }
      setIsOpen(false);
      setCountdown(null);
    }
  };

  return (
    <Modal open={isOpen} setOpen={setIsOpen} title="Take a Picture">
      <div className="relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="h-auto w-full"
          onLoadedData={() => videoRef.current?.play()}
        />
        {countdown !== null && countdown > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl font-bold text-white">{countdown}</div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TakePictureModal;
