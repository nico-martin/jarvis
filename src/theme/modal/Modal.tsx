import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { ComponentChildren, FunctionComponent } from "preact";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";

const sizeClasses: Record<ModalSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
  "2xl": "sm:max-w-6xl",
};

const Modal: FunctionComponent<{
  open: boolean;
  setOpen: (open: boolean) => void;
  title: string;
  subtitle?: string;
  children: ComponentChildren;
  size?: ModalSize;
}> = ({ open, setOpen, title, subtitle, children, size = "md" }) => (
  <Dialog open={open} onClose={setOpen} className="relative z-10">
    <DialogBackdrop
      transition
      className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in"
    />
    <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
        <DialogPanel
          transition
          className={`border-primary-400/30 bg-primary-950/20 relative transform overflow-hidden border p-4 text-left shadow-[0_0_500px_rgba(0,162,255,0.2)] backdrop-blur-sm transition-all data-closed:translate-y-4 data-closed:opacity-0 data-enter:duration-300 data-enter:ease-out data-leave:duration-200 data-leave:ease-in sm:my-8 sm:w-full ${sizeClasses[size]} data-closed:sm:translate-y-0 data-closed:sm:scale-95`}
        >
          <div className="absolute top-4 right-4 hidden sm:block">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="border-primary-400/30 bg-primary-950/20 text-primary-300 hover:bg-primary-900/30 hover:text-primary-200 focus:ring-primary-400/50 cursor-pointer border backdrop-blur-sm transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,162,255,0.3)] focus:ring-2 focus:ring-offset-2 focus:outline-hidden"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon aria-hidden="true" className="size-6" />
            </button>
          </div>
          <div className="mt-3 sm:mt-5">
            <DialogTitle
              as="h3"
              className="text-text-bright text-base font-semibold tracking-wider uppercase"
            >
              {title}
            </DialogTitle>
            {Boolean(subtitle) && (
              <p className="text-text/80 mt-2 text-sm">{subtitle}</p>
            )}
            <div className="mt-10 text-sm">{children}</div>
          </div>
        </DialogPanel>
      </div>
    </div>
  </Dialog>
);

export default Modal;
