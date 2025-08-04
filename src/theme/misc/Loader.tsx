import cn from "@utils/classnames";
import { FunctionComponent } from "preact";

const Loader: FunctionComponent<{ size?: 4 | 5 | 6 | 8 | 10 }> = ({ size = 5 }) => {
  const sizeClass =
    {
      4: "h-4 w-4",
      5: "h-5 w-5",
      6: "h-6 w-6",
      8: "h-8 w-8",
      10: "h-10 w-10",
    }[size] || "h-5 w-5";

  return (
    <svg
      className={cn(
        sizeClass,
        "animate-spin shadow-[0_0_10px_rgba(0,162,255,0.5)]"
      )}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
};

export default Loader;
