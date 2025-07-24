import cn from "@utils/classnames";
import nl2brJsx from "@utils/nl2brJsx";
import parseThinkingJsx from "@utils/parseThinkingJsx";

import { Message as MessageI, MessageRole } from "../../types";

const icons = {
  [MessageRole.ASSISTANT]: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1rem"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="-translate-y-1/15"
    >
      <path d="M12 8V4H8" />
      <rect width="16" height="12" x="4" y="8" rx="2" />
      <path d="M2 14h2" />
      <path d="M20 14h2" />
      <path d="M15 13v2" />
      <path d="M9 13v2" />
    </svg>
  ),
  [MessageRole.USER]: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1rem"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="-translate-y-1/15"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  [MessageRole.TOOL]: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1rem"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="-translate-y-1/15"
    >
      <path d="M8 21s-4-3-4-9 4-9 4-9" />
      <path d="M16 3s4 3 4 9-4 9-4 9" />
    </svg>
  ),
  [MessageRole.SYSTEM]: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1rem"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="-translate-y-1/15"
    >
      <path d="M12 6V2H8" />
      <path d="m8 18-4 4V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2Z" />
      <path d="M2 12h2" />
      <path d="M9 11v2" />
      <path d="M15 11v2" />
      <path d="M20 12h2" />
    </svg>
  ),
};

export function Message({
  message,
  className = "",
}: {
  message: MessageI;
  className?: string;
}) {
  const parsed = parseThinkingJsx(message?.text?.toString() || "");

  return (
    <div
      className={cn(
        className,
        "flex",
        message.role === MessageRole.USER || message.role === MessageRole.TOOL
          ? "flex-row"
          : "flex-row-reverse"
      )}
    >
      <div className="w-19/20 rounded-md border border-stone-300 bg-stone-100 p-4">
        <p className="mb-4 text-xs text-stone-600">
          {message.role === MessageRole.ASSISTANT ? (
            <span className="flex items-center gap-2">
              {icons[MessageRole.ASSISTANT]} Agent
            </span>
          ) : message.role === MessageRole.TOOL ? (
            <span className="flex items-center gap-2">
              {icons[MessageRole.TOOL]} Tool Call
            </span>
          ) : message.role === MessageRole.USER ? (
            <span className="flex items-center gap-2">
              {icons[MessageRole.USER]} User Prompt
            </span>
          ) : message.role === MessageRole.SYSTEM ? (
            <span className="flex items-center gap-2">
              {icons[MessageRole.SYSTEM]} System Prompt
            </span>
          ) : (
            ""
          )}
        </p>
        {Boolean(parsed.thinking) &&
          nl2brJsx(parsed.thinking).filter(Boolean).length > 0 && (
            <p className="mb-4 text-xs font-thin text-stone-500">
              <span className="mb-2 block font-normal">Thinking:</span>
              {nl2brJsx(parsed.thinking).flat()}
            </p>
          )}
        {Boolean(parsed.content) && <p>{nl2brJsx(parsed.content).flat()}</p>}
      </div>
    </div>
  );
}
