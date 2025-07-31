import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import React from "react";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg", 
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "2xl": "sm:max-w-6xl"
};

const Modal: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
  size?: ModalSize;
}> = ({ open, setOpen, title, children, size = "md" }) => (
  <Dialog open={open} onClose={setOpen} className="relative z-10">
    <DialogBackdrop
      transition
      className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
    />

    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
        <DialogPanel
          transition
          className={`relative transform overflow-hidden border border-blue-400/30 bg-blue-950/20 backdrop-blur-sm px-4 pt-5 pb-4 text-left shadow-[0_0_50px_rgba(0,162,255,0.3)] transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full ${sizeClasses[size]} sm:p-6 data-closed:sm:translate-y-0 data-closed:sm:scale-95`}
        >
          <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="bg-blue-950/20 backdrop-blur-sm text-blue-300 hover:text-blue-200 hover:bg-blue-900/30 focus:ring-2 focus:ring-blue-400/50 focus:ring-offset-2 focus:outline-hidden transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] border border-blue-400/30"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-3 sm:mt-5">
            <DialogTitle
              as="h3"
              className="text-base font-semibold text-blue-300 font-mono uppercase tracking-wider"
            >
              {title}
            </DialogTitle>
            <div className="mt-8 text-sm text-blue-200 font-mono">{children}</div>
          </div>
        </DialogPanel>
      </div>
    </div>
  </Dialog>
);

export default Modal;
