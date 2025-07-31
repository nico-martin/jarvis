import {
  Message as MessageI,
  MessagePart,
  MessagePartType,
  MessageRole,
} from "@ai/types";
import { Loader } from "@theme";
import cn from "@utils/classnames";
import nl2brJsx from "@utils/nl2brJsx";

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
    return (
      <div>
        <p className="text-text-bright text-sm leading-relaxed">
          {nl2brJsx(part.text).flat()}
        </p>
      </div>
    );
  }

  if (part.type === MessagePartType.TOOL_CALL) {
    return (
      <div className="border-primary-400/60 bg-primary-950/40 my-4 border p-3">
        <div className="text-text-bright mb-2 flex items-center gap-2 text-xs font-medium">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="1rem"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary-300"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
          TOOL_EXECUTION: {part.functionName}
        </div>
        <div className="text-text-bright/90 mb-2 text-xs">
          <strong>PARAMETERS:</strong>
          <pre className="border-primary-400/30 text-text-superbright/80 mt-1 max-w-full overflow-x-auto rounded border bg-black/50 p-2 text-xs">
            {JSON.stringify(part.parameters, null, 2)}
          </pre>
        </div>
        {part.response && (
          <div className="text-text-bright/90 text-xs">
            <strong>OUTPUT:</strong>
            <p className="text-text-superbright mt-1">{part.response}</p>
          </div>
        )}
        {part.responseMedia && (
          <div className="mt-2">
            {part.responseMedia.type === "image" && (
              <img
                src={`data:${part.responseMedia.mimeType};base64,${part.responseMedia.data}`}
                alt="Tool response"
                className="border-primary-400/50 max-w-full rounded border shadow-[0_0_15px_rgba(0,162,255,0.4)]"
              />
            )}
            {part.responseMedia.type === "audio" && (
              <audio
                src={`data:${part.responseMedia.mimeType};base64,${part.responseMedia.data}`}
                controls
                className="max-w-full"
                style={{
                  filter: "invert(1) hue-rotate(180deg) brightness(0.8)",
                }}
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
      <div className="border-primary-400/60 bg-primary-950/30 w-19/20 border p-4">
        <p className="mb-4 text-xs">
          <span className="flex items-center gap-2">
            {message.role === MessageRole.ASSISTANT ? (
              <>
                <span className="text-text">
                  {icons[MessageRole.ASSISTANT]}
                </span>
                <span className="text-text-bright">JARVIS</span>
              </>
            ) : message.role === MessageRole.USER ? (
              <>
                <span className="text-text">{icons[MessageRole.USER]}</span>
                <span className="text-text-bright">USER_INPUT</span>
              </>
            ) : message.role === MessageRole.SYSTEM ? (
              <>
                <span className="text-text">{icons[MessageRole.SYSTEM]}</span>
                <span className="text-text-bright">SYSTEM_DIRECTIVE</span>
              </>
            ) : (
              ""
            )}
          </span>
        </p>
        <div>
          {message.messageParts.length > 0 ? (
            message.messageParts.map((part) => (
              <MessagePartRenderer key={part.id} part={part} />
            ))
          ) : (
            <div className="text-text flex items-center gap-2 text-sm">
              <Loader size={4} />
              PROCESSING_REQUEST...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
