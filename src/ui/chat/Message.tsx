import {
  Message as MessageI,
  MessagePart,
  MessagePartType,
  MessageRole,
} from "@ai/types";
import cn from "@utils/classnames";
import nl2brJsx from "@utils/nl2brJsx";
import parseThinkingJsx from "@utils/parseThinkingJsx";

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

function MessagePartRenderer({ part }: { part: MessagePart }) {
  if (part.type === MessagePartType.TEXT) {
    const parsed = parseThinkingJsx(part.text || "");
    return (
      <div>
        {Boolean(parsed.thinking) &&
          nl2brJsx(parsed.thinking).filter(Boolean).length > 0 && (
            <p className="mb-4 text-xs font-thin text-stone-500">
              <span className="mb-2 block font-normal">Thinking:</span>
              {nl2brJsx(parsed.thinking).flat()}
            </p>
          )}
        {Boolean(parsed.content) && <p>{nl2brJsx(parsed.content).flat()}</p>}
      </div>
    );
  }

  if (part.type === MessagePartType.TOOL_CALL) {
    return (
      <div className="my-4 rounded border border-blue-200 bg-blue-50 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-blue-700">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1rem"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          Tool Call: {part.functionName}
        </div>
        <div className="mb-2 text-xs text-gray-600">
          <strong>Parameters:</strong>
          <pre className="mt-1 max-w-full overflow-x-auto text-xs text-gray-500">
            {JSON.stringify(part.parameters, null, 2)}
          </pre>
        </div>
        {part.response && (
          <div className="text-xs text-gray-600">
            <strong>Response:</strong>
            <p className="mt-1">{part.response}</p>
          </div>
        )}
        {part.responseMedia && (
          <div className="mt-2">
            {part.responseMedia.type === "image" && (
              <img
                src={`data:${part.responseMedia.mimeType};base64,${part.responseMedia.data}`}
                alt="Tool response"
                className="max-w-full rounded"
              />
            )}
            {part.responseMedia.type === "audio" && (
              <audio
                src={`data:${part.responseMedia.mimeType};base64,${part.responseMedia.data}`}
                controls
                className="max-w-full"
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return null;
}

export function Message({
  message,
  className = "",
}: {
  message: MessageI;
  className?: string;
}) {
  return (
    <div
      className={cn(
        className,
        "flex",
        message.role === MessageRole.USER ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div className="w-19/20 rounded-md border border-stone-300 bg-stone-100 p-4">
        <p className="mb-4 text-xs text-stone-600">
          {message.role === MessageRole.ASSISTANT ? (
            <span className="flex items-center gap-2">
              {icons[MessageRole.ASSISTANT]} Agent
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
        <div>
          {message.messageParts.length > 0 ? (
            message.messageParts.map((part) => (
              <MessagePartRenderer key={part.id} part={part} />
            ))
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600"></div>
              thinking...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
